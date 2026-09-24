"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import fallbackContent from "@/data/content.json";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type PortfolioContent = typeof fallbackContent;
type DraftRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DraftRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isPortfolioContent(value: unknown): value is PortfolioContent {
  return Boolean(value && typeof value === "object" && "profile" in value && "about" in value);
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

function UploadField({ label, kind, onUploaded }: { label: string; kind: "image" | "cv"; onUploaded: (url: string) => void }) {
  const [state, setState] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState("Supabase is not configured.");
      return;
    }

    setState("Uploading...");
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { data, error } = await supabase.storage.from("portfolio-media").upload(fileName, file, { upsert: true, contentType: file.type || "application/octet-stream" });

    if (error || !data) {
      setState(error?.message || "Upload failed.");
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("portfolio-media").getPublicUrl(data.path);
    onUploaded(publicUrlData.publicUrl);
    setState("Uploaded");
  }

  return (
    <label className="admin-upload">
      <span>{label}</span>
      <input type="file" accept={kind === "cv" ? ".pdf,application/pdf" : "image/jpeg,image/png,image/webp,image/gif"} onChange={(event) => upload(event.target.files?.[0])} />
      <small>{state || (kind === "cv" ? "PDF up to 10 MB" : "JPG, PNG, WebP, or GIF up to 5 MB")}</small>
    </label>
  );
}

