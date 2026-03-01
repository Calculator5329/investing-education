import { makeAutoObservable, observable, runInAction } from "mobx";
import Stock from "../objects/Stock";
import { generateOneRevenues, generateOnePrices } from "../levels/generate_one";

export type HistoryPoint = { week: number; value: number };

export type GameResult = {
  finalNav: number;
  finalBenchmarkNav: number;
  portfolioCagr: number;
  benchmarkCagr: number;
  pass: boolean;
  bestHoldings: Array<{ ticker: string; value: number }>;
  worstHoldings: Array<{ ticker: string; value: number }>;
  holdingsAreActual: boolean;
  top5: Array<{ ticker: string; returnMultiple: number; priceCagr: number; revenueCagr: number }>;
  bottom5: Array<{ ticker: string; returnMultiple: number; priceCagr: number; revenueCagr: number }>;
};

export const WEEKS_PER_YEAR = 48;
export const WEEKS_PER_QUARTER = 12;
export const YEARS = 20;

const START_YEARS_VISIBLE = 5;
const START_QUARTERS_VISIBLE = START_YEARS_VISIBLE * 4;
const START_WEEK_OFFSET = START_YEARS_VISIBLE * WEEKS_PER_YEAR;

export class GameStore {
  levelName = "Level 1: Revenue Growth";
  companies: Stock[] = [];

  portfolioCash = 10000;
  portfolioHoldings = observable.map<string, number>({});
  portfolioCostBasis = observable.map<string, number>({});
  portfolioHistory: HistoryPoint[] = [];

  benchmarkHoldings = observable.map<string, number>({});
  benchmarkHistory: HistoryPoint[] = [];

  readonly totalWeeks = YEARS * WEEKS_PER_YEAR;
  readonly startWeekOffset = START_WEEK_OFFSET;
  readonly startQuarterOffset = START_QUARTERS_VISIBLE;
  readonly startYearNumber = START_YEARS_VISIBLE + 1;

  weekIndex = START_WEEK_OFFSET;
  private endWeekIndex = this.startWeekOffset + YEARS * WEEKS_PER_YEAR - 1;

  isLoading = true;
  isRunning = false;
  isComplete = false;
  /** base tick interval in ms used at 1x speed; actual interval = baseTickInterval / speedMultiplier */
  baseTickInterval = 500;
  /** current speed multiplier (1 = normal, 10 = 10x) */
  speedMultiplier = 1;
  /** computed interval in ms used for setInterval */
  get tickIntervalMs() {
    // Avoid division by zero and keep minimum interval of 1ms
    return Math.max(1, Math.round(this.baseTickInterval / this.speedMultiplier));
  }
  private intervalHandle: number | null = null;

  lastUnlockedQuarter = 0;

  result: GameResult | null = null;
  showResultsDialog = false;

  get isGameOver() {
    return this.isComplete && this.result !== null;
  }

  constructor() {
    makeAutoObservable(this, undefined, { autoBind: true });
  }

  async initialize() {
    this.stop();
    this.isLoading = true;
    this.isComplete = false;
    this.result = null;
    this.showResultsDialog = false;
    this.weekIndex = this.startWeekOffset;
    this.endWeekIndex = this.startWeekOffset + YEARS * WEEKS_PER_YEAR - 1;
    this.portfolioCash = 10000;
    this.portfolioHoldings.clear();
    this.portfolioCostBasis.clear();
    this.benchmarkHoldings.clear();
    this.portfolioHistory = [];
    this.benchmarkHistory = [];
    this.lastUnlockedQuarter = this.startQuarterOffset - 1;

    const seedArray = this.createSeeds(10);
    const generatedCompanies: Stock[] = [];

    for (let i = 0; i < 10; i++) {
      const { ticker, revenues, eps, growthLabel } = generateOneRevenues(seedArray[i], i);
      const weeklyPrices = generateOnePrices(revenues, eps);

      const stock = new Stock(ticker);
      stock.name = `${growthLabel.toUpperCase()} Corp`;
      stock.revenue = revenues;
      stock.eps = eps;
      stock.weeklyPrices = weeklyPrices;
      stock.growthProfile = growthLabel as Stock["growthProfile"];
      stock.unlockedStats = new Set(["revenue"]);
      stock.historyLength = this.startQuarterOffset;
      stock.currentQuarterIndex = this.startQuarterOffset - 1;
      generatedCompanies.push(stock);
    }

    runInAction(() => {
      this.companies = generatedCompanies;
      this.setupBenchmark();
      this.recordSnapshotForWeek(this.weekIndex);
      this.isLoading = false;
    });
  }

