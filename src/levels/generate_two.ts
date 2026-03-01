import { randBetweenWithRng, randomTickerWithRng, createRng } from "../utils/utils.ts";

export type GrowthProfile = "flashy" | "steady";

// --- Revenue Generator for Level 2 ---
export function generateLevel2Revenues(
  seed?: number,
  profile: GrowthProfile = "steady"
): { seed: number; ticker: string; revenues: number[]; eps: number[]; growthLabel: string } {
  const usedSeed = typeof seed === "number" ? seed : Math.floor(Date.now() % 2147483647);
  const rng = createRng(usedSeed);

  const ticker = randomTickerWithRng(rng);

  let baseAnnualGrowth: number;
  let volatility: number;
  let shockChance: number;
  let cycleAmplitude: number;

  if (profile === "flashy") {
    // Flashy: high growth but chaos
    baseAnnualGrowth = randBetweenWithRng(rng, 0.08, 0.25);   // 8–25% annual
    volatility = 0.08;  // ±8% quarterly swings
    shockChance = 0.05; // 5% chance per quarter of huge shocks
    cycleAmplitude = 0.15; // big macro swings
  } else {
    // Steady: lower growth, very stable
    baseAnnualGrowth = randBetweenWithRng(rng, 0.05, 0.10);   // 5–10% annual
    volatility = 0.01;  // ±1% quarterly noise
    shockChance = 0.005; // extremely rare shocks
    cycleAmplitude = 0.03; // tiny cycles
  }

  let quarterlyGrowth = Math.pow(1 + baseAnnualGrowth, 1 / 4) - 1;
  let revenue = Math.max(1, Math.round(randBetweenWithRng(rng, 100, 10000)));

  const revenues: number[] = [];
  const eps: number[] = [];

  const cycleLength = 20 + Math.floor(rng() * 40);

  for (let q = 0; q < 100; q++) {
    const cycle = Math.sin((2 * Math.PI * q) / cycleLength) * cycleAmplitude;

    const noise = (rng() - 0.5) * 2 * volatility; // profile-specific noise

    const shock = rng() < shockChance ? (rng() - 0.5) * 0.4 : 0; // up to ±40%

    const effectiveGrowth = quarterlyGrowth + cycle / 4 + noise;
    revenue *= 1 + effectiveGrowth + shock;
    revenue = Math.max(1, revenue);

    const rounded = Math.round(revenue);
    revenues.push(rounded);

    const epsVal = (rounded / 10) * (1 + (rng() - 0.5) * 0.1);
    eps.push(Math.max(0.01, parseFloat(epsVal.toFixed(2))));
  }

  return { seed: usedSeed, ticker, revenues, eps, growthLabel: profile };
}

// --- Price Generator Reuse ---
// You can reuse generateOnePrices from Level 1, no need to duplicate.
// Just feed in the different revenue/eps arrays for flashy vs steady.

// --- Price Generator ---
// Generates 1,200 weekly prices with natural swings (25y × 48w)
export function generateOnePrices(
    revenues: number[],
    eps: number[],
    peBase: number = 20,
    rng?: () => number
  ): number[] {
    const weeklyPrices: number[] = [];
    const usedRng = rng ?? createRng(Math.floor(Date.now() % 2147483647));
  
    // Start near fair value
    let price = eps[0] * peBase;
  
    // Volatility state (changes slowly over time)
    let volState = 0.02; // baseline ~2% weekly stddev
  
    for (let q = 0; q < revenues.length; q++) {
      const fairValue = eps[q] * peBase;
  
      for (let w = 0; w < 12; w++) {
        // Drift toward fair value (mean reversion)
        const reversionStrength = 0.02; // pull ~2% toward fair value each week
        const reversion = (fairValue - price) * reversionStrength;
  
        // Update volatility state (simulate clustering)
        volState += (usedRng() - 0.5) * 0.01;
        volState = Math.max(0.01, Math.min(0.08, volState)); // clamp 1–8%
  
        // Random shock
        let shock = 0;
        if (usedRng() < 0.002) {
          // ~0.2% chance per week (about once every 10 years)
          const magnitude = 0.1 + usedRng() * 0.2; // 10–30%
          shock = (usedRng() < 0.5 ? -1 : 1) * magnitude * price;
        }
  
        // Random return with volatility
        const randomMove = (usedRng() * 2 - 1) * volState * price;
  
        // Update price
        price = Math.max(
          1,
          price + reversion + randomMove + shock
        );
  
        weeklyPrices.push(Math.round(price));
      }
    }
  
    return weeklyPrices;
  }
  