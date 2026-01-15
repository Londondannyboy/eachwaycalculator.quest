import { BuyerType, CalculationBand, StampDutyResult } from "../types";

// Wales LTT (Land Transaction Tax) rates (2024/25)

interface RateBand {
  from: number;
  to: number;
  rate: number;
  name: string;
}

// Standard residential rates
const standardRates: RateBand[] = [
  { from: 0, to: 225000, rate: 0, name: "Up to £225,000" },
  { from: 225000, to: 400000, rate: 0.06, name: "£225,001 to £400,000" },
  { from: 400000, to: 750000, rate: 0.075, name: "£400,001 to £750,000" },
  { from: 750000, to: 1500000, rate: 0.1, name: "£750,001 to £1,500,000" },
  { from: 1500000, to: Infinity, rate: 0.12, name: "Over £1,500,000" },
];

// Higher rates for additional properties
const higherRates: RateBand[] = [
  { from: 0, to: 180000, rate: 0.04, name: "Up to £180,000" },
  { from: 180000, to: 250000, rate: 0.075, name: "£180,001 to £250,000" },
  { from: 250000, to: 400000, rate: 0.09, name: "£250,001 to £400,000" },
  { from: 400000, to: 750000, rate: 0.115, name: "£400,001 to £750,000" },
  { from: 750000, to: 1500000, rate: 0.14, name: "£750,001 to £1,500,000" },
  { from: 1500000, to: Infinity, rate: 0.16, name: "Over £1,500,000" },
];

// Note: Wales doesn't have specific first-time buyer relief like England
// The nil-rate band applies to all buyers

const HIGHER_RATE_THRESHOLD = 40000;

export function calculateWalesLTT(
  purchasePrice: number,
  buyerType: BuyerType
): StampDutyResult {
  // Wales uses higher rates for additional properties, not a surcharge
  const rates =
    buyerType === "additional" && purchasePrice > HIGHER_RATE_THRESHOLD
      ? higherRates
      : standardRates;

  const breakdown: CalculationBand[] = [];
  let totalTax = 0;

  for (const band of rates) {
    if (purchasePrice <= band.from) break;

    const bandStart = band.from;
    const bandEnd = Math.min(band.to, purchasePrice);
    const taxableInBand = bandEnd - bandStart;

    if (taxableInBand > 0) {
      const taxDue = taxableInBand * band.rate;
      totalTax += taxDue;

      breakdown.push({
        bandName: band.name,
        from: bandStart,
        to: bandEnd,
        rate: band.rate,
        taxableAmount: taxableInBand,
        taxDue,
      });
    }
  }

  const effectiveRate = purchasePrice > 0 ? (totalTax / purchasePrice) * 100 : 0;

  // Note for first-time buyers in Wales
  const effectiveBuyerType =
    buyerType === "first-time" ? "standard" : buyerType;

  return {
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
    region: "wales",
    buyerType: effectiveBuyerType,
    purchasePrice,
  };
}