  start(skipDelay = false) {
    if (this.isRunning || this.isLoading || this.isComplete) return;
    if (!this.portfolioHistory.length) {
      this.recordSnapshotForWeek(this.weekIndex);
    }
    this.isRunning = true;
    
    if (skipDelay) {
      // Start immediately (for speed changes)
      this.intervalHandle = window.setInterval(() => this.tick(), this.tickIntervalMs);
    } else {
      // Wait 5 seconds before starting the ticks (initial start only)
      setTimeout(() => {
        if (this.isRunning) { // Only start if still running (user didn't stop/reset)
          this.intervalHandle = window.setInterval(() => this.tick(), this.tickIntervalMs);
        }
      }, 5000);
    }
  }

  /** Toggle or set the speed multiplier (1 = normal, 10 = ten times faster). If the same value is passed, toggles back to 1x. Restarts the interval if running. */
  setSpeedMultiplier(mult: number) {
    if (!Number.isFinite(mult) || mult <= 0) return;
    // Toggle off if same multiplier is clicked again
    const newMult = this.speedMultiplier === mult ? 1 : mult;
    this.speedMultiplier = newMult;
    // if running, restart interval with new speed (skip delay)
    if (this.isRunning) {
      this.stop();
      this.start(true); // skipDelay = true
    }
  }

