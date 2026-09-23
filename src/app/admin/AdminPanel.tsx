"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import fallbackContent from "@/data/content.json";

type PortfolioContent = typeof fallbackContent;
type DraftRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DraftRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function Field({ label, value, onChange, multiline = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; type?: string }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function ImagePreview({ url, label }: { url: string; label: string }) {
  if (!url) return <div className="admin-image-placeholder">{label}</div>;
  return <div className="admin-image-preview" style={{ backgroundImage: `url("${url}")` }} role="img" aria-label={label} />;
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [content, setContent] = useState<PortfolioContent>(fallbackContent);
  const [contentJson, setContentJson] = useState(JSON.stringify(fallbackContent, null, 2));
  const [contentLoading, setContentLoading] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [activeTab, setActiveTab] = useState<"visual" | "advanced">("visual");

  useEffect(() => {
    fetch("/api/admin/login").then((response) => response.json()).then((data) => {
      setConfigured(data.configured !== false);
      setAuthenticated(data.authenticated);
    }).catch(() => {
      setConfigured(false);
      setAuthenticated(false);
    });
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
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "The admin email or password is incorrect.");
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
        setContent(data);
        setContentJson(JSON.stringify(data, null, 2));
        setContentLoading(false);
      }).catch(() => setContentLoading(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [authenticated]);

  function syncContent(next: PortfolioContent) {
    setContent(next);
    setContentJson(JSON.stringify(next, null, 2));
    setSaveState("");
  }

  function updateProfile(key: keyof PortfolioContent["profile"], value: string) {
    syncContent({ ...content, profile: { ...content.profile, [key]: value } });
  }

  function updateSocial(key: keyof PortfolioContent["profile"]["socials"], value: string) {
    syncContent({ ...content, profile: { ...content.profile, socials: { ...content.profile.socials, [key]: value } } });
  }

  function updateText(key: "about", value: string) {
    syncContent({ ...content, [key]: value });
  }

  function updateArrayItem(section: "stats" | "skills" | "experience" | "projects" | "certifications" | "workshops" | "languages", index: number, key: string, value: string) {
    const items = content[section] as unknown as DraftRecord[];
    const item = items[index];
    if (!item) return;
    const nextItems = items.map((current, itemIndex) => itemIndex === index ? { ...current, [key]: value } : current);
    syncContent({ ...content, [section]: nextItems } as PortfolioContent);
  }

  function updateEducation(key: keyof PortfolioContent["education"], value: string) {
    syncContent({ ...content, education: { ...content.education, [key]: value } });
  }

  function updateContact(key: keyof PortfolioContent["contact"], value: string) {
    syncContent({ ...content, contact: { ...content.contact, [key]: value } });
  }

  function updateListItem(section: "skills" | "experience" | "projects" | "workshops", index: number, key: string, itemIndex: number, value: string) {
    const items = content[section] as unknown as DraftRecord[];
    const item = items[index];
    if (!item || !Array.isArray(item[key])) return;
    const values = item[key] as unknown[];
    const nextItems = items.map((current, currentIndex) => currentIndex === index ? { ...current, [key]: values.map((entry, valueIndex) => valueIndex === itemIndex ? value : entry) } : current);
    syncContent({ ...content, [section]: nextItems } as PortfolioContent);
  }

  function parseAdvanced() {
    try {
      const parsed = JSON.parse(contentJson) as PortfolioContent;
      if (!isRecord(parsed) || !parsed.profile || !parsed.about) throw new Error("Content must include profile and about.");
      setContent(parsed);
      setSaveState("Draft updated");
    } catch (parseError) {
      setSaveState(parseError instanceof Error ? parseError.message : "Invalid JSON");
    }
  }

  async function saveContent() {
    setSaveState("Saving...");
    try {
      const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save content.");
      setContent(result.content);
      setContentJson(JSON.stringify(result.content, null, 2));
      setSaveState("Saved to Supabase");
    } catch (saveError) {
      setSaveState(saveError instanceof Error ? saveError.message : "Could not save content.");
    }
  }

  const projectCount = useMemo(() => content.projects.length, [content.projects.length]);

  if (authenticated === null || configured === null) return <main className="admin-loading">Checking secure access...</main>;
  if (!configured) return <main className="admin-login"><div className="admin-login-card"><span className="brand-mark">NJ</span><p className="eyebrow">Supabase setup required</p><h1>Admin is not connected</h1><p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart the server.</p><Link href="/">← Back to portfolio</Link></div></main>;
  if (!authenticated) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <span className="brand-mark">NJ</span><p className="eyebrow">Private workspace</p><h1>Portfolio admin</h1><p>Sign in to manage Nadeem&apos;s portfolio content.</p>
          <form onSubmit={handleSubmit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="admin-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button></form>
          <Link href="/">← Back to portfolio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-workspace">
      <header className="admin-toolbar"><Link className="brand" href="/"><span className="brand-mark">{content.profile.logo}</span><span>{content.profile.name}</span></Link><div><span className="admin-status">Supabase connected</span><button className="admin-logout" onClick={logout}>Sign out</button></div></header>
      <section className="admin-editor">
        <div className="admin-editor-heading"><div><p className="eyebrow">Content workspace</p><h1>Edit your website</h1><p>Update your text, images, logo, CV, links, and every portfolio card here. Save once to publish the full website.</p></div><div className="admin-editor-actions"><button className="button button-secondary" onClick={() => syncContent(fallbackContent)}>Reset draft</button><button className="button button-primary" onClick={saveContent} disabled={contentLoading}>{saveState || "Save changes"}</button></div></div>
        <div className="admin-tabs"><button className={activeTab === "visual" ? "active" : ""} onClick={() => setActiveTab("visual")}>Visual editor</button><button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>Advanced JSON</button></div>
        {activeTab === "advanced" ? <div className="admin-advanced"><div className="admin-code-wrap"><label htmlFor="content-json">Full portfolio content JSON</label><textarea id="content-json" className="admin-code-editor" value={contentLoading ? "Loading content..." : contentJson} onChange={(event) => setContentJson(event.target.value)} spellCheck={false} disabled={contentLoading} /></div><button className="button button-secondary" onClick={parseAdvanced}>Apply JSON draft</button></div> : (
          <div className="admin-visual">
            <section className="admin-panel-card"><div className="admin-panel-title"><div><p className="eyebrow">Brand &amp; profile</p><h2>First impression</h2></div><ImagePreview url={content.profile.photo} label="Profile photo preview" /></div><div className="admin-form-grid"><Field label="Logo text" value={content.profile.logo} onChange={(value) => updateProfile("logo", value)} /><Field label="Full name" value={content.profile.name} onChange={(value) => updateProfile("name", value)} /><Field label="Role" value={content.profile.role} onChange={(value) => updateProfile("role", value)} /><Field label="Short role" value={content.profile.shortRole} onChange={(value) => updateProfile("shortRole", value)} /><Field label="Tagline" value={content.profile.tagline} onChange={(value) => updateProfile("tagline", value)} multiline /><Field label="Intro" value={content.profile.intro} onChange={(value) => updateProfile("intro", value)} multiline /><Field label="Location" value={content.profile.location} onChange={(value) => updateProfile("location", value)} /><Field label="Email" value={content.profile.email} onChange={(value) => updateProfile("email", value)} type="email" /><Field label="Profile photo URL" value={content.profile.photo} onChange={(value) => updateProfile("photo", value)} /><Field label="CV PDF URL" value={content.profile.cv} onChange={(value) => updateProfile("cv", value)} /></div><div className="admin-social-grid"><Field label="LinkedIn" value={content.profile.socials.linkedin} onChange={(value) => updateSocial("linkedin", value)} /><Field label="ResearchGate" value={content.profile.socials.researchgate} onChange={(value) => updateSocial("researchgate", value)} /><Field label="Google Scholar" value={content.profile.socials.scholar} onChange={(value) => updateSocial("scholar", value)} /><Field label="ORCID" value={content.profile.socials.orcid} onChange={(value) => updateSocial("orcid", value)} /></div></section>
            <section className="admin-panel-card"><p className="eyebrow">About</p><h2>Story &amp; statistics</h2><Field label="About biography" value={content.about} onChange={(value) => updateText("about", value)} multiline /><div className="admin-mini-grid">{content.stats.map((stat, index) => <div className="admin-mini-card" key={stat.label}><Field label={`Stat ${index + 1} value`} value={stat.value} onChange={(value) => updateArrayItem("stats", index, "value", value)} /><Field label="Label" value={stat.label} onChange={(value) => updateArrayItem("stats", index, "label", value)} /></div>)}</div></section>
            <section className="admin-panel-card"><p className="eyebrow">Education</p><h2>Academic background</h2><div className="admin-form-grid"><Field label="Degree" value={content.education.degree} onChange={(value) => updateEducation("degree", value)} /><Field label="Dates" value={content.education.dates} onChange={(value) => updateEducation("dates", value)} /><Field label="University" value={content.education.university} onChange={(value) => updateEducation("university", value)} /><Field label="Grade" value={content.education.grade} onChange={(value) => updateEducation("grade", value)} /><Field label="Final-year project" value={content.education.project} onChange={(value) => updateEducation("project", value)} multiline /></div></section>
            <section className="admin-panel-card"><p className="eyebrow">Skills &amp; experience</p><h2>Capabilities and timeline</h2><div className="admin-repeat-grid">{content.skills.map((skill, index) => <article className="admin-repeat-card" key={skill.title}><Field label="Skill title" value={skill.title} onChange={(value) => updateArrayItem("skills", index, "title", value)} /><Field label="Icon" value={skill.icon} onChange={(value) => updateArrayItem("skills", index, "icon", value)} /><div className="admin-list-fields">{skill.tags.map((tag, tagIndex) => <Field key={`${skill.title}-${tagIndex}`} label={`Tag ${tagIndex + 1}`} value={tag} onChange={(value) => updateListItem("skills", index, "tags", tagIndex, value)} />)}</div></article>)}</div><div className="admin-repeat-grid">{content.experience.map((item, index) => <article className="admin-repeat-card" key={`${item.role}-${index}`}><Field label="Role" value={item.role} onChange={(value) => updateArrayItem("experience", index, "role", value)} /><Field label="Place" value={item.place} onChange={(value) => updateArrayItem("experience", index, "place", value)} /><Field label="Dates" value={item.dates} onChange={(value) => updateArrayItem("experience", index, "dates", value)} />{item.bullets.map((bullet, bulletIndex) => <Field key={`${item.role}-bullet-${bulletIndex}`} label={`Bullet ${bulletIndex + 1}`} value={bullet} onChange={(value) => updateListItem("experience", index, "bullets", bulletIndex, value)} multiline />)}</article>)}</div></section>
            <section className="admin-panel-card"><p className="eyebrow">Projects</p><h2>{projectCount} project cards</h2><div className="admin-repeat-grid">{content.projects.map((project, index) => <article className="admin-repeat-card admin-project-editor" key={project.id}><ImagePreview url={project.image} label={`${project.title} preview`} /><Field label="Title" value={project.title} onChange={(value) => updateArrayItem("projects", index, "title", value)} /><Field label="Category" value={project.category} onChange={(value) => updateArrayItem("projects", index, "category", value)} /><Field label="Image URL" value={project.image} onChange={(value) => updateArrayItem("projects", index, "image", value)} /><Field label="Description" value={project.description} onChange={(value) => updateArrayItem("projects", index, "description", value)} multiline /><Field label="Outcome" value={project.outcome} onChange={(value) => updateArrayItem("projects", index, "outcome", value)} multiline /><Field label="Full details" value={project.details} onChange={(value) => updateArrayItem("projects", index, "details", value)} multiline />{project.tools.map((tool, toolIndex) => <Field key={`${project.id}-tool-${toolIndex}`} label={`Tool ${toolIndex + 1}`} value={tool} onChange={(value) => updateListItem("projects", index, "tools", toolIndex, value)} />)}</article>)}</div></section>
            <section className="admin-panel-card"><p className="eyebrow">Certifications, workshops &amp; languages</p><h2>Supporting details</h2><div className="admin-repeat-grid">{content.certifications.map((item, index) => <article className="admin-repeat-card" key={`${item.title}-${index}`}><Field label="Certificate" value={item.title} onChange={(value) => updateArrayItem("certifications", index, "title", value)} /><Field label="Issuer" value={item.issuer} onChange={(value) => updateArrayItem("certifications", index, "issuer", value)} /><Field label="Year" value={item.year} onChange={(value) => updateArrayItem("certifications", index, "year", value)} /><Field label="Category" value={item.category} onChange={(value) => updateArrayItem("certifications", index, "category", value)} /></article>)}</div><div className="admin-repeat-grid">{content.workshops.map((item, index) => <article className="admin-repeat-card" key={`${item.topic}-${index}`}><Field label="Topic" value={item.topic} onChange={(value) => updateArrayItem("workshops", index, "topic", value)} /><Field label="Date" value={item.date} onChange={(value) => updateArrayItem("workshops", index, "date", value)} /><Field label="Place" value={item.place} onChange={(value) => updateArrayItem("workshops", index, "place", value)} /><Field label="Description" value={item.description} onChange={(value) => updateArrayItem("workshops", index, "description", value)} multiline /></article>)}</div><div className="admin-mini-grid">{content.languages.map((item, index) => <div className="admin-mini-card" key={item.name}><Field label="Language" value={item.name} onChange={(value) => updateArrayItem("languages", index, "name", value)} /><Field label="Level" value={item.level} onChange={(value) => updateArrayItem("languages", index, "level", value)} /><Field label="Note" value={item.note} onChange={(value) => updateArrayItem("languages", index, "note", value)} /></div>)}</div></section>
            <section className="admin-panel-card"><p className="eyebrow">Contact</p><h2>How people reach you</h2><div className="admin-form-grid"><Field label="Formspree action URL" value={content.contact.formAction} onChange={(value) => updateContact("formAction", value)} /><Field label="Contact note" value={content.contact.note} onChange={(value) => updateContact("note", value)} multiline /></div></section>
          </div>
        )}
      </section>
    </main>
  );
}
