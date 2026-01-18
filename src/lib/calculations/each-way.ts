// Each Way Calculation Logic

import {
  BetDetails,
  EachWayResult,
  OddsInput,
  EachWayTerms,
  EachWayTermsInfo,
  PlaceTermsRule,
  ScenarioComparison,
} from "../types";

// Standard each-way terms information
export const EACH_WAY_TERMS: EachWayTermsInfo[] = [
  {
    terms: "1/4",
    fraction: 0.25,
    label: "1/4 odds",
    typicalUse: "Most horse racing (5-7 runners), golf",
  },
  {
    terms: "1/5",
    fraction: 0.2,
    label: "1/5 odds",
    typicalUse: "Horse racing (8+ runners), most sports",
  },
  {
    terms: "1/6",
    fraction: 1 / 6,
    label: "1/6 odds",
    typicalUse: "Some promotions, greyhounds",
  },
  {
    terms: "1/8",
    fraction: 0.125,
    label: "1/8 odds",
    typicalUse: "Some golf events, special offers",
  },
];

// Standard place terms rules for horse racing
export const HORSE_RACING_PLACE_RULES: PlaceTermsRule[] = [
  {
    runners: "2-4",
    places: 1,
    terms: "1/4",
    description: "Win only (no each-way betting)",
  },
  {
    runners: "5-7",
    places: 2,
    terms: "1/4",
    description: "1st & 2nd at 1/4 odds",
  },
  {
    runners: "8+",
    places: 3,
    terms: "1/5",
    description: "1st, 2nd & 3rd at 1/5 odds",
  },
  {
    runners: "12-15 (handicap)",
    places: 3,
    terms: "1/4",
    description: "1st, 2nd & 3rd at 1/4 odds",
  },
  {
    runners: "16+ (handicap)",
    places: 4,
    terms: "1/4",
    description: "1st, 2nd, 3rd & 4th at 1/4 odds",
  },
];

// Convert odds between formats
export function convertToDecimal(odds: OddsInput): number {
  switch (odds.format) {
    case "fractional":
      if (odds.fractionalNumerator && odds.fractionalDenominator) {
        return odds.fractionalNumerator / odds.fractionalDenominator + 1;
      }
      return 1;
    case "decimal":
      return odds.decimal || 1;
    case "american":
      if (!odds.american) return 1;
      if (odds.american > 0) {
        return odds.american / 100 + 1;
      } else {
        return 100 / Math.abs(odds.american) + 1;
      }
    default:
      return 1;
  }
}

export function decimalToFractional(decimal: number): string {
  // Convert decimal to fractional
  const fraction = decimal - 1;

  // Common fractions lookup for cleaner output
  const commonFractions: Record<string, string> = {
    "0.5": "1/2",
    "0.33": "1/3",
    "0.25": "1/4",
    "0.2": "1/5",
    "0.166": "1/6",
    "0.125": "1/8",
    "1": "Evens",
    "2": "2/1",
    "3": "3/1",
    "4": "4/1",
    "5": "5/1",
    "6": "6/1",
    "7": "7/1",
    "8": "8/1",
    "9": "9/1",
    "10": "10/1",
    "1.5": "3/2",
    "2.5": "5/2",
    "3.5": "7/2",
    "4.5": "9/2",
  };

  const key = fraction.toFixed(2).replace(/\.?0+$/, "");
  if (commonFractions[key]) {
    return commonFractions[key];
  }

  // For non-standard fractions, approximate
  // Find the best fraction with denominator up to 10
  let bestNumerator = 1;
  let bestDenominator = 1;
  let bestError = Math.abs(fraction - 1);

  for (let d = 1; d <= 10; d++) {
    const n = Math.round(fraction * d);
    const error = Math.abs(fraction - n / d);
    if (error < bestError) {
      bestError = error;
      bestNumerator = n;
      bestDenominator = d;
    }
  }

  if (bestDenominator === 1) {
    return `${bestNumerator}/1`;
  }
  return `${bestNumerator}/${bestDenominator}`;
}

