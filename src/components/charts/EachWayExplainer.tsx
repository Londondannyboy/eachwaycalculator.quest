"use client";

import { HORSE_RACING_PLACE_RULES, EACH_WAY_TERMS } from "@/lib/calculations";

export function EachWayExplainer() {
  return (
    <div className="space-y-6">
      {/* How Each-Way Works */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg
            className="w-6 h-6 text-emerald-400"
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
          How Each-Way Betting Works
        </h3>
        <div className="prose prose-invert max-w-none">
          <p className="text-slate-300 mb-4">
            An each-way bet is essentially <strong className="text-white">two bets in one</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h4 className="font-semibold text-green-400 mb-2">1. Win Bet</h4>
              <p className="text-slate-300 text-sm">
                Your selection must WIN for this part to pay out. Paid at the full odds.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h4 className="font-semibold text-amber-400 mb-2">2. Place Bet</h4>
              <p className="text-slate-300 text-sm">
                Your selection must PLACE (finish in the top positions) for this part to pay out.
                Paid at a fraction of the odds.
              </p>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Important:</strong> Your stake is DOUBLED when betting
              each-way. If you bet £10 each-way, your total stake is £20 (£10 on win + £10 on
              place).
            </p>
          </div>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Example Calculation</h3>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
          <p className="text-emerald-400 font-medium mb-2">£10 Each-Way at 5/1 (1/4 odds, 3 places)</p>
        </div>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-white font-semibold">If Selection WINS:</p>
            <ul className="text-slate-300 text-sm space-y-1 mt-2">
              <li>Win bet: £10 × 6.00 = £60 return (£50 profit)</li>
              <li>Place bet: £10 × 2.25 (5/4) = £22.50 return (£12.50 profit)</li>
              <li className="text-green-400 font-semibold">
                Total: £82.50 return (£62.50 profit)
              </li>
            </ul>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-white font-semibold">If Selection PLACES Only:</p>
            <ul className="text-slate-300 text-sm space-y-1 mt-2">
              <li>Win bet: £0 (loses)</li>
              <li>Place bet: £10 × 2.25 (5/4) = £22.50 return</li>
              <li className="text-amber-400 font-semibold">
                Total: £22.50 return (£2.50 profit from place, £7.50 loss overall)
              </li>
            </ul>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <p className="text-white font-semibold">If Selection LOSES:</p>
            <ul className="text-slate-300 text-sm space-y-1 mt-2">
              <li>Win bet: £0 (loses)</li>
              <li>Place bet: £0 (loses)</li>
              <li className="text-red-400 font-semibold">
                Total: £0 return (£20 loss)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Place Terms by Runners */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4">
          Standard Horse Racing Each-Way Terms
        </h3>
        <p className="text-slate-400 mb-4">
          The number of places paid and the odds fraction vary based on race type and number of
          runners:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Runners</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">Places</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">Terms</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Notes</th>
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
                  <td className="py-3 px-4 text-center text-emerald-400">{rule.places}</td>
                  <td className="py-3 px-4 text-center text-amber-400">{rule.terms}</td>
                  <td className="py-3 px-4 text-slate-300">{rule.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Each-Way Terms Explained */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Each-Way Terms Explained</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EACH_WAY_TERMS.map((term) => (
            <div
              key={term.terms}
              className="bg-slate-700/30 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl font-bold text-white">{term.label}</span>
                <span className="text-sm text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">
                  {(term.fraction * 100).toFixed(1)}% of odds
                </span>
              </div>
              <p className="text-slate-400 text-sm">{term.typicalUse}</p>
              <div className="mt-3 text-xs text-slate-500">
                Example: 8/1 win odds → {term.terms === "1/4" ? "2/1" : term.terms === "1/5" ? "8/5" : term.terms === "1/6" ? "4/3" : "1/1"} place odds
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* When to Bet Each-Way */}
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
        <h3 className="text-xl font-bold text-white mb-4">When to Bet Each-Way</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-green-400 font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Each-Way is Good When:
            </h4>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></span>
                Backing longer-priced selections (5/1 and above)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></span>
                Competitive races with many runners
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></span>
                When you think your selection will be competitive but may not win
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2"></span>
                Handicap races with 16+ runners (4 places)
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              Avoid Each-Way When:
            </h4>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2"></span>
                Backing short-priced favourites (under 3/1)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2"></span>
                Small fields (4 runners or fewer)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2"></span>
                When place odds offer poor value
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2"></span>
                Two-runner races (no E/W available)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
