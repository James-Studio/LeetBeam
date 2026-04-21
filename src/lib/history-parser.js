(function attachHistoryParser(global) {
  const utils = global.LeetTrackerUtils;
  const LANGUAGE_NAMES = [
    "C",
    "C++",
    "C#",
    "Dart",
    "Elixir",
    "Erlang",
    "Go",
    "Java",
    "JavaScript",
    "Kotlin",
    "MySQL",
    "MS SQL Server",
    "Oracle",
    "Pandas",
    "PHP",
    "PostgreSQL",
    "Python",
    "Python3",
    "Racket",
    "Ruby",
    "Rust",
    "Scala",
    "Swift",
    "TypeScript"
  ];

  function extractTodayAcceptedRows(documentRef, locationRef, now = new Date()) {
    const candidateRows = collectCandidateRows(documentRef);
    const seenKeys = new Set();
    const todayRows = [];

    candidateRows.forEach((row) => {
      const rowText = utils.visibleText(row);
      if (!/\bAccepted\b/i.test(rowText)) {
        return;
      }

      const acceptedAt = extractAcceptedAt(row, now);
      if (!acceptedAt) {
        return;
      }

      const acceptedDay = utils.isoDay(acceptedAt);
      if (acceptedDay !== utils.isoDay(now)) {
        return;
      }

      const problemMeta = extractProblemMeta(row);
      if (!problemMeta.slug) {
        return;
      }

      const title = problemMeta.title || humanizeSlug(problemMeta.slug);
      const language = extractLanguage(rowText);
      const key = [problemMeta.slug, acceptedAt.toISOString()].join(":");

      if (seenKeys.has(key)) {
        return;
      }

      seenKeys.add(key);
      todayRows.push({
        pageUrl: locationRef.href,
        title,
        slug: problemMeta.slug,
        difficulty: problemMeta.difficulty,
        language,
        acceptedAt: acceptedAt.toISOString()
      });
    });

    return todayRows;
  }

  function collectCandidateRows(documentRef) {
    const rows = Array.from(documentRef.querySelectorAll("tr, [role='row'], li, article"));
    const filteredRows = rows.filter((row) => {
      const text = utils.visibleText(row);
      return /\bAccepted\b/i.test(text) && /ago|Yesterday|Sun|Mon|Tue|Wed|Thu|Fri|Sat|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(text);
    });

    if (filteredRows.length) {
      return filteredRows;
    }

    return Array.from(documentRef.querySelectorAll("div")).filter((row) => {
      const text = utils.visibleText(row);
      return /\bAccepted\b/i.test(text) && /ago|Yesterday/i.test(text);
    });
  }

  function extractAcceptedAt(row, now) {
    const timeElements = Array.from(row.querySelectorAll("time"));
    for (const timeElement of timeElements) {
      const candidate =
        timeElement.getAttribute("datetime") ||
        timeElement.getAttribute("title") ||
        timeElement.textContent;
      const parsed = utils.parseDateCandidate(candidate, now);
      if (parsed) {
        return parsed;
      }
    }

    const text = utils.visibleText(row);
    const candidates = [
      ...text.matchAll(/\b\d+\s*(?:second|minute|hour|day|week|month)s?\s*ago\b/gi),
      ...text.matchAll(/\b[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}(?:,\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?\b/g),
      ...text.matchAll(/\b\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/g),
      ...text.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?\b/g)
    ].map((match) => match[0]);

    for (const candidate of candidates) {
      const parsed = utils.parseDateCandidate(candidate, now);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  function extractLanguage(text) {
    return LANGUAGE_NAMES.find((language) => text.includes(language)) || "Unknown";
  }

  function extractProblemMeta(row) {
    const problemLink = row.querySelector("a[href*='/problems/']");
    if (problemLink) {
      const slug = utils.slugFromPath(problemLink.getAttribute("href"));
      const title = cleanProblemTitle(problemLink.textContent);
      return {
        slug,
        title: title || humanizeSlug(slug),
        difficulty: extractDifficulty(row)
      };
    }

    const rowText = utils.visibleText(row);
    const titleMatch = rowText.match(/(?:^|\s)(\d+\.\s+[A-Za-z0-9][^\n]+?)(?=\s+(?:Easy|Med\.|Hard)\b)/);
    const title = cleanProblemTitle(titleMatch ? titleMatch[1] : "");
    const slug = slugifyTitle(title);

    return {
      slug,
      title,
      difficulty: extractDifficulty(row)
    };
  }

  function cleanProblemTitle(value) {
    return utils.normalizeWhitespace(String(value || "").replace(/^\d+\.\s*/, "").replace(/\.\.\.$/, ""));
  }

  function slugifyTitle(title) {
    const cleaned = cleanProblemTitle(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return cleaned || null;
  }

  function extractDifficulty(row) {
    const text = utils.visibleText(row);
    if (/\bHard\b/.test(text)) {
      return "Hard";
    }

    if (/\bMed\.\b|\bMedium\b/.test(text)) {
      return "Medium";
    }

    if (/\bEasy\b/.test(text)) {
      return "Easy";
    }

    return "Unknown";
  }

  function humanizeSlug(slug) {
    return slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  global.LeetTrackerHistoryParser = {
    extractTodayAcceptedRows
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
