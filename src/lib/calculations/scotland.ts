import { BuyerType, CalculationBand, StampDutyResult } from "../types";

// Scotland LBTT (Land and Buildings Transaction Tax) rates (2024/25)

interface RateBand {
  from: number;
  to: number;
  rate: number;
  name: string;
}

// Standard residential rates
const standardRates: RateBand[] = [
  { from: 0, to: 145000, rate: 0, name: "Up to £145,000" },
  { from: 145000, to: 250000, rate: 0.02, name: "£145,001 to £250,000" },
  { from: 250000, to: 325000, rate: 0.05, name: "£250,001 to £325,000" },
  { from: 325000, to: 750000, rate: 0.1, name: "£325,001 to £750,000" },
  { from: 750000, to: Infinity, rate: 0.12, name: "Over £750,000" },
];

// First-time buyer rates (properties up to £175,000 threshold)
const firstTimeBuyerRates: RateBand[] = [
  { from: 0, to: 175000, rate: 0, name: "Up to £175,000" },
  { from: 175000, to: 250000, rate: 0.02, name: "£175,001 to £250,000" },
  { from: 250000, to: 325000, rate: 0.05, name: "£250,001 to £325,000" },
  { from: 325000, to: 750000, rate: 0.1, name: "£325,001 to £750,000" },
  { from: 750000, to: Infinity, rate: 0.12, name: "Over £750,000" },
];

// Additional Dwelling Supplement (ADS)
const ADS_RATE = 0.06; // 6% on additional properties
const ADS_THRESHOLD = 40000;

export function calculateScotlandLBTT(
  purchasePrice: number,
  buyerType: BuyerType
): StampDutyResult {
  const rates = buyerType === "first-time" ? firstTimeBuyerRates : standardRates;

  // ADS applies to the whole purchase price for additional properties
  const adsAmount =
    buyerType === "additional" && purchasePrice > ADS_THRESHOLD
      ? purchasePrice * ADS_RATE
      : 0;

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

  // Add ADS as a separate line item if applicable
  if (adsAmount > 0) {
    breakdown.push({
      bandName: "Additional Dwelling Supplement (6%)",
      from: 0,
      to: purchasePrice,
      rate: ADS_RATE,
      taxableAmount: purchasePrice,
      taxDue: adsAmount,
    });
    totalTax += adsAmount;
  }

  const effectiveRate = purchasePrice > 0 ? (totalTax / purchasePrice) * 100 : 0;

  return {
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
    region: "scotland",
    buyerType,
    purchasePrice,
  };
}
