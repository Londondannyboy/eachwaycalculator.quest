"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, calculateEachWay } from "@/lib/calculations";
import { BetDetails, EachWayTerms, OddsInput } from "@/lib/types";

interface OddsComparisonProps {
  stake: number;
  eachWayTerms: EachWayTerms;
  numberOfPlaces: number;
}

export function OddsComparison({
  stake,
  eachWayTerms,
  numberOfPlaces,
}: OddsComparisonProps) {
  const commonOdds = [
    { num: 2, den: 1, label: "2/1" },
    { num: 5, den: 2, label: "5/2" },
    { num: 3, den: 1, label: "3/1" },
    { num: 4, den: 1, label: "4/1" },
    { num: 5, den: 1, label: "5/1" },
    { num: 8, den: 1, label: "8/1" },
    { num: 10, den: 1, label: "10/1" },
  ];

  const data = useMemo(() => {
    return commonOdds.map((odd) => {
      const odds: OddsInput = {
        format: "fractional",
        fractionalNumerator: odd.num,
        fractionalDenominator: odd.den,
      };
      const bet: BetDetails = {
        stake,
        odds,
        eachWayTerms,
        numberOfPlaces,
        outcome: "won",
        raceType: "horse-racing",
      };
      const result = calculateEachWay(bet);
      return {
        odds: odd.label,
        returnWon: result.totalReturnIfWon,
        returnPlaced: result.totalReturnIfPlaced,
        profitWon: result.totalProfitIfWon,
        profitPlaced: result.totalProfitIfPlaced,
      };
    });
  }, [stake, eachWayTerms, numberOfPlaces]);

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-2">
        Returns at Different Odds
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        £{stake} each way ({eachWayTerms} odds, {numberOfPlaces} places)
      </p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="odds" stroke="#9ca3af" fontSize={12} />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#f3f4f6" }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "returnWon" ? "Return if Won" : "Return if Placed",
              ]}
            />
            <Legend
              formatter={(value) =>
                value === "returnWon" ? "Return if Won" : "Return if Placed"
              }
            />
            <Bar
              dataKey="returnWon"
              name="returnWon"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="returnPlaced"
              name="returnPlaced"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick reference table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-medium">
                Odds
              </th>
              <th className="text-right py-2 px-3 text-green-400 font-medium">
                If Won
              </th>
              <th className="text-right py-2 px-3 text-amber-400 font-medium">
                If Placed
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.odds}
                className={`border-b border-slate-700/50 ${
                  index % 2 === 0 ? "bg-slate-800/30" : ""
                }`}
              >
                <td className="py-2 px-3 text-white font-mono">{row.odds}</td>
                <td className="py-2 px-3 text-right text-green-400 font-mono">
                  {formatCurrency(row.returnWon)}
                  <span className="text-green-500/60 text-xs ml-1">
                    (+{formatCurrency(row.profitWon)})
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-amber-400 font-mono">
                  {formatCurrency(row.returnPlaced)}
                  <span
                    className={`text-xs ml-1 ${
                      row.profitPlaced >= 0
                        ? "text-green-500/60"
                        : "text-red-500/60"
                    }`}
                  >
                    ({row.profitPlaced >= 0 ? "+" : ""}
                    {formatCurrency(row.profitPlaced)})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
