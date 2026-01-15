"use client";

import { useState, useCallback } from "react";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import {
  PropertyDetails,
  StampDutyResult,
  Region,
  BuyerType,
} from "@/lib/types";
import {
  calculateStampDuty,
  formatCurrency,
  getRegionName,
  getBuyerTypeName,
} from "@/lib/calculations";

export default function StampDutyCalculator() {
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({
    purchasePrice: 0,
    region: "england",
    propertyType: "residential",
    buyerType: "standard",
  });

  const [result, setResult] = useState<StampDutyResult | null>(null);
  const [priceInput, setPriceInput] = useState("");

  // Calculate stamp duty
  const handleCalculate = useCallback(
    (details: PropertyDetails) => {
      if (details.purchasePrice > 0) {
        const calculationResult = calculateStampDuty(details);
        setResult(calculationResult);
        return calculationResult;
      }
      return null;
    },
    []
  );

  // Update property details and recalculate
  const updateAndCalculate = useCallback(
    (updates: Partial<PropertyDetails>) => {
      const newDetails = { ...propertyDetails, ...updates };
      setPropertyDetails(newDetails);
      return handleCalculate(newDetails);
    },
    [propertyDetails, handleCalculate]
  );

  // Make calculator state readable to Copilot
  useCopilotReadable({
    description: "Current stamp duty calculator state and results",
    value: JSON.stringify({
      propertyDetails,
      result,
      formattedPrice: formatCurrency(propertyDetails.purchasePrice),
      regionName: getRegionName(propertyDetails.region),
      buyerTypeName: getBuyerTypeName(propertyDetails.buyerType),
    }),
  });

  // Define Copilot actions
  useCopilotAction({
    name: "calculateStampDuty",
    description:
      "Calculate UK stamp duty (SDLT/LBTT/LTT) based on property details. Use this when the user wants to know how much stamp duty they'll pay.",
    parameters: [
      {
        name: "purchasePrice",
        type: "number",
        description: "Property purchase price in GBP (pounds)",
        required: true,
      },
      {
        name: "region",
        type: "string",
        description:
          "UK region: 'england' (includes Northern Ireland), 'scotland', or 'wales'",
        required: true,
      },
      {
        name: "buyerType",
        type: "string",
        description:
          "'standard' for normal purchase, 'first-time' for first-time buyers, 'additional' for second homes/buy-to-let",
        required: true,
      },
    ],
    handler: async ({
      purchasePrice,
      region,
      buyerType,
    }: {
      purchasePrice: number;
      region: string;
      buyerType: string;
    }) => {
      const details: PropertyDetails = {
        purchasePrice,
        region: region as Region,
        propertyType: "residential",
        buyerType: buyerType as BuyerType,
      };

      setPropertyDetails(details);
      setPriceInput(purchasePrice.toString());
      const calcResult = handleCalculate(details);

      if (calcResult) {
        return {
          totalTax: formatCurrency(calcResult.totalTax),
          effectiveRate: `${calcResult.effectiveRate}%`,
          breakdown: calcResult.breakdown.map((band) => ({
            band: band.bandName,
            rate: `${(band.rate * 100).toFixed(1)}%`,
            taxableAmount: formatCurrency(band.taxableAmount),
            taxDue: formatCurrency(band.taxDue),
          })),
          message: `For a ${formatCurrency(purchasePrice)} property in ${getRegionName(region as Region)} as a ${getBuyerTypeName(buyerType as BuyerType)}, the stamp duty is ${formatCurrency(calcResult.totalTax)} (effective rate: ${calcResult.effectiveRate}%)`,
        };
      }

      return { error: "Could not calculate stamp duty" };
    },
  });

  useCopilotAction({
    name: "compareScenarios",
    description:
      "Compare stamp duty between different buyer types (e.g., first-time buyer vs standard buyer)",
    parameters: [
      {
        name: "purchasePrice",
        type: "number",
        description: "Property purchase price in GBP",
        required: true,
      },
      {
        name: "region",
        type: "string",
        description: "UK region: 'england', 'scotland', or 'wales'",
        required: true,
      },
    ],
    handler: async ({
      purchasePrice,
      region,
    }: {
      purchasePrice: number;
      region: string;
    }) => {
      const scenarios = (["standard", "first-time", "additional"] as BuyerType[]).map(
        (buyerType) => {
          const details: PropertyDetails = {
            purchasePrice,
            region: region as Region,
            propertyType: "residential",
            buyerType,
          };
          const calcResult = calculateStampDuty(details);
          return {
            buyerType: getBuyerTypeName(buyerType),
            totalTax: formatCurrency(calcResult.totalTax),
            effectiveRate: `${calcResult.effectiveRate}%`,
            rawTax: calcResult.totalTax,
          };
        }
      );

      const savings =
        scenarios[0].rawTax - scenarios[1].rawTax > 0
          ? formatCurrency(scenarios[0].rawTax - scenarios[1].rawTax)
          : "£0";

      return {
        scenarios,
        firstTimeBuyerSavings: savings,
        message: `For a ${formatCurrency(purchasePrice)} property in ${getRegionName(region as Region)}: Standard buyer pays ${scenarios[0].totalTax}, first-time buyer pays ${scenarios[1].totalTax} (saving ${savings}), additional property pays ${scenarios[2].totalTax}.`,
      };
    },
  });

  // Handle price input
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPriceInput(value);
    const price = parseInt(value) || 0;
    updateAndCalculate({ purchasePrice: price });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          Calculate Your Stamp Duty
        </h2>

        {/* Property Price */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Property Price
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">
              £
            </span>
            <input
              type="text"
              value={priceInput}
              onChange={handlePriceChange}
              placeholder="Enter property price"
              className="w-full pl-8 pr-4 py-3 text-lg border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* Region Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Property Location
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["england", "scotland", "wales"] as Region[]).map((region) => (
              <button
                key={region}
                onClick={() => updateAndCalculate({ region })}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  propertyDetails.region === region
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {region === "england"
                  ? "England & NI"
                  : region.charAt(0).toUpperCase() + region.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Buyer Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Buyer Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => updateAndCalculate({ buyerType: "standard" })}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                propertyDetails.buyerType === "standard"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => updateAndCalculate({ buyerType: "first-time" })}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                propertyDetails.buyerType === "first-time"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              First-time Buyer
            </button>
            <button
              onClick={() => updateAndCalculate({ buyerType: "additional" })}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                propertyDetails.buyerType === "additional"
                  ? "bg-orange-600 text-white shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              Additional Property
            </button>
          </div>
        </div>

        {/* Results */}
        {result && result.totalTax >= 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
            <div className="text-center mb-6">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                Stamp Duty to Pay
              </p>
              <p className="text-4xl font-bold text-zinc-900 dark:text-white">
                {formatCurrency(result.totalTax)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Effective rate: {result.effectiveRate}%
              </p>
            </div>

            {/* Breakdown */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Calculation Breakdown
              </h3>
              <div className="space-y-2">
                {result.breakdown.map((band, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex-1">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {band.bandName}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 ml-2">
                        @ {(band.rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {formatCurrency(band.taxDue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* First-time buyer note */}
            {propertyDetails.buyerType === "first-time" &&
              propertyDetails.region === "wales" && (
                <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  Note: Wales does not offer specific first-time buyer relief.
                  Standard rates apply.
                </p>
              )}

            {propertyDetails.buyerType === "first-time" &&
              propertyDetails.region === "england" &&
              propertyDetails.purchasePrice > 625000 && (
                <p className="mt-4 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  Note: First-time buyer relief only applies to properties up to
                  £625,000. Standard rates have been applied.
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
