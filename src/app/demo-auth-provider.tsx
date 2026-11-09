"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { DemoAuthContext } from "./demo-auth-context";
import {
  clearDemoSession,
  hasDemoSession,
  subscribeToDemoSession,
} from "@/lib/demo-session";

export default function DemoAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isSignedIn = useSyncExternalStore(
    subscribeToDemoSession,
    hasDemoSession,
    () => false,
  );

  useEffect(() => {
    if (!isSignedIn && pathname !== "/login") {
      router.replace("/login");
    } else if (isSignedIn && pathname === "/login") {
      router.replace("/");
    }
  }, [isSignedIn, pathname, router]);

  const signOut = useCallback(() => {
    clearDemoSession();
    router.replace("/login");
  }, [router]);

  if (!isSignedIn && pathname !== "/login") {
    return (
      <main className="auth-loading" role="status">
        <span className="brand-mark">g</span>
        <p>Opening your demo workspace…</p>
      </main>
    );
  }

  return (
    <DemoAuthContext.Provider value={{ signOut }}>
      {children}
    </DemoAuthContext.Provider>
  );
}
