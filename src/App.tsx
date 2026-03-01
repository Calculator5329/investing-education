import "./App.css";
import { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { StocksGrid } from "./components/StockGrid.tsx";
import { useGameStore } from "./hooks/useGameStore";
import { GameOverlay } from "./components/GameOverlay";

function AppComponent() {
  const store = useGameStore();

  useEffect(() => {
    store.initialize();
    return () => store.dispose();
  }, [store]);

  const { companies, levelName, weekLabel } = store;

  return (
    <div className="game-shell">
      <div className="topbar">
        <div className="topbar-left">
          <h2>{levelName}</h2>
          <div className="week">{weekLabel}</div>
        </div>
        <div className="topbar-right">
          <div className="portfolio-nav">
            Portfolio NAV: ${store.portfolioNav.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="benchmark-nav">
            Benchmark: ${store.benchmarkValue().toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <StocksGrid companies={companies} />

      <GameOverlay />
    </div>
  );
}

export default observer(AppComponent);
