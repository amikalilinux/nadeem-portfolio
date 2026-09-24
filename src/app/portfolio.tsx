"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import fallbackContent from "@/data/content.json";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const navItems = ["About", "Experience", "Projects", "Contact"];
const projectFilters = ["All", "Field research", "Education", "Community"];
const certificationFilters = ["All", "Research", "Climate", "Digital"];

type PortfolioContent = typeof fallbackContent;
type DraftRecord = Record<string, unknown>;

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function isPortfolioContent(value: unknown): value is PortfolioContent {
  return Boolean(value && typeof value === "object" && "profile" in value && "about" in value);
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
  const [content, setContent] = useState<typeof fallbackContent | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("About");
  const [projectFilter, setProjectFilter] = useState("All");
  const [certificationFilter, setCertificationFilter] = useState("All");
  const [certificationSearch, setCertificationSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<(typeof fallbackContent.projects)[number] | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const currentContent = content ?? fallbackContent;

  useEffect(() => {
    const savedMode = window.localStorage.getItem("nadeem-theme");
    const frame = window.requestAnimationFrame(() => {
      setDarkMode(savedMode === "dark");
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
    let active = true;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setContent(fallbackContent);
      setLoaded(true);
      return;
    }

    const loadContent = async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_content")
          .select("content")
          .eq("slug", "main")
          .maybeSingle();

        if (!active) return;

        if (error) {
          setContent(fallbackContent);
          setLoaded(true);
          return;
        }

        if (data?.content && isPortfolioContent(data.content)) {
          setContent(data.content as PortfolioContent);
        } else {
          setContent(fallbackContent);
        }
      } catch {
        if (active) {
          setContent(fallbackContent);
        }
      } finally {
        if (active) setLoaded(true);
      }
    };

    void loadContent();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("nadeem-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const visibleProjects = projectFilter === "All" ? currentContent.projects : currentContent.projects.filter((project) => project.category === projectFilter);
  const visibleCertifications = currentContent.certifications.filter((certification) => {
    const matchesFilter = certificationFilter === "All" || certification.category === certificationFilter;
    const query = certificationSearch.toLowerCase();
    return matchesFilter && `${certification.title} ${certification.issuer}`.toLowerCase().includes(query);
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  if (!loaded) {
    return (
      <div className="loading-screen">
        <span className="loading-mark">NJ</span>
        <span>Preparing field notes...</span>
      </div>
    );
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={`${currentContent.profile.name} home`}>
          <span className="brand-mark">{currentContent.profile.logo}</span>
          <span>{currentContent.profile.name}</span>
        </a>
        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="Primary navigation">
          {navItems.map((item) => (
            <button key={item} className={activeSection === item ? "active" : ""} onClick={() => scrollTo(item.toLowerCase())}>
              {item}
            </button>
          ))}
          <button onClick={() => scrollTo("contact")} className="nav-contact">
            Let&apos;s talk <ArrowIcon />
          </button>
        </nav>
        <div className="header-actions">
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}>
            <span>{darkMode ? "☼" : "◐"}</span>
          </button>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation menu">
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-pattern" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="hero-content">
          <div className="hero-copy reveal">
            <p className="eyebrow"><span className="status-dot" /> Available for meaningful work</p>
            <h1>
              {currentContent.profile.name.split(" ").map((name, index) => (
                <span key={name} className={index === 1 ? "accent-word" : ""}>{name} </span>
              ))}
            </h1>
            <p className="hero-role">{currentContent.profile.role}</p>
            <p className="hero-tagline">{currentContent.profile.tagline}</p>
            <p className="hero-intro">{currentContent.profile.intro}</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => scrollTo("projects")}>View my work <ArrowIcon /></button>
              <a className="button button-secondary" href={currentContent.profile.cv} download>
                Download CV <span aria-hidden="true">↓</span>
              </a>
              <button className="button button-quiet" onClick={() => scrollTo("contact")}>Contact me</button>
            </div>
            <div className="hero-meta">
              <span>{currentContent.profile.location}</span>
              <span className="meta-line" />
              <span>Research · Education · Conservation</span>
            </div>
          </div>

          <div className="hero-portrait reveal delay-1">
            <div className="portrait-ring">
              <Image src={currentContent.profile.photo} alt="Portrait of Nadeem Jamal" width={640} height={640} priority />
            </div>
            <div className="portrait-note note-one"><span className="note-symbol">✳</span><span>Curiosity<br /><strong>in practice</strong></span></div>
            <div className="portrait-note note-two"><span className="note-number">03</span><span>areas of<br /><strong>focus</strong></span></div>
          </div>
        </div>
        <button className="scroll-cue" onClick={() => scrollTo("about")}><span>Scroll to explore</span><span className="scroll-line" /></button>
      </section>

      <section className="section about-section" id="about">
        <SectionIntro eyebrow="01 / About" title="Science is a way of paying attention." copy="I work where research, education, and care for the living world meet." />
        <div className="about-grid">
          <p className="about-lead">{currentContent.about}</p>
          <div className="about-side">
            <span className="quote-mark">“</span>
            <p>Good science asks better questions. Good education makes room for more people to ask them.</p>
            <span className="signature">Nadeem</span>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="stats-grid">
          {currentContent.stats.map((stat) => (
            <div className="stat reveal" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="skills">
        <SectionIntro eyebrow="02 / Capabilities" title="A practical toolkit for curious work." copy="From a careful field note to a room full of young questions, these are the ways I contribute." />
        <div className="skills-grid">
          {currentContent.skills.map((skill, index) => (
            <article className="skill-card reveal" key={skill.title}>
              <span className="skill-icon">{skill.icon}</span>
              <span className="card-index">0{index + 1}</span>
              <h3>{skill.title}</h3>
              <div className="tag-list">{skill.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="experience">
        <SectionIntro eyebrow="03 / Experience" title="Work shaped by field evidence and public trust." copy="I move between research, teaching, and collaborative problem solving." />
        <div className="timeline">
          {currentContent.experience.map((item) => (
            <article className="timeline-item reveal" key={`${item.role}-${item.place}`}>
              <div className="timeline-dot" aria-hidden="true" />
              <div className="timeline-content">
                <div className="timeline-head">
                  <h3>{item.role}</h3>
                  <span>{item.dates}</span>
                </div>
                <p className="timeline-place">{item.place}</p>
                <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="education">
        <SectionIntro eyebrow="04 / Education" title="Training that keeps curiosity grounded." copy="My study path and research interests are shaped by careful observation and practical questions." />
        <div className="education-card reveal">
          <div>
            <p className="eyebrow">Degree</p>
            <h3>{currentContent.education.degree}</h3>
          </div>
          <div className="education-meta">
            <span>{currentContent.education.university}</span>
            <span>{currentContent.education.dates}</span>
            <span>{currentContent.education.grade}</span>
          </div>
          <p>{currentContent.education.project}</p>
        </div>
      </section>

      <section className="section" id="projects">
        <SectionIntro eyebrow="05 / Projects" title="Applied work with local meaning." copy="Selected efforts that combine evidence, learning, and community engagement." />
        <div className="filter-row">
          {projectFilters.map((filter) => (
            <button key={filter} className={projectFilter === filter ? "filter-button active" : "filter-button"} onClick={() => setProjectFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
        <div className="project-grid">
          {visibleProjects.map((project) => (
            <article className="project-card reveal" key={project.id}>
              <button className="project-image-button" onClick={() => setSelectedProject(project)}>
                <Image src={project.image} alt={project.title} width={800} height={520} unoptimized />
              </button>
              <div className="project-body">
                <span className="project-tag">{project.category}</span>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="tag-list">{project.tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="certifications">
        <SectionIntro eyebrow="06 / Credentials" title="Learning is a practice of staying useful." copy="Selected courses and certifications that sharpen my research and communication work." />
        <div className="filter-row compact">
          {certificationFilters.map((filter) => (
            <button key={filter} className={certificationFilter === filter ? "filter-button active" : "filter-button"} onClick={() => setCertificationFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
        <div className="search-box">
          <input type="search" placeholder="Search certifications" value={certificationSearch} onChange={(event) => setCertificationSearch(event.target.value)} />
        </div>
        <div className="cert-grid">
          {visibleCertifications.map((certification) => (
            <article className="cert-card reveal" key={`${certification.title}-${certification.issuer}`}>
              <span className="cert-year">{certification.year}</span>
              <h3>{certification.title}</h3>
              <p>{certification.issuer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="contact">
        <SectionIntro eyebrow="07 / Contact" title="Let&apos;s build something thoughtful together." copy="I’m open to research, education, and community-facing work where careful thinking matters." />
        <div className="contact-panel reveal">
          <div>
            <p className="contact-lead">{currentContent.contact.note}</p>
            <a href={`mailto:${currentContent.profile.email}`} className="contact-link">{currentContent.profile.email}</a>
          </div>
          <div className="contact-links">
            {Object.entries(currentContent.profile.socials).map(([key, value]) => (
              <a key={key} href={value} target="_blank" rel="noreferrer">{key}</a>
            ))}
          </div>
        </div>
      </section>

      {selectedProject && (
        <div className="modal-backdrop" onClick={() => setSelectedProject(null)}>
          <div className="project-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProject(null)}>×</button>
            <div className="modal-image-wrap">
              <Image src={selectedProject.image} alt={selectedProject.title} width={1200} height={700} unoptimized />
            </div>
            <div className="modal-copy">
              <span className="project-tag">{selectedProject.category}</span>
              <h3>{selectedProject.title}</h3>
              <p>{selectedProject.description}</p>
              <div className="tag-list">{selectedProject.tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
              <p className="modal-outcome">{selectedProject.outcome}</p>
              <p>{selectedProject.details}</p>
            </div>
          </div>
        </div>
      )}

      <button className={showTop ? "back-to-top visible" : "back-to-top"} onClick={() => scrollTo("top")} aria-label="Back to top">↑</button>
    </main>
  );
}
