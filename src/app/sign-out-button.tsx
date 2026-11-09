"use client";

import { useDemoAuth } from "./demo-auth-context";

export default function SignOutButton() {
  const { signOut } = useDemoAuth();
  return (
    <button className="sign-out-button" onClick={signOut} type="button">
      Sign out
    </button>
  );
}
