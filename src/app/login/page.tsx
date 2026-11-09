"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createDemoSession, DEMO_LOGIN } from "@/lib/demo-session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>(DEMO_LOGIN.email);
  const [password, setPassword] = useState<string>(DEMO_LOGIN.password);
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      email.trim().toLocaleLowerCase() !== DEMO_LOGIN.email ||
      password !== DEMO_LOGIN.password
    ) {
      setErrorMessage("Those demo credentials don't match. Please try again.");
      return;
    }

    createDemoSession();
    router.replace("/");
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-heading">
        <Link className="brand login-brand" href="/" aria-label="GapFinder home">
          <span className="brand-mark">g</span>
          <span>gapfinder<span className="brand-period">.</span></span>
        </Link>
        <p className="eyebrow"><span className="eyebrow-dot" /> STUDENT WORKSPACE</p>
        <h1 id="login-heading">Welcome back.</h1>
        <p className="welcome-copy">
          Sign in to open the saved demo workspace on this device.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label className="field-label" htmlFor="login-email">Demo email</label>
            <input
              autoComplete="username"
              className="login-input"
              id="login-email"
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                setErrorMessage("");
              }}
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="login-password">Password</label>
            <input
              autoComplete="current-password"
              className="login-input"
              id="login-password"
              onChange={(event) => {
                setPassword(event.currentTarget.value);
                setErrorMessage("");
              }}
              required
              type="password"
              value={password}
            />
          </div>
          {errorMessage && (
            <p className="notice error-notice" role="alert">{errorMessage}</p>
          )}
          <button className="primary-button login-submit" type="submit">
            Open my workspace <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="demo-credentials">
          <strong>Judge demo credentials</strong>
          <span>Email: {DEMO_LOGIN.email}</span>
          <span>Password: {DEMO_LOGIN.password}</span>
        </div>
        <p className="login-disclaimer">
          Demo access only, not a secure production account. Your materials and progress remain in this browser.
        </p>
      </section>
    </main>
  );
}
