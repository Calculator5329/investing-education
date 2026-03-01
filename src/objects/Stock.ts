import { makeAutoObservable } from "mobx";

class Stock {
  ticker: string;                // unique ID, e.g. "ABCD"
  name: string;                  // Company name
  industry: string;              // Sector / flavor text
  description: string;           // Optional narrative hook

  // Financials (quarterly, arrays of length 100 for 25 years)
  revenue: number[];             // top line
  operatingIncome: number[];     // EBIT
  netIncome: number[];           // after tax
  eps: number[];                 // earnings per share
  freeCashFlow: number[];        // cash-based profitability
  dividends: number[];           // quarterly dividend payout per share

  // Balance sheet (quarterly snapshots)
  totalAssets: number[];
  totalLiabilities: number[];
  equity: number[];
  cash: number[];   
  debt: number[];

  // Market data (weekly, 1200 entries for 25 years)
  weeklyPrices: number[];
  marketCap: number[];
  volatility: number[];

  // Derived stats (calculated, not directly generated)
  profitMargin: number[];
  operatingMargin: number[];
  debtToEquity: number[];
  returnOnEquity: number[];
  peRatio: number[];
  priceToBook: number[];

  // Gameplay / metadata
  moatStrength: number;          // 0–100 durability score
  growthProfile: "steady" | "volatile" | "declining" | "explosive";
  riskFlags: string[];
  intrinsicValue: number[];
  unlockedStats: Set<string>;    // controls what’s visible to player
  historyLength: number;         // how much data is visible at start (e.g. 5 years = 20 quarters)
  currentQuarterIndex: number;   // tracks the latest quarter index revealed to the player

  constructor(ticker: string) {
    this.ticker = ticker;
    this.name = "";
    this.industry = "";
    this.description = "";

    this.revenue = [];
    this.operatingIncome = [];
    this.netIncome = [];
    this.eps = [];
    this.freeCashFlow = [];
    this.dividends = [];

    this.totalAssets = [];
    this.totalLiabilities = [];
    this.equity = [];
    this.cash = [];
    this.debt = [];

    this.weeklyPrices = [];
    this.marketCap = [];
    this.volatility = [];

    this.profitMargin = [];
    this.operatingMargin = [];
    this.debtToEquity = [];
    this.returnOnEquity = [];
    this.peRatio = [];
    this.priceToBook = [];

    this.moatStrength = 0;
    this.growthProfile = "steady";
    this.riskFlags = [];
    this.intrinsicValue = [];
    this.unlockedStats = new Set(["revenue"]); // Level 1 starts with revenue visible
    this.historyLength = 20; // 5 years of quarters
    this.currentQuarterIndex = 0;
    makeAutoObservable(this);
  }

  calculateMargins() {
    this.operatingMargin = this.operatingIncome.map((oi, i) => oi / this.revenue[i]);
    this.profitMargin = this.netIncome.map((ni, i) => ni / this.revenue[i]);
  }

  calculateRatios() {
    this.debtToEquity = this.debt.map((d, i) => d / (this.equity[i] || 1));
    this.returnOnEquity = this.netIncome.map((ni, i) => ni / (this.equity[i] || 1));
    this.peRatio = this.weeklyPrices.map((p, i) => p / (this.eps[i] || 0.01));
    this.priceToBook = this.weeklyPrices.map((p, i) => p / ((this.equity[i] / (this.equity.length || 1)) || 1));
  }

  unlockStat(stat: string) {
    this.unlockedStats.add(stat);
  }
}

export default Stock;
