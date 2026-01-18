"use client";

import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { UserButton, SignedIn, SignedOut } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";
import EachWayCalculator from "@/components/EachWayCalculator";
import { VoiceInput } from "@/components/VoiceInput";
import {
  ReturnsBreakdown,
  OddsComparison,
  EachWayExplainer,
} from "@/components/charts";
import { useCallback, useState, useEffect, useMemo } from "react";
import { calculateEachWay, formatCurrency, HORSE_RACING_PLACE_RULES } from "@/lib/calculations";
import { BetDetails, EachWayTerms, OddsInput } from "@/lib/types";
import Image from "next/image";

const SYSTEM_PROMPT = `You are an expert each-way betting assistant. You help users understand each-way betting and calculate their potential returns.

Key information you know:
- An each-way bet is TWO bets in one: a win bet and a place bet
- The total stake is DOUBLED (e.g., £10 each-way = £20 total)
- Place bets pay at a fraction of the win odds (1/4 or 1/5 typically)

Standard horse racing terms:
- 5-7 runners: 2 places at 1/4 odds
- 8+ runners: 3 places at 1/5 odds
- 12-15 handicap: 3 places at 1/4 odds
- 16+ handicap: 4 places at 1/4 odds

When helping users:
1. Ask about their stake and odds if not provided
2. Clarify the each-way terms (1/4 or 1/5 odds)
3. Use the calculateEachWayBet action to compute returns
4. Explain both win and place scenarios clearly
5. Offer to compare different stakes or odds
6. Use explainEachWayTerms if they need to understand how E/W works

Always be helpful and explain things in plain English. Remember:
- If they WIN: both win and place bets pay out
- If they PLACE: only the place bet pays out (may still profit or lose overall)
- If they LOSE: they lose the entire stake`;

// FAQ Data
const FAQS = [
  {
    question: "What is an each-way bet?",
    answer:
      "An each-way bet is two bets in one: a WIN bet and a PLACE bet. You're betting on your selection to both win AND place (finish in the top positions). Your stake is doubled - so £10 each-way costs £20 total. If your selection wins, both bets pay out. If it places but doesn't win, only the place bet pays.",
  },
  {
    question: "How does an each way calculator work?",
    answer:
      "An each way calculator takes your stake, odds, place terms (1/4 or 1/5), and number of places to calculate three scenarios: returns if your selection wins, returns if it only places, and total loss if it loses. The calculator shows your total stake (doubled), win odds, place odds, and profit/loss for each outcome.",
  },
  {
    question: "What are the standard each-way terms for horse racing?",
    answer:
      "For horse racing: 5-7 runners pays 1st & 2nd at 1/4 odds. 8+ runners pays 1st, 2nd & 3rd at 1/5 odds. Handicaps with 12-15 runners pay 3 places at 1/4 odds. Handicaps with 16+ runners pay 4 places at 1/4 odds. These can vary by bookmaker and for enhanced each-way offers.",
  },
  {
    question: "Can I make a profit if my horse only places?",
    answer:
      "It depends on the odds. At shorter odds (like 2/1), you'll usually make a loss overall if your selection only places because the place return doesn't cover the lost win stake. At longer odds (like 8/1 or higher), you may still profit even if your selection only places, as the place return exceeds your total stake.",
  },
  {
    question: "Is each-way betting good value?",
    answer:
      "Each-way can be good value at longer odds (5/1+) in competitive races with many runners. It provides insurance if your selection is competitive but doesn't win. However, at short odds or in small fields, you're often better off just backing to win. The value depends on the specific odds and terms offered.",
  },
  {
    question: "What does 'each-way' mean in golf betting?",
    answer:
      "In golf, each-way bets typically pay out if your player finishes in the top 5 or top 8 (depending on the tournament), at 1/4 or 1/5 of the odds. This makes each-way particularly attractive in golf due to the large fields and unpredictable nature of the sport.",
  },
  {
    question: "How do I calculate my each-way returns manually?",
    answer:
      "For a £10 E/W at 5/1 (1/4 odds, 3 places): Win part: £10 x 6.0 = £60. Place part: £10 x 2.25 (5/4 +1) = £22.50. If WINS: £60 + £22.50 = £82.50 total (£62.50 profit). If PLACES: £22.50 return (£7.50 loss overall as you lose the £10 win stake). If LOSES: £0 (lose £20 total stake). Or use our free each way calculator above!",
  },
  {
    question: "What's the difference between 1/4 and 1/5 odds?",
    answer:
      "1/4 odds means the place bet pays 25% of the win odds, while 1/5 pays 20%. For example, at 10/1: with 1/4 terms you get 10/4 (2.5/1) place odds; with 1/5 terms you get 10/5 (2/1) place odds. 1/4 is better for the bettor as you get higher place odds.",
  },
  {
    question: "Why should I use an each way calculator before betting?",
    answer:
      "Using an each way calculator before placing your bet helps you understand exactly what you stand to win or lose. It shows whether you'll profit if your selection only places (not always the case at short odds), helps you compare different stakes and odds, and ensures you're making informed betting decisions.",
  },
  {
    question: "Do all bookmakers offer the same each-way terms?",
    answer:
      "No, each-way terms can vary between bookmakers. Some offer enhanced each-way terms as promotions, such as extra places or better odds fractions (1/4 instead of 1/5). Always check the specific terms your bookmaker is offering before placing an each-way bet.",
  },
];

