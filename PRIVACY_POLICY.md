# Privacy Policy

Last updated: April 21, 2026

## Overview

LeetBeam is a Chrome extension that helps users track accepted LeetCode submissions, review progress, and optionally generate narrative coaching.

This extension is designed to be local-first. Most functionality works entirely in the user’s browser without a backend service.

## What Data The Extension Accesses

The extension may access the following information from LeetCode pages that the user opens:

- Problem metadata such as title, slug, difficulty, tags, language, and accepted status
- Submission history visible on the user’s LeetCode `progress` or `submissions` pages
- Source code visible in the LeetCode editor DOM, when available

## How Data Is Used

The extension uses this information to:

- Track accepted problems locally
- Compute local aggregates such as total solved, streaks, and topic coverage
- Generate rule-based feedback in the browser
- Optionally generate AI narrative coaching when the user enables the AI feature

## Local Storage

By default, tracked submission data is stored in `chrome.storage.local` within the user’s browser profile.

This local data may include:

- Accepted submission metadata
- Extracted code, when available
- Rule-based feedback
- Progress aggregates
- Sync timestamps
- Optional AI coaching outputs
- Optional extension settings

## Optional AI Feature

The AI coaching feature is disabled by default.

If the user enables AI coaching and provides their own OpenAI API key, the extension may send a compact analytics summary to OpenAI in order to generate narrative coaching. This summary is intended to include deterministic analytics and may include information derived from the user’s tracked LeetCode activity.

The extension does not rely on AI for core counts, streaks, or topic math. Those remain deterministic and local.

## Data Sharing

The extension does not sell user data.

Data is only sent to third parties in the following case:

- OpenAI, if and only if the user explicitly enables the optional AI coaching feature and supplies an OpenAI API key

## Data Retention and Control

Users control their locally stored data through the extension interface and Chrome’s extension storage behavior.

The extension includes controls to:

- Delete individual tracked submissions
- Clear imported history
- Re-sync visible history pages

Users may also remove the extension to remove future access.

## Security Notes

If a user enables AI coaching, their OpenAI API key is stored in extension local storage for convenience. This is suitable for personal use but should be evaluated carefully before broad production deployment.

## Contact

If you publish this extension, replace this section with your real support contact or website.
