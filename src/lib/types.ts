// Each Way Calculator Types

export type OddsFormat = "fractional" | "decimal" | "american";
export type BetOutcome = "won" | "placed" | "lost";
export type EachWayTerms = "1/4" | "1/5" | "1/6" | "1/8";
export type RaceType = "horse-racing" | "greyhound" | "golf" | "other";

export interface OddsInput {
  fractionalNumerator?: number;
  fractionalDenominator?: number;
  decimal?: number;
  american?: number;
  format: OddsFormat;
}

export interface BetDetails {
  stake: number; // Stake per part (so total stake = stake * 2)
  odds: OddsInput;
  eachWayTerms: EachWayTerms;
  numberOfPlaces: number; // How many places pay out (2, 3, 4, 5)
  outcome: BetOutcome;
  raceType: RaceType;
  numberOfRunners?: number;
}

export interface EachWayResult {
  // Stakes
  stakePerPart: number;
  totalStake: number;

  // Odds (converted)
  winOddsDecimal: number;
  winOddsFractional: string;
  placeOddsDecimal: number;
  placeOddsFractional: string;

  // Returns if WON (both parts pay)
  winBetReturn: number;
  winBetProfit: number;
  placeBetReturnIfWon: number;
  placeBetProfitIfWon: number;
  totalReturnIfWon: number;
  totalProfitIfWon: number;

  // Returns if PLACED ONLY (only place part pays)
  placeBetReturnIfPlaced: number;
  placeBetProfitIfPlaced: number;
  totalReturnIfPlaced: number;
  totalProfitIfPlaced: number;

  // If Lost
  totalLoss: number;

  // Actual result based on outcome
  actualReturn: number;
  actualProfit: number;

  // Each way terms info
  eachWayFraction: number;
  placesPayingOut: number;

  // Breakdown for display
  breakdown: {
    winPart: {
      stake: number;
      odds: string;
      potentialReturn: number;
      potentialProfit: number;
      actualReturn: number;
    };
    placePart: {
      stake: number;
      odds: string;
      potentialReturn: number;
      potentialProfit: number;
      actualReturn: number;
    };
  };
}

export interface EachWayTermsInfo {
  terms: EachWayTerms;
  fraction: number;
  label: string;
  typicalUse: string;
}

export interface PlaceTermsRule {
  runners: string;
  places: number;
  terms: EachWayTerms;
  description: string;
}

export interface MultipleBet {
  selections: BetDetails[];
  betType: "single" | "double" | "treble" | "accumulator";
  totalStake: number;
}

// For comparing different scenarios
export interface ScenarioComparison {
  scenario: string;
  stake: number;
  totalStake: number;
  returnIfWon: number;
  profitIfWon: number;
  returnIfPlaced: number;
  profitIfPlaced: number;
  loss: number;
}
