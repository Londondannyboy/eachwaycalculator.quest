import { BuyerType, CalculationBand, StampDutyResult } from "../types";

// England & Northern Ireland SDLT rates (2024/25)
// Note: Rates valid as of April 2024

interface RateBand {
  from: number;
  to: number;
  rate: number;
  name: string;
}

// Standard residential rates
const standardRates: RateBand[] = [
  { from: 0, to: 250000, rate: 0, name: "Up to £250,000" },
  { from: 250000, to: 925000, rate: 0.05, name: "£250,001 to £925,000" },
  { from: 925000, to: 1500000, rate: 0.1, name: "£925,001 to £1,500,000" },
  { from: 1500000, to: Infinity, rate: 0.12, name: "Over £1,500,000" },
];

// First-time buyer rates (properties up to £625,000)
const firstTimeBuyerRates: RateBand[] = [
  { from: 0, to: 425000, rate: 0, name: "Up to £425,000" },
  { from: 425000, to: 625000, rate: 0.05, name: "£425,001 to £625,000" },
];

// Additional property surcharge
const ADDITIONAL_PROPERTY_SURCHARGE = 0.03;

// Higher rate threshold for additional properties
const ADDITIONAL_PROPERTY_THRESHOLD = 40000;

export function calculateEnglandSDLT(
  purchasePrice: number,
  buyerType: BuyerType
): StampDutyResult {
  // First-time buyers only get relief on properties up to £625,000
  const useFirstTimeBuyerRates =
    buyerType === "first-time" && purchasePrice <= 625000;

  const rates = useFirstTimeBuyerRates ? firstTimeBuyerRates : standardRates;

  // Additional property surcharge applies to the whole purchase price
  // if property is over £40,000
  const surcharge =
    buyerType === "additional" && purchasePrice > ADDITIONAL_PROPERTY_THRESHOLD
      ? ADDITIONAL_PROPERTY_SURCHARGE
      : 0;

  const breakdown: CalculationBand[] = [];
  let totalTax = 0;
  let remainingAmount = purchasePrice;

  for (const band of rates) {
    if (remainingAmount <= 0) break;

    const bandStart = band.from;
    const bandEnd = band.to;
    const bandSize = bandEnd - bandStart;

    // How much of this band applies?
    const taxableInBand = Math.min(
      remainingAmount,
      purchasePrice > bandStart ? Math.min(bandSize, purchasePrice - bandStart) : 0
    );

    if (taxableInBand > 0 && purchasePrice > bandStart) {
      const effectiveRate = band.rate + surcharge;
      const taxDue = taxableInBand * effectiveRate;
      totalTax += taxDue;

      breakdown.push({
        bandName: band.name,
        from: bandStart,
        to: Math.min(bandEnd, purchasePrice),
        rate: effectiveRate,
        taxableAmount: taxableInBand,
        taxDue,
      });

      remainingAmount -= taxableInBand;
    }
  }

  // Handle amounts above the highest band threshold
  if (remainingAmount > 0 && purchasePrice > 1500000) {
    const highestRate = 0.12 + surcharge;
    const taxDue = remainingAmount * highestRate;
    totalTax += taxDue;

    breakdown.push({
      bandName: "Over £1,500,000",
      from: 1500000,
      to: purchasePrice,
      rate: highestRate,
      taxableAmount: remainingAmount,
      taxDue,
    });
  }

  const effectiveRate = purchasePrice > 0 ? (totalTax / purchasePrice) * 100 : 0;

  return {
    totalTax: Math.round(totalTax * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    breakdown,
    region: "england",
    buyerType,
    purchasePrice,
  };
}
