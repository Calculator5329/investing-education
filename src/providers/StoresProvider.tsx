import { createContext, type PropsWithChildren } from "react";
import { rootStore, type RootStoreType } from "../stores";

export const StoresContext = createContext<RootStoreType | null>(null);

export function StoresProvider({ children }: PropsWithChildren) {
  return <StoresContext.Provider value={rootStore}>{children}</StoresContext.Provider>;
}