  stop() {
    if (this.intervalHandle != null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
  }

  dispose() {
    this.stop();
  }

  get weekLabel() {
    const elapsedWeeks = this.weekIndex - this.startWeekOffset;
    // Show user-facing year starting from 1, even though internally we start at year 6
    const year = 1 + Math.floor(elapsedWeeks / WEEKS_PER_YEAR);
    const week = (elapsedWeeks % WEEKS_PER_YEAR) + 1;
    return `Year ${year}, Week ${week}`;
  }

  get currentQuarter() {
    const elapsedWeeks = this.weekIndex - this.startWeekOffset;
    const quartersSinceStart = Math.floor(Math.max(0, elapsedWeeks) / WEEKS_PER_QUARTER);
    return this.startQuarterOffset - 1 + quartersSinceStart;
  }

  get portfolioNav() {
    return this.portfolioCash + this.currentHoldingsValue();
  }

  get progressPercent() {
    const elapsedWeeks = this.weekIndex - this.startWeekOffset;
    return Math.round(((elapsedWeeks + 1) / this.totalWeeks) * 100);
  }

  get holdingsSummary() {
    return Array.from(this.portfolioHoldings.entries()).map(([ticker, shares]) => {
      const price = this.getPriceForWeek(ticker, this.weekIndex);
      const value = shares * price;
      const cost = this.portfolioCostBasis.get(ticker) ?? 0;
      const gain = value - cost;
      const gainPct = cost > 0 ? gain / cost : 0;
      return {
        ticker,
        shares,
        value,
        gain,
        gainPct,
      };
    }).sort((a, b) => b.value - a.value);
  }

  currentHoldingsValue(week = this.weekIndex) {
    let total = 0;
    for (const [ticker, shares] of this.portfolioHoldings.entries()) {
      const price = this.getPriceForWeek(ticker, week);
      total += shares * price;
    }
    return total;
  }

  benchmarkValue(week = this.weekIndex) {
    let total = 0;
    for (const [ticker, shares] of this.benchmarkHoldings.entries()) {
      const price = this.getPriceForWeek(ticker, week);
      total += shares * price;
    }
    return total;
  }

  tick() {
    if (this.isLoading || this.isComplete) return;

    const nextWeek = this.weekIndex + 1;
    if (nextWeek > this.endWeekIndex) {
      this.finish();
      return;
    }

    this.weekIndex = nextWeek;

    const elapsedWeeks = this.weekIndex - this.startWeekOffset;
    const quartersSinceStart = Math.floor(Math.max(0, elapsedWeeks) / WEEKS_PER_QUARTER);
    const desiredQuarter = this.startQuarterOffset - 1 + quartersSinceStart;
    if (desiredQuarter > this.lastUnlockedQuarter) {
      this.lastUnlockedQuarter = desiredQuarter;
      this.unlockNextQuarter(desiredQuarter);
    }

    this.recordSnapshotForWeek(this.weekIndex);

    if (this.weekIndex === this.endWeekIndex) {
      this.finish();
    }
  }

  buy(ticker: string) {
    if (this.isComplete) return;
    const price = this.getPriceForWeek(ticker, this.weekIndex);
    if (price <= 0) return;

    const amount = Math.min(1000, this.portfolioCash);
    if (amount <= 0) return;

    const sharesToBuy = amount / price;
    const existing = this.portfolioHoldings.get(ticker) ?? 0;
    this.portfolioHoldings.set(ticker, existing + sharesToBuy);
    const existingCost = this.portfolioCostBasis.get(ticker) ?? 0;
    this.portfolioCostBasis.set(ticker, existingCost + amount);
    this.portfolioCash -= amount;
    this.updateCurrentWeekSnapshot();
  }

  sell(ticker: string) {
    if (this.isComplete) return;
    const price = this.getPriceForWeek(ticker, this.weekIndex);
    const owned = this.portfolioHoldings.get(ticker) ?? 0;
    if (price <= 0 || owned <= 0) return;

    const maxLiquidationValue = owned * price;
    const amount = Math.min(1000, maxLiquidationValue);
    if (amount <= 0) return;

    if (amount === maxLiquidationValue) {
      this.portfolioHoldings.delete(ticker);
      this.portfolioCostBasis.delete(ticker);
    } else {
      const sharesRemaining = owned - amount / price;
      this.portfolioHoldings.set(ticker, sharesRemaining);
      const existingCost = this.portfolioCostBasis.get(ticker) ?? 0;
      const costPerShare = owned > 0 ? existingCost / owned : 0;
      const newCost = Math.max(0, existingCost - costPerShare * (amount / price));
      this.portfolioCostBasis.set(ticker, newCost);
    }
    this.portfolioCash += amount;
    this.updateCurrentWeekSnapshot();
  }

  getPriceForWeek(ticker: string, week: number) {
    const company = this.companies.find((c) => c.ticker === ticker);
    if (!company) return 0;
    const idx = Math.min(Math.max(week, 0), company.weeklyPrices.length - 1);
    return company.weeklyPrices[idx] ?? 0;
  }

  canBuy() {
    return !this.isComplete && this.portfolioCash > 0;
  }

  canSell(ticker: string) {
    return !this.isComplete && (this.portfolioHoldings.get(ticker) ?? 0) > 0;
  }

  private recordSnapshotForWeek(week: number) {
    const portfolioValue = this.portfolioCash + this.currentHoldingsValue(week);
    const benchmarkValue = this.benchmarkValue(week);

    const elapsedWeek = week - this.startWeekOffset;
    this.upsertHistoryPoint(this.portfolioHistory, { week: elapsedWeek, value: portfolioValue });
    this.upsertHistoryPoint(this.benchmarkHistory, { week: elapsedWeek, value: benchmarkValue });
  }

  private unlockNextQuarter(currentQuarter: number) {
    this.companies.forEach((company) => {
      const nextLength = Math.min(company.revenue.length, currentQuarter + 1);
      company.historyLength = Math.max(company.historyLength, nextLength);
      company.currentQuarterIndex = Math.min(currentQuarter, company.revenue.length - 1);
      const quarterIndex = company.currentQuarterIndex;

      if (quarterIndex > 0) {
        const quarterRevenue = company.revenue[quarterIndex];
        if (Number.isFinite(quarterRevenue)) {
          // Placeholder for future unlock logic. Level 1 keeps revenue only.
        }
      }
    });
  }

  private updateCurrentWeekSnapshot() {
    if (this.portfolioHistory.length === 0) return;
    this.recordSnapshotForWeek(this.weekIndex);
  }

  private upsertHistoryPoint(history: HistoryPoint[], point: HistoryPoint) {
    const idx = history.findIndex((entry) => entry.week === point.week);
    if (idx >= 0) {
      history[idx] = point;
    } else {
      history.push(point);
    }
  }

  private finish() {
    this.stop();
    this.isComplete = true;

    const finalNav = this.portfolioNav;
    const finalBenchmarkNav = this.benchmarkValue(this.weekIndex);
    const initialNav = this.portfolioHistory[0]?.value ?? 10000;
    const initialBenchmark = this.benchmarkHistory[0]?.value ?? 10000;

    const portfolioCagr = this.calculateCagr(initialNav, finalNav, YEARS);
    const benchmarkCagr = this.calculateCagr(initialBenchmark, finalBenchmarkNav, YEARS);

    const holdingsArray = Array.from(this.portfolioHoldings.entries()).map(([ticker, shares]) => ({
      ticker,
      value: shares * this.getPriceForWeek(ticker, this.weekIndex),
    }));

    const hasHoldings = holdingsArray.length > 0;
    const sortedHoldings = hasHoldings
      ? [...holdingsArray].sort((a, b) => b.value - a.value)
      : this.companies
          .map((company) => {
            const start = company.weeklyPrices[0] ?? 1;
            const end = company.weeklyPrices[this.weekIndex] ?? start;
            const ret = end / start;
            return { ticker: company.ticker, value: ret };
          })
          .sort((a, b) => b.value - a.value);

    const bestHoldings = sortedHoldings.slice(0, 3);
    const worstHoldings = sortedHoldings.slice(-3).reverse();

    // Compute Top/Bottom 5 companies by total return CAGR over the game period
    const startWeek = this.startWeekOffset;
    const endWeek = this.weekIndex;
    const startQuarterIdx = this.startQuarterOffset - 1;
    const endQuarterIdx = this.companies[0]
      ? Math.min(
          this.companies[0].revenue.length - 1,
          this.companies[0].currentQuarterIndex ?? startQuarterIdx
        )
      : startQuarterIdx;

    const companyStats = this.companies.map((c) => {
      const startPrice = c.weeklyPrices[startWeek] ?? c.weeklyPrices[0] ?? 1;
      const endPrice = c.weeklyPrices[endWeek] ?? startPrice;
      const priceCagr = this.calculateCagr(startPrice, endPrice, YEARS);
      const returnMultiple = startPrice > 0 ? endPrice / startPrice : 0;

      const rqStart = Math.max(0, startQuarterIdx);
      const rqEnd = Math.max(rqStart, endQuarterIdx);
      const revStart = c.revenue[rqStart] ?? 0;
      const revEnd = c.revenue[rqEnd] ?? revStart;
      const revenueCagr = revStart > 0 && revEnd > 0 ? this.calculateCagr(revStart, revEnd, YEARS) : 0;

      return { ticker: c.ticker, returnMultiple, priceCagr, revenueCagr };
    });

    const sortedByPrice = [...companyStats].sort((a, b) => b.priceCagr - a.priceCagr);
    const top5 = sortedByPrice.slice(0, 5);
    const bottom5 = sortedByPrice.slice(-5).reverse();

    this.result = {
      finalNav,
      finalBenchmarkNav,
      portfolioCagr,
      benchmarkCagr,
      pass: finalNav >= finalBenchmarkNav,
      bestHoldings,
      worstHoldings,
      holdingsAreActual: hasHoldings,
      top5,
      bottom5,
    };

    this.showResultsDialog = true;
  }

  private calculateCagr(initial: number, final: number, years: number) {
    if (initial <= 0 || final <= 0 || years <= 0) return 0;
    return Math.pow(final / initial, 1 / years) - 1;
  }

  private setupBenchmark() {
    if (!this.companies.length) return;
    const initialValue = 10000;
    const perStock = initialValue / this.companies.length;
    this.companies.forEach((company) => {
      const price = company.weeklyPrices[this.startWeekOffset] || company.weeklyPrices[0] || 1;
      const shares = perStock / price;
      this.benchmarkHoldings.set(company.ticker, shares);
    });
  }

  private createSeeds(count: number) {
    const seedArray = new Uint32Array(count);
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      crypto.getRandomValues(seedArray);
    } else {
      for (let i = 0; i < count; i++) {
        seedArray[i] = Math.floor(Math.random() * 0xffffffff);
      }
    }
    return seedArray;
  }

  async retry() {
    await this.initialize();
  }

  closeResultsDialog() {
    this.showResultsDialog = false;
  }
}


