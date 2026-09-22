"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/admin/login").then((response) => response.json()).then((data) => {
      setConfigured(data.configured !== false);
      setAuthenticated(data.authenticated);
    }).catch(() => setAuthenticated(false));
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
  if (!configured) return <main className="admin-login"><div className="admin-login-card"><span className="brand-mark">NJ</span><p className="eyebrow">Supabase setup required</p><h1>Admin is not connected</h1><p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart the server.</p><Link href="/">← Back to portfolio</Link></div></main>;
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
    <main className="admin-login"><div className="admin-login-card"><span className="brand-mark">NJ</span><p className="eyebrow">Supabase admin</p><h1>Signed in</h1><p>You are authenticated as the portfolio administrator. The Supabase content workspace is ready for the connected project.</p><button className="button button-primary" onClick={logout}>Sign out</button></div></main>
  );
}