export default function AdminPanel() {
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState<PortfolioContent>(fallbackContent);
  const [contentJson, setContentJson] = useState(JSON.stringify(fallbackContent, null, 2));
  const [contentLoading, setContentLoading] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [activeTab, setActiveTab] = useState<"visual" | "advanced">("visual");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    setSupabase(client);

    if (!client) {
      setConfigured(false);
      setAuthenticated(false);
      return;
    }

    setConfigured(true);
    setAuthenticated(Boolean(client.auth.getSession()));
  }, []);

  useEffect(() => {
    if (!supabase || !authenticated) return;

    const loadContent = async () => {
      setContentLoading(true);
      const { data, error } = await supabase.from("portfolio_content").select("content").eq("slug", "main").maybeSingle();
      if (error) {
        setSaveState(error.message);
        setContentLoading(false);
        return;
      }

      if (data?.content && isPortfolioContent(data.content)) {
        setContent(data.content as PortfolioContent);
        setContentJson(JSON.stringify(data.content, null, 2));
      }
      setContentLoading(false);
    };

    loadContent();
  }, [supabase, authenticated]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.session) {
      setError(authError?.message || "The admin email or password is incorrect.");
      setBusy(false);
      return;
    }

    setAuthenticated(true);
    setPassword("");
    setBusy(false);
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthenticated(false);
    setPassword("");
  }

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
    const nextItems = items.map((current, itemIndex) => (itemIndex === index ? { ...current, [key]: value } : current));
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
    const nextItems = items.map((current, currentIndex) =>
      currentIndex === index ? { ...current, [key]: values.map((entry, valueIndex) => (valueIndex === itemIndex ? value : entry)) } : current,
    );
    syncContent({ ...content, [section]: nextItems } as PortfolioContent);
  }

  function parseAdvanced() {
    try {
      const parsed = JSON.parse(contentJson) as PortfolioContent;
      if (!isPortfolioContent(parsed)) throw new Error("Content must include profile and about.");
      setContent(parsed);
      setSaveState("Draft updated");
    } catch (parseError) {
      setSaveState(parseError instanceof Error ? parseError.message : "Invalid JSON");
    }
  }

  async function saveContent() {
    if (!supabase || !authenticated) return;
    setSaveState("Saving...");

    try {
      const { error } = await supabase.from("portfolio_content").upsert({ slug: "main", content }, { onConflict: "slug" });
      if (error) throw new Error(error.message);
      setSaveState("Saved to Supabase");
    } catch (saveError) {
      setSaveState(saveError instanceof Error ? saveError.message : "Could not save content.");
    }
  }

  const projectCount = useMemo(() => content.projects.length, [content.projects.length]);

  if (authenticated === null || configured === null) return <main className="admin-loading">Checking secure access...</main>;
  if (!configured) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <span className="brand-mark">NJ</span>
          <p className="eyebrow">Supabase setup required</p>
          <h1>Admin is not connected</h1>
          <p>Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart the app.</p>
          <Link href="/">← Back to portfolio</Link>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <span className="brand-mark">NJ</span>
          <p className="eyebrow">Private workspace</p>
          <h1>Portfolio admin</h1>
          <p>Sign in to manage Nadeem&apos;s portfolio content.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
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
      <header className="admin-toolbar">
        <Link className="brand" href="/">
          <span className="brand-mark">{content.profile.logo}</span>
          <span>{content.profile.name}</span>
        </Link>
        <div>
          <span className="admin-status">Supabase connected</span>
          <button className="admin-logout" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="admin-editor">
        <div className="admin-editor-heading">
          <div>
            <p className="eyebrow">Content workspace</p>
            <h1>Edit your website</h1>
            <p>Update your text, images, profile, CV, and portfolio cards here. Save once to publish the public site.</p>
          </div>
          <div className="admin-editor-actions">
            <button className="button button-secondary" onClick={() => syncContent(fallbackContent)}>Reset draft</button>
            <button className="button button-primary" onClick={saveContent} disabled={contentLoading}>{saveState || "Save changes"}</button>
          </div>
        </div>

        <div className="admin-tabs">
          <button className={activeTab === "visual" ? "active" : ""} onClick={() => setActiveTab("visual")}>Visual editor</button>
          <button className={activeTab === "advanced" ? "active" : ""} onClick={() => setActiveTab("advanced")}>Advanced JSON</button>
        </div>

        {activeTab === "advanced" ? (
          <div className="admin-advanced">
            <div className="admin-code-wrap">
              <label htmlFor="content-json">Full portfolio content JSON</label>
              <textarea id="content-json" className="admin-code-editor" value={contentLoading ? "Loading content..." : contentJson} onChange={(event) => setContentJson(event.target.value)} spellCheck={false} disabled={contentLoading} />
            </div>
            <button className="button button-secondary" onClick={parseAdvanced}>Apply JSON draft</button>
          </div>
        ) : (
          <div className="admin-visual">
            <section className="admin-panel-card">
              <div className="admin-panel-title">
                <div>
                  <p className="eyebrow">Brand &amp; profile</p>
                  <h2>First impression</h2>
                </div>
                <ImagePreview url={content.profile.photo} label="Profile photo preview" />
              </div>

              <div className="admin-form-grid">
                <Field label="Logo text" value={content.profile.logo} onChange={(value) => updateProfile("logo", value)} />
                <Field label="Full name" value={content.profile.name} onChange={(value) => updateProfile("name", value)} />
                <Field label="Role" value={content.profile.role} onChange={(value) => updateProfile("role", value)} />
                <Field label="Short role" value={content.profile.shortRole} onChange={(value) => updateProfile("shortRole", value)} />
                <Field label="Tagline" value={content.profile.tagline} onChange={(value) => updateProfile("tagline", value)} multiline />
                <Field label="Intro" value={content.profile.intro} onChange={(value) => updateProfile("intro", value)} multiline />
                <Field label="Location" value={content.profile.location} onChange={(value) => updateProfile("location", value)} />
                <Field label="Email" value={content.profile.email} onChange={(value) => updateProfile("email", value)} type="email" />
                <Field label="Profile photo URL" value={content.profile.photo} onChange={(value) => updateProfile("photo", value)} />
                <Field label="CV PDF URL" value={content.profile.cv} onChange={(value) => updateProfile("cv", value)} />
              </div>

              <div className="admin-upload-grid">
                <UploadField label="Upload profile photo" kind="image" onUploaded={(value) => updateProfile("photo", value)} />
                <UploadField label="Upload CV PDF" kind="cv" onUploaded={(value) => updateProfile("cv", value)} />
              </div>

              <div className="admin-social-grid">
                <Field label="LinkedIn" value={content.profile.socials.linkedin} onChange={(value) => updateSocial("linkedin", value)} />
                <Field label="ResearchGate" value={content.profile.socials.researchgate} onChange={(value) => updateSocial("researchgate", value)} />
                <Field label="Google Scholar" value={content.profile.socials.scholar} onChange={(value) => updateSocial("scholar", value)} />
                <Field label="ORCID" value={content.profile.socials.orcid} onChange={(value) => updateSocial("orcid", value)} />
              </div>
            </section>

            <section className="admin-panel-card">
              <p className="eyebrow">About</p>
              <h2>Story &amp; statistics</h2>
              <Field label="About biography" value={content.about} onChange={(value) => updateText("about", value)} multiline />
              <div className="admin-form-grid">
                {content.stats.map((stat, index) => (
                  <div key={`${stat.label}-${index}`} className="mini-grid">
                    <Field label="Value" value={stat.value} onChange={(value) => updateArrayItem("stats", index, "value", value)} />
                    <Field label="Label" value={stat.label} onChange={(value) => updateArrayItem("stats", index, "label", value)} />
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-panel-card">
              <p className="eyebrow">Education</p>
              <h2>Academic background</h2>
              <div className="admin-form-grid">
                <Field label="Degree" value={content.education.degree} onChange={(value) => updateEducation("degree", value)} />
                <Field label="Dates" value={content.education.dates} onChange={(value) => updateEducation("dates", value)} />
                <Field label="University" value={content.education.university} onChange={(value) => updateEducation("university", value)} />
                <Field label="Grade" value={content.education.grade} onChange={(value) => updateEducation("grade", value)} />
                <Field label="Project" value={content.education.project} onChange={(value) => updateEducation("project", value)} multiline />
              </div>
            </section>

            <section className="admin-panel-card">
              <p className="eyebrow">Projects</p>
              <h2>{projectCount} featured projects</h2>
              <div className="admin-resource-list">
                {content.projects.map((project, index) => (
                  <article key={project.id} className="admin-resource-item">
                    <Field label="Title" value={project.title} onChange={(value) => updateArrayItem("projects", index, "title", value)} />
                    <Field label="Category" value={project.category} onChange={(value) => updateArrayItem("projects", index, "category", value)} />
                    <Field label="Description" value={project.description} onChange={(value) => updateArrayItem("projects", index, "description", value)} multiline />
                    <Field label="Image URL" value={project.image} onChange={(value) => updateArrayItem("projects", index, "image", value)} />
                    <Field label="Outcome" value={project.outcome} onChange={(value) => updateArrayItem("projects", index, "outcome", value)} multiline />
                    <Field label="Details" value={project.details} onChange={(value) => updateArrayItem("projects", index, "details", value)} multiline />
                    <div className="admin-tags-wrap">
                      {project.tools.map((tool, toolIndex) => (
                        <Field key={`${project.id}-tool-${toolIndex}`} label={`Tool ${toolIndex + 1}`} value={tool} onChange={(value) => updateListItem("projects", index, "tools", toolIndex, value)} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-panel-card">
              <p className="eyebrow">Contact</p>
              <h2>How to reach you</h2>
              <div className="admin-form-grid">
                <Field label="Form action" value={content.contact.formAction} onChange={(value) => updateContact("formAction", value)} />
                <Field label="Contact note" value={content.contact.note} onChange={(value) => updateContact("note", value)} multiline />
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
