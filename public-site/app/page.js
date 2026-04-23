import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "./components";

const screenshotCards = [
  {
    eyebrow: "Dashboard",
    title: "See tracked solves and streaks clearly",
    copy: "The popup keeps your core progress visible at a glance, so you can tell whether you are building momentum instead of just collecting random accepted submissions.",
    image: "/screenshots/dashboard-panel.png",
    alt: "LeetBeam dashboard screenshot showing tracked solved count and current streak."
  },
  {
    eyebrow: "Review",
    title: "Turn accepted problems into daily review",
    copy: "Daily review, interview coach, and recent accepted history are grouped into one calm workspace, with optional AI generation layered on top of deterministic analytics.",
    image: "/screenshots/review-panel.png",
    alt: "LeetBeam review screenshot showing daily review, interview coach, and archive panels."
  },
  {
    eyebrow: "Sync",
    title: "Resync from your LeetCode progress page",
    copy: "Bring accepted submissions back in with one click from the progress page instead of manually rebuilding history when you need to refresh recent activity.",
    image: "/screenshots/sync-panel.png",
    alt: "LeetBeam sync screenshot showing resync, open progress page, and AI settings controls."
  },
  {
    eyebrow: "AI",
    title: "Keep AI optional and user-controlled",
    copy: "Narrative coaching stays opt-in. Users can bring their own OpenAI key while the extension remains useful even without any model configured.",
    image: "/screenshots/ai-settings-panel.png",
    alt: "LeetBeam optional AI settings screenshot with provider, API key, and model fields."
  }
];

const featureList = [
  "Local-first accepted submission tracking",
  "Floating solve timer with automatic stop on Accepted",
  "Daily review and interview coach summaries",
  "One-click progress-page resync",
  "Optional OpenAI coaching with your own API key"
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <SiteHeader
        links={[
          { href: "#features", label: "Features" },
          { href: "#screens", label: "Screens" },
          { href: "/privacy", label: "Privacy" },
          { href: "/support", label: "Support" }
        ]}
      />

      <section className="hero-panel hero-panel-showcase">
        <div className="hero-copy">
          <p className="eyebrow">Local-First Tracking</p>
          <h1>Track LeetCode progress locally, time real solves, and review what your practice is actually turning into.</h1>
          <p className="lead">
            LeetBeam combines accepted submission capture, a faster solve timer, daily review, resync from LeetCode progress, and optional AI coaching in one focused workflow.
          </p>

          <div className="hero-actions">
            <a
              className="button button-primary"
              href="https://github.com/James-Studio/LeetBeam"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </a>
            <Link className="button button-secondary" href="/privacy">
              Read privacy policy
            </Link>
          </div>

          <ul className="hero-points">
            {featureList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="hero-screenshot-frame">
          <Image
            className="hero-screenshot"
            src="/screenshots/home-composite.png"
            alt="LeetBeam composite marketing screenshot showing dashboard, review, sync, and AI settings."
            width={1587}
            height={1109}
            priority
          />
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-intro">
          <p className="eyebrow">Why LeetBeam</p>
          <h2>Built around the current product instead of generic extension marketing.</h2>
          <p>
            LeetBeam is not just a submission archive. It tracks accepted solves, records solve time, helps users review daily patterns, refreshes visible history, and keeps AI assistance behind an explicit opt-in.
          </p>
        </div>

        <div className="feature-grid feature-grid-three">
          <article className="feature-card">
            <p className="eyebrow">Timer</p>
            <h3>Solve timing that stays out of the way</h3>
            <p>
              A floating timer on LeetCode problem pages lets users start when they begin solving, minimize it when they want less clutter, and automatically stop on Accepted results.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Tracking</p>
            <h3>Accepted submissions stored locally</h3>
            <p>
              Problem metadata, language, tags, solve timestamps, captured code when available, and timer duration are stored in extension local storage instead of requiring a hosted backend.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Review</p>
            <h3>Daily and interview feedback in one place</h3>
            <p>
              Recent accepted entries, day review, interview coach signals, and optional AI coaching are grouped in the popup so the workflow feels more like a practice journal than a log dump.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Sync</p>
            <h3>One-click recovery from LeetCode history</h3>
            <p>
              Users can pull accepted entries back in from the visible progress page whenever they need to refresh or repair recent history without manual re-entry.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">AI</p>
            <h3>Optional coaching, not AI-first lock-in</h3>
            <p>
              The core extension stays deterministic. OpenAI is used only when the user enables it and supplies their own API key for narrative coaching.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Privacy</p>
            <h3>Clear product boundaries</h3>
            <p>
              Counts, streaks, and tracking logic come from rule-based analytics. AI augments the product instead of owning the product.
            </p>
          </article>
        </div>
      </section>

      <section className="section screenshot-stack" id="screens">
        <div className="section-intro">
          <p className="eyebrow">Product Screens</p>
          <h2>The public site now reflects the actual current UI.</h2>
          <p>
            These screenshots match the extension’s current direction more closely: dashboard visibility, daily review, progress sync, and optional AI settings.
          </p>
        </div>

        <div className="screenshot-grid">
          {screenshotCards.map((card) => (
            <article key={card.title} className="screenshot-card">
              <div className="screenshot-copy">
                <p className="eyebrow">{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </div>
              <div className="screenshot-frame">
                <Image
                  src={card.image}
                  alt={card.alt}
                  width={1587}
                  height={1109}
                  className="screenshot-image"
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section" id="how-it-works">
        <div className="section-intro">
          <p className="eyebrow">How it works</p>
          <h2>Designed for actual interview-prep loops.</h2>
          <p>
            Solve on LeetCode, start timing when you begin, let Accepted submissions land in local history, then use the popup to review progress and generate optional coaching when you want it.
          </p>
        </div>

        <div className="timeline">
          <article className="timeline-card">
            <span className="timeline-step">01</span>
            <h3>Start a real solve</h3>
            <p>Use the LeetBeam timer on the problem page when you begin. It is meant to feel lighter than LeetCode’s built-in timer.</p>
          </article>
          <article className="timeline-card">
            <span className="timeline-step">02</span>
            <h3>Submit normally on LeetCode</h3>
            <p>When the submission is Accepted, LeetBeam records the solve, keeps the timing, and stores metadata locally.</p>
          </article>
          <article className="timeline-card">
            <span className="timeline-step">03</span>
            <h3>Review and resync when needed</h3>
            <p>Open the popup for daily review and interview coaching, or sync again from the progress page whenever recent accepted history needs a refresh.</p>
          </article>
        </div>
      </section>

      <section className="cta-panel">
        <div>
          <p className="eyebrow">Ready to try it</p>
          <h2>Use the repo, ship the screenshots, and keep the product story aligned with the real extension.</h2>
          <p>
            The public site now has a cleaner base for publishing the current LeetBeam workflow instead of relying on placeholder mockups.
          </p>
        </div>
        <div className="cta-actions">
          <a
            className="button button-primary"
            href="https://github.com/James-Studio/LeetBeam"
            target="_blank"
            rel="noreferrer"
          >
            Open GitHub
          </a>
          <Link className="button button-secondary" href="/support">
            Support
          </Link>
        </div>
      </section>
    </main>
  );
}
