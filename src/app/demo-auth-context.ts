"use client";

import { createContext, useContext } from "react";

export type DemoAuthContextValue = {
  signOut: () => void;
};

export const DemoAuthContext = createContext<DemoAuthContextValue | null>(null);

export function useDemoAuth(): DemoAuthContextValue {
  const context = useContext(DemoAuthContext);
  if (!context) {
    throw new Error("useDemoAuth must be used within DemoAuthProvider.");
  }
  return context;
}
