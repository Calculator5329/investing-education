import { observer } from "mobx-react-lite";
import { useGameStore } from "../hooks/useGameStore";
import { LevelOne } from "./endscreens/LevelOne";

function GameOverlayComponent() {
  const store = useGameStore();

  if (!store.result && !store.isRunning && !store.isLoading) {
    return (
      <div className="overlay loading-state">
        <div className="title">Level 1: Revenue Growth</div>
        <div className="subtitle">Generate your market and begin the simulation.</div>
        <button className="btn btn-primary" onClick={() => store.start()}>
          Start
        </button>
      </div>
    );
  }

  if (store.isLoading) {
    return (
      <div className="overlay loading-state">
        <div className="title">Generating Companies...</div>
        <div className="subtitle">Building out 20 years of fundamentals and prices.</div>
      </div>
    );
  }

  if (!store.isGameOver || !store.result || !store.showResultsDialog) {
    return null;
  }

  const { result } = store;

  return (
    <LevelOne
      result={result}
      onAdvance={() => store.retry()}
      onClose={() => store.closeResultsDialog()}
    />
  );
}

export const GameOverlay = observer(GameOverlayComponent);
