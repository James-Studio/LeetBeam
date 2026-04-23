importScripts(
  "../lib/utils.js",
  "../lib/storage.js",
  "../lib/feedback-engine.js",
  "../providers/ai-provider.js"
);

chrome.runtime.onInstalled.addListener(() => {
  LeetTrackerStorage.initialize();
});

chrome.runtime.onStartup.addListener(() => {
  LeetTrackerStorage.initialize();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "leetcode/acceptedSubmission") {
    handleAcceptedSubmission(message.payload, sender)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to store accepted submission", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/getPopupData") {
    LeetTrackerStorage.getPopupData()
      .then((data) => {
        sendResponse({
          ok: true,
          data
        });
      })
      .catch((error) => {
        console.error("Failed to load popup data", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/getActiveTimer") {
    LeetTrackerStorage.getActiveTimer()
      .then((activeTimer) => sendResponse({ ok: true, activeTimer }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "leetcode/startTimer") {
    startTimerSession(message.payload || {}, sender)
      .then((activeTimer) => sendResponse({ ok: true, activeTimer }))
      .catch((error) => {
        console.error("Failed to start timer", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message.type === "leetcode/clearActiveTimer") {
    LeetTrackerStorage.clearActiveTimer()
      .then((previous) => sendResponse({ ok: true, previous }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "leetcode/importHistoryRows") {
    handleImportedHistoryRows(message.payload, sender)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to import history rows", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/resyncFromHistoryPage") {
    resyncFromHistoryPage()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to resync from history page", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/openHistoryPage") {
    openHistoryPage()
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to open history page", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/clearImportedHistory") {
    LeetTrackerStorage.clearImportedHistory()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        console.error("Failed to clear imported history", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/deleteSubmission") {
    LeetTrackerStorage.deleteSubmission(message.payload && message.payload.submissionId)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => {
        console.error("Failed to delete submission", error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "leetcode/getSettings") {
    LeetTrackerStorage.getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "leetcode/saveSettings") {
    LeetTrackerStorage.saveSettings(message.payload || {})
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "leetcode/generateAiCoaching") {
    generateAICoaching(message.payload && message.payload.kind)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Failed to generate AI coaching", error);
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  return false;
});

async function handleAcceptedSubmission(payload, sender) {
  await LeetTrackerStorage.initialize();
  const timerResult = await stopTimerForAcceptedSubmission(payload, sender);

  const acceptedAt = payload.acceptedAt || new Date().toISOString();
  const acceptedDay = LeetTrackerUtils.isoDay(acceptedAt);
  const code = typeof payload.code === "string" && payload.code.trim() ? payload.code : null;
  const normalizedCode = code || "";
  const codeHash = LeetTrackerUtils.simpleHash(normalizedCode);
  const dedupeKey = [payload.slug, payload.language || "Unknown", codeHash].join(":");

  const submission = {
    id: LeetTrackerUtils.createSubmissionId(),
    pageUrl: payload.pageUrl || (sender.tab ? sender.tab.url : ""),
    title: payload.title || "Unknown Problem",
    slug: payload.slug || "unknown-problem",
    difficulty: payload.difficulty || "Unknown",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    language: payload.language || "Unknown",
    code,
    codeSource: payload.codeSource || "unavailable",
    codeUnavailableReason: payload.codeUnavailableReason || null,
    acceptedAt,
    acceptedDay,
    detectedFrom: payload.detectedFrom || "content-script",
    durationMs: timerResult ? timerResult.durationMs : null,
    timerStartedAt: timerResult ? timerResult.startedAt : null,
    timerStoppedAt: timerResult ? timerResult.stoppedAt : null,
    dedupeKey
  };

  const ruleFeedback = LeetTrackerFeedbackEngine.analyzeSubmission(submission);
  const state = await LeetTrackerStorage.getState();
  const provider = LeetTrackerAIProvider.getProvider(state.settings.aiProvider);
  let aiFeedback = [];

  try {
    aiFeedback = await provider.analyzeSubmission(submission, state.settings);
  } catch (error) {
    console.error("AI submission analysis failed", error);
    aiFeedback = [
      {
        id: "ai-feedback-unavailable",
        severity: "info",
        title: "AI feedback unavailable",
        message: "LeetBeam still saved this solve, but the optional AI feedback pass did not complete."
      }
    ];
  }

  const combinedFeedback = ruleFeedback.concat(Array.isArray(aiFeedback) ? aiFeedback : []);
  const storageResult = await LeetTrackerStorage.storeAcceptedSubmission(submission, combinedFeedback);

  return {
    ok: true,
    stored: storageResult.stored,
    submissionId: storageResult.submissionId,
    feedbackCount: combinedFeedback.length,
    timerStopped: Boolean(timerResult),
    durationMs: timerResult ? timerResult.durationMs : null
  };
}

async function startTimerSession(payload, sender) {
  await LeetTrackerStorage.initialize();
  const pageUrl = payload.pageUrl || (sender.tab ? sender.tab.url : "") || "";
  const title = payload.title || "Unknown Problem";
  const parsedPath = safePathname(pageUrl);
  const slug = payload.slug || LeetTrackerUtils.slugFromPath(parsedPath) || "unknown-problem";

  return LeetTrackerStorage.startTimer({
    slug,
    title,
    pageUrl,
    startedAt: payload.startedAt,
    source: payload.source || "manual",
    tabId: sender.tab && typeof sender.tab.id === "number" ? sender.tab.id : null
  });
}

async function stopTimerForAcceptedSubmission(payload, sender) {
  const activeTimer = await LeetTrackerStorage.getActiveTimer();
  if (!activeTimer) {
    return null;
  }

  const senderUrl = sender.tab && sender.tab.url ? sender.tab.url : payload.pageUrl || "";
  const senderSlug = senderUrl ? LeetTrackerUtils.slugFromPath(safePathname(senderUrl)) : null;
  const payloadSlug = payload.slug || senderSlug;
  const senderTabId = sender.tab && typeof sender.tab.id === "number" ? sender.tab.id : null;
  const sameProblem = activeTimer.slug && payloadSlug && activeTimer.slug === payloadSlug;
  const sameTabWithoutSlug = !payloadSlug && activeTimer.tabId !== null && senderTabId !== null && activeTimer.tabId === senderTabId;

  if (!sameProblem && !sameTabWithoutSlug) {
    return null;
  }

  const stoppedAt = payload.acceptedAt || new Date().toISOString();
  const durationMs = Math.max(0, new Date(stoppedAt).getTime() - new Date(activeTimer.startedAt).getTime());

  await LeetTrackerStorage.clearActiveTimer();

  return {
    ...activeTimer,
    stoppedAt,
    durationMs
  };
}

function safePathname(url) {
  try {
    return new URL(url).pathname;
  } catch (error) {
    return "";
  }
}

async function handleImportedHistoryRows(payload, sender) {
  await LeetTrackerStorage.initialize();

  const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
  if (!rows.length) {
    return {
      ok: true,
      importedCount: 0,
      updatedCount: 0
    };
  }

  const normalizedRows = rows
    .filter((row) => row && row.slug && row.acceptedAt)
    .map((row) => {
      const acceptedAt = new Date(row.acceptedAt).toISOString();
      const acceptedDay = LeetTrackerUtils.isoDay(acceptedAt);

      return {
        id: LeetTrackerUtils.createSubmissionId(),
        pageUrl: row.pageUrl || (sender.tab ? sender.tab.url : ""),
        title: row.title || "Unknown Problem",
        slug: row.slug,
        difficulty: row.difficulty || "Unknown",
        tags: Array.isArray(row.tags) ? row.tags : [],
        language: row.language || "Unknown",
        code: null,
        codeSource: "history-sync",
        codeUnavailableReason: "Imported from the LeetCode submissions page without editor access.",
        acceptedAt,
        acceptedDay,
        detectedFrom: "submissions-page",
        dedupeKey: ["history", row.slug, acceptedAt, row.language || "Unknown"].join(":"),
        externalKey: ["history", row.slug, acceptedAt].join(":")
      };
    });

  const result = await LeetTrackerStorage.importHistorySubmissions(normalizedRows);
  return {
    ok: true,
    importedCount: result.importedCount,
    updatedCount: result.updatedCount
  };
}

async function resyncFromHistoryPage() {
  const tab = await findHistoryTab();
  if (!tab || typeof tab.id !== "number") {
    return {
      ok: false,
      error: "Open your LeetCode progress or submissions page, then try again."
    };
  }

  let response;

  try {
    response = await chrome.tabs.sendMessage(tab.id, {
      type: "leetcode/forceHistorySync"
    });
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const needsInjection =
      message.includes("Receiving end does not exist") ||
      message.includes("Could not establish connection");

    if (!needsInjection) {
      throw error;
    }

    await injectHistoryScripts(tab.id);
    response = await chrome.tabs.sendMessage(tab.id, {
      type: "leetcode/forceHistorySync"
    });
  }

  if (!response || !response.ok) {
    return {
      ok: false,
      error: response && response.error ? response.error : "Could not read the LeetCode history page."
    };
  }

  return {
    ok: true,
    pageType: tab.url && tab.url.includes("/progress/") ? "progress" : "submissions",
    rowsFound: response.rowsFound || 0,
    importedCount: response.importedCount || 0,
    updatedCount: response.updatedCount || 0
  };
}

async function openHistoryPage() {
  const existing = await findHistoryTab();
  if (existing && typeof existing.id === "number") {
    await chrome.tabs.update(existing.id, { active: true });
    if (typeof existing.windowId === "number") {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return {
      ok: true,
      opened: false
    };
  }

  await chrome.tabs.create({
    url: "https://leetcode.com/progress/"
  });

  return {
    ok: true,
    opened: true
  };
}

async function findHistoryTab() {
  const tabs = await chrome.tabs.query({
    url: [
      "https://leetcode.com/progress/",
      "https://leetcode.com/submissions",
      "https://leetcode.com/submissions/*"
    ]
  });

  const progressTab = tabs.find((tab) => tab.url && tab.url.includes("/progress/"));
  return progressTab || tabs[0] || null;
}

async function injectHistoryScripts(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [
      "src/lib/utils.js",
      "src/lib/history-parser.js",
      "src/content/history-sync.js"
    ]
  });
}

async function generateAICoaching(kind) {
  await LeetTrackerStorage.initialize();
  const state = await LeetTrackerStorage.getState();
  const popupData = await LeetTrackerStorage.getPopupData();
  const insights = popupData.insights;
  const settings = state.settings || {};
  const provider = LeetTrackerAIProvider.getProvider(settings.aiProvider);

  if (provider.name === "stub") {
    return {
      ok: false,
      error: "AI coaching is not enabled. Add an OpenAI API key in settings first."
    };
  }

  if (!insights || !insights.analytics) {
    return {
      ok: false,
      error: "Track some submissions first so the deterministic analytics exist."
    };
  }

  if (kind === "day") {
    const generated = await provider.generateDailyReview(insights.analytics.dayReview.facts, settings);
    const record = {
      inputHash: insights.analytics.dayReview.inputHash,
      generatedAt: new Date().toISOString(),
      provider: provider.name,
      model: settings.openaiModel,
      content: generated
    };
    await LeetTrackerStorage.saveAICoaching({ dayReview: record });
    return { ok: true, kind, record };
  }

  const generated = await provider.generateInterviewCoach(insights.analytics.interviewCoach.facts, settings);
  const record = {
    inputHash: insights.analytics.interviewCoach.inputHash,
    generatedAt: new Date().toISOString(),
    provider: provider.name,
    model: settings.openaiModel,
    content: generated
  };
  await LeetTrackerStorage.saveAICoaching({ interviewCoach: record });
  return { ok: true, kind: "interview", record };
}
