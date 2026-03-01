// Simple seeded RNG (mulberry32)
export function createRng(seed: number) {
    return function rng() {
        // mulberry32
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function randBetweenWithRng(rng: () => number, min: number, max: number): number {
    return rng() * (max - min) + min;
}

export function randomTickerWithRng(rng: () => number): string {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let ticker = "";
    for (let i = 0; i < 4; i++) {
        const idx = Math.floor(rng() * letters.length);
        ticker += letters.charAt(idx);
    }
    return ticker;
}

// Backwards-compatible wrappers that use Math.random when no RNG passed
export function randBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomTicker(): string {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let ticker = "";
    for (let i = 0; i < 4; i++) {
        ticker += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return ticker;
}
  