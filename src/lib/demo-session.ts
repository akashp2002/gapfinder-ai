export const DEMO_LOGIN = {
  email: "student@demo.com",
  password: "gapfinder2026",
} as const;

const SESSION_KEY = "gapfinder-demo-session";
const SESSION_EVENT = "gapfinder-demo-session-change";

export function subscribeToDemoSession(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

export function hasDemoSession(): boolean {
  return localStorage.getItem(SESSION_KEY) === "demo-student";
}

export function createDemoSession(): void {
  localStorage.setItem(SESSION_KEY, "demo-student");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearDemoSession(): void {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