export function getEachWayFraction(terms: EachWayTerms): number {
  switch (terms) {
    case "1/4":
      return 0.25;
    case "1/5":
      return 0.2;
    case "1/6":
      return 1 / 6;
    case "1/8":
      return 0.125;
    default:
      return 0.25;
  }
}

// Main calculation function
export function calculateEachWay(bet: BetDetails): EachWayResult {
  const stake = bet.stake;
  const totalStake = stake * 2;

  // Convert odds to decimal
  const winOddsDecimal = convertToDecimal(bet.odds);
  const winOddsFractional = decimalToFractional(winOddsDecimal);

  // Calculate place odds
  const eachWayFraction = getEachWayFraction(bet.eachWayTerms);
  const placeOddsDecimal = (winOddsDecimal - 1) * eachWayFraction + 1;
  const placeOddsFractional = decimalToFractional(placeOddsDecimal);

  // Calculate returns IF WON (both parts pay)
  const winBetReturn = stake * winOddsDecimal;
  const winBetProfit = winBetReturn - stake;
  const placeBetReturnIfWon = stake * placeOddsDecimal;
  const placeBetProfitIfWon = placeBetReturnIfWon - stake;
  const totalReturnIfWon = winBetReturn + placeBetReturnIfWon;
  const totalProfitIfWon = totalReturnIfWon - totalStake;

  // Calculate returns IF PLACED ONLY (only place part pays)
  const placeBetReturnIfPlaced = stake * placeOddsDecimal;
  const placeBetProfitIfPlaced = placeBetReturnIfPlaced - stake;
  const totalReturnIfPlaced = placeBetReturnIfPlaced; // Win bet returns nothing
  const totalProfitIfPlaced = totalReturnIfPlaced - totalStake;

  // Total loss
  const totalLoss = totalStake;

  // Actual result based on outcome
  let actualReturn = 0;
  let actualProfit = 0;
  let winPartActualReturn = 0;
  let placePartActualReturn = 0;

  switch (bet.outcome) {
    case "won":
      actualReturn = totalReturnIfWon;
      actualProfit = totalProfitIfWon;
      winPartActualReturn = winBetReturn;
      placePartActualReturn = placeBetReturnIfWon;
      break;
    case "placed":
      actualReturn = totalReturnIfPlaced;
      actualProfit = totalProfitIfPlaced;
      winPartActualReturn = 0;
      placePartActualReturn = placeBetReturnIfPlaced;
      break;
    case "lost":
      actualReturn = 0;
      actualProfit = -totalLoss;
      winPartActualReturn = 0;
      placePartActualReturn = 0;
      break;
  }

  return {
    stakePerPart: stake,
    totalStake,
    winOddsDecimal,
    winOddsFractional,
    placeOddsDecimal,
    placeOddsFractional,
    winBetReturn,
    winBetProfit,
    placeBetReturnIfWon,
    placeBetProfitIfWon,
    totalReturnIfWon,
    totalProfitIfWon,
    placeBetReturnIfPlaced,
    placeBetProfitIfPlaced,
    totalReturnIfPlaced,
    totalProfitIfPlaced,
    totalLoss,
    actualReturn,
    actualProfit,
    eachWayFraction,
    placesPayingOut: bet.numberOfPlaces,
    breakdown: {
      winPart: {
        stake,
        odds: winOddsFractional,
        potentialReturn: winBetReturn,
        potentialProfit: winBetProfit,
        actualReturn: winPartActualReturn,
      },
      placePart: {
        stake,
        odds: placeOddsFractional,
        potentialReturn: placeBetReturnIfWon,
        potentialProfit: placeBetProfitIfWon,
        actualReturn: placePartActualReturn,
      },
    },
  };
}

