import { GameStore } from "./GameStore";

class RootStore {
  game: GameStore;

  constructor() {
    this.game = new GameStore();
  }
}

export const rootStore = new RootStore();

export type RootStoreType = RootStore;

