import Link from "next/link";
import { ProseShell } from "../components";

export const metadata = {
  title: "Privacy Policy | LeetBeam"
};

export default function PrivacyPage() {
  return (
    <ProseShell
      eyebrow="Privacy"
      title="Privacy Policy"
      links={[
        { href: "/", label: "Home" },
        { href: "/support", label: "Support" }
      ]}
      actions={
        <>
          <Link className="button button-secondary" href="/">
            Back to home
          </Link>
          <Link className="button button-secondary" href="/support">
            Support
          </Link>
        </>
      }
    >
      <p>Last updated: April 21, 2026</p>
      <p>
        LeetBeam is a local-first Chrome extension that tracks accepted LeetCode submissions, syncs visible progress history, and optionally generates narrative coaching.
      </p>

      <h2>What the extension reads</h2>
      <p>
        LeetBeam may read visible LeetCode page content required for user-facing features, including problem metadata, accepted status, submission history rows, and code visible in the editor DOM when available.
      </p>

      <h2>How data is used</h2>
      <p>
        The extension uses this information to track progress locally, compute deterministic analytics such as streaks and topic coverage, generate rule-based feedback, and optionally generate AI coaching.
      </p>

      <h2>Where data is stored</h2>
      <p>Tracked data is primarily stored in Chrome extension local storage within the user&apos;s browser profile.</p>

      <h2>Optional AI feature</h2>
      <p>
        AI coaching is disabled by default. If a user enables OpenAI-based coaching and provides their own API key, the extension may send a compact analytics summary derived from tracked LeetCode activity to OpenAI to generate narrative coaching.
      </p>

      <h2>Data sharing</h2>
      <p>
        LeetBeam does not sell user data. Data is only sent to OpenAI when the user explicitly enables AI coaching and provides an API key.
      </p>

      <h2>User control</h2>
      <p>
        Users can delete tracked entries, clear imported history, disable AI coaching, remove their API key, or remove the extension entirely.
      </p>

      <h2>Contact</h2>
      <p>Replace this page with your final support contact details before publishing publicly.</p>
    </ProseShell>
  );
}
