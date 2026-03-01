import { observer } from "mobx-react-lite";
import { Sparkline } from "./Sparkline";
import type Stock from "../objects/Stock";
import { useGameStore } from "../hooks/useGameStore";

type Props = {
  company: Stock;
};

function Currency({ value }: { value: number }) {
  const val = Number.isFinite(value) ? value : 0;
  return <span>${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
}

function Percent({ value, decimals = 2, showArrow = true }: { value: number; decimals?: number; showArrow?: boolean }) {
  if (!Number.isFinite(value)) return <span style={{ color: "#777" }}>—</span>;
  const isUp = value > 0;
  const isDown = value < 0;
  const color = isUp ? "#16a34a" : isDown ? "#ef4444" : "#9ca3af";
  const sign = isUp ? "+" : "";
  const arrow = showArrow ? (isUp ? "▲" : isDown ? "▼" : "•") + " " : "";
  return <span style={{ color, fontWeight: 600 }}>{arrow}{sign}{(value * 100).toFixed(decimals)}%</span>;
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      padding: "4px 8px",
      fontSize: 12,
      lineHeight: 1.1,
      whiteSpace: "nowrap"
    }}>
      <span style={{ color: "#9ca3af", fontWeight: 500 }}>{label}</span>
      <Percent value={value} decimals={1} />
    </div>
  );
}

function StockCardComponent({ company }: Props) {
  const store = useGameStore();
  const currentWeek = Math.max(0, Math.min(store.weekIndex, company.weeklyPrices.length - 1));
  const weeksPerQuarter = 12;
  const windowWeeks = 20 * weeksPerQuarter; // 5 years of data window
  const weekStart = Math.max(0, currentWeek - windowWeeks + 1);
  const weekEnd = currentWeek + 1;
  const priceHistory = company.weeklyPrices.slice(weekStart, weekEnd);
  const lastPrice = company.weeklyPrices[currentWeek] ?? company.weeklyPrices.at(-1) ?? 0;

  const maxVisibleQuarter = Math.max(0, (company.historyLength ?? 1) - 1);
  const currentQuarterIndex = Math.max(
    0,
    Math.min(maxVisibleQuarter, company.currentQuarterIndex ?? maxVisibleQuarter, company.revenue.length - 1)
  );

  // Helper to compute growth over N years relative to the game's "current" quarter index
  function growthOverYears(years: number) {
    const quartersRequested = years * 4;
    const nowIdx = currentQuarterIndex;
    if (years <= 0) return NaN;
    if (!Number.isFinite(nowIdx) || nowIdx < 0 || nowIdx >= company.revenue.length) return NaN;

    // If full window is not available yet (e.g., at game start), use the available window
    const tentativePastIdx = nowIdx - quartersRequested;
    const pastIdx = Math.max(0, tentativePastIdx);
    const quartersAvailable = nowIdx - pastIdx;
    const yearsAvailable = quartersAvailable / 4;
    if (!(yearsAvailable > 0)) return NaN;

    const past = company.revenue[pastIdx] ?? 0;
    const now = company.revenue[nowIdx] ?? 0;
    if (!(past > 0) || !(now > 0)) return NaN;

    // Annualize based on available years (may be slightly under the requested window)
    return Math.pow(now / past, 1 / yearsAvailable) - 1; // CAGR
  }

  const growth5y = growthOverYears(5);
  const growth3y = growthOverYears(3);
  const growth1y = growthOverYears(1);
  const eps = company.eps[currentQuarterIndex] ?? 0;

  return (
    <div className={`stock-card${(store.portfolioHoldings.get(company.ticker) ?? 0) > 0 ? " owned" : ""}`}>
      <div className="stock-card__header">
        <div className="stock-card__title">
          <div className="stock-card__ticker">{company.ticker}</div>
          <div className="stock-card__name">{company.name}</div>
        </div>
        <div className="stock-card__price">
          <div className="stock-card__price-main"><Currency value={lastPrice} /></div>
        </div>
      </div>

      <div className="mini-chart">
        <div className="mini-chart__label">Price</div>
        <Sparkline
          values={priceHistory.length > 1 ? priceHistory : [lastPrice - 0.01, lastPrice]}
          width={300}
          height={64}
          fill="#1976d2"
        />
      </div>

      <div className="stock-card__stats stat-grid" style={{ textAlign: "center", width: "100%" }}>
        {company.unlockedStats.has("revenue") && (
          <div className="stat">
            <div className="label">Revenue Growth</div>
            <div className="value" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
                <MetricPill label="5y" value={growth5y} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <MetricPill label="3y" value={growth3y} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <MetricPill label="1y" value={growth1y} />
              </div>
            </div>
          </div>
        )}
        {company.unlockedStats.has("eps") && (
          <div className="stat">
            <div className="label">EPS</div>
            <div className="value"><Currency value={eps} /></div>
          </div>
        )}
        {company.unlockedStats.has("pe") && (
          <div className="stat">
            <div className="label">P/E</div>
            <div className="value">{eps > 0 ? (lastPrice / eps).toFixed(1) : "n/a"}</div>
          </div>
        )}
      </div>

      <div className="stock-card__trade">
        <button
          className="btn btn-primary"
          disabled={!store.canBuy()}
          onClick={() => store.buy(company.ticker)}
        >
          Buy $1K
        </button>
        <button
          className="btn btn-danger"
          disabled={!store.canSell(company.ticker)}
          onClick={() => store.sell(company.ticker)}
        >
          Sell $1K
        </button>
      </div>
    </div>
  );
}

export const StockCard = observer(StockCardComponent);
