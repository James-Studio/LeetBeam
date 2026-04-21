# Chrome Web Store Submission Fields

Use this file as a checklist for the Chrome Web Store dashboard.

## Package Upload

- Upload: `dist/leetbeam-1.0.0.zip`

## Store Listing

### Name

LeetBeam

### Short Description

Track accepted LeetCode solves, review daily progress, and get local-first interview coaching.

### Detailed Description

Use the content from:

- [STORE_LISTING.md](/Users/james/Projects_Labs/leetcode-progress-tracker-mvp/store/STORE_LISTING.md)

### Category

Productivity

### Language

English

## Visual Assets

### Required / Recommended

- Extension icons from `assets/`
- Screenshots based on:
  - [SCREENSHOT_CAPTIONS.md](/Users/james/Projects_Labs/leetcode-progress-tracker-mvp/store/SCREENSHOT_CAPTIONS.md)

Suggested screenshots:

1. popup overview
2. daily review expanded
3. interview coach expanded
4. recent accepted expanded
5. AI settings page

## Privacy

### Privacy Policy URL

Host this publicly and paste the final URL:

- source file: [PRIVACY_POLICY.md](/Users/james/Projects_Labs/leetcode-progress-tracker-mvp/PRIVACY_POLICY.md)

### Privacy Practices Guidance

Disclose behavior consistently with actual extension behavior:

- reads LeetCode page content needed for tracking and sync
- stores tracked progress locally in Chrome
- optionally sends analytics summaries to OpenAI only when the user enables AI and provides an API key

## Single Purpose

This extension tracks a user’s LeetCode problem-solving progress and provides review and coaching features based on that activity.

## Support

Fill in real support information before submission:

- support email
- homepage URL
- privacy policy URL

Use:

- [SUPPORT.md](/Users/james/Projects_Labs/leetcode-progress-tracker-mvp/store/SUPPORT.md)

## Final Pre-Upload Checks

- manifest loads without missing files
- icons render correctly
- progress-page sync works
- accepted submission capture works
- popup loads with AI disabled
- optional AI flow works if enabled
- privacy policy URL is live
