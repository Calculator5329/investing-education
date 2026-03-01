import { observer } from "mobx-react-lite";
import type Stock from "../objects/Stock";
import { StockCard } from "./StockCard";
import { useGameStore } from "../hooks/useGameStore";
import { PositionsPanel } from "./positions/PositionsPanel";

type Props = {
  companies: Stock[];
};

function StocksGridComponent({ companies }: Props) {
  const store = useGameStore();
  if (!companies.length) {
    return <div className="loading-state">Generating companies...</div>;
  }

  return (
    <>
      <PositionsPanel />
      <div className="cards-grid">
        {companies.map((company) => (
          <StockCard key={company.ticker} company={company} />
        ))}
      </div>
    </>
  );
}

export const StocksGrid = observer(StocksGridComponent);

