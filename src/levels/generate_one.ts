import { randBetweenWithRng, randomTickerWithRng, createRng } from "../utils/utils.ts";

// --- Revenue Generator ---
// Generates 25 years (100 quarters) of revenue + EPS
export function generateOneRevenues(
  seed?: number,
  index: number = 0
): { seed: number; ticker: string; revenues: number[]; eps: number[]; growthLabel: string } {
  const usedSeed = typeof seed === "number" ? seed : Math.floor(Date.now() % 2147483647);
  const rng = createRng(usedSeed);

  const growthBands = [
    { label: "slow", min: -0.08, max: 0.02 },   // -1–4% annual
    { label: "steady", min: 0.01, max: 0.07 },  // 5–9% annual
    { label: "moderate", min: 0.07, max: 0.12 },  // 8–18% annual
    { label: "fast", min: 0.12, max: 0.26 }       // 10–20% annual
  ];

  const ticker = randomTickerWithRng(rng);
  const band = growthBands[index % growthBands.length];
  const baseAnnualGrowth = randBetweenWithRng(rng, band.min, band.max);

  let quarterlyGrowth = Math.pow(1 + baseAnnualGrowth, 1 / 4) - 1;

  let revenue = Math.max(1, Math.round(randBetweenWithRng(rng, 100, 10000))); // $100M–$10B

  const revenues: number[] = [];
  const eps: number[] = [];

  // Gentle macro cycle (5–15 years, ±5–10%)
  const cycleLength = 20 + Math.floor(rng() * 40);
  const cycleAmplitude = 0.05 + rng() * 0.05;

  // 100 quarters = 25 years of fundamentals to cover 5y offset + 20y sim
  for (let q = 0; q < 100; q++) {
    // Macro influence
    const cycle = Math.sin((2 * Math.PI * q) / cycleLength) * cycleAmplitude;

    // Mild quarterly noise
    const noise = (rng() - 0.5) * 0.02; // ±2%

    // Rare mild shock (–10% to +10%)
    const shock = rng() < 0.02 ? (rng() - 0.5) * 0.2 : 0;

    // Update revenue
    const effectiveGrowth = quarterlyGrowth + cycle / 4 + noise;
    revenue *= 1 + effectiveGrowth + shock;

    // Prevent collapse
    revenue = Math.max(1, revenue);

    const rounded = Math.round(revenue);
    revenues.push(rounded);

    // EPS ~ revenue/10 with ±10% wobble
    const epsVal = (rounded / 10) * (1 + (rng() - 0.5) * 0.1);
    eps.push(Math.max(0.01, parseFloat(epsVal.toFixed(2))));
  }

  return { seed: usedSeed, ticker, revenues, eps, growthLabel: band.label };
}


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
  