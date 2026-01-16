"""
UK Stamp Duty Calculator Agent
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

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize Zep client
ZEP_API_KEY = os.environ.get("ZEP_API_KEY")
ZEP_GRAPH_ID = "stamp_duty_calculator"
zep_client = Zep(api_key=ZEP_API_KEY) if ZEP_API_KEY else None

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
# STAMP DUTY CALCULATION LOGIC
# ============================================================================

# England/NI SDLT Rates (2024/25)
ENGLAND_STANDARD_BANDS = [
    (250000, 0.0),      # 0% up to £250,000
    (925000, 0.05),     # 5% £250,001 to £925,000
    (1500000, 0.10),    # 10% £925,001 to £1,500,000
    (float('inf'), 0.12) # 12% above £1,500,000
]

ENGLAND_FIRST_TIME_BANDS = [
    (425000, 0.0),      # 0% up to £425,000 (first-time buyers)
    (625000, 0.05),     # 5% £425,001 to £625,000
]

ENGLAND_ADDITIONAL_SURCHARGE = 0.05  # 5% surcharge on additional properties (increased from 3%)

# Scotland LBTT Rates
SCOTLAND_STANDARD_BANDS = [
    (145000, 0.0),      # 0% up to £145,000
    (250000, 0.02),     # 2% £145,001 to £250,000
    (325000, 0.05),     # 5% £250,001 to £325,000
    (750000, 0.10),     # 10% £325,001 to £750,000
    (float('inf'), 0.12) # 12% above £750,000
]

SCOTLAND_FIRST_TIME_BANDS = [
    (175000, 0.0),      # 0% up to £175,000 (first-time buyers)
    (250000, 0.02),
    (325000, 0.05),
    (750000, 0.10),
    (float('inf'), 0.12)
]

SCOTLAND_ADS = 0.06  # Additional Dwelling Supplement

# Wales LTT Rates
WALES_STANDARD_BANDS = [
    (225000, 0.0),      # 0% up to £225,000
    (400000, 0.06),     # 6% £225,001 to £400,000
    (750000, 0.075),    # 7.5% £400,001 to £750,000
    (1500000, 0.10),    # 10% £750,001 to £1,500,000
    (float('inf'), 0.12) # 12% above £1,500,000
]

WALES_HIGHER_RATES_SURCHARGE = 0.04  # 4% surcharge for additional properties


def calculate_stamp_duty(
    price: float,
    region: str,
    buyer_type: str
) -> dict:
    """
    Calculate UK stamp duty based on price, region, and buyer type.

    Args:
        price: Property purchase price in GBP
        region: 'england', 'scotland', or 'wales'
        buyer_type: 'standard', 'first-time', or 'additional'

    Returns:
        Dict with total_tax, effective_rate, and breakdown
    """
    region = region.lower()
    buyer_type = buyer_type.lower()

    # Select appropriate bands and surcharge
    if region == 'england':
        if buyer_type == 'first-time' and price <= 625000:
            bands = ENGLAND_FIRST_TIME_BANDS
            surcharge = 0.0
        elif buyer_type == 'additional':
            bands = ENGLAND_STANDARD_BANDS
            surcharge = ENGLAND_ADDITIONAL_SURCHARGE
        else:
            bands = ENGLAND_STANDARD_BANDS
            surcharge = 0.0

    elif region == 'scotland':
        if buyer_type == 'first-time':
            bands = SCOTLAND_FIRST_TIME_BANDS
            surcharge = 0.0
        elif buyer_type == 'additional':
            bands = SCOTLAND_STANDARD_BANDS
            surcharge = SCOTLAND_ADS
        else:
            bands = SCOTLAND_STANDARD_BANDS
            surcharge = 0.0

    elif region == 'wales':
        # Wales doesn't have first-time buyer relief
        bands = WALES_STANDARD_BANDS
        surcharge = WALES_HIGHER_RATES_SURCHARGE if buyer_type == 'additional' else 0.0

    else:
        return {"error": f"Unknown region: {region}. Use 'england', 'scotland', or 'wales'."}

    # Calculate tax for each band
    breakdown = []
    total_tax = 0.0
    previous_threshold = 0

    for threshold, rate in bands:
        if price > previous_threshold:
            taxable_in_band = min(price, threshold) - previous_threshold
            if taxable_in_band > 0:
                effective_rate = rate + surcharge
                tax_in_band = taxable_in_band * effective_rate
                total_tax += tax_in_band

                breakdown.append({
                    "band": f"£{previous_threshold:,.0f} - £{threshold:,.0f}" if threshold != float('inf') else f"Above £{previous_threshold:,.0f}",
                    "rate": f"{effective_rate * 100:.1f}%",
                    "taxable_amount": taxable_in_band,
                    "tax_due": tax_in_band
                })

        previous_threshold = threshold
        if price <= threshold:
            break

    effective_rate = (total_tax / price * 100) if price > 0 else 0

    return {
        "purchase_price": price,
        "region": region.title(),
        "buyer_type": buyer_type.replace('-', ' ').title(),
        "total_tax": round(total_tax, 2),
        "effective_rate": round(effective_rate, 2),
        "breakdown": breakdown
    }


# ============================================================================
# PYDANTIC AI AGENT
# ============================================================================

class AppState(BaseModel):
    """Shared state between frontend and agent."""
    current_price: float = 0
    current_region: str = "england"
    current_buyer_type: str = "standard"
    last_calculation: Optional[dict] = None


# Create the agent
agent = Agent(
    model=GoogleModel('gemini-2.0-flash'),
    deps_type=StateDeps[AppState]
)


@agent.system_prompt
async def base_system_prompt() -> str:
    return """You are an expert UK stamp duty assistant. Help users understand their stamp duty obligations when buying property in the UK.

