"use client";

import { useState, useCallback, useMemo } from "react";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import {
  BetDetails,
  EachWayResult,
  OddsFormat,
  BetOutcome,
  EachWayTerms,
  RaceType,
  OddsInput,
} from "@/lib/types";
import {
  calculateEachWay,
  formatCurrency,
  suggestPlaceTerms,
  compareEachWayVsWinOnly,
  EACH_WAY_TERMS,
  HORSE_RACING_PLACE_RULES,
} from "@/lib/calculations";

interface EachWayCalculatorProps {
  defaultStake?: number;
  defaultOddsFormat?: OddsFormat;
}

export default function EachWayCalculator({
  defaultStake = 10,
  defaultOddsFormat = "fractional",
}: EachWayCalculatorProps) {
  // Form state
  const [stake, setStake] = useState<number>(defaultStake);
  const [stakeInput, setStakeInput] = useState<string>(defaultStake.toString());
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>(defaultOddsFormat);
  const [fractionalNum, setFractionalNum] = useState<string>("5");
  const [fractionalDen, setFractionalDen] = useState<string>("1");
  const [decimalOdds, setDecimalOdds] = useState<string>("6.00");
  const [eachWayTerms, setEachWayTerms] = useState<EachWayTerms>("1/4");
  const [numberOfPlaces, setNumberOfPlaces] = useState<number>(3);
  const [outcome, setOutcome] = useState<BetOutcome>("won");
  const raceType: RaceType = "horse-racing";
  const [numberOfRunners, setNumberOfRunners] = useState<string>("8");

  // Result
  const [result, setResult] = useState<EachWayResult | null>(null);

  // Build odds object
  const currentOdds = useMemo((): OddsInput => {
    if (oddsFormat === "fractional") {
      return {
        format: "fractional",
        fractionalNumerator: parseInt(fractionalNum) || 1,
        fractionalDenominator: parseInt(fractionalDen) || 1,
      };
    } else {
      return {
        format: "decimal",
        decimal: parseFloat(decimalOdds) || 2,
      };
    }
  }, [oddsFormat, fractionalNum, fractionalDen, decimalOdds]);

  // Calculate
  const handleCalculate = useCallback(() => {
    const bet: BetDetails = {
      stake,
      odds: currentOdds,
      eachWayTerms,
      numberOfPlaces,
      outcome,
      raceType,
      numberOfRunners: parseInt(numberOfRunners) || undefined,
    };
    const calcResult = calculateEachWay(bet);
    setResult(calcResult);
    return calcResult;
  }, [stake, currentOdds, eachWayTerms, numberOfPlaces, outcome, raceType, numberOfRunners]);

  // Auto-suggest terms when runners change
  const handleRunnersChange = (value: string) => {
    setNumberOfRunners(value);
    const runners = parseInt(value);
    if (!isNaN(runners) && runners > 0) {
      const suggested = suggestPlaceTerms(runners);
      setNumberOfPlaces(suggested.places);
      setEachWayTerms(suggested.terms);
    }
  };

  // Handle stake input
  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStakeInput(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      setStake(parsed);
    }
  };

  // Format odds display
  const oddsDisplay = useMemo(() => {
    if (oddsFormat === "fractional") {
      return `${fractionalNum}/${fractionalDen}`;
    }
    return decimalOdds;
  }, [oddsFormat, fractionalNum, fractionalDen, decimalOdds]);

  // Make calculator state readable to Copilot
  useCopilotReadable({
    description: "Current each-way bet calculator state and results",
    value: JSON.stringify({
      stake,
      totalStake: stake * 2,
      oddsDisplay,
      oddsFormat,
      eachWayTerms,
      numberOfPlaces,
      outcome,
      raceType,
      numberOfRunners,
      result: result
        ? {
            totalReturnIfWon: formatCurrency(result.totalReturnIfWon),
            totalProfitIfWon: formatCurrency(result.totalProfitIfWon),
            totalReturnIfPlaced: formatCurrency(result.totalReturnIfPlaced),
            totalProfitIfPlaced: formatCurrency(result.totalProfitIfPlaced),
            winOdds: result.winOddsFractional,
            placeOdds: result.placeOddsFractional,
          }
        : null,
    }),
  });

  // Define Copilot actions
  useCopilotAction({
    name: "calculateEachWayBet",
    description:
      "Calculate an each-way bet return. Use this when the user wants to know their potential returns on an each-way bet.",
    parameters: [
      {
        name: "stake",
        type: "number",
        description: "Stake per part in GBP (e.g., 10 means £10 each way = £20 total stake)",
        required: true,
      },
      {
        name: "oddsNumerator",
        type: "number",
        description: "Numerator of fractional odds (e.g., 5 for 5/1)",
        required: true,
      },
      {
        name: "oddsDenominator",
        type: "number",
        description: "Denominator of fractional odds (e.g., 1 for 5/1, 2 for 5/2)",
        required: true,
      },
      {
        name: "eachWayTerms",
        type: "string",
        description: "Place odds fraction: '1/4', '1/5', '1/6', or '1/8'",
        required: true,
      },
      {
        name: "numberOfPlaces",
        type: "number",
        description: "Number of places that pay out (2, 3, 4, or 5)",
        required: true,
      },
      {
        name: "outcome",
        type: "string",
        description: "Bet outcome: 'won', 'placed', or 'lost'",
        required: false,
      },
    ],
    handler: async ({
      stake: betStake,
      oddsNumerator,
      oddsDenominator,
      eachWayTerms: terms,
      numberOfPlaces: places,
      outcome: betOutcome,
    }: {
      stake: number;
      oddsNumerator: number;
      oddsDenominator: number;
      eachWayTerms: string;
      numberOfPlaces: number;
      outcome?: string;
    }) => {
      const bet: BetDetails = {
        stake: betStake,
        odds: {
          format: "fractional",
          fractionalNumerator: oddsNumerator,
          fractionalDenominator: oddsDenominator,
        },
        eachWayTerms: terms as EachWayTerms,
        numberOfPlaces: places,
        outcome: (betOutcome as BetOutcome) || "won",
        raceType: "horse-racing",
      };

      const calcResult = calculateEachWay(bet);

      // Update UI
      setStake(betStake);
      setStakeInput(betStake.toString());
      setFractionalNum(oddsNumerator.toString());
      setFractionalDen(oddsDenominator.toString());
      setEachWayTerms(terms as EachWayTerms);
      setNumberOfPlaces(places);
      if (betOutcome) setOutcome(betOutcome as BetOutcome);
      setResult(calcResult);

      const oddsStr = `${oddsNumerator}/${oddsDenominator}`;
      return {
        stake: formatCurrency(betStake),
        totalStake: formatCurrency(calcResult.totalStake),
        odds: oddsStr,
        placeOdds: calcResult.placeOddsFractional,
        eachWayTerms: terms,
        placesPayingOut: places,
        returnIfWon: formatCurrency(calcResult.totalReturnIfWon),
        profitIfWon: formatCurrency(calcResult.totalProfitIfWon),
        returnIfPlaced: formatCurrency(calcResult.totalReturnIfPlaced),
        profitIfPlaced: formatCurrency(calcResult.totalProfitIfPlaced),
        message: `For a ${formatCurrency(betStake)} each-way bet (${formatCurrency(calcResult.totalStake)} total) at ${oddsStr}:

If the selection WINS: You return ${formatCurrency(calcResult.totalReturnIfWon)} (profit of ${formatCurrency(calcResult.totalProfitIfWon)}).

If the selection PLACES only: You return ${formatCurrency(calcResult.totalReturnIfPlaced)} (${calcResult.totalProfitIfPlaced >= 0 ? "profit" : "loss"} of ${formatCurrency(Math.abs(calcResult.totalProfitIfPlaced))}).

The place odds are ${calcResult.placeOddsFractional} (${terms} of ${oddsStr}).`,
      };
    },
  });

  useCopilotAction({
    name: "compareEachWayVsWin",
    description:
      "Compare an each-way bet versus a win-only bet with the same total stake",
    parameters: [
      {
        name: "stake",
        type: "number",
        description: "Stake per part for each-way (total compared will be stake * 2)",
        required: true,
      },
      {
        name: "oddsNumerator",
        type: "number",
        description: "Numerator of fractional odds",
        required: true,
      },
      {
        name: "oddsDenominator",
        type: "number",
        description: "Denominator of fractional odds",
        required: true,
      },
      {
        name: "eachWayTerms",
        type: "string",
        description: "Place odds fraction: '1/4' or '1/5'",
        required: true,
      },
      {
        name: "numberOfPlaces",
        type: "number",
        description: "Number of places that pay out",
        required: true,
      },
    ],
    handler: async ({
      stake: betStake,
      oddsNumerator,
      oddsDenominator,
      eachWayTerms: terms,
      numberOfPlaces: places,
    }: {
      stake: number;
      oddsNumerator: number;
      oddsDenominator: number;
      eachWayTerms: string;
      numberOfPlaces: number;
    }) => {
      const odds: OddsInput = {
        format: "fractional",
        fractionalNumerator: oddsNumerator,
        fractionalDenominator: oddsDenominator,
      };

      const comparison = compareEachWayVsWinOnly(
        betStake,
        odds,
        terms as EachWayTerms,
        places
      );

      const oddsStr = `${oddsNumerator}/${oddsDenominator}`;
      return {
        eachWay: comparison.eachWay,
        winOnly: comparison.winOnly,
        message: `Comparison at ${oddsStr} odds with ${formatCurrency(betStake * 2)} total stake:

EACH WAY (${formatCurrency(betStake)} E/W):
- If WON: Return ${formatCurrency(comparison.eachWay.returnIfWon)}, Profit ${formatCurrency(comparison.eachWay.profitIfWon)}
- If PLACED: Return ${formatCurrency(comparison.eachWay.returnIfPlaced)}, ${comparison.eachWay.profitIfPlaced >= 0 ? "Profit" : "Loss"} ${formatCurrency(Math.abs(comparison.eachWay.profitIfPlaced))}

WIN ONLY (${formatCurrency(betStake * 2)} to win):
- If WON: Return ${formatCurrency(comparison.winOnly.returnIfWon)}, Profit ${formatCurrency(comparison.winOnly.profitIfWon)}
- If PLACED: Return ${formatCurrency(0)}, Loss ${formatCurrency(comparison.winOnly.loss)}

Each-way gives you insurance if your selection places but doesn't win.`,
      };
    },
  });

  useCopilotAction({
    name: "explainEachWayTerms",
    description: "Explain how each-way betting works and the standard place terms",
    parameters: [],
    handler: async () => {
      return {
        explanation: `EACH-WAY BETTING EXPLAINED:

An each-way bet is two bets in one:
1. A WIN bet - backing your selection to win
2. A PLACE bet - backing your selection to finish in the places

Your total stake is DOUBLED (e.g., £10 each-way = £20 total).

PLACE ODDS:
The place bet pays at a fraction of the win odds:
- 1/4 odds: Common for 5-7 runners
- 1/5 odds: Common for 8+ runners
- 1/4 odds: Handicaps with 12+ runners

STANDARD HORSE RACING TERMS:
${HORSE_RACING_PLACE_RULES.map((rule) => `- ${rule.runners} runners: ${rule.description}`).join("\n")}

EXAMPLE:
£10 E/W at 5/1 (1/4 odds, 3 places):
- Total stake: £20
- Win bet: £10 at 5/1 = £60 return (£50 profit)
- Place bet: £10 at 5/4 = £22.50 return (£12.50 profit)
- If WINS: £60 + £22.50 = £82.50 total (£62.50 profit)
- If PLACES: £22.50 return (£7.50 loss overall)
- If LOSES: £20 loss`,
        terms: EACH_WAY_TERMS,
        rules: HORSE_RACING_PLACE_RULES,
      };
    },
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          Calculate Your Each-Way Bet
        </h2>

        {/* Stake Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Stake (per part)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">
              £
            </span>
            <input
              type="number"
              value={stakeInput}
              onChange={handleStakeChange}
              placeholder="10"
              min="0.01"
              step="0.01"
              className="w-full pl-8 pr-4 py-3 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Total stake: {formatCurrency(stake * 2)} (£{stake} win + £{stake} place)
          </p>
        </div>

        {/* Odds Format Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Odds Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOddsFormat("fractional")}
              className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                oddsFormat === "fractional"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Fractional (5/1)
            </button>
            <button
              onClick={() => setOddsFormat("decimal")}
              className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                oddsFormat === "decimal"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Decimal (6.00)
            </button>
          </div>
        </div>

        {/* Odds Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Win Odds
          </label>
          {oddsFormat === "fractional" ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={fractionalNum}
                onChange={(e) => setFractionalNum(e.target.value)}
                min="1"
                className="w-24 px-4 py-3 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-zinc-800 dark:text-white text-center"
              />
              <span className="text-2xl text-zinc-400">/</span>
              <input
                type="number"
                value={fractionalDen}
                onChange={(e) => setFractionalDen(e.target.value)}
                min="1"
                className="w-24 px-4 py-3 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-zinc-800 dark:text-white text-center"
              />
            </div>
          ) : (
            <input
              type="number"
              value={decimalOdds}
              onChange={(e) => setDecimalOdds(e.target.value)}
              min="1.01"
              step="0.01"
              className="w-full px-4 py-3 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-zinc-800 dark:text-white"
            />
          )}
        </div>

        {/* Quick Odds Buttons */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Quick Odds
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { num: 2, den: 1 },
              { num: 5, den: 2 },
              { num: 3, den: 1 },
              { num: 4, den: 1 },
              { num: 5, den: 1 },
              { num: 8, den: 1 },
              { num: 10, den: 1 },
              { num: 20, den: 1 },
            ].map((odd) => (
              <button
                key={`${odd.num}/${odd.den}`}
                onClick={() => {
                  setOddsFormat("fractional");
                  setFractionalNum(odd.num.toString());
                  setFractionalDen(odd.den.toString());
                }}
                className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                {odd.num}/{odd.den}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Runners (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Number of Runners (optional)
          </label>
          <input
            type="number"
            value={numberOfRunners}
            onChange={(e) => handleRunnersChange(e.target.value)}
            placeholder="8"
            min="2"
            className="w-full px-4 py-3 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-zinc-800 dark:text-white"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Enter runners to auto-suggest each-way terms
          </p>
        </div>

        {/* Each Way Terms */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Each-Way Terms (Place Odds Fraction)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["1/4", "1/5", "1/6", "1/8"] as EachWayTerms[]).map((terms) => (
              <button
                key={terms}
                onClick={() => setEachWayTerms(terms)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  eachWayTerms === terms
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {terms} odds
              </button>
            ))}
          </div>
        </div>

        {/* Number of Places */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Places Paying Out
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map((places) => (
              <button
                key={places}
                onClick={() => setNumberOfPlaces(places)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  numberOfPlaces === places
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {places} places
              </button>
            ))}
          </div>
        </div>

        {/* Outcome (for actual result) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Outcome (for settled bets)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setOutcome("won")}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                outcome === "won"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Won
            </button>
            <button
              onClick={() => setOutcome("placed")}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                outcome === "placed"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Placed Only
            </button>
            <button
              onClick={() => setOutcome("lost")}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                outcome === "lost"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Lost
            </button>
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-colors shadow-lg hover:shadow-emerald-500/25"
        >
          Calculate Returns
        </button>

        {/* Results */}
        {result && (
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                  Total Stake
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatCurrency(result.totalStake)}
                </p>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                  Actual Return
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(result.actualReturn)}
                </p>
                <p
                  className={`text-sm ${
                    result.actualProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {result.actualProfit >= 0 ? "Profit: " : "Loss: "}
                  {formatCurrency(Math.abs(result.actualProfit))}
                </p>
              </div>
            </div>

            {/* Potential Returns */}
            <div className="space-y-4 mb-6">
              {/* If Won */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  If Selection WINS
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-600 dark:text-green-400/80">
                      Win Bet Return
                    </p>
                    <p className="font-mono text-lg text-green-800 dark:text-green-300">
                      {formatCurrency(result.winBetReturn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-green-600 dark:text-green-400/80">
                      Place Bet Return
                    </p>
                    <p className="font-mono text-lg text-green-800 dark:text-green-300">
                      {formatCurrency(result.placeBetReturnIfWon)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Total Return
                    </span>
                    <span className="text-xl font-bold text-green-800 dark:text-green-300">
                      {formatCurrency(result.totalReturnIfWon)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 dark:text-green-400/80">
                      Profit
                    </span>
                    <span className="font-mono text-green-700 dark:text-green-400">
                      +{formatCurrency(result.totalProfitIfWon)}
                    </span>
                  </div>
                </div>
              </div>

              {/* If Placed Only */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                  If Selection PLACES Only
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-amber-600 dark:text-amber-400/80">
                      Win Bet Return
                    </p>
                    <p className="font-mono text-lg text-amber-800 dark:text-amber-300">
                      {formatCurrency(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-amber-600 dark:text-amber-400/80">
                      Place Bet Return
                    </p>
                    <p className="font-mono text-lg text-amber-800 dark:text-amber-300">
                      {formatCurrency(result.placeBetReturnIfPlaced)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      Total Return
                    </span>
                    <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
                      {formatCurrency(result.totalReturnIfPlaced)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-amber-600 dark:text-amber-400/80">
                      {result.totalProfitIfPlaced >= 0 ? "Profit" : "Loss"}
                    </span>
                    <span
                      className={`font-mono ${
                        result.totalProfitIfPlaced >= 0
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {result.totalProfitIfPlaced >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(result.totalProfitIfPlaced))}
                    </span>
                  </div>
                </div>
              </div>

              {/* If Lost */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  If Selection LOSES
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 dark:text-red-400/80">
                    Total Loss
                  </span>
                  <span className="text-xl font-bold text-red-700 dark:text-red-400">
                    -{formatCurrency(result.totalLoss)}
                  </span>
                </div>
              </div>
            </div>

            {/* Odds Breakdown */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Odds Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Win Odds
                  </span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-white">
                    {result.winOddsFractional} ({result.winOddsDecimal.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Place Odds ({eachWayTerms})
                  </span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-white">
                    {result.placeOddsFractional} ({result.placeOddsDecimal.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Places Paying
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    1st - {numberOfPlaces === 2 ? "2nd" : numberOfPlaces === 3 ? "3rd" : `${numberOfPlaces}th`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