// Compare different stakes
export function compareStakes(
  odds: OddsInput,
  stakes: number[],
  eachWayTerms: EachWayTerms,
  numberOfPlaces: number
): ScenarioComparison[] {
  return stakes.map((stake) => {
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
      scenario: `£${stake} E/W`,
      stake,
      totalStake: result.totalStake,
      returnIfWon: result.totalReturnIfWon,
      profitIfWon: result.totalProfitIfWon,
      returnIfPlaced: result.totalReturnIfPlaced,
      profitIfPlaced: result.totalProfitIfPlaced,
      loss: result.totalLoss,
    };
  });
}

// Compare each-way vs win only
export function compareEachWayVsWinOnly(
  stake: number,
  odds: OddsInput,
  eachWayTerms: EachWayTerms,
  numberOfPlaces: number
): { eachWay: ScenarioComparison; winOnly: ScenarioComparison } {
  const ewBet: BetDetails = {
    stake,
    odds,
    eachWayTerms,
    numberOfPlaces,
    outcome: "won",
    raceType: "horse-racing",
  };
  const ewResult = calculateEachWay(ewBet);

  // Win only bet with same total stake (double the E/W stake)
  const winOnlyStake = stake * 2;
  const winOddsDecimal = convertToDecimal(odds);

  return {
    eachWay: {
      scenario: "Each Way",
      stake,
      totalStake: ewResult.totalStake,
      returnIfWon: ewResult.totalReturnIfWon,
      profitIfWon: ewResult.totalProfitIfWon,
      returnIfPlaced: ewResult.totalReturnIfPlaced,
      profitIfPlaced: ewResult.totalProfitIfPlaced,
      loss: ewResult.totalLoss,
    },
    winOnly: {
      scenario: "Win Only",
      stake: winOnlyStake,
      totalStake: winOnlyStake,
      returnIfWon: winOnlyStake * winOddsDecimal,
      profitIfWon: winOnlyStake * winOddsDecimal - winOnlyStake,
      returnIfPlaced: 0, // Win only returns nothing if just placed
      profitIfPlaced: -winOnlyStake,
      loss: winOnlyStake,
    },
  };
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Suggest place terms based on number of runners
export function suggestPlaceTerms(
  runners: number,
  isHandicap: boolean = false
): { places: number; terms: EachWayTerms } {
  if (runners <= 4) {
    return { places: 1, terms: "1/4" }; // Win only effectively
  }
  if (runners <= 7) {
    return { places: 2, terms: "1/4" };
  }
  if (isHandicap && runners >= 16) {
    return { places: 4, terms: "1/4" };
  }
  if (isHandicap && runners >= 12) {
    return { places: 3, terms: "1/4" };
  }
  return { places: 3, terms: "1/5" };
}

// Parse fractional odds string like "5/1" or "11/4"
export function parseFractionalOdds(oddsString: string): OddsInput | null {
  const match = oddsString.trim().match(/^(\d+)\s*[/]\s*(\d+)$/);
  if (match) {
    return {
      format: "fractional",
      fractionalNumerator: parseInt(match[1]),
      fractionalDenominator: parseInt(match[2]),
    };
  }

  // Check for "Evens" or "EVS"
  if (oddsString.toLowerCase() === "evens" || oddsString.toLowerCase() === "evs") {
    return {
      format: "fractional",
      fractionalNumerator: 1,
      fractionalDenominator: 1,
    };
  }

  return null;
}

// Parse decimal odds
export function parseDecimalOdds(oddsString: string): OddsInput | null {
  const decimal = parseFloat(oddsString);
  if (!isNaN(decimal) && decimal >= 1) {
    return {
      format: "decimal",
      decimal,
    };
  }
  return null;
}

// Parse American odds
export function parseAmericanOdds(oddsString: string): OddsInput | null {
  const match = oddsString.trim().match(/^([+-]?\d+)$/);
  if (match) {
    const american = parseInt(match[1]);
    if (american !== 0) {
      return {
        format: "american",
        american,
      };
    }
  }
  return null;
}
