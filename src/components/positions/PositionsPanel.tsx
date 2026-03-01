import { observer } from "mobx-react-lite";
import { useGameStore } from "../../hooks/useGameStore";
import { PerformanceChart } from "../charts/PerformanceChart";

function Currency({ value }: { value: number }) {
  return <span>${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
}

function Percent({ value }: { value: number }) {
  const color = value >= 0 ? "#34d399" : "#f87171";
  const sign = value >= 0 ? "+" : "";
  return <span style={{ color, fontWeight: 600 }}>{sign}{(value * 100).toFixed(1)}%</span>;
}

function PositionsPanelComponent() {
  const store = useGameStore();
  const positions = store.holdingsSummary;

  return (
    <div className="dashboard-bottom">
      <div className="dashboard-bottom__left">
        <div className="dashboard-card performance-chart">
          <PerformanceChart />
        </div>
      </div>
      <div className="dashboard-bottom__right">
        <div className="positions-container">
          <div className="positions-header">
            <h3>Positions</h3>
            <div className="nav-summary">
              <div className="nav-item">
                <div className="label">Portfolio</div>
                <div className="value"><Currency value={store.portfolioNav} /></div>
              </div>
              <div className="nav-item">
                <div className="label">Benchmark</div>
                <div className="value"><Currency value={store.benchmarkValue()} /></div>
              </div>
              <div className="nav-item">
                <div className="label">Speed</div>
                <div className="value">
                  <button
                    className={"btn " + (store.speedMultiplier === 10 ? "active" : "")}
                    onClick={() => store.setSpeedMultiplier(100)}
                  >
                    10x
                  </button>
                </div>
              </div>
            </div>
          </div>
          {positions.length === 0 ? (
            <div className="positions-empty">
              <div className="empty-icon">📊</div>
              <div className="empty-text">No positions yet</div>
              <div className="empty-subtext">Buy $1K on a stock to open a position</div>
            </div>
          ) : (
            <div className="positions-content">
              <div className="positions-header-row">
                <div>Ticker</div>
                <div>Value</div>
                <div>Gain</div>
              </div>
              <div className="positions-list">
                {positions.map((p) => (
                  <div key={p.ticker} className="position-item">
                    <div className="position-ticker">{p.ticker}</div>
                    <div className="position-value"><Currency value={p.value} /></div>
                    <div className="position-gain"><Percent value={p.gainPct} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PositionsPanel = observer(PositionsPanelComponent);


