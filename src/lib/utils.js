(function attachUtils(global) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function normalizeWhitespace(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function slugFromPath(pathname) {
    const match = String(pathname || "").match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  function visibleText(element) {
    if (!element) {
      return "";
    }

    const style = global.getComputedStyle ? global.getComputedStyle(element) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) {
      return "";
    }

    return normalizeWhitespace(element.innerText || element.textContent || "");
  }

  function simpleHash(input) {
    let hash = 2166136261;
    const text = String(input || "");

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function isoDay(dateLike) {
    const date = new Date(dateLike);
    return date.toISOString().slice(0, 10);
  }

  function formatShortDate(dateLike) {
    const date = new Date(dateLike);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function formatDurationCompact(durationMs) {
    const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    return `${seconds}s`;
  }

  function formatDurationClock(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(Number(durationMs || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
    }

    return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function sortByAcceptedAtDesc(records) {
    return records.slice().sort((left, right) => {
      return new Date(right.acceptedAt).getTime() - new Date(left.acceptedAt).getTime();
    });
  }

  function computeCurrentStreak(dayValues, now = new Date()) {
    if (!dayValues.length) {
      return 0;
    }

    const days = unique(dayValues).sort();
    const today = isoDay(now);
    const yesterday = isoDay(new Date(now.getTime() - DAY_MS));
    const lastDay = days[days.length - 1];

    if (lastDay !== today && lastDay !== yesterday) {
      return 0;
    }

    let streak = 1;

    for (let index = days.length - 1; index > 0; index -= 1) {
      const current = new Date(days[index]);
      const previous = new Date(days[index - 1]);
      const diffDays = Math.round((current - previous) / DAY_MS);

      if (diffDays === 1) {
        streak += 1;
        continue;
      }

      break;
    }

    return streak;
  }

  function createSubmissionId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }

    return "sub_" + Date.now() + "_" + Math.random().toString(16).slice(2, 10);
  }

  function parseDateCandidate(value, now = new Date()) {
    const text = normalizeWhitespace(value);
    if (!text) {
      return null;
    }

    if (/^just now$/i.test(text)) {
      return new Date(now.getTime());
    }

    const relativeMatch = text.match(/(\d+|a|an)\s*(second|minute|hour|day|week|month)s?\s*ago/i);
    if (relativeMatch) {
      const rawAmount = relativeMatch[1].toLowerCase();
      const amount = rawAmount === "a" || rawAmount === "an" ? 1 : Number(rawAmount);
      const unit = relativeMatch[2].toLowerCase();
      const multipliers = {
        second: 1000,
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: DAY_MS,
        week: 7 * DAY_MS,
        month: 30 * DAY_MS
      };

      return new Date(now.getTime() - amount * multipliers[unit]);
    }

    const directDate = new Date(text);
    if (!Number.isNaN(directDate.getTime())) {
      return directDate;
    }

    const cleaned = text.replace(/\bat\b/i, " ");
    const secondAttempt = new Date(cleaned);
    if (!Number.isNaN(secondAttempt.getTime())) {
      return secondAttempt;
    }

    return null;
  }

  global.LeetTrackerUtils = {
    computeCurrentStreak,
    createSubmissionId,
    formatDurationClock,
    formatDurationCompact,
    formatShortDate,
    isoDay,
    normalizeWhitespace,
    parseDateCandidate,
    simpleHash,
    slugFromPath,
    sortByAcceptedAtDesc,
    unique,
    visibleText
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
