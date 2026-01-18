"""
Each-Way Calculator Agent
Pydantic AI agent with AG-UI and CLM endpoints for CopilotKit and Hume Voice.
Integrates with Zep for user memory and knowledge graphs.
"""

import os
import sys
import json
from typing import Optional
from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.result import RunContext
from pydantic_ai.ag_ui import StateDeps

# Zep for user memory
from zep_cloud.client import Zep
from zep_cloud import NotFoundError

# Neon PostgreSQL
import psycopg2

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize Zep client
ZEP_API_KEY = os.environ.get("ZEP_API_KEY")
ZEP_GRAPH_ID = "each_way_calculator"
zep_client = Zep(api_key=ZEP_API_KEY) if ZEP_API_KEY else None

# Initialize Neon database
DATABASE_URL = os.environ.get("DATABASE_URL")
print(f"[INIT] Database URL configured: {bool(DATABASE_URL)}", file=sys.stderr)

# ============================================================================
# ZEP USER MEMORY HELPERS
# ============================================================================

async def get_or_create_zep_user(user_id: str, email: str = None, name: str = None):
    """Get or create a Zep user for memory tracking."""
    if not zep_client:
        return None

    try:
        user = zep_client.user.get(user_id)
        return user
    except NotFoundError:
        # Create new user
        first_name = name.split()[0] if name else None
        last_name = " ".join(name.split()[1:]) if name and len(name.split()) > 1 else None
        zep_client.user.add(
            user_id=user_id,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        return zep_client.user.get(user_id)
    except Exception as e:
        print(f"Zep user error: {e}")
        return None


async def get_user_context(user_id: str) -> str:
    """Get relevant context about a user from Zep knowledge graph."""
    if not zep_client:
        return ""

    try:
        # Get user facts from knowledge graph
        context = zep_client.user.get_context(user_id, min_score=0.5)
        if context and context.facts:
            facts = [f.fact for f in context.facts[:5]]  # Top 5 facts
            return "Known about this user: " + "; ".join(facts)
        return ""
    except Exception as e:
        print(f"Zep context error: {e}")
        return ""


async def add_conversation_to_zep(user_id: str, user_msg: str, assistant_msg: str):
    """Store conversation in Zep for memory."""
    if not zep_client:
        return

    try:
        # Add to user's graph (creates user graph if doesn't exist)
        zep_client.graph.add(
            user_id=user_id,
            type="message",
            data=f"User asked: {user_msg}\nAssistant answered: {assistant_msg}"
        )
        print(f"Zep: Stored conversation for user {user_id[:8]}...")
    except Exception as e:
        print(f"Zep add error: {e}")


# ============================================================================
# EACH-WAY CALCULATION LOGIC
# ============================================================================

# Each-way terms (place odds fraction)
EACH_WAY_TERMS = {
    "1/4": 0.25,
    "1/5": 0.2,
    "1/6": 1/6,
    "1/8": 0.125
}

# Standard horse racing place rules
HORSE_RACING_RULES = [
    {"runners": "2-4", "places": 1, "terms": "1/4", "description": "Win only"},
    {"runners": "5-7", "places": 2, "terms": "1/4", "description": "1st & 2nd at 1/4 odds"},
    {"runners": "8+", "places": 3, "terms": "1/5", "description": "1st, 2nd & 3rd at 1/5 odds"},
    {"runners": "12-15 handicap", "places": 3, "terms": "1/4", "description": "1st, 2nd & 3rd at 1/4 odds"},
    {"runners": "16+ handicap", "places": 4, "terms": "1/4", "description": "1st-4th at 1/4 odds"},
]


def fractional_to_decimal(numerator: int, denominator: int) -> float:
    """Convert fractional odds to decimal."""
    return numerator / denominator + 1


def decimal_to_fractional(decimal: float) -> str:
    """Convert decimal odds to fractional string."""
    fraction = decimal - 1

    # Common fractions lookup
    common = {
        0.5: "1/2", 0.25: "1/4", 0.2: "1/5", 0.33: "1/3",
        1.0: "Evens", 2.0: "2/1", 3.0: "3/1", 4.0: "4/1",
        5.0: "5/1", 6.0: "6/1", 7.0: "7/1", 8.0: "8/1",
        9.0: "9/1", 10.0: "10/1", 1.5: "3/2", 2.5: "5/2"
    }

    key = round(fraction, 2)
    if key in common:
        return common[key]

    # Approximate
    for d in range(1, 11):
        n = round(fraction * d)
        if abs(fraction - n/d) < 0.01:
            return f"{n}/{d}"
    return f"{fraction:.2f}/1"


def calculate_each_way(
    stake: float,
    odds_numerator: int,
    odds_denominator: int,
    each_way_terms: str = "1/4",
    number_of_places: int = 3,
    outcome: str = "won"
) -> dict:
    """
    Calculate each-way bet returns.

    Args:
        stake: Stake per part in GBP (total stake = stake * 2)
        odds_numerator: Numerator of fractional odds (e.g., 5 for 5/1)
        odds_denominator: Denominator of fractional odds (e.g., 1 for 5/1)
        each_way_terms: Place odds fraction ('1/4', '1/5', '1/6', '1/8')
        number_of_places: How many places pay out (2, 3, 4, 5)
        outcome: 'won', 'placed', or 'lost'

    Returns:
        Dict with all calculation details
    """
    # Total stake
    total_stake = stake * 2

    # Win odds
    win_odds_decimal = fractional_to_decimal(odds_numerator, odds_denominator)
    win_odds_fractional = f"{odds_numerator}/{odds_denominator}"

    # Place odds
    ew_fraction = EACH_WAY_TERMS.get(each_way_terms, 0.25)
    place_odds_decimal = (win_odds_decimal - 1) * ew_fraction + 1
    place_odds_fractional = decimal_to_fractional(place_odds_decimal)

    # Returns if WON (both parts pay)
    win_bet_return = stake * win_odds_decimal
    win_bet_profit = win_bet_return - stake
    place_bet_return_if_won = stake * place_odds_decimal
    place_bet_profit_if_won = place_bet_return_if_won - stake
    total_return_if_won = win_bet_return + place_bet_return_if_won
    total_profit_if_won = total_return_if_won - total_stake

    # Returns if PLACED ONLY
    place_bet_return_if_placed = stake * place_odds_decimal
    place_bet_profit_if_placed = place_bet_return_if_placed - stake
    total_return_if_placed = place_bet_return_if_placed
    total_profit_if_placed = total_return_if_placed - total_stake

    # Actual result based on outcome
    if outcome == "won":
        actual_return = total_return_if_won
        actual_profit = total_profit_if_won
    elif outcome == "placed":
        actual_return = total_return_if_placed
        actual_profit = total_profit_if_placed
    else:  # lost
        actual_return = 0
        actual_profit = -total_stake

    return {
        "stake_per_part": stake,
        "total_stake": total_stake,
        "win_odds": win_odds_fractional,
        "win_odds_decimal": round(win_odds_decimal, 2),
        "place_odds": place_odds_fractional,
        "place_odds_decimal": round(place_odds_decimal, 2),
        "each_way_terms": each_way_terms,
        "places_paying": number_of_places,
        "return_if_won": round(total_return_if_won, 2),
        "profit_if_won": round(total_profit_if_won, 2),
        "return_if_placed": round(total_return_if_placed, 2),
        "profit_if_placed": round(total_profit_if_placed, 2),
        "total_loss": round(total_stake, 2),
        "actual_return": round(actual_return, 2),
        "actual_profit": round(actual_profit, 2),
        "outcome": outcome,
        "breakdown": {
            "win_bet": {
                "stake": stake,
                "odds": win_odds_fractional,
                "return_if_wins": round(win_bet_return, 2),
                "profit_if_wins": round(win_bet_profit, 2)
            },
            "place_bet": {
                "stake": stake,
                "odds": place_odds_fractional,
                "return_if_places": round(place_bet_return_if_won, 2),
                "profit_if_places": round(place_bet_profit_if_won, 2)
            }
        }
    }


def compare_each_way_vs_win(
    stake: float,
    odds_numerator: int,
    odds_denominator: int,
    each_way_terms: str = "1/4",
    number_of_places: int = 3
) -> dict:
    """Compare each-way bet vs win-only bet with same total stake."""
    ew_result = calculate_each_way(stake, odds_numerator, odds_denominator, each_way_terms, number_of_places)

    # Win only with same total stake
    win_only_stake = stake * 2
    win_odds_decimal = fractional_to_decimal(odds_numerator, odds_denominator)
    win_only_return = win_only_stake * win_odds_decimal
    win_only_profit = win_only_return - win_only_stake

    return {
        "total_stake": ew_result["total_stake"],
        "odds": f"{odds_numerator}/{odds_denominator}",
        "each_way": {
            "return_if_won": ew_result["return_if_won"],
            "profit_if_won": ew_result["profit_if_won"],
            "return_if_placed": ew_result["return_if_placed"],
            "profit_if_placed": ew_result["profit_if_placed"],
            "loss": ew_result["total_loss"]
        },
        "win_only": {
            "stake": win_only_stake,
            "return_if_won": round(win_only_return, 2),
            "profit_if_won": round(win_only_profit, 2),
            "return_if_placed": 0,
            "profit_if_placed": -win_only_stake,
            "loss": win_only_stake
        }
    }


# ============================================================================
# PYDANTIC AI AGENT
# ============================================================================

class UserProfile(BaseModel):
    """User profile for personalization."""
    id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None


class AppState(BaseModel):
    """Shared state between frontend and agent."""
    current_stake: float = 10
    current_odds: str = "5/1"
    current_terms: str = "1/4"
    current_places: int = 3
    last_calculation: Optional[dict] = None
    user: Optional[UserProfile] = None
    zep_context: str = ""


# Create the agent
agent = Agent(
    model=GoogleModel('gemini-2.0-flash'),
    deps_type=StateDeps[AppState]
)


@agent.system_prompt
async def dynamic_system_prompt(ctx: RunContext[StateDeps[AppState]]) -> str:
    """Build system prompt with user context."""
    state = ctx.deps.state

    # Build user context section
    user_section = ""
    if state.user and state.user.name:
        user_section = f"""
## USER CONTEXT
- **Name**: {state.user.name}
- **User ID**: {state.user.id or 'Unknown'}
When greeting or addressing the user, use their name: {state.user.name}
"""

    # Build Zep memory section
    memory_section = ""
    if state.zep_context:
        memory_section = f"""
## MEMORY (What I know about this user)
{state.zep_context}
Use this context to personalize your responses.
"""

    return f"""You are an expert each-way betting assistant. Help users understand each-way betting and calculate their potential returns.
{user_section}
{memory_section}

## KEY KNOWLEDGE

### What is an Each-Way Bet?
- An each-way bet is TWO bets in one: a WIN bet and a PLACE bet
- The total stake is DOUBLED (e.g., £10 each-way = £20 total)
- If the selection WINS: both win and place bets pay out
- If the selection PLACES only: only the place bet pays out
- If the selection LOSES: you lose the entire stake

### Place Odds
- Place bets pay at a fraction of the win odds
- 1/4 odds: Common for 5-7 runners
- 1/5 odds: Common for 8+ runners
- 1/4 odds: Handicaps with 12+ runners

### Standard Horse Racing Terms
- 5-7 runners: 2 places at 1/4 odds
- 8+ runners: 3 places at 1/5 odds
- 12-15 handicap: 3 places at 1/4 odds
- 16+ handicap: 4 places at 1/4 odds

## TOOLS AVAILABLE

### Calculation Tools
- `calculate_each_way_bet`: Calculate each-way returns
- `compare_each_way_vs_win_only`: Compare E/W vs win-only bet
- `explain_each_way_terms`: Explain how each-way betting works

### User Profile & Memory Tools
- `get_user_profile`: Get user's saved preferences
- `save_user_preference`: Save betting preferences
- `get_zep_memory`: Get what you remember about the user

## BEHAVIOR

### When calculating:
1. Ask for stake and odds if not provided
2. Use calculate_each_way_bet immediately when you have the info
3. Always explain both WIN and PLACE scenarios clearly
4. Mention if they'll profit or lose overall if just placed

### Example response format:
"For a £10 each-way bet at 5/1 (1/4 odds, 3 places):
- Total stake: £20
- If WINS: Return £82.50, Profit £62.50
- If PLACES: Return £22.50, Loss £7.50 overall
- If LOSES: Loss £20"

### Important:
- Be concise and clear
- Always mention the total stake (doubled)
- Use the user's name when you know it
- Remind users to gamble responsibly
"""


@agent.tool
async def calculate_each_way_bet(
    ctx: RunContext[StateDeps[AppState]],
    stake: float,
    odds_numerator: int,
    odds_denominator: int,
    each_way_terms: str = "1/4",
    number_of_places: int = 3,
    outcome: str = "won"
) -> dict:
    """
    Calculate each-way bet returns.

    Args:
        stake: Stake per part in GBP (e.g., 10 means £10 each way = £20 total)
        odds_numerator: Numerator of fractional odds (e.g., 5 for 5/1)
        odds_denominator: Denominator of fractional odds (e.g., 1 for 5/1, 2 for 5/2)
        each_way_terms: Place odds fraction: '1/4', '1/5', '1/6', or '1/8'
        number_of_places: How many places pay out (2, 3, 4, or 5)
        outcome: 'won', 'placed', or 'lost' (for actual result)

    Returns:
        Full calculation with returns for all scenarios
    """
    result = calculate_each_way(
        stake, odds_numerator, odds_denominator,
        each_way_terms, number_of_places, outcome
    )

    # Update state
    ctx.deps.state.current_stake = stake
    ctx.deps.state.current_odds = f"{odds_numerator}/{odds_denominator}"
    ctx.deps.state.current_terms = each_way_terms
    ctx.deps.state.current_places = number_of_places
    ctx.deps.state.last_calculation = result

    return result


@agent.tool
async def compare_each_way_vs_win_only(
    ctx: RunContext[StateDeps[AppState]],
    stake: float,
    odds_numerator: int,
    odds_denominator: int,
    each_way_terms: str = "1/4",
    number_of_places: int = 3
) -> dict:
    """
    Compare each-way bet vs win-only bet with same total stake.

    Args:
        stake: Stake per part for E/W (total compared = stake * 2)
        odds_numerator: Numerator of fractional odds
        odds_denominator: Denominator of fractional odds
        each_way_terms: Place odds fraction
        number_of_places: How many places pay out

    Returns:
        Side-by-side comparison of E/W vs win-only
    """
    return compare_each_way_vs_win(
        stake, odds_numerator, odds_denominator,
        each_way_terms, number_of_places
    )


@agent.tool
async def explain_each_way_terms(ctx: RunContext[StateDeps[AppState]]) -> dict:
    """
    Explain how each-way betting works and standard terms.
    Call this when user asks about each-way betting basics.

    Returns:
        Detailed explanation of each-way betting
    """
    return {
        "explanation": """EACH-WAY BETTING EXPLAINED:

An each-way bet is TWO bets in one:
1. A WIN bet - your selection must WIN
2. A PLACE bet - your selection must finish in the places

Your total stake is DOUBLED. £10 each-way = £20 total.

PLACE ODDS:
- 1/4 odds means place pays 25% of win odds
- 1/5 odds means place pays 20% of win odds

EXAMPLE: £10 E/W at 5/1 (1/4 odds):
- Total stake: £20
- Win odds: 5/1 (decimal 6.0)
- Place odds: 5/4 (decimal 2.25)

If WINS:
- Win bet: £10 × 6.0 = £60
- Place bet: £10 × 2.25 = £22.50
- Total: £82.50 (£62.50 profit)

If PLACES only:
- Win bet: £0 (loses)
- Place bet: £10 × 2.25 = £22.50
- Total: £22.50 (£7.50 loss overall)

If LOSES:
- Total: £0 (£20 loss)""",
        "horse_racing_terms": HORSE_RACING_RULES,
        "terms_fractions": EACH_WAY_TERMS
    }


# ============================================================================
# USER PROFILE & MEMORY TOOLS
# ============================================================================

@agent.tool
async def get_user_profile(ctx: RunContext[StateDeps[AppState]]) -> dict:
    """
    Get the current user's profile and preferences.
    Call this when user asks 'what do you know about me'.
    """
    state = ctx.deps.state
    user = state.user

    if not user or not user.id:
        return {"logged_in": False, "message": "User is not logged in."}

    profile = {
        "logged_in": True,
        "user_id": user.id,
        "name": user.name or "Unknown",
        "preferences": {},
        "zep_facts": []
    }

    # Fetch from database if available
    if DATABASE_URL:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            cur.execute("""
                SELECT item_type, value FROM user_profile_items
                WHERE user_id = %s ORDER BY created_at DESC
            """, (user.id,))
            items = cur.fetchall()
            for item_type, value in items:
                profile["preferences"][item_type] = value
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[TOOL] get_user_profile error: {e}", file=sys.stderr)

    # Fetch Zep facts
    if zep_client and user.id:
        try:
            context = zep_client.user.get_context(user.id, min_score=0.5)
            if context and context.facts:
                profile["zep_facts"] = [f.fact for f in context.facts[:5]]
        except Exception as e:
            print(f"[TOOL] get_user_profile Zep error: {e}", file=sys.stderr)

    return profile


@agent.tool
async def save_user_preference(
    ctx: RunContext[StateDeps[AppState]],
    preference_type: str,
    value: str
) -> dict:
    """
    Save a user preference.

    Args:
        preference_type: 'default_stake', 'preferred_terms', 'favorite_sport'
        value: The value to save

    Returns:
        Confirmation
    """
    state = ctx.deps.state
    user = state.user

    if not user or not user.id:
        return {"saved": False, "message": "User not logged in."}

    if not DATABASE_URL:
        return {"saved": False, "message": "Database not configured"}

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO user_profile_items (user_id, item_type, value, confirmed)
            VALUES (%s, %s, %s, TRUE)
            ON CONFLICT (user_id, item_type, value) DO UPDATE SET updated_at = NOW()
        """, (user.id, preference_type, value))
        conn.commit()
        cur.close()
        conn.close()
        return {"saved": True, "preference": preference_type, "value": value}
    except Exception as e:
        print(f"[TOOL] save_user_preference error: {e}", file=sys.stderr)
        return {"saved": False, "error": str(e)}


@agent.tool
async def get_zep_memory(ctx: RunContext[StateDeps[AppState]]) -> dict:
    """
    Get what the AI remembers about the user.
    Call this when user asks 'what do you remember'.
    """
    state = ctx.deps.state
    user = state.user

    if not user or not user.id:
        return {"has_memory": False, "message": "Sign in to enable memory."}

    if not zep_client:
        return {"has_memory": False, "message": "Memory not configured."}

    try:
        context = zep_client.user.get_context(user.id, min_score=0.3)
        if context and context.facts:
            facts = [{"fact": f.fact, "score": f.score} for f in context.facts[:10]]
            return {"has_memory": True, "facts": facts}
        return {"has_memory": True, "facts_count": 0, "message": "No memories yet."}
    except Exception as e:
        return {"has_memory": False, "error": str(e)}


# ============================================================================
# FASTAPI APP WITH AG-UI AND CLM ENDPOINTS
# ============================================================================

main_app = FastAPI(title="Each-Way Calculator Agent")

main_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ag_ui_app = agent.to_ag_ui(deps=StateDeps(AppState()))

_last_clm_request = {}


@main_app.get("/")
async def health():
    return {
        "status": "ok",
        "service": "each-way-calculator-agent",
        "endpoints": ["/agui/", "/chat/completions", "/user", "/debug"],
        "zep_enabled": zep_client is not None
    }


@main_app.get("/debug")
async def debug_endpoint():
    return _last_clm_request


@main_app.post("/user")
async def register_user(request: Request):
    """Register or update a user in Zep."""
    if not zep_client:
        return {"status": "zep_not_configured"}

    try:
        body = await request.json()
        user_id = body.get("user_id")
        email = body.get("email")
        name = body.get("name")

        if not user_id:
            return {"error": "user_id required"}, 400

        user = await get_or_create_zep_user(user_id, email, name)
        return {"status": "ok", "user_id": user_id, "zep_user": user is not None}
    except Exception as e:
        return {"error": str(e)}


# ============================================================================
# CLM ENDPOINT FOR HUME VOICE
# ============================================================================

def extract_session_id(request: Request, body: dict) -> Optional[str]:
    session_id = body.get("custom_session_id") or body.get("customSessionId") or body.get("session_id")
    if session_id:
        return session_id

    metadata = body.get("metadata", {})
    session_id = metadata.get("custom_session_id") or metadata.get("session_id")
    if session_id:
        return session_id

    for header in ["x-hume-session-id", "x-custom-session-id", "x-session-id"]:
        session_id = request.headers.get(header)
        if session_id:
            return session_id

    return None


def parse_session_id(session_id: Optional[str]) -> dict:
    if not session_id:
        return {"user_name": "", "user_id": ""}

    if session_id.startswith("anon_"):
        return {"user_name": "", "user_id": ""}

    parts = session_id.split("|")
    user_name = parts[0] if len(parts) > 0 else ""
    user_id = parts[1] if len(parts) > 1 else ""

    return {"user_name": user_name, "user_id": user_id}


def extract_user_from_messages(messages: list) -> dict:
    import re
    user_name = ""
    user_id = ""

    for msg in messages:
        if msg.get("role") == "system":
            content = msg.get("content", "")
            if isinstance(content, str):
                match = re.search(r'\b(?:first_name|name):\s*(\w+)', content, re.IGNORECASE)
                if match and match.group(1).lower() not in ['unknown', 'none', '']:
                    user_name = match.group(1)

                match = re.search(r'\b(?:user_id|id):\s*([^\s,\n]+)', content, re.IGNORECASE)
                if match and match.group(1).lower() not in ['unknown', 'none', 'anonymous', '']:
                    user_id = match.group(1)

    return {"user_name": user_name, "user_id": user_id}


async def stream_sse_response(content: str, msg_id: str):
    import asyncio
    words = content.split(' ')
    for i, word in enumerate(words):
        chunk = {
            "id": msg_id,
            "object": "chat.completion.chunk",
            "choices": [{
                "index": 0,
                "delta": {"content": word + (' ' if i < len(words) - 1 else '')},
                "finish_reason": None
            }]
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0.01)

    yield f"data: {json.dumps({'id': msg_id, 'choices': [{'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
    yield "data: [DONE]\n\n"


async def run_agent_for_clm(user_message: str, state: AppState, conversation_history: list = None) -> str:
    try:
        from pydantic_ai.messages import ModelRequest, UserPromptPart, ModelResponse, TextPart

        deps = StateDeps(state)
        message_history = []

        if conversation_history:
            for msg in conversation_history[:-1]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if isinstance(content, str) and content.strip():
                    if role == "user":
                        message_history.append(ModelRequest(parts=[UserPromptPart(content=content)]))
                    elif role == "assistant":
                        message_history.append(ModelResponse(parts=[TextPart(content=content)]))

        result = await agent.run(
            user_message,
            deps=deps,
            message_history=message_history if message_history else None
        )

        if hasattr(result, 'data') and result.data:
            return str(result.data)
        elif hasattr(result, 'output'):
            return str(result.output)
        else:
            return str(result)

    except Exception as e:
        print(f"[CLM] Agent error: {e}", file=sys.stderr)
        return ""


@main_app.post("/chat/completions")
async def clm_endpoint(request: Request):
    """OpenAI-compatible CLM endpoint for Hume EVI voice."""
    import asyncio
    import time

    global _last_clm_request

    try:
        body = await request.json()
        messages = body.get("messages", [])

        _last_clm_request = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "body_keys": list(body.keys()),
            "messages": [{"role": m.get("role"), "content_preview": str(m.get("content", ""))[:200]} for m in messages]
        }

        session_id = extract_session_id(request, body)
        parsed = parse_session_id(session_id)
        user_name = parsed["user_name"]
        user_id = parsed["user_id"]

        if not user_name or not user_id:
            msg_parsed = extract_user_from_messages(messages)
            if not user_name and msg_parsed["user_name"]:
                user_name = msg_parsed["user_name"]
            if not user_id and msg_parsed["user_id"]:
                user_id = msg_parsed["user_id"]

        user_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_msg = msg.get("content", "")
                break

        if not user_msg:
            user_msg = "Hello"

        zep_context = ""
        if user_id and zep_client:
            try:
                await get_or_create_zep_user(user_id, None, user_name)
                zep_context = await get_user_context(user_id)
            except Exception as e:
                print(f"[CLM] Zep error: {e}", file=sys.stderr)

        user_profile = UserProfile(
            id=user_id if user_id else None,
            name=user_name if user_name else None,
        ) if user_id or user_name else None

        state = AppState(
            current_stake=10,
            current_odds="5/1",
            current_terms="1/4",
            current_places=3,
            last_calculation=None,
            user=user_profile,
            zep_context=zep_context
        )

        response_text = await run_agent_for_clm(user_msg, state, conversation_history=messages)

        if not response_text:
            if user_name:
                response_text = f"Hi {user_name}! I can help you calculate each-way bet returns. What's your stake and odds?"
            else:
                response_text = "Hi! I can help you calculate each-way bet returns. Tell me your stake and odds."

        if user_id and zep_client and user_msg:
            asyncio.create_task(add_conversation_to_zep(user_id, user_msg, response_text))

        msg_id = f"clm-{hash(user_msg) % 100000}"
        return StreamingResponse(
            stream_sse_response(response_text, msg_id),
            media_type="text/event-stream"
        )

    except Exception as e:
        print(f"[CLM] ERROR: {e}", file=sys.stderr)
        error_response = "Sorry, I encountered an error. Please try again."
        return StreamingResponse(
            stream_sse_response(error_response, "error"),
            media_type="text/event-stream"
        )


main_app.mount("/agui", ag_ui_app)
app = main_app
