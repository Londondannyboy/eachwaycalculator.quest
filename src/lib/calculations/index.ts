import { PropertyDetails, StampDutyResult, Region, BuyerType } from "../types";
import { calculateEnglandSDLT } from "./england";
import { calculateScotlandLBTT } from "./scotland";
import { calculateWalesLTT } from "./wales";

export function calculateStampDuty(details: PropertyDetails): StampDutyResult {
  const { purchasePrice, region, buyerType } = details;

  switch (region) {
    case "england":
      return calculateEnglandSDLT(purchasePrice, buyerType);
    case "scotland":
      return calculateScotlandLBTT(purchasePrice, buyerType);
    case "wales":
      return calculateWalesLTT(purchasePrice, buyerType);
    default:
      return calculateEnglandSDLT(purchasePrice, buyerType);
  }
}

export function getRegionName(region: Region): string {
  switch (region) {
    case "england":
      return "England & Northern Ireland (SDLT)";
    case "scotland":
      return "Scotland (LBTT)";
    case "wales":
      return "Wales (LTT)";
    default:
      return "Unknown";
  }
}

export function getBuyerTypeName(buyerType: BuyerType): string {
  switch (buyerType) {
    case "first-time":
      return "First-time buyer";
    case "additional":
      return "Additional property";
    case "standard":
      return "Standard purchase";
    default:
      return "Unknown";
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export { calculateEnglandSDLT } from "./england";
export { calculateScotlandLBTT } from "./scotland";
export { calculateWalesLTT } from "./wales";
