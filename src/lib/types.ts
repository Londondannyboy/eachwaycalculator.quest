export type Region = "england" | "scotland" | "wales";
export type PropertyType = "residential" | "commercial";
export type BuyerType = "standard" | "first-time" | "additional";

export interface PropertyDetails {
  purchasePrice: number;
  region: Region;
  propertyType: PropertyType;
  buyerType: BuyerType;
}

export interface TaxBand {
  threshold: number;
  rate: number;
  name: string;
}

export interface CalculationBand {
  bandName: string;
  from: number;
  to: number;
  rate: number;
  taxableAmount: number;
  taxDue: number;
}

export interface StampDutyResult {
  totalTax: number;
  effectiveRate: number;
  breakdown: CalculationBand[];
  region: Region;
  buyerType: BuyerType;
  purchasePrice: number;
}
