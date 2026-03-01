import { useContext } from "react";
import { StoresContext } from "../providers/StoresProvider";

export function useGameStore() {
  const stores = useContext(StoresContext);
  if (!stores) {
    throw new Error("useGameStore must be used within StoresProvider");
  }
  return stores.game;
}

