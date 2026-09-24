"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import fallbackContent from "@/data/content.json";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const navItems = ["About", "Experience", "Projects", "Contact"];
const projectFilters = ["All", "Field research", "Education", "Community"];
const certificationFilters = ["All", "Research", "Climate", "Digital"];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function SectionIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="section-intro reveal">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p className="section-copy">{copy}</p>}
    </div>
  );
}

export default function Portfolio() {
  const [content, setContent] = useState(fallbackContent);
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("About");
  const [projectFilter, setProjectFilter] = useState("All");
  const [certificationFilter, setCertificationFilter] = useState("All");
  const [certificationSearch, setCertificationSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<(typeof content.projects)[number] | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedMode = window.localStorage.getItem("nadeem-theme");
    const frame = window.requestAnimationFrame(() => {
      setDarkMode(savedMode === "dark");
      setLoaded(true);
    });
    const onScroll = () => {
      setShowTop(window.scrollY > 520);
      const sections = navItems.map((item) => document.getElementById(item.toLowerCase()));
      const current = sections.find((section) => section && section.getBoundingClientRect().top > 80 && section.getBoundingClientRect().top < window.innerHeight * 0.55);
      if (current) setActiveSection(current.id.charAt(0).toUpperCase() + current.id.slice(1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.from("portfolio_content").select("content").eq("slug", "main").maybeSingle().then(({ data }) => {
      if (data?.content && typeof data.content === "object" && "profile" in data.content && "about" in data.content) setContent(data.content as typeof fallbackContent);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("nadeem-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const visibleProjects = projectFilter === "All" ? content.projects : content.projects.filter((project) => project.category === projectFilter);
  const visibleCertifications = content.certifications.filter((certification) => {
    const matchesFilter = certificationFilter === "All" || certification.category === certificationFilter;
    const query = certificationSearch.toLowerCase();
    return matchesFilter && `${certification.title} ${certification.issuer}`.toLowerCase().includes(query);
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  if (!loaded) return <div className="loading-screen"><span className="loading-mark">NJ</span><span>Preparing field notes...</span></div>;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={`${content.profile.name} home`}><span className="brand-mark">{content.profile.logo}</span><span>{content.profile.name}</span></a>
        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
          {navItems.map((item) => <button key={item} className={activeSection === item ? "active" : ""} onClick={() => scrollTo(item.toLowerCase())}>{item}</button>)}
          <button onClick={() => scrollTo("contact")} className="nav-contact">Let&apos;s talk <ArrowIcon /></button>
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}><span>{darkMode ? "☼" : "◐"}</span></button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation menu">{menuOpen ? "×" : "☰"}</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-pattern" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="hero-content">
          <div className="hero-copy reveal">
            <p className="eyebrow"><span className="status-dot" /> Available for meaningful work</p>
            <h1>{content.profile.name.split(" ").map((name, index) => <span key={name} className={index === 1 ? "accent-word" : ""}>{name} </span>)}</h1>
            <p className="hero-role">{content.profile.role}</p>
            <p className="hero-tagline">{content.profile.tagline}</p>
            <p className="hero-intro">{content.profile.intro}</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => scrollTo("projects")}>View my work <ArrowIcon /></button>
              <a className="button button-secondary" href={content.profile.cv} download>Download CV <span aria-hidden="true">↓</span></a>
              <button className="button button-quiet" onClick={() => scrollTo("contact")}>Contact me</button>
            </div>
            <div className="hero-meta"><span>{content.profile.location}</span><span className="meta-line" /><span>Research · Education · Conservation</span></div>
          </div>
          <div className="hero-portrait reveal delay-1">
            <div className="portrait-ring"><Image src={content.profile.photo} alt="Portrait of Nadeem Jamal" width={640} height={640} priority /></div>
            <div className="portrait-note note-one"><span className="note-symbol">✳</span><span>Curiosity<br /><strong>in practice</strong></span></div>
            <div className="portrait-note note-two"><span className="note-number">03</span><span>areas of<br /><strong>focus</strong></span></div>
          </div>
        </div>
        <button className="scroll-cue" onClick={() => scrollTo("about")}><span>Scroll to explore</span><span className="scroll-line" /></button>
      </section>

      <section className="section about-section" id="about">
        <SectionIntro eyebrow="01 / About" title="Science is a way of paying attention." copy="I work where research, education, and care for the living world meet." />
        <div className="about-grid">
          <p className="about-lead">{content.about}</p>
          <div className="about-side"><span className="quote-mark">“</span><p>Good science asks better questions. Good education makes room for more people to ask them.</p><span className="signature">Nadeem</span></div>
        </div>
      </section>

      <section className="stats-band"><div className="stats-grid">{content.stats.map((stat) => <div className="stat reveal" key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div></section>

      <section className="section" id="skills">
        <SectionIntro eyebrow="02 / Capabilities" title="A practical toolkit for curious work." copy="From a careful field note to a room full of young questions, these are the ways I contribute." />
        <div className="skills-grid">{content.skills.map((skill, index) => <article className="skill-card reveal" key={skill.title}><span className="skill-icon">{skill.icon}</span><span className="card-index">0{index + 1}</span><h3>{skill.title}</h3><div className="tag-list">{skill.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div>
      </section>

      <section className="section split-section" id="experience">
        <SectionIntro eyebrow="03 / Experience" title="Learning by doing, sharing, and looking closer." />
        <div className="timeline">{content.experience.map((item, index) => <article className="timeline-item reveal" key={item.role}><div className="timeline-marker">0{index + 1}</div><div className="timeline-main"><div className="timeline-heading"><div><h3>{item.role}</h3><p>{item.place}</p></div><span>{item.dates}</span></div><ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div></article>)}</div>
      </section>

      <section className="section education-section" id="education">
        <SectionIntro eyebrow="04 / Education" title="A foundation in the living world." />
        <div className="education-card reveal"><div className="edu-year">{content.education.dates}</div><div className="edu-content"><p className="eyebrow">Undergraduate study</p><h3>{content.education.degree}</h3><p className="edu-school">{content.education.university}</p><p>{content.education.project}</p></div><div className="edu-grade"><span>Grade</span><strong>{content.education.grade}</strong></div></div>
      </section>

      <section className="section projects-section" id="projects">
        <SectionIntro eyebrow="05 / Selected work" title="Small studies with a wider view." copy="A few projects where observation became evidence, and evidence became a shared starting point." />
        <div className="filter-row" role="tablist" aria-label="Project categories">{projectFilters.map((filter) => <button key={filter} className={projectFilter === filter ? "selected" : ""} onClick={() => setProjectFilter(filter)}>{filter}</button>)}</div>
        <div className="projects-grid">{visibleProjects.map((project, index) => <article className={`project-card project-${index + 1} reveal`} key={project.id} onClick={() => setSelectedProject(project)} tabIndex={0} onKeyDown={(event) => event.key === "Enter" && setSelectedProject(project)}><div className="project-image"><Image src={project.image} alt="" fill sizes="(max-width: 800px) 100vw, 50vw" /><span className="project-category">{project.category}</span><span className="project-open">↗</span></div><div className="project-body"><p className="project-number">0{index + 1}</p><h3>{project.title}</h3><p>{project.description}</p><div className="project-tools">{project.tools.map((tool) => <span key={tool}>{tool}</span>)}</div></div></article>)}</div>
      </section>

      <section className="section certifications-section" id="certifications">
        <div className="cert-heading"><SectionIntro eyebrow="06 / Continuing learning" title="Proof that the work keeps moving." /><div className="search-wrap"><span>⌕</span><input value={certificationSearch} onChange={(event) => setCertificationSearch(event.target.value)} placeholder="Search certifications" aria-label="Search certifications" /></div></div>
        <div className="filter-row">{certificationFilters.map((filter) => <button key={filter} className={certificationFilter === filter ? "selected" : ""} onClick={() => setCertificationFilter(filter)}>{filter}</button>)}</div>
        <div className="cert-grid">{visibleCertifications.map((certification) => <article className="cert-card reveal" key={certification.title}><div className="cert-seal">✦</div><div><p className="cert-year">{certification.year} · {certification.category}</p><h3>{certification.title}</h3><p>{certification.issuer}</p></div><span className="cert-arrow">↗</span></article>)}</div>
      </section>

      <section className="section workshop-section" id="workshops"><SectionIntro eyebrow="07 / Workshops & conferences" title="Making space for shared understanding." /><div className="workshop-list">{content.workshops.map((workshop) => <article className="workshop-item reveal" key={workshop.topic}><span className="workshop-date">{workshop.date}</span><div><p className="eyebrow">{workshop.place}</p><h3>{workshop.topic}</h3><p>{workshop.description}</p></div><span className="workshop-arrow">↗</span></article>)}</div></section>

      <section className="section languages-section" id="languages"><SectionIntro eyebrow="08 / Languages" title="Science travels further when it is shared clearly." /><div className="language-grid">{content.languages.map((language, index) => <article className="language-card reveal" key={language.name}><span className="language-index">0{index + 1}</span><h3>{language.name}</h3><span className="level-badge">{language.level}</span><p>{language.note}</p></article>)}</div></section>

      <section className="cv-band"><div><p className="eyebrow">A fuller picture</p><h2>Take the work with you.</h2><p>For a concise look at my experience, education, and current focus.</p></div><a className="button button-light" href={content.profile.cv} download>Download my CV <span>↓</span></a></section>

      <section className="section contact-section" id="contact"><div className="contact-grid"><div><SectionIntro eyebrow="09 / Contact" title="Let&apos;s make the next question a good one." copy={content.contact.note} /><div className="contact-links"><a href={`mailto:${content.profile.email}`}>{content.profile.email} <ArrowIcon /></a><span>{content.profile.location}</span></div><div className="social-links">{Object.entries(content.profile.socials).map(([name, link]) => <a href={link} target="_blank" rel="noreferrer" key={name} aria-label={name}>{name === "scholar" ? "GS" : name.slice(0, 2).toUpperCase()}</a>)}</div></div><form className="contact-form" action={content.contact.formAction} method="POST"><label>Name<input required name="name" placeholder="Your name" /></label><label>Email<input required type="email" name="email" placeholder="you@example.com" /></label><label>Message<textarea required name="message" rows={5} placeholder="Tell me a little about what you are working on..." /></label><label className="honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label><button className="button button-primary" type="submit">Send a note <ArrowIcon /></button></form></div></section>

      <footer className="site-footer"><span>© {new Date().getFullYear()} Nadeem Jamal</span><span>Made with curiosity · Peshawar, PK</span><a href="#top">Back to top ↑</a></footer>
      {showTop && <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button>}
      {selectedProject && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedProject(null)}><div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedProject(null)} aria-label="Close project details">×</button><Image src={selectedProject.image} alt="" width={1000} height={500} /><p className="eyebrow">{selectedProject.category}</p><h2 id="project-title">{selectedProject.title}</h2><p>{selectedProject.details}</p><p><strong>Outcome:</strong> {selectedProject.outcome}</p><div className="project-tools">{selectedProject.tools.map((tool) => <span key={tool}>{tool}</span>)}</div></div></div>}
    </main>
  );
}
