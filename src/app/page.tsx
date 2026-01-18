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
    question: "How are each-way odds calculated?",
    answer:
      "The place part of your bet pays at a fraction of the win odds. Typically 1/4 or 1/5 of the odds. For example, at 5/1 with 1/4 odds, your place odds are 5/4 (1.25). At 5/1 with 1/5 odds, your place odds are 1/1 (evens). The fraction used depends on the number of runners and race type.",
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
    question: "How do I calculate my each-way returns?",
    answer:
      "For a £10 E/W at 5/1 (1/4 odds, 3 places): Win part: £10 x 6.0 = £60. Place part: £10 x 2.25 (5/4 +1) = £22.50. If WINS: £60 + £22.50 = £82.50 total (£62.50 profit). If PLACES: £22.50 return (£2.50 loss overall as you lose the £10 win stake). If LOSES: £0 (lose £20 total stake).",
  },
  {
    question: "What's the difference between 1/4 and 1/5 odds?",
    answer:
      "1/4 odds means the place bet pays 25% of the win odds, while 1/5 pays 20%. For example, at 10/1: with 1/4 terms you get 10/4 (2.5/1) place odds; with 1/5 terms you get 10/5 (2/1) place odds. 1/4 is better for the bettor as you get higher place odds.",
  },
];

// Common bet examples
const BET_EXAMPLES = [
  { stake: 5, odds: "3/1", terms: "1/4" as EachWayTerms, places: 2 },
  { stake: 10, odds: "5/1", terms: "1/4" as EachWayTerms, places: 3 },
  { stake: 10, odds: "8/1", terms: "1/5" as EachWayTerms, places: 3 },
  { stake: 20, odds: "10/1", terms: "1/4" as EachWayTerms, places: 4 },
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
                Free Calculator
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                Each-Way
                <span className="text-emerald-400"> Calculator</span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl">
                Free AI-powered each-way bet calculator. Calculate your potential returns
                for horse racing, golf, and other sports. Understand your win and place payouts instantly.
              </p>
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
              All Odds Formats
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              100% Free
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              AI Assistant
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="px-4 py-12 pb-32">
        <div className="max-w-5xl mx-auto">
          {/* Calculator Section */}
          <section className="mb-16">
            <div className="gradient-card rounded-2xl p-8 glow-emerald">
              <EachWayCalculator />
            </div>
          </section>

          {/* Interactive Returns Breakdown */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Visual Returns Breakdown
            </h2>
            <p className="text-slate-400 mb-6">
              See how your returns change based on stake and odds. Adjust the values below to see the impact.
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
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              What is an Each-Way Bet?
            </h2>
            <div className="gradient-card rounded-2xl p-8">
              <p className="text-lg text-slate-300 leading-relaxed mb-4">
                An each-way bet is one of the most popular bet types in horse racing, golf, and other
                sports. It's essentially <strong className="text-white">two bets in one</strong>: a WIN
                bet and a PLACE bet. This gives you a safety net - even if your selection doesn't win,
                you can still get a return if it finishes in the places.
              </p>
              <p className="text-slate-400 leading-relaxed mb-6">
                The catch? Your stake is doubled. A £10 each-way bet costs £20 total (£10 on win, £10 on
                place). The place bet pays at a fraction of the win odds (typically 1/4 or 1/5), and the
                number of places that pay out depends on the number of runners in the race.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-bold text-2xl mb-1">WIN</p>
                  <p className="text-slate-300 text-sm">Both parts pay out at full + place odds</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                  <p className="text-amber-400 font-bold text-2xl mb-1">PLACE</p>
                  <p className="text-slate-300 text-sm">Only place part pays at fraction of odds</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <p className="text-red-400 font-bold text-2xl mb-1">LOSE</p>
                  <p className="text-slate-300 text-sm">Lose entire stake (both parts)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Examples Table */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each-Way Returns Examples
            </h2>
            <p className="text-slate-400 mb-8">
              Quick reference showing returns at common stakes and odds. All examples use standard
              horse racing each-way terms.
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
              Standard Horse Racing Each-Way Terms
            </h2>
            <div className="gradient-card rounded-2xl p-8">
              <p className="text-slate-400 mb-6">
                The number of places paid and the odds fraction depend on the type of race and number
                of runners. Here are the standard terms used by most UK bookmakers:
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
                * Terms may vary between bookmakers and for special offers. Always check the specific
                terms before placing your bet.
              </p>
            </div>
          </section>

          {/* Full Explainer */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Complete Each-Way Betting Guide
            </h2>
            <EachWayExplainer />
          </section>

          {/* FAQs Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">
              Each-Way Betting FAQ
            </h2>
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
                This each-way calculator provides estimates based on standard betting rules. Actual
                returns may vary depending on your bookmaker's specific terms and conditions. Gambling
                involves risk - only bet what you can afford to lose. If you're concerned about your
                gambling, visit <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">BeGambleAware.org</a>.
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

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
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
