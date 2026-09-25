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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="admin-field admin-color-field">
      <span>{label}</span>
      <div className="admin-color-input-wrap">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <span>{value}</span>
      </div>
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
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
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setAuthenticated(Boolean(data.session));
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthenticated(Boolean(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
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
        const merged = {
          ...fallbackContent,
          ...data.content,
          customization: {
            ...fallbackContent.customization,
            ...(data.content.customization ?? {}),
            colors: { ...fallbackContent.customization.colors, ...((data.content.customization?.colors ?? {}) as Record<string, string>) },
            textStyles: { ...fallbackContent.customization.textStyles, ...((data.content.customization?.textStyles ?? {}) as Record<string, { size: string; weight: number; color: string }>) },
            buttonLabels: { ...fallbackContent.customization.buttonLabels, ...((data.content.customization?.buttonLabels ?? {}) as Record<string, string>) },
          },
        } as PortfolioContent;

        setContent(merged);
        setContentJson(JSON.stringify(merged, null, 2));
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
    const merged = {
      ...fallbackContent,
      ...next,
      customization: {
        ...fallbackContent.customization,
        ...next.customization,
        colors: { ...fallbackContent.customization.colors, ...next.customization.colors },
        textStyles: { ...fallbackContent.customization.textStyles, ...next.customization.textStyles },
        buttonLabels: { ...fallbackContent.customization.buttonLabels, ...next.customization.buttonLabels },
      },
    } as PortfolioContent;

    setContent(merged);
    setContentJson(JSON.stringify(merged, null, 2));
    setSaveState("");
  }

  function updateProfile(key: keyof PortfolioContent["profile"], value: string) {
    syncContent({ ...content, profile: { ...content.profile, [key]: value } });
  }

  function updateProfilePhoto(value: string) {
    syncContent({
      ...content,
      profile: { ...content.profile, photo: value },
      customization: { ...content.customization, profilePhoto: value },
    } as PortfolioContent);
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

  function updateCustomizationField(key: keyof PortfolioContent["customization"], value: string) {
    syncContent({ ...content, customization: { ...content.customization, [key]: value } } as PortfolioContent);
  }

  function updateCustomizationBoolean(key: "logoTextVisible", value: boolean) {
    syncContent({ ...content, customization: { ...content.customization, [key]: value } } as PortfolioContent);
  }

  function updateButtonLabel(key: keyof PortfolioContent["customization"]["buttonLabels"], value: string) {
    syncContent({
      ...content,
      customization: {
        ...content.customization,
        buttonLabels: { ...content.customization.buttonLabels, [key]: value },
      },
    } as PortfolioContent);
  }

  function updateThemeColor(key: keyof PortfolioContent["customization"]["colors"], value: string) {
    syncContent({
      ...content,
      customization: {
        ...content.customization,
        colors: { ...content.customization.colors, [key]: value },
      },
    } as PortfolioContent);
  }

  function updateTextStyle(name: keyof PortfolioContent["customization"]["textStyles"], field: "size" | "weight" | "color", value: string) {
    const style = content.customization.textStyles[name];
    syncContent({
      ...content,
      customization: {
        ...content.customization,
        textStyles: {
          ...content.customization.textStyles,
          [name]: { ...style, [field]: field === "weight" ? Number(value || 400) : value },
        },
      },
    } as PortfolioContent);
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

  function addItem(section: "stats" | "skills" | "experience" | "projects" | "certifications" | "workshops" | "languages", item: DraftRecord) {
    const items = content[section] as unknown as DraftRecord[];
    syncContent({ ...content, [section]: [...items, item] } as PortfolioContent);
  }

  function deleteItem(section: "stats" | "skills" | "experience" | "projects" | "certifications" | "workshops" | "languages", index: number) {
    const items = content[section] as unknown as DraftRecord[];
    syncContent({ ...content, [section]: items.filter((_item, itemIndex) => itemIndex !== index) } as PortfolioContent);
  }

  function parseAdvanced() {
    try {
      const parsed = JSON.parse(contentJson) as PortfolioContent;
      if (!isPortfolioContent(parsed)) throw new Error("Content must include profile and about.");
      const merged = {
        ...fallbackContent,
        ...parsed,
        customization: {
          ...fallbackContent.customization,
          ...(parsed.customization ?? {}),
          colors: { ...fallbackContent.customization.colors, ...((parsed.customization?.colors ?? {}) as Record<string, string>) },
          textStyles: { ...fallbackContent.customization.textStyles, ...((parsed.customization?.textStyles ?? {}) as Record<string, { size: string; weight: number; color: string }>) },
          buttonLabels: { ...fallbackContent.customization.buttonLabels, ...((parsed.customization?.buttonLabels ?? {}) as Record<string, string>) },
        },
      } as PortfolioContent;
      setContent(merged);
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

  if (contentLoading) return <main className="admin-loading">Loading your saved content...</main>;

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
                <ImagePreview url={content.customization.profilePhoto || content.profile.photo} label="Profile photo preview" />
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
                <Field label="Profile photo URL" value={content.customization.profilePhoto || content.profile.photo} onChange={updateProfilePhoto} />
                <Field label="CV PDF URL" value={content.profile.cv} onChange={(value) => updateProfile("cv", value)} />
              </div>

              <div className="admin-upload-grid">
                <UploadField label="Upload profile photo" kind="image" onUploaded={updateProfilePhoto} />
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
              <p className="eyebrow">Customization</p>
              <h2>Theme, media &amp; typography</h2>
              <div className="admin-form-grid">
                <Field label="Hero background URL" value={content.customization.heroBackground} onChange={(value) => updateCustomizationField("heroBackground", value)} />
                <Field label="Profile photo URL" value={content.customization.profilePhoto} onChange={(value) => updateCustomizationField("profilePhoto", value)} />
                <Field label="Logo image URL" value={content.customization.logoImage} onChange={(value) => updateCustomizationField("logoImage", value)} />
                <Field label="WhatsApp number" value={content.customization.whatsappNumber} onChange={(value) => updateCustomizationField("whatsappNumber", value)} />
                <Field label="WhatsApp link" value={content.customization.whatsappLink} onChange={(value) => updateCustomizationField("whatsappLink", value)} />
                <Field label="Logo shape (circle, square, rounded)" value={content.customization.logoShape} onChange={(value) => updateCustomizationField("logoShape", value)} />
                <Field label="Logo size (for example 42px)" value={content.customization.logoSize} onChange={(value) => updateCustomizationField("logoSize", value)} />
                <Field label="Header style (glass, solid, plain)" value={content.customization.headerStyle} onChange={(value) => updateCustomizationField("headerStyle", value)} />
                <Field label="Card radius" value={content.customization.cardRadius} onChange={(value) => updateCustomizationField("cardRadius", value)} />
                <Field label="Button radius" value={content.customization.buttonRadius} onChange={(value) => updateCustomizationField("buttonRadius", value)} />
                <Field label="Section spacing" value={content.customization.sectionSpacing} onChange={(value) => updateCustomizationField("sectionSpacing", value)} />
                <Field label="Font family" value={content.customization.fontFamily} onChange={(value) => updateCustomizationField("fontFamily", value)} />
                <ToggleField label="Show logo name beside the logo" checked={content.customization.logoTextVisible} onChange={(value) => updateCustomizationBoolean("logoTextVisible", value)} />
              </div>

              <div className="admin-upload-grid">
                <UploadField label="Upload logo image" kind="image" onUploaded={(value) => updateCustomizationField("logoImage", value)} />
                <UploadField label="Upload hero/profile image" kind="image" onUploaded={(value) => updateCustomizationField("heroBackground", value)} />
              </div>

              <div className="admin-form-grid">
                {Object.entries(content.customization.buttonLabels).map(([key, value]) => (
                  <Field key={key} label={`${key} button text`} value={value} onChange={(nextValue) => updateButtonLabel(key as keyof PortfolioContent["customization"]["buttonLabels"], nextValue)} />
                ))}
              </div>

              <div className="admin-color-grid">
                {Object.entries(content.customization.colors).map(([key, value]) => (
                  <ColorField key={key} label={key} value={String(value)} onChange={(nextValue) => updateThemeColor(key as keyof PortfolioContent["customization"]["colors"], nextValue)} />
                ))}
              </div>

              <div className="admin-form-grid">
                {Object.entries(content.customization.textStyles).map(([key, style]) => (
                  <div key={key} className="mini-grid">
                    <Field label={`${key} size`} value={style.size} onChange={(value) => updateTextStyle(key as keyof PortfolioContent["customization"]["textStyles"], "size", value)} />
                    <Field label={`${key} weight`} value={String(style.weight)} onChange={(value) => updateTextStyle(key as keyof PortfolioContent["customization"]["textStyles"], "weight", value)} />
                    <ColorField label={`${key} color`} value={style.color} onChange={(value) => updateTextStyle(key as keyof PortfolioContent["customization"]["textStyles"], "color", value)} />
                  </div>
                ))}
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
                    <button className="admin-delete-button" type="button" onClick={() => deleteItem("stats", index)}>Delete statistic</button>
                  </div>
                ))}
              </div>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("stats", { value: "0", label: "New statistic" })}>+ Add statistic</button>
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
              <p className="eyebrow">Skills &amp; experience</p>
              <h2>Edit every capability and role</h2>
              <div className="admin-resource-list">
                {content.skills.map((skill, index) => (
                  <article key={`${skill.title}-${index}`} className="admin-resource-item">
                    <div className="admin-resource-heading">
                      <strong>Skill {index + 1}</strong>
                      <button className="admin-delete-button" type="button" onClick={() => deleteItem("skills", index)}>Delete skill</button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Title" value={skill.title} onChange={(value) => updateArrayItem("skills", index, "title", value)} />
                      <Field label="Icon" value={skill.icon} onChange={(value) => updateArrayItem("skills", index, "icon", value)} />
                    </div>
                    <div className="admin-tags-wrap">
                      {skill.tags.map((tag, tagIndex) => (
                        <Field key={`${skill.title}-tag-${tagIndex}`} label={`Tag ${tagIndex + 1}`} value={tag} onChange={(value) => updateListItem("skills", index, "tags", tagIndex, value)} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("skills", { title: "New skill", icon: "✦", tags: ["New tag"] })}>+ Add skill</button>
              <div className="admin-resource-list">
                {content.experience.map((item, index) => (
                  <article key={`${item.role}-${index}`} className="admin-resource-item">
                    <div className="admin-resource-heading">
                      <strong>Experience {index + 1}</strong>
                      <button className="admin-delete-button" type="button" onClick={() => deleteItem("experience", index)}>Delete experience</button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Role" value={item.role} onChange={(value) => updateArrayItem("experience", index, "role", value)} />
                      <Field label="Place" value={item.place} onChange={(value) => updateArrayItem("experience", index, "place", value)} />
                      <Field label="Dates" value={item.dates} onChange={(value) => updateArrayItem("experience", index, "dates", value)} />
                    </div>
                    <div className="admin-tags-wrap">
                      {item.bullets.map((bullet, bulletIndex) => (
                        <Field key={`${item.role}-bullet-${bulletIndex}`} label={`Bullet ${bulletIndex + 1}`} value={bullet} onChange={(value) => updateListItem("experience", index, "bullets", bulletIndex, value)} multiline />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("experience", { role: "New role", place: "New organization", dates: "2026 — Present", bullets: ["Add an achievement."] })}>+ Add experience</button>
            </section>

            <section className="admin-panel-card">
              <p className="eyebrow">Projects</p>
              <h2>{projectCount} featured projects</h2>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("projects", {
                id: `project-${Date.now()}`,
                category: "Field research",
                title: "New project",
                description: "Add a project description.",
                tools: ["New tool"],
                outcome: "Add the project outcome.",
                image: "",
                details: "Add project details.",
              })}>+ Add project</button>
              <div className="admin-resource-list">
                {content.projects.map((project, index) => (
                  <article key={project.id} className="admin-resource-item">
                    <div className="admin-resource-heading">
                      <strong>Project {index + 1}</strong>
                      <button className="admin-delete-button" type="button" onClick={() => deleteItem("projects", index)}>Delete project</button>
                    </div>
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

            <section className="admin-panel-card">
              <p className="eyebrow">Credentials &amp; community</p>
              <h2>Edit certifications, workshops, and languages</h2>
              <div className="admin-resource-list">
                {content.certifications.map((item, index) => (
                  <article key={`${item.title}-${index}`} className="admin-resource-item">
                    <div className="admin-resource-heading">
                      <strong>Certification {index + 1}</strong>
                      <button className="admin-delete-button" type="button" onClick={() => deleteItem("certifications", index)}>Delete certification</button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Title" value={item.title} onChange={(value) => updateArrayItem("certifications", index, "title", value)} />
                      <Field label="Issuer" value={item.issuer} onChange={(value) => updateArrayItem("certifications", index, "issuer", value)} />
                      <Field label="Year" value={item.year} onChange={(value) => updateArrayItem("certifications", index, "year", value)} />
                      <Field label="Category" value={item.category} onChange={(value) => updateArrayItem("certifications", index, "category", value)} />
                    </div>
                  </article>
                ))}
              </div>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("certifications", { title: "New certification", issuer: "Issuer", year: "2026", category: "Research" })}>+ Add certification</button>

              <div className="admin-resource-list">
                {content.workshops.map((item, index) => (
                  <article key={`${item.topic}-${index}`} className="admin-resource-item">
                    <div className="admin-resource-heading">
                      <strong>Workshop {index + 1}</strong>
                      <button className="admin-delete-button" type="button" onClick={() => deleteItem("workshops", index)}>Delete workshop</button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Date" value={item.date} onChange={(value) => updateArrayItem("workshops", index, "date", value)} />
                      <Field label="Topic" value={item.topic} onChange={(value) => updateArrayItem("workshops", index, "topic", value)} />
                      <Field label="Place" value={item.place} onChange={(value) => updateArrayItem("workshops", index, "place", value)} />
                      <Field label="Description" value={item.description} onChange={(value) => updateArrayItem("workshops", index, "description", value)} multiline />
                    </div>
                  </article>
                ))}
              </div>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("workshops", { date: "2026", topic: "New workshop", place: "Organization", description: "Add workshop details." })}>+ Add workshop</button>

              <div className="admin-resource-list">
                {content.languages.map((item, index) => (
                  <article key={`${item.name}-${index}`} className="admin-resource-item">
                    <div className="admin-resource-heading">
                      <strong>Language {index + 1}</strong>
                      <button className="admin-delete-button" type="button" onClick={() => deleteItem("languages", index)}>Delete language</button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Name" value={item.name} onChange={(value) => updateArrayItem("languages", index, "name", value)} />
                      <Field label="Level" value={item.level} onChange={(value) => updateArrayItem("languages", index, "level", value)} />
                      <Field label="Note" value={item.note} onChange={(value) => updateArrayItem("languages", index, "note", value)} />
                    </div>
                  </article>
                ))}
              </div>
              <button className="button button-secondary admin-add-button" type="button" onClick={() => addItem("languages", { name: "New language", level: "Conversational", note: "Add language details." })}>+ Add language</button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
