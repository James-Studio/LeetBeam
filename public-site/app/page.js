import Link from "next/link";
import { SiteHeader } from "./components";

export default function HomePage() {
  return (
    <main className="site-shell">
      <SiteHeader
        links={[
          { href: "#features", label: "Features" },
          { href: "#how-it-works", label: "How it works" },
          { href: "/privacy", label: "Privacy" },
          { href: "/support", label: "Support" }
        ]}
      />

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Local-First Interview Prep</p>
          <h1>Track your LeetCode practice with calm focus, elegant review, and optional AI coaching.</h1>
          <p className="lead">
            LeetBeam captures accepted solves, organizes your daily momentum, and turns raw practice into a more intentional interview-prep rhythm without forcing you into a backend-first workflow.
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
            <li>Tracks accepted LeetCode solves locally in your browser</li>
            <li>Reviews your day with deterministic analytics before any AI layer</li>
            <li>Lets you add your own OpenAI key only if you want narrative coaching</li>
          </ul>
        </div>

        <div className="hero-visual">
          <div className="mock-window">
            <div className="mock-toolbar">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-card mock-card-hero">
              <p className="eyebrow">Local-First Tracking</p>
              <h2>LeetBeam</h2>
              <div className="metric-grid">
                <div className="metric-box">
                  <span className="metric-label">Tracked solved</span>
                  <strong>12</strong>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Current streak</span>
                  <strong>6</strong>
                </div>
              </div>
            </div>
            <div className="mock-card mock-card-sync">
              <p className="eyebrow">Sync</p>
              <div className="mock-button mock-button-primary">Resync from progress page</div>
              <div className="mock-button-row">
                <div className="mock-button">Open progress page</div>
                <div className="mock-button">AI settings</div>
              </div>
              <p className="mock-note">
                Reads today&apos;s accepted rows from your open LeetCode progress page, with submissions as a fallback.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-intro">
          <p className="eyebrow">Why LeetBeam</p>
          <h2>A quieter, sharper way to review your coding practice.</h2>
          <p>
            Instead of treating LeetCode as a pile of disconnected submissions, LeetBeam turns it into a daily practice journal with grounded metrics, reliable sync paths, and coaching that stays optional.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <p className="eyebrow">Capture</p>
            <h3>Local accepted tracking</h3>
            <p>
              Records accepted problem metadata, tags, language, and code when the page exposes it, all from a Chrome extension workflow that still works without a backend.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Review</p>
            <h3>Deterministic daily insight</h3>
            <p>
              Daily review and interview coach sections are built from rule-based analytics, so your counts, streaks, topic mix, and trend math stay stable and explainable.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Sync</p>
            <h3>Progress-page resync</h3>
            <p>
              Re-reads your LeetCode progress history when you want to correct or refresh recent accepted entries, instead of silently inventing data.
            </p>
          </article>
          <article className="feature-card">
            <p className="eyebrow">Coach</p>
            <h3>Optional AI narrative layer</h3>
            <p>
              Add your own OpenAI API key only if you want higher-level narrative coaching. Core tracking still stays useful without any model configured.
            </p>
          </article>
        </div>
      </section>

      <section className="section split-section" id="how-it-works">
        <div className="section-intro">
          <p className="eyebrow">How it works</p>
          <h2>Designed to stay production-sane.</h2>
          <p>
            LeetBeam prefers visible page extraction, local storage, and narrow sync actions over fragile hidden dependencies. The result is a workflow that feels lightweight, but still gives you meaningful review.
          </p>
        </div>

        <div className="timeline">
          <article className="timeline-card">
            <span className="timeline-step">01</span>
            <h3>Solve on LeetCode</h3>
            <p>The extension listens on supported LeetCode pages and captures accepted submissions from real page state.</p>
          </article>
          <article className="timeline-card">
            <span className="timeline-step">02</span>
            <h3>Review your day</h3>
            <p>Open the popup to see tracked solves, streak, recent accepted problems, and a daily summary of where your practice is strong or thin.</p>
          </article>
          <article className="timeline-card">
            <span className="timeline-step">03</span>
            <h3>Coach with intention</h3>
            <p>
              Enable AI only when you want richer narrative guidance. The extension sends a compact analytics summary instead of outsourcing the whole product to a model.
            </p>
          </article>
        </div>
      </section>

      <section className="section trust-section">
        <div className="section-intro">
          <p className="eyebrow">Trust by design</p>
          <h2>Built around clarity instead of magic.</h2>
        </div>
        <div className="trust-grid">
          <div className="trust-pill">
            <strong>Local-first</strong>
            <span>Tracked history lives in your browser profile by default.</span>
          </div>
          <div className="trust-pill">
            <strong>Deterministic core</strong>
            <span>Counts, streaks, and topic math stay rule-based and inspectable.</span>
          </div>
          <div className="trust-pill">
            <strong>Optional AI</strong>
            <span>AI coaching is additive, disabled by default, and user-controlled.</span>
          </div>
        </div>
      </section>

      <section className="cta-panel">
        <div>
          <p className="eyebrow">Ready to try it</p>
          <h2>Bring more shape and signal to your interview prep.</h2>
          <p>
            LeetBeam is built for people who want a calmer, more intentional practice loop instead of another noisy dashboard.
          </p>
        </div>
        <div className="cta-actions">
          <a
            className="button button-primary"
            href="https://github.com/James-Studio/LeetBeam"
            target="_blank"
            rel="noreferrer"
          >
            Get the source
          </a>
          <Link className="button button-secondary" href="/support">
            Support
          </Link>
        </div>
      </section>
    </main>
  );
}
