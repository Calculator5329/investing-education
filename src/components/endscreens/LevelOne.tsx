import { observer } from "mobx-react-lite";
import type { GameResult } from "../../stores/GameStore";

type Props = {
  result: GameResult;
  onAdvance: () => void;
  onClose: () => void;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const lesson = {
  title: "📈 Why Revenue Growth Matters",
  intro:
    "Revenue is a company’s oxygen. More sales fund better products, more hiring, and bigger profits. Over time, stock prices tend to follow that growth.",
  bullets: [
    {
      heading: "Growth compounds:",
      body:
        "At ~10% a year, sales can 6× over two decades. Slow growers barely move.",
    },
    {
      heading: "Markets notice:",
      body:
        "Companies that grow the top line steadily are more likely to deliver strong long‑term returns.",
    },
    {
      heading: "Focus beats noise:",
      body:
        "Weekly price swings are loud. Consistent revenue growth is the signal.",
    },
  ],
  teaser:
    "Next round: why predictability of growth can matter even more than raw speed.",
  statHighlight: {
    number: "74%",
    text: "of long‑term shareholder returns come from revenue growth — not short‑term hype.",
    image: "/Top-line-growth-and-stocks-.webp",
    caption:
      "Source: BCG Analysis, Morgan Stanley Research (S&P 500, 1990–2009). Over 10 years, revenue growth explained most of the return for top‑quartile performers.",
  },
};

function LessonRevenueGraphic() {
  const bars = [
    { label: "1Y", revenuePct: 29 },
    { label: "3Y", revenuePct: 50 },
    { label: "5Y", revenuePct: 58 },
    { label: "10Y", revenuePct: 74 },
  ];

  return (
    <div className="rev-graphic">
      <div className="rev-graphic__legend">
        <div className="legend-item revenue">Revenue growth</div>
        <div className="legend-item other">Other drivers</div>
      </div>
      <div className="rev-graphic__bars">
        {bars.map((b) => (
          <div key={b.label} className="rev-graphic__bar">
            <div
              className="rev-graphic__segment rev-graphic__segment--other"
              style={{ height: `${100 - b.revenuePct}%` }}
              title={`${100 - b.revenuePct}% other drivers`}
            />
            <div
              className="rev-graphic__segment rev-graphic__segment--revenue"
              style={{ height: `${b.revenuePct}%` }}
              title={`${b.revenuePct}% revenue growth share`}
            >
              <span className="rev-graphic__pct">{b.revenuePct}%</span>
            </div>
            <div className="rev-graphic__label">{b.label}</div>
          </div>
        ))}
      </div>
      <div className="rev-graphic__caption">
        Share of returns driven by revenue growth — Source: BCG Analysis, Morgan Stanley Research (S&P 500, 1990–2009). Over 10 years, revenue growth explained most of the return for top‑quartile performers.
      </div>
    </div>
  );
}

function LevelOneComponent({ result, onAdvance, onClose }: Props) {
  return (
    <div className="overlay complete-state">
      <div className="title">Level Complete</div>
      <div className="subtitle">
        {result.pass ? "You beat the benchmark!" : "Benchmark outperformed you this time."}
      </div>

      {/* Two-column layout: stats left, lesson right */}
      <div className="end-columns">
        <div className="end-left">
      <div className="endcap">
        <div className="endcap__stat">
          <div className="label">Portfolio CAGR</div>
          <div className="value up">{formatPercent(result.portfolioCagr)}</div>
        </div>
        <div className="endcap__stat">
          <div className="label">Benchmark CAGR</div>
          <div className="value">{formatPercent(result.benchmarkCagr)}</div>
        </div>
        <div className="endcap__stat">
          <div className="label">Final NAV</div>
          <div className="value">{formatCurrency(result.finalNav)}</div>
        </div>
        <div className="endcap__stat">
          <div className="label">Benchmark NAV</div>
          <div className="value">{formatCurrency(result.finalBenchmarkNav)}</div>
        </div>
      </div>

      <div className="leaderboards">
        <div className="board">
          <div className="board__header board__header--grid">
            <h4 className="board__title">Company Performance</h4>
            <span className="col-head">Return</span>
            <span className="col-head">CAGR</span>
            <span className="col-head">Avg Revenue Growth</span>
          </div>
          <ul className="board__list">
            {[...result.top5, ...result.bottom5.slice().reverse()].map((c, index) => (
              <li key={c.ticker} className="board__row">
                <span className="ticker">
                  <span className="rank">#{index + 1}</span>
                  {c.ticker}
                </span>
                <span className={`metric mult ${c.returnMultiple >= 1 ? "up" : "down"}`}>
                  {c.returnMultiple.toFixed(2)}x
                </span>
                <span className={c.priceCagr >= 0 ? "metric up" : "metric down"}>
                  {formatPercent(c.priceCagr)}
                </span>
                <span className="metric alt">{formatPercent(c.revenueCagr)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!result.holdingsAreActual && (
        <div className="note">
          You held no positions, so best/worst reflect stock total returns.
        </div>
      )}
        </div>
        <div className="divider"></div>
        <div className="end-right">
          <div className="lesson">
            <h3>{lesson.title}</h3>
            <p>{lesson.intro}</p>
            <ul className="lesson__bullets">
              {lesson.bullets.map((b, idx) => (
                <li key={idx}>
                  <strong>{b.heading}</strong> {b.body}
                </li>
              ))}
            </ul>
            <LessonRevenueGraphic />
            <div className="lesson__stat">
              <span className="number">{lesson.statHighlight.number}</span>
              <span className="text">{lesson.statHighlight.text}</span>
            </div>
            <p className="teaser">{lesson.teaser}</p>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={onAdvance}>
          {result.pass ? "Advance to Level 2" : "Retry Level"}
        </button>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export const LevelOne = observer(LevelOneComponent);