## KEY KNOWLEDGE
- **England & Northern Ireland**: SDLT (Stamp Duty Land Tax)
  - Standard: 0% up to £250k, 5% to £925k, 10% to £1.5M, 12% above
  - First-time buyers: 0% up to £425k, 5% to £625k (only if total price ≤ £625k)
  - Additional properties: +5% surcharge on all bands

- **Scotland**: LBTT (Land and Buildings Transaction Tax)
  - Standard: 0% to £145k, 2% to £250k, 5% to £325k, 10% to £750k, 12% above
  - First-time buyers: 0% to £175k, then standard rates
  - Additional properties: +6% ADS (Additional Dwelling Supplement)

- **Wales**: LTT (Land Transaction Tax)
  - Standard: 0% to £225k, 6% to £400k, 7.5% to £750k, 10% to £1.5M, 12% above
  - NO first-time buyer relief in Wales
  - Additional properties: +4% surcharge

## TOOLS AVAILABLE
- `calculate_stamp_duty`: Calculate stamp duty for a specific scenario
- `compare_buyer_types`: Compare costs across different buyer types

## BEHAVIOR
1. When user mentions a price/location, use calculate_stamp_duty immediately
2. Always explain the breakdown clearly
3. Offer to compare scenarios (e.g., "Want to see what you'd pay as a first-time buyer?")
4. Be concise but accurate
5. Mention important caveats (e.g., first-time buyer limits)
"""


@agent.tool
async def calculate_stamp_duty_tool(
    ctx: RunContext[StateDeps[AppState]],
    purchase_price: float,
    region: str,
    buyer_type: str
) -> dict:
    """
    Calculate UK stamp duty for a property purchase.

    Args:
        purchase_price: Property price in GBP (pounds)
        region: 'england' (includes NI), 'scotland', or 'wales'
        buyer_type: 'standard', 'first-time', or 'additional'

    Returns:
        Calculation result with total tax, effective rate, and breakdown
    """
    result = calculate_stamp_duty(purchase_price, region, buyer_type)

    # Update state
    ctx.deps.state.current_price = purchase_price
    ctx.deps.state.current_region = region
    ctx.deps.state.current_buyer_type = buyer_type
    ctx.deps.state.last_calculation = result

    return result


@agent.tool
async def compare_buyer_types(
    ctx: RunContext[StateDeps[AppState]],
    purchase_price: float,
    region: str
) -> dict:
    """
    Compare stamp duty across all buyer types for a given price and region.

    Args:
        purchase_price: Property price in GBP
        region: 'england', 'scotland', or 'wales'

    Returns:
        Comparison of standard, first-time, and additional property costs
    """
    buyer_types = ['standard', 'first-time', 'additional']
    comparisons = []

    for bt in buyer_types:
        result = calculate_stamp_duty(purchase_price, region, bt)
        comparisons.append({
            "buyer_type": bt.replace('-', ' ').title(),
            "total_tax": result["total_tax"],
            "effective_rate": result["effective_rate"]
        })

    # Calculate savings
    standard_tax = comparisons[0]["total_tax"]
    first_time_tax = comparisons[1]["total_tax"]
    savings = standard_tax - first_time_tax if first_time_tax < standard_tax else 0

    return {
        "purchase_price": purchase_price,
        "region": region.title(),
        "comparisons": comparisons,
        "first_time_buyer_savings": savings
    }


# ============================================================================
# FASTAPI APP WITH AG-UI AND CLM ENDPOINTS
# ============================================================================

# Create main FastAPI app
main_app = FastAPI(title="Stamp Duty Calculator Agent")

# Add CORS middleware
main_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create AG-UI app from agent
ag_ui_app = agent.to_ag_ui(deps=StateDeps(AppState()))


# Health check
@main_app.get("/")
async def health():
    return {
        "status": "ok",
        "service": "stamp-duty-calculator-agent",
        "endpoints": ["/agui/", "/chat/completions", "/user"],
        "zep_enabled": zep_client is not None
    }


# User registration endpoint for frontend
@main_app.post("/user")
async def register_user(request: Request):
    """Register or update a user in Zep for memory tracking."""
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
        return {
            "status": "ok",
            "user_id": user_id,
            "zep_user": user is not None
        }
    except Exception as e:
        return {"error": str(e)}


# ============================================================================
# CLM ENDPOINT FOR HUME VOICE
# ============================================================================

def extract_session_id(request: Request, body: dict) -> Optional[str]:
    """Extract session ID from various sources (Hume sends it in body)."""
    # Check body first (Hume's primary method)
    session_id = body.get("custom_session_id") or body.get("customSessionId") or body.get("session_id")
    if session_id:
        return session_id

    # Check metadata
    metadata = body.get("metadata", {})
    session_id = metadata.get("custom_session_id") or metadata.get("session_id")
    if session_id:
        return session_id

    # Check headers as fallback
    for header in ["x-hume-session-id", "x-custom-session-id", "x-session-id"]:
        session_id = request.headers.get(header)
        if session_id:
            return session_id

    return None


def parse_session_id(session_id: Optional[str]) -> dict:
    """
    Parse custom session ID format: "userName|userId"
    Returns dict with user_name and user_id.
    """
    if not session_id:
        return {"user_name": "", "user_id": ""}

    # Handle anonymous sessions
    if session_id.startswith("anon_"):
        return {"user_name": "", "user_id": ""}

    parts = session_id.split("|")
    user_name = parts[0] if len(parts) > 0 else ""
    user_id = parts[1] if len(parts) > 1 else ""

    return {"user_name": user_name, "user_id": user_id}


async def stream_sse_response(content: str, msg_id: str):
    """Stream OpenAI-compatible SSE chunks for Hume."""
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
        await asyncio.sleep(0.01)  # Small delay for natural streaming

    # Final chunk
    yield f"data: {json.dumps({'id': msg_id, 'choices': [{'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
    yield "data: [DONE]\n\n"


@main_app.post("/chat/completions")
async def clm_endpoint(request: Request):
    """OpenAI-compatible endpoint for Hume EVI voice interface with Zep memory."""
    import asyncio
    import re

    try:
        body = await request.json()
        messages = body.get("messages", [])

        # DEBUG: Log session info
        print(f"[CLM] === REQUEST DEBUG ===", file=sys.stderr)
        print(f"[CLM] body keys: {list(body.keys())}", file=sys.stderr)
        print(f"[CLM] custom_session_id: {body.get('custom_session_id')}", file=sys.stderr)
        print(f"[CLM] customSessionId: {body.get('customSessionId')}", file=sys.stderr)

        # Extract session ID (format: "userName|userId")
        session_id = extract_session_id(request, body)
        print(f"[CLM] Extracted session_id: {session_id}", file=sys.stderr)

        parsed = parse_session_id(session_id)
        user_name = parsed["user_name"]
        user_id = parsed["user_id"]
        print(f"[CLM] Parsed: name={user_name}, id={user_id}", file=sys.stderr)

        # Extract user message
        user_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_msg = msg.get("content", "")
                break

        if not user_msg:
            user_msg = "Hello"

        print(f"[CLM] User message: {user_msg[:80]}...", file=sys.stderr)

        # Get user context from Zep
        user_context = ""
        if user_id and zep_client:
            try:
                await get_or_create_zep_user(user_id, None, user_name)
                user_context = await get_user_context(user_id)
                print(f"[CLM] Zep context: {user_context[:100]}..." if user_context else "[CLM] No Zep context", file=sys.stderr)
            except Exception as e:
                print(f"[CLM] Zep error: {e}", file=sys.stderr)

        # Handle "what is my name" question directly
        user_lower = user_msg.lower()
        if any(phrase in user_lower for phrase in ['my name', 'who am i', "what's my name", 'do you know me']):
            if user_name:
                response_text = f"Your name is {user_name}! I remembered that from when you logged in."
            else:
                response_text = "I don't know your name yet. You can tell me, or sign in so I can remember you!"
            msg_id = f"clm-{hash(user_msg) % 100000}"
            return StreamingResponse(stream_sse_response(response_text, msg_id), media_type="text/event-stream")

        # Build personalized greeting
        greeting_name = f" {user_name}" if user_name else ""

        if any(word in user_lower for word in ['stamp duty', 'calculate', 'how much', 'what would', 'property']):
            response_text = f"I can help you calculate stamp duty{greeting_name}! Just tell me the property price, location (England, Scotland, or Wales), and whether you're a first-time buyer, and I'll work out exactly what you'll pay."
        elif any(word in user_lower for word in ['first-time', 'first time']):
            response_text = "First-time buyers can save significantly! In England, you pay no stamp duty on the first £425,000. In Scotland, it's the first £175,000. Wales unfortunately doesn't have first-time buyer relief."
        elif any(word in user_lower for word in ['additional', 'second home', 'buy to let']):
            response_text = "Additional properties attract surcharges - 5% in England and Northern Ireland, 6% in Scotland, and 4% in Wales. These apply on top of the standard rates from pound zero."
        elif any(word in user_lower for word in ['hello', 'hi', 'hey', 'speak your greeting']):
            if user_name:
                response_text = f"Hello {user_name}! Great to chat with you. I'm your UK stamp duty calculator assistant. What property are you looking at?"
            else:
                response_text = "Hello! I'm your UK stamp duty calculator assistant. I can help you work out stamp duty for England, Scotland, or Wales. What property are you looking at?"
        elif '£' in user_msg or any(char.isdigit() for char in user_msg):
            # Try to extract a number
            numbers = re.findall(r'[\d,]+', user_msg.replace('£', ''))
            if numbers:
                price = int(numbers[0].replace(',', ''))
                # Default calculation for England standard
                result = calculate_stamp_duty(price, 'england', 'standard')
                response_text = f"For a £{price:,} property in England, the stamp duty would be £{result['total_tax']:,.2f}. That's an effective rate of {result['effective_rate']}%. Would you like me to check Scotland or Wales rates, or see the first-time buyer discount?"
            else:
                response_text = "I'd be happy to help! Just tell me the property price and I'll calculate the stamp duty for you."
        else:
            response_text = "I'm here to help with UK stamp duty calculations. Tell me about the property you're interested in - the price and location - and I'll work out what you'll pay."

        msg_id = f"clm-{hash(user_msg) % 100000}"

        # Store conversation in Zep for memory (fire and forget)
        if user_id and zep_client:
            asyncio.create_task(add_conversation_to_zep(user_id, user_msg, response_text))

        return StreamingResponse(
            stream_sse_response(response_text, msg_id),
            media_type="text/event-stream"
        )

    except Exception as e:
        print(f"[CLM] ERROR: {e}", file=sys.stderr)
        error_response = f"Sorry, I encountered an error: {str(e)}"
        return StreamingResponse(
            stream_sse_response(error_response, "error"),
            media_type="text/event-stream"
        )


# Mount AG-UI app
main_app.mount("/agui", ag_ui_app)

# Export for uvicorn
app = main_app
