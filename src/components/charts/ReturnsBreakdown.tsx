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
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/calculations";

interface ReturnsBreakdownProps {
  stake: number;
  winOdds: string;
  placeOdds: string;
  returnIfWon: number;
  returnIfPlaced: number;
  profitIfWon: number;
  profitIfPlaced: number;
  totalLoss: number;
}

export function ReturnsBreakdown({
  stake,
  winOdds,
  placeOdds,
  returnIfWon,
  returnIfPlaced,
  profitIfWon,
  profitIfPlaced,
  totalLoss,
}: ReturnsBreakdownProps) {
  const data = useMemo(
    () => [
      {
        name: "If Wins",
        return: returnIfWon,
        profit: profitIfWon,
        fill: "#22c55e",
      },
      {
        name: "If Places",
        return: returnIfPlaced,
        profit: profitIfPlaced,
        fill: "#f59e0b",
      },
      {
        name: "If Loses",
        return: 0,
        profit: -totalLoss,
        fill: "#ef4444",
      },
    ],
    [returnIfWon, returnIfPlaced, profitIfWon, profitIfPlaced, totalLoss]
  );

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-4">Returns Breakdown</h3>

      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-slate-700/30 rounded-xl">
            <p className="text-xs text-slate-400">Total Stake</p>
            <p className="text-lg font-bold text-white">{formatCurrency(stake * 2)}</p>
          </div>
          <div className="text-center p-3 bg-slate-700/30 rounded-xl">
            <p className="text-xs text-slate-400">Win Odds</p>
            <p className="text-lg font-bold text-white">{winOdds}</p>
          </div>
          <div className="text-center p-3 bg-slate-700/30 rounded-xl">
            <p className="text-xs text-slate-400">Place Odds</p>
            <p className="text-lg font-bold text-white">{placeOdds}</p>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
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
              formatter={(value: number) => [formatCurrency(value), "Amount"]}
            />
            <Legend />
            <Bar dataKey="return" name="Return" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-green-400">If Wins</span>
          </div>
          <div className="text-right">
            <span className="text-white font-bold">{formatCurrency(returnIfWon)}</span>
            <span className="text-green-400 text-sm ml-2">+{formatCurrency(profitIfWon)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            <span className="text-amber-400">If Places</span>
          </div>
          <div className="text-right">
            <span className="text-white font-bold">{formatCurrency(returnIfPlaced)}</span>
            <span className={`text-sm ml-2 ${profitIfPlaced >= 0 ? "text-green-400" : "text-red-400"}`}>
              {profitIfPlaced >= 0 ? "+" : ""}{formatCurrency(profitIfPlaced)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-red-400">If Loses</span>
          </div>
          <div className="text-right">
            <span className="text-white font-bold">{formatCurrency(0)}</span>
            <span className="text-red-400 text-sm ml-2">-{formatCurrency(totalLoss)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