// Common bet examples
const BET_EXAMPLES = [
  { stake: 5, odds: "3/1", terms: "1/4" as EachWayTerms, places: 2 },
  { stake: 10, odds: "5/1", terms: "1/4" as EachWayTerms, places: 3 },
  { stake: 10, odds: "8/1", terms: "1/5" as EachWayTerms, places: 3 },
  { stake: 20, odds: "10/1", terms: "1/4" as EachWayTerms, places: 4 },
  { stake: 10, odds: "16/1", terms: "1/5" as EachWayTerms, places: 3 },
  { stake: 25, odds: "20/1", terms: "1/4" as EachWayTerms, places: 4 },
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const { appendMessage } = useCopilotChat();
  const { data: session } = authClient.useSession();

  // State for interactive returns breakdown
  const [demoStake, setDemoStake] = useState(10);
  const [demoOddsNum, setDemoOddsNum] = useState(5);
  const [demoOddsDen, setDemoOddsDen] = useState(1);
  const [demoTerms, setDemoTerms] = useState<EachWayTerms>("1/4");
  const [demoPlaces, setDemoPlaces] = useState(3);

  const user = session?.user;
  const firstName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || null;

  // Calculate demo result
  const demoResult = useMemo(() => {
    const odds: OddsInput = {
      format: "fractional",
      fractionalNumerator: demoOddsNum,
      fractionalDenominator: demoOddsDen,
    };
    const bet: BetDetails = {
      stake: demoStake,
      odds,
      eachWayTerms: demoTerms,
      numberOfPlaces: demoPlaces,
      outcome: "won",
      raceType: "horse-racing",
    };
    return calculateEachWay(bet);
  }, [demoStake, demoOddsNum, demoOddsDen, demoTerms, demoPlaces]);

  // Register user with agent for Zep memory
  useEffect(() => {
    if (user?.id) {
      const agentUrl =
        process.env.NEXT_PUBLIC_AGENT_URL ||
        "https://each-way-agent-production.up.railway.app";
      fetch(`${agentUrl}/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          name: user.name,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("User registered with agent:", data))
        .catch((err) => console.log("Agent registration skipped:", err.message));
    }
  }, [user?.id, user?.email, user?.name]);

  const handleVoiceMessage = useCallback(
    (text: string, role?: "user" | "assistant") => {
      setSidebarOpen(true);
      setVoiceMessage(text);
      const messageRole = role === "assistant" ? Role.Assistant : Role.User;
      appendMessage(new TextMessage({ content: text, role: messageRole }));
      setTimeout(() => setVoiceMessage(""), 5000);
    },
    [appendMessage]
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <section className="relative w-full py-16 px-4 gradient-hero border-b border-slate-700/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Free Online Tool
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Each Way Calculator
                <span className="text-emerald-400"> UK</span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mb-6">
                The most comprehensive free <strong className="text-white">each way calculator</strong> for UK betting.
                Calculate your potential returns for horse racing, golf, football outrights, and other sports instantly.
                Powered by AI to help you understand win and place payouts.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#calculator" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Use Calculator Now
                </a>
                <a href="#guide" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                  Learn Each-Way Betting
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SignedIn>
                <span className="text-sm text-emerald-400 hidden sm:block">
                  {firstName || user?.email || "Signed in"}
                </span>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <button
                  onClick={() => (window.location.href = "/auth/sign-in")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign in
                </button>
              </SignedOut>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 border border-slate-700/50">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-slate-800/80 to-slate-900/90 z-10"></div>
            <Image
              src="/images/each-way-calculator-hero.svg"
              alt="Each Way Calculator - Free UK betting calculator for horse racing and sports"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center justify-center gap-8 text-white">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-emerald-400">£10</p>
                    <p className="text-sm text-slate-300">E/W Stake</p>
                  </div>
                  <div className="text-4xl text-slate-500">×</div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-amber-400">5/1</p>
                    <p className="text-sm text-slate-300">Odds</p>
                  </div>
                  <div className="text-4xl text-slate-500">=</div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-400">£82.50</p>
                    <p className="text-sm text-slate-300">If Wins</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Accurate Calculations
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Fractional &amp; Decimal Odds
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              100% Free Forever
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              AI Voice Assistant
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="px-4 py-12 pb-32">
        <div className="max-w-5xl mx-auto">

          {/* Introduction Section */}
          <section className="mb-16">
            <div className="gradient-card rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                Why Use Our Each Way Calculator?
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-lg text-slate-300 leading-relaxed mb-4">
                  Our <strong className="text-white">each way calculator</strong> is the most trusted tool for UK punters who want to understand exactly what they stand to win or lose before placing a bet. Whether you're betting on the Grand National, The Open Championship, or a midweek race at Kempton, knowing your potential returns is essential for smart betting.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Each-way betting is one of the most popular bet types in British horse racing, offering a safety net if your selection doesn't quite manage to win but still runs well enough to place. However, calculating your returns manually can be confusing - that's where our each way calculator comes in. Simply enter your stake, odds, and the each-way terms, and we'll show you exactly what you'll receive if your selection wins, places, or loses.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Unlike basic calculators, our tool is powered by AI and includes a voice assistant that can answer your questions about each-way betting in real-time. Ask about anything from how place odds are calculated to whether each-way betting is worth it at certain odds.
                </p>
              </div>
            </div>
          </section>

          {/* Calculator Section */}
          <section id="calculator" className="mb-16 scroll-mt-8">
            <h2 className="text-3xl font-bold text-white mb-6">
              Free Each Way Calculator Tool
            </h2>
            <p className="text-slate-400 mb-6">
              Enter your stake and odds below to instantly calculate your each-way bet returns. Our each way calculator supports fractional odds (like 5/1) and decimal odds (like 6.0), and allows you to adjust the place terms and number of places to match your bookmaker's offer.
            </p>
            <div className="gradient-card rounded-2xl p-8 glow-emerald">
              <EachWayCalculator />
            </div>
          </section>

          {/* How to Use Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              How to Use This Each Way Calculator
            </h2>
            <div className="gradient-card rounded-2xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">1</span>
                    Enter Your Stake
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Input the amount you want to stake each-way. Remember, this amount is placed on BOTH the win and place parts, so a £10 each-way bet costs £20 total. The each way calculator will show your total outlay clearly.
                  </p>

                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">2</span>
                    Enter the Odds
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Enter the odds offered by your bookmaker. You can use fractional odds (5/1, 11/4, etc.) or decimal odds (6.0, 3.75, etc.). The calculator will convert between formats automatically.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">3</span>
                    Select Each-Way Terms
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Choose the place odds fraction (usually 1/4 or 1/5) and number of places that pay out. These depend on the race type and number of runners. Check your bookmaker's terms if unsure.
                  </p>

                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">4</span>
                    View Your Returns
                  </h3>
                  <p className="text-slate-400">
                    Instantly see your potential returns for all three outcomes: if your selection wins (both parts pay), if it only places (just place part pays), and if it loses (total stake lost).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Returns Breakdown */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator Visual Breakdown
            </h2>
            <p className="text-slate-400 mb-6">
              See how your returns change based on stake and odds with our interactive charts. Adjust the values below to see the impact on your potential winnings. This visual each way calculator helps you understand the relationship between odds and returns.
            </p>

            {/* Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Stake (E/W)</label>
                <select
                  value={demoStake}
                  onChange={(e) => setDemoStake(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value={5}>£5</option>
                  <option value={10}>£10</option>
                  <option value={20}>£20</option>
                  <option value={50}>£50</option>
                  <option value={100}>£100</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Odds</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={demoOddsNum}
                    onChange={(e) => setDemoOddsNum(Number(e.target.value) || 1)}
                    min={1}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    value={demoOddsDen}
                    onChange={(e) => setDemoOddsDen(Number(e.target.value) || 1)}
                    min={1}
                    className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-white text-center"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Terms</label>
                <select
                  value={demoTerms}
                  onChange={(e) => setDemoTerms(e.target.value as EachWayTerms)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="1/4">1/4 odds</option>
                  <option value="1/5">1/5 odds</option>
                  <option value="1/6">1/6 odds</option>
                  <option value="1/8">1/8 odds</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Places</label>
                <select
                  value={demoPlaces}
                  onChange={(e) => setDemoPlaces(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value={2}>2 places</option>
                  <option value={3}>3 places</option>
                  <option value={4}>4 places</option>
                  <option value={5}>5 places</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ReturnsBreakdown
                stake={demoStake}
                winOdds={`${demoOddsNum}/${demoOddsDen}`}
                placeOdds={demoResult.placeOddsFractional}
                returnIfWon={demoResult.totalReturnIfWon}
                returnIfPlaced={demoResult.totalReturnIfPlaced}
                profitIfWon={demoResult.totalProfitIfWon}
                profitIfPlaced={demoResult.totalProfitIfPlaced}
                totalLoss={demoResult.totalLoss}
              />
              <OddsComparison
                stake={demoStake}
                eachWayTerms={demoTerms}
                numberOfPlaces={demoPlaces}
              />
            </div>
          </section>

          {/* What is Each-Way Section */}
          <section id="guide" className="mb-16 scroll-mt-8">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator: Understanding Each-Way Betting
            </h2>
            <div className="gradient-card rounded-2xl p-8">
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                An each-way bet is one of the most popular bet types in UK horse racing, golf, and other sports with outright markets. It's essentially <strong className="text-white">two bets in one</strong>: a WIN bet and a PLACE bet. This gives you a safety net - even if your selection doesn't win, you can still get a return if it finishes in the places.
              </p>

              <h3 className="text-xl font-semibold text-white mb-4">How Each-Way Betting Works</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                When you place an each-way bet, you're making two separate bets of equal value. The first bet is on your selection to WIN the race or tournament outright. The second bet is on your selection to PLACE - meaning it finishes in one of the paying positions (usually top 2, 3, or 4 depending on the field size and race type).
              </p>
              <p className="text-slate-400 leading-relaxed mb-6">
                The catch? Your stake is doubled. A £10 each-way bet costs £20 total (£10 on win, £10 on place). The place bet pays at a fraction of the win odds (typically 1/4 or 1/5), and the number of places that pay out depends on the number of runners in the race. That's why using an each way calculator before you bet is so important - it helps you understand exactly what you're getting into.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                  <p className="text-green-400 font-bold text-2xl mb-2">IF IT WINS</p>
                  <p className="text-slate-300 text-sm mb-2">Both win and place bets pay out</p>
                  <p className="text-xs text-slate-500">Win bet pays at full odds + Place bet pays at fractional odds</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                  <p className="text-amber-400 font-bold text-2xl mb-2">IF IT PLACES</p>
                  <p className="text-slate-300 text-sm mb-2">Only place bet pays out</p>
                  <p className="text-xs text-slate-500">You lose the win stake but collect place returns</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                  <p className="text-red-400 font-bold text-2xl mb-2">IF IT LOSES</p>
                  <p className="text-slate-300 text-sm mb-2">Lose entire stake (both parts)</p>
                  <p className="text-xs text-slate-500">No return - total stake is lost</p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">The Mathematics Behind Each-Way Betting</h3>
              <p className="text-slate-400 leading-relaxed mb-4">
                Let's break down a real example to show exactly how each-way betting works. Say you place £10 each-way on a horse at 5/1 with 1/4 place odds and 3 places:
              </p>
              <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-emerald-400 font-semibold mb-3">Your Bet Details:</h4>
                    <ul className="space-y-2 text-slate-300 text-sm">
                      <li>• Stake per part: £10</li>
                      <li>• Total stake: £20 (£10 win + £10 place)</li>
                      <li>• Win odds: 5/1 (decimal: 6.0)</li>
                      <li>• Place odds: 5/4 (5÷4=1.25, decimal: 2.25)</li>
                      <li>• Places paying: 1st, 2nd, 3rd</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-emerald-400 font-semibold mb-3">Potential Returns:</h4>
                    <ul className="space-y-2 text-slate-300 text-sm">
                      <li className="text-green-400">• If WINS: £60 + £22.50 = £82.50 (profit £62.50)</li>
                      <li className="text-amber-400">• If PLACES: £22.50 (loss £7.50 overall)</li>
                      <li className="text-red-400">• If LOSES: £0 (loss £20)</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Notice that at 5/1 odds, you actually make a small loss if your selection only places. This is because the place return (£22.50) doesn't quite cover your total stake (£20). At longer odds, you would profit even on a place finish. Our each way calculator shows you this breakdown instantly for any combination of stake and odds.
              </p>
            </div>
          </section>

          {/* Quick Examples Table */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator: Quick Reference Examples
            </h2>
            <p className="text-slate-400 mb-8">
              Quick reference showing returns at common stakes and odds. All examples use standard horse racing each-way terms. Use our each way calculator above for custom calculations with your specific bet details.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
              <table className="w-full text-sm table-dark">
                <thead>
                  <tr className="bg-slate-800/50">
                    <th className="text-left p-4 font-semibold text-slate-300">Bet</th>
                    <th className="text-right p-4 font-semibold text-slate-300">Total Stake</th>
                    <th className="text-right p-4 font-semibold text-green-400">If Wins</th>
                    <th className="text-right p-4 font-semibold text-amber-400">If Places</th>
                    <th className="text-right p-4 font-semibold text-red-400">If Loses</th>
                  </tr>
                </thead>
                <tbody>
                  {BET_EXAMPLES.map((example, index) => {
                    const [num, den] = example.odds.split("/").map(Number);
                    const odds: OddsInput = {
                      format: "fractional",
                      fractionalNumerator: num,
                      fractionalDenominator: den,
                    };
                    const bet: BetDetails = {
                      stake: example.stake,
                      odds,
                      eachWayTerms: example.terms,
                      numberOfPlaces: example.places,
                      outcome: "won",
                      raceType: "horse-racing",
                    };
                    const result = calculateEachWay(bet);
                    return (
                      <tr
                        key={index}
                        className={`border-t border-slate-700/50 hover:bg-emerald-500/5 transition-colors ${
                          index % 2 === 0 ? "bg-slate-800/20" : "bg-slate-800/10"
                        }`}
                      >
                        <td className="p-4 font-medium text-white">
                          £{example.stake} E/W @ {example.odds}
                          <span className="text-slate-500 text-xs ml-2">
                            ({example.terms}, {example.places} places)
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-slate-300">
                          {formatCurrency(result.totalStake)}
                        </td>
                        <td className="p-4 text-right font-mono text-green-400">
                          {formatCurrency(result.totalReturnIfWon)}
                          <span className="text-green-500/60 text-xs block">
                            +{formatCurrency(result.totalProfitIfWon)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-amber-400">
                          {formatCurrency(result.totalReturnIfPlaced)}
                          <span
                            className={`text-xs block ${
                              result.totalProfitIfPlaced >= 0
                                ? "text-green-500/60"
                                : "text-red-500/60"
                            }`}
                          >
                            {result.totalProfitIfPlaced >= 0 ? "+" : ""}
                            {formatCurrency(result.totalProfitIfPlaced)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-red-400">
                          {formatCurrency(0)}
                          <span className="text-red-500/60 text-xs block">
                            -{formatCurrency(result.totalLoss)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Each-Way Terms by Runners */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator: Standard UK Horse Racing Terms
            </h2>
            <div className="gradient-card rounded-2xl p-8">
              <p className="text-slate-400 mb-6">
                The number of places paid and the odds fraction depend on the type of race and number of runners. Here are the standard terms used by most UK bookmakers. Always check these when using your each way calculator to ensure accurate results:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Runners</th>
                      <th className="text-center py-3 px-4 text-slate-400 font-medium">Places Paid</th>
                      <th className="text-center py-3 px-4 text-slate-400 font-medium">Odds Fraction</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HORSE_RACING_PLACE_RULES.map((rule, index) => (
                      <tr
                        key={index}
                        className={`border-b border-slate-700/50 ${
                          index % 2 === 0 ? "bg-slate-800/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-white font-mono">{rule.runners}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-medium">
                            {rule.places} places
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded text-xs font-medium">
                            {rule.terms}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{rule.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                * Terms may vary between bookmakers and for special offers. Some bookies offer enhanced each-way terms as promotions - extra places or better odds fractions. Always check before betting.
              </p>
            </div>
          </section>

          {/* When to Bet Each-Way Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator Strategy: When to Bet Each-Way
            </h2>
            <div className="gradient-card rounded-2xl p-8">
              <p className="text-slate-400 leading-relaxed mb-6">
                Knowing when to bet each-way versus win-only is crucial for profitable betting. Use our each way calculator to run the numbers, but here are some general guidelines:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                  <h3 className="text-emerald-400 font-bold text-lg mb-4">When Each-Way IS Worth It:</h3>
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>At <strong>longer odds (5/1+)</strong> where place returns can cover your stake</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>In <strong>large field races</strong> (8+ runners) with more places</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>In <strong>competitive handicaps</strong> where any of 10 horses could win</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>When bookies offer <strong>enhanced each-way terms</strong> (extra places)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>In <strong>golf majors</strong> with 150+ player fields</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <h3 className="text-red-400 font-bold text-lg mb-4">When Each-Way ISN'T Worth It:</h3>
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>At <strong>short odds (under 3/1)</strong> - you'll lose money on a place finish</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>In <strong>small field races</strong> (4-5 runners) with only 2 places</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>When betting on <strong>heavy favourites</strong> in weak races</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>If your selection has a <strong>poor place record</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>In <strong>two-horse races</strong> where only 1 place pays</span>
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-slate-400 leading-relaxed">
                The key insight is that each-way betting has diminishing value at shorter odds. At 2/1, your place odds are just 1/2 (1.5 decimal) at 1/4 terms - not enough to cover your doubled stake if your selection only places. Always run the numbers through an each way calculator before placing your bet.
              </p>
            </div>
          </section>

          {/* Full Explainer */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Complete Each Way Calculator Betting Guide
            </h2>
            <EachWayExplainer />
          </section>

          {/* FAQs Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator FAQ
            </h2>
            <p className="text-slate-400 mb-6">
              Got questions about each-way betting or how to use our each way calculator? Here are answers to the most common questions from UK punters:
            </p>
            <div className="space-y-3">
              {FAQS.map((faq, index) => (
                <details key={index} className="gradient-card rounded-xl group">
                  <summary className="flex justify-between items-center cursor-pointer p-5 font-medium text-white">
                    {faq.question}
                    <span className="ml-2 transition-transform group-open:rotate-180 text-slate-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-slate-400 border-t border-slate-700/50 pt-4">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Sports-Specific Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each Way Calculator for Different Sports
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="gradient-card rounded-xl p-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Horse Racing</h3>
                <p className="text-slate-400 text-sm mb-4">
                  The most common sport for each-way betting. Terms vary by field size: 2-3 places for smaller fields, up to 4 places for big handicaps. Use our each way calculator with the correct number of runners.
                </p>
                <p className="text-xs text-slate-500">
                  Typical terms: 1/4 or 1/5 odds, 2-4 places
                </p>
              </div>
              <div className="gradient-card rounded-xl p-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Golf</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Each-way betting shines in golf due to huge fields (150+ players). Bookies typically offer 5-8 places at 1/4 or 1/5 odds. Great for backing outsiders at big prices with decent place chances.
                </p>
                <p className="text-xs text-slate-500">
                  Typical terms: 1/4 or 1/5 odds, 5-8 places
                </p>
              </div>
              <div className="gradient-card rounded-xl p-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Football Outrights</h3>
                <p className="text-slate-400 text-sm mb-4">
                  League winner, top scorer, and other outright markets offer each-way options. Usually 2-3 places depending on the market. Perfect for backing teams you think will challenge but might not win.
                </p>
                <p className="text-xs text-slate-500">
                  Typical terms: 1/4 odds, 2-3 places
                </p>
              </div>
            </div>
          </section>

          {/* AI Assistant Section */}
          <section className="mb-16">
            <div className="gradient-card rounded-2xl p-8 border-2 border-emerald-500/30">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    Each Way Calculator AI Assistant
                  </h2>
                  <p className="text-slate-300 mb-4">
                    Need help understanding each-way betting? Our AI assistant can answer your questions in real-time. Ask about odds calculations, when to bet each-way, or get personalized advice for your specific bet.
                  </p>
                  <p className="text-slate-400 mb-6">
                    Click the chat button in the bottom right corner or use our voice assistant to speak your questions naturally. The AI knows everything about each-way betting and can use our calculator for you.
                  </p>
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat with AI Assistant
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="mb-16">
            <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Disclaimer
              </h3>
              <p className="text-sm text-slate-500">
                This each way calculator provides estimates based on standard betting rules. Actual returns may vary depending on your bookmaker's specific terms and conditions. Each-way terms can vary between bookmakers - always check before placing your bet. Gambling involves risk - only bet what you can afford to lose. If you're concerned about your gambling, visit <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">BeGambleAware.org</a>.
              </p>
              <p className="text-sm text-slate-600 mt-3">
                18+ only. Please gamble responsibly.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Voice transcript notification */}
      {voiceMessage && (
        <div className="fixed bottom-40 right-6 z-50 max-w-xs bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Voice:</p>
          <p className="text-sm text-slate-300">{voiceMessage}</p>
        </div>
      )}

      {/* Floating action buttons - Voice and Chat */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Chat button - opens sidebar */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
            title="Open AI Assistant"
            aria-label="Open AI Assistant"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        )}

        {/* Voice button */}
        <VoiceInput
          onMessage={handleVoiceMessage}
          userName={firstName}
          userId={user?.id}
          userEmail={user?.email}
        />
      </div>

      {/* CopilotSidebar */}
      <CopilotSidebar
        instructions={SYSTEM_PROMPT}
        labels={{
          title: "Each-Way Assistant",
          initial: firstName
            ? `Hi ${firstName}! I can help you calculate each-way bet returns. Tell me your stake and odds.`
            : "Hi! I can help you calculate each-way bet returns. Tell me your stake and odds, and I'll work out your potential winnings.",
        }}
        defaultOpen={false}
        clickOutsideToClose={true}
        onSetOpen={setSidebarOpen}
      />
    </div>
  );
}
