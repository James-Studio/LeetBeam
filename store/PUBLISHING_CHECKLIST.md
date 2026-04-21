# Publishing Checklist

## Before Upload

- Confirm icons exist and load correctly from `manifest.json`
- Host `PRIVACY_POLICY.md` at a public URL
- Add that privacy policy URL in the Chrome Web Store dashboard
- Fill out Privacy Practices fields consistently with actual behavior
- Capture real screenshots of:
  - popup overview
  - daily review section
  - interview coach section
  - settings page
- Test history sync on:
  - `https://leetcode.com/progress/`
  - `https://leetcode.com/submissions/`
- Test accepted capture on a live LeetCode problem page
- Test optional AI coaching flow with a real API key
- Verify the extension works with AI disabled

## Privacy Dashboard Guidance

You should disclose that the extension:

- Reads LeetCode page content needed for its user-facing tracking and coaching features
- Stores tracked progress locally in Chrome
- Optionally sends analytics summaries to OpenAI only when the user enables AI and provides an API key

## Real Screenshots To Capture

1. Hero stats and sync controls
2. Expanded Daily review
3. Expanded Interview coach
4. Recent accepted list
5. AI settings page

## Recommended Support Materials

- Store listing title and description from `store/STORE_LISTING.md`
- Privacy policy from `PRIVACY_POLICY.md`
- A support email or project website
