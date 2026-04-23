import Link from "next/link";
import { ProseShell } from "../components";

export const metadata = {
  title: "Support | LeetBeam"
};

export default function SupportPage() {
  return (
    <ProseShell
      eyebrow="Support"
      title="Support"
      links={[
        { href: "/", label: "Home" },
        { href: "/privacy", label: "Privacy" }
      ]}
      actions={
        <>
          <Link className="button button-secondary" href="/">
            Back to home
          </Link>
          <Link className="button button-secondary" href="/privacy">
            Privacy policy
          </Link>
        </>
      }
    >
      <p>
        LeetBeam is a Chrome extension for tracking accepted LeetCode submissions, timing real solves on problem pages, reviewing progress, and optionally generating narrative coaching from deterministic analytics.
      </p>

      <h2>Common help</h2>
      <ul>
        <li>Reload the extension after updates from <code>chrome://extensions</code>.</li>
        <li>On LeetCode problem pages, use the floating timer button to start timing a solve and let it stop automatically when the result is Accepted.</li>
        <li>Refresh the LeetCode page before using resync.</li>
        <li>Open the LeetCode progress page when you want to correct recent accepted entries.</li>
        <li>Check AI settings only if you explicitly want optional narrative coaching.</li>
      </ul>

      <h2>Troubleshooting</h2>
      <p>
        If progress sync finds no rows, refresh the LeetCode progress page and try again. If a tracked entry is wrong, delete the entry or clear imported history and resync. If the timer does not appear or behaves oddly, reload the extension from <code>chrome://extensions</code> and refresh the LeetCode problem page. If AI coaching fails, verify that your provider, API key, and model settings are correct.
      </p>

      <h2>Contact</h2>
      <p>Replace this page with your real support email or site before publishing publicly.</p>
    </ProseShell>
  );
}
