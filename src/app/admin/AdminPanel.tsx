"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import fallbackContent from "@/data/content.json";

type PortfolioContent = typeof fallbackContent;

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [contentJson, setContentJson] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [saveState, setSaveState] = useState("");

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

  useEffect(() => {
    if (!authenticated) return;
    const frame = window.requestAnimationFrame(() => {
      setContentLoading(true);
      fetch("/api/content", { cache: "no-store" }).then((response) => response.json()).then((data: PortfolioContent) => {
        setContentJson(JSON.stringify(data, null, 2));
        setContentLoading(false);
      }).catch(() => setContentLoading(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [authenticated]);

  async function saveContent() {
    setSaveState("Saving...");
    try {
      const parsed = JSON.parse(contentJson) as PortfolioContent;
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save content.");
      setContentJson(JSON.stringify(result.content, null, 2));
      setSaveState("Saved to Supabase");
    } catch (saveError) {
      setSaveState(saveError instanceof SyntaxError ? "Invalid JSON" : saveError instanceof Error ? saveError.message : "Could not save content.");
    }
  }

  if (authenticated === null || configured === null) return <main className="admin-loading">Checking secure access...</main>;
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
    <main className="admin-workspace">
      <header className="admin-toolbar"><Link className="brand" href="/"><span className="brand-mark">NJ</span><span>Nadeem Jamal</span></Link><div><span className="admin-status">Supabase connected</span><button className="admin-logout" onClick={logout}>Sign out</button></div></header>
      <section className="admin-editor">
        <div className="admin-editor-heading"><div><p className="eyebrow">Content workspace</p><h1>Edit your website</h1><p>Every section of the public portfolio is stored in this single content document. Update the JSON, save, and refresh the website to publish your changes.</p></div><div className="admin-editor-actions"><button className="button button-secondary" onClick={() => setContentJson(JSON.stringify(fallbackContent, null, 2))}>Reset draft</button><button className="button button-primary" onClick={saveContent} disabled={contentLoading}>{saveState || "Save changes"}</button></div></div>
        <div className="admin-editor-grid"><aside className="admin-guide"><h2>Editable areas</h2><p>Use the section names as landmarks in the editor.</p><ul><li>Profile &amp; social links</li><li>About &amp; statistics</li><li>Skills &amp; experience</li><li>Education &amp; projects</li><li>Certifications &amp; workshops</li><li>Languages &amp; contact form</li></ul><p className="admin-note">Keep the JSON valid. The website will keep using its local content while Supabase is unavailable.</p></aside><div className="admin-code-wrap"><label htmlFor="content-json">Portfolio content JSON</label><textarea id="content-json" className="admin-code-editor" value={contentLoading ? "Loading content..." : contentJson} onChange={(event) => setContentJson(event.target.value)} spellCheck={false} disabled={contentLoading} /></div></div>
      </section>
    </main>
  );
}
