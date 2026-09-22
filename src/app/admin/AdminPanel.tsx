"use client";

import Script from "next/script";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/login").then((response) => response.json()).then((data) => setAuthenticated(data.authenticated)).catch(() => setAuthenticated(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (response.ok) {
      setAuthenticated(true);
      setPassword("");
    } else {
      setError("Invalid email or password.");
    }
    setBusy(false);
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
  }

  if (authenticated === null) return <main className="admin-loading">Checking secure access...</main>;
  if (!authenticated) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <span className="brand-mark">NJ</span>
          <p className="eyebrow">Private workspace</p>
          <h1>Portfolio admin</h1>
          <p>Sign in to manage Nadeem&apos;s portfolio content.</p>
          <form onSubmit={handleSubmit}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
          </form>
          <Link href="/">← Back to portfolio</Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <button className="admin-logout" onClick={logout}>Sign out</button>
      <Script src="https://unpkg.com/decap-cms@3.8.3/dist/decap-cms.js" strategy="afterInteractive" />
      <main id="nc-root" aria-label="Portfolio content management dashboard" />
    </>
  );
}
