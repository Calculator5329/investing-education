import { observer } from "mobx-react-lite";
import { useMemo } from "react";
import { useGameStore } from "../../hooks/useGameStore";

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const VIEW_W = 600;
const VIEW_H = 180;
const PAD = 10; // outer padding
const Y_AXIS_WIDTH = 60; // space for y-axis labels
const CHART_X = PAD + Y_AXIS_WIDTH; // chart starts after y-axis
const CHART_W = VIEW_W - CHART_X - PAD; // chart width
const CHART_H = VIEW_H - PAD * 2; // chart height

function PerformanceChartComponent() {
  const store = useGameStore();

  const { portfolioHistory, benchmarkHistory } = store;

  const { portfolioSeries, benchmarkSeries } = useMemo(() => {
    // Build continuous weekly series from week 0 to current
    if (!portfolioHistory.length) {
      return {
        portfolioSeries: [10000, store.portfolioNav],
        benchmarkSeries: [10000, store.benchmarkValue()],
      };
    }

    const maxWeek = Math.max(
      portfolioHistory.at(-1)?.week ?? 0,
      benchmarkHistory.at(-1)?.week ?? 0
    );

    const weekToPortfolio = new Map(portfolioHistory.map((p) => [p.week, p.value]));
    const weekToBenchmark = new Map(benchmarkHistory.map((b) => [b.week, b.value]));

    const portfolio: number[] = [];
    const benchmark: number[] = [];

    let lastP = weekToPortfolio.get(0) ?? 10000;
    let lastB = weekToBenchmark.get(0) ?? 10000;

    for (let w = 0; w <= maxWeek; w++) {
      if (weekToPortfolio.has(w)) lastP = weekToPortfolio.get(w)!;
      if (weekToBenchmark.has(w)) lastB = weekToBenchmark.get(w)!;
      portfolio.push(lastP);
      benchmark.push(lastB);
    }

    return { portfolioSeries: portfolio, benchmarkSeries: benchmark };
  }, [portfolioHistory, benchmarkHistory, store.portfolioNav, store.benchmarkValue()]);

  const hasStarted = portfolioSeries.length > 1 || store.isRunning;
  if (!hasStarted) {
    return (
      <>
        <div className="performance-chart__header">
          <div className="title">Performance vs Benchmark</div>
          <div className="legend">
            <span className="legend-item portfolio">Portfolio ({formatCurrency(store.portfolioNav)})</span>
            <span className="legend-item benchmark">Benchmark ({formatCurrency(store.benchmarkValue())})</span>
          </div>
        </div>
        <div className="performance-chart__empty">Game hasn't started yet. Hit Start to begin the simulation.</div>
      </>
    );
  }

  const allValues = [...portfolioSeries, ...benchmarkSeries];
  const dataMax = Math.max(...allValues);
  const dataMin = Math.min(...allValues);
  
  // Round min down to nearest 1000, max up to nearest 1000
  const min = Math.floor(dataMin / 1000) * 1000;
  const max = Math.ceil(dataMax / 1000) * 1000;
  const range = max - min || 1000;
  
  // Calculate y-axis tick marks (every 1000 or appropriate interval)
  const tickInterval = Math.max(1000, Math.ceil(range / 5000) * 1000);
  const ticks = [];
  for (let value = min; value <= max; value += tickInterval) {
    ticks.push(value);
  }

  return (
    <>
      <div className="performance-chart__header">
        <div className="title">Performance vs Benchmark</div>
        <div className="legend">
          <span className="legend-item portfolio">Portfolio ({formatCurrency(portfolioSeries.at(-1) ?? store.portfolioNav)})</span>
          <span className="legend-item benchmark">Benchmark ({formatCurrency(benchmarkSeries.at(-1) ?? store.benchmarkValue())})</span>
        </div>
      </div>
      <div className="performance-chart__content">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
          {/* Chart background with gradient */}
          <defs>
            <linearGradient id="chartBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(15,23,42,0.3)" />
              <stop offset="100%" stopColor="rgba(15,23,42,0.8)" />
            </linearGradient>
            <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(52,211,153,0.3)" />
              <stop offset="100%" stopColor="rgba(52,211,153,0.05)" />
            </linearGradient>
          </defs>
          <rect x={CHART_X} y={PAD} width={CHART_W} height={CHART_H} fill="url(#chartBg)" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
          
          {/* Y-axis line */}
          <line x1={CHART_X} y1={PAD} x2={CHART_X} y2={PAD + CHART_H} stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" />
          
          {/* Y-axis ticks and labels */}
          {ticks.map((tickValue) => {
            const y = PAD + CHART_H - ((tickValue - min) / range) * CHART_H;
            return (
              <g key={tickValue}>
                {/* Tick mark */}
                <line x1={CHART_X - 6} y1={y} x2={CHART_X} y2={y} stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" />
                {/* Grid line */}
                <line x1={CHART_X} y1={y} x2={CHART_X + CHART_W} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" strokeDasharray="2 4" />
                {/* Label */}
                <text 
                  x={CHART_X - 8} 
                  y={y + 4} 
                  textAnchor="end" 
                  fontSize="12" 
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="500"
                  fill="rgba(148,163,184,0.8)"
                >
                  ${(tickValue / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}
          
          {/* Portfolio line */}
          <path
            d={buildPath(portfolioSeries, range, min, CHART_W, CHART_H, CHART_X, PAD)}
            fill="none"
            stroke="#34d399"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Benchmark line */}
          <path
            d={buildPath(benchmarkSeries, range, min, CHART_W, CHART_H, CHART_X, PAD)}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}

function buildPath(values: number[], range: number, min: number, width: number, height: number, offsetX: number, offsetY: number) {
  if (values.length <= 1) return "";
  const step = width / (values.length - 1);
  const coords = values.map((value, idx) => {
    const x = offsetX + idx * step;
    const y = offsetY + (height - ((value - min) / range) * height);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M ${coords.join(" L ")}`;
}

export const PerformanceChart = observer(PerformanceChartComponent);

