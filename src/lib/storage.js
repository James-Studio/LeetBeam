(function attachStorage(global) {
  const utils = global.LeetTrackerUtils;
  const STORAGE_KEY = "leetTrackerState";
  const MAX_RECENT_SUBMISSIONS = 20;
  const CORE_AREAS = [
    {
      label: "Arrays and Hashing",
      tags: ["Array", "Hash Table"],
      drills: ["Two Sum style lookups", "frequency counting", "prefix sum bookkeeping"]
    },
    {
      label: "Two Pointers and Sliding Window",
      tags: ["Two Pointers", "Sliding Window", "String"],
      drills: ["longest substring windows", "palindrome pointer sweeps", "window frequency maps"]
    },
    {
      label: "Binary Search",
      tags: ["Binary Search"],
      drills: ["search in rotated array", "binary search on answer", "boundary search patterns"]
    },
    {
      label: "Trees and Graphs",
      tags: ["Tree", "Binary Tree", "Binary Search Tree", "Graph", "Depth-First Search", "Breadth-First Search"],
      drills: ["tree DFS/BFS traversals", "lowest common ancestor", "graph visited-state problems"]
    },
    {
      label: "Backtracking",
      tags: ["Backtracking"],
      drills: ["subset generation", "permutation search", "pruning recursion trees"]
    },
    {
      label: "Dynamic Programming",
      tags: ["Dynamic Programming", "Memoization"],
      drills: ["1D DP transitions", "grid DP", "memoized recursion to tabulation"]
    },
    {
      label: "Heap and Greedy",
      tags: ["Heap (Priority Queue)", "Greedy", "Sorting"],
      drills: ["top-k heap problems", "interval greediness", "sort then sweep"]
    },
    {
      label: "Linked Lists and Stacks",
      tags: ["Linked List", "Stack", "Monotonic Stack", "Queue"],
      drills: ["reverse/reorder linked list", "stack-based parsing", "next greater element"]
    }
  ];

  function defaultState() {
    return {
      version: 1,
      submissions: [],
      activeTimer: null,
      feedbackBySubmissionId: {},
      aggregates: {
        totalSolved: 0,
        currentStreak: 0,
        solvedProblemSlugs: [],
        lastAcceptedAt: null
      },
      sync: {
        lastHistorySyncAt: null,
        lastHistoryImportedCount: 0
      },
      aiCoaching: {
        dayReview: null,
        interviewCoach: null
      },
      settings: {
        aiProvider: "stub",
        openaiApiKey: "",
        openaiModel: "gpt-5-mini"
      }
    };
  }

  async function getState() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return stored[STORAGE_KEY] || defaultState();
  }

  async function saveState(state) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: state
    });
    return state;
  }

  async function initialize() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    if (!stored[STORAGE_KEY]) {
      await saveState(defaultState());
    }
  }

  async function storeAcceptedSubmission(submission, feedbackItems) {
    const state = await getState();
    const existing = findExistingSubmission(state, submission);

    if (existing) {
      state.feedbackBySubmissionId[existing.id] = feedbackItems;
      mergeSubmission(existing, submission);
      recalculateAggregates(state);
      await saveState(state);
      return {
        stored: false,
        submissionId: existing.id
      };
    }

    state.submissions.unshift(submission);
    state.submissions = utils.sortByAcceptedAtDesc(state.submissions).slice(0, 500);
    state.feedbackBySubmissionId[submission.id] = feedbackItems;
    recalculateAggregates(state);
    await saveState(state);

    return {
      stored: true,
      submissionId: submission.id
    };
  }

  async function importHistorySubmissions(submissions) {
    const state = await getState();
    let importedCount = 0;
    let updatedCount = 0;

    submissions.forEach((submission) => {
      const existing = findExistingSubmission(state, submission, true);

      if (existing) {
        mergeSubmission(existing, submission);
        state.feedbackBySubmissionId[existing.id] = state.feedbackBySubmissionId[existing.id] || [
          {
            id: "history-sync-import",
            severity: "info",
            title: "Imported from submissions history",
            message: "This solve was synced from the LeetCode submissions page."
          }
        ];
        updatedCount += 1;
        return;
      }

      state.submissions.unshift(submission);
      state.feedbackBySubmissionId[submission.id] = [
        {
          id: "history-sync-import",
          severity: "info",
          title: "Imported from submissions history",
          message: "This solve was synced from the LeetCode submissions page."
        }
      ];
      importedCount += 1;
    });

    state.submissions = utils.sortByAcceptedAtDesc(state.submissions).slice(0, 500);
    state.sync = {
      lastHistorySyncAt: new Date().toISOString(),
      lastHistoryImportedCount: importedCount
    };
    recalculateAggregates(state);
    await saveState(state);

    return {
      importedCount,
      updatedCount
    };
  }

  async function clearImportedHistory() {
    const state = await getState();
    const retainedSubmissions = state.submissions.filter((submission) => submission.detectedFrom !== "submissions-page");
    const removedIds = state.submissions
      .filter((submission) => submission.detectedFrom === "submissions-page")
      .map((submission) => submission.id);

    removedIds.forEach((id) => {
      delete state.feedbackBySubmissionId[id];
    });

    state.submissions = retainedSubmissions;
    state.sync = {
      lastHistorySyncAt: state.sync && state.sync.lastHistorySyncAt ? state.sync.lastHistorySyncAt : null,
      lastHistoryImportedCount: 0
    };
    recalculateAggregates(state);
    await saveState(state);

    return {
      removedCount: removedIds.length
    };
  }

  async function deleteSubmission(submissionId) {
    const state = await getState();
    const beforeCount = state.submissions.length;
    state.submissions = state.submissions.filter((submission) => submission.id !== submissionId);

    if (state.submissions.length === beforeCount) {
      return {
        deleted: false
      };
    }

    delete state.feedbackBySubmissionId[submissionId];
    recalculateAggregates(state);
    await saveState(state);

    return {
      deleted: true
    };
  }

  function recalculateAggregates(state) {
    const accepted = utils.sortByAcceptedAtDesc(state.submissions);
    const solvedProblemSlugs = utils.unique(accepted.map((item) => item.slug));
    const solvedDays = accepted.map((item) => item.acceptedDay);

    state.aggregates = {
      totalSolved: solvedProblemSlugs.length,
      currentStreak: utils.computeCurrentStreak(solvedDays),
      solvedProblemSlugs,
      lastAcceptedAt: accepted.length ? accepted[0].acceptedAt : null
    };
  }

  async function getPopupData() {
    const state = await getState();
    const orderedSubmissions = utils.sortByAcceptedAtDesc(state.submissions);
    const recentAccepted = orderedSubmissions
      .slice(0, MAX_RECENT_SUBMISSIONS)
      .map((submission) => {
        return {
          id: submission.id,
          title: submission.title,
          slug: submission.slug,
          difficulty: submission.difficulty,
          tags: submission.tags || [],
          language: submission.language || "Unknown",
          acceptedAt: submission.acceptedAt,
          acceptedDay: submission.acceptedDay,
          durationMs: Number.isFinite(submission.durationMs) ? submission.durationMs : null,
          timerStartedAt: submission.timerStartedAt || null,
          timerStoppedAt: submission.timerStoppedAt || null,
          feedback: state.feedbackBySubmissionId[submission.id] || [],
          codeCaptured: Boolean(submission.code),
          detectedFrom: submission.detectedFrom || "content-script"
        };
      });
    const insights = buildInsights(state, orderedSubmissions);

    return {
      aggregates: state.aggregates,
      insights,
      recentAccepted,
      activeTimer: state.activeTimer,
      sync: state.sync,
      settings: sanitizeSettings(state.settings)
    };
  }

  async function getSettings() {
    const state = await getState();
    return state.settings || defaultState().settings;
  }

  async function saveSettings(nextSettings) {
    const state = await getState();
    state.settings = {
      ...defaultState().settings,
      ...state.settings,
      ...nextSettings
    };
    await saveState(state);
    return sanitizeSettings(state.settings);
  }

  async function saveAICoaching(payload) {
    const state = await getState();
    state.aiCoaching = {
      ...state.aiCoaching,
      ...payload
    };
    await saveState(state);
    return state.aiCoaching;
  }

  async function getActiveTimer() {
    const state = await getState();
    return state.activeTimer || null;
  }

  async function startTimer(payload) {
    const state = await getState();
    const startedAt = payload && payload.startedAt ? new Date(payload.startedAt).toISOString() : new Date().toISOString();

    state.activeTimer = {
      slug: payload && payload.slug ? payload.slug : "unknown-problem",
      title: payload && payload.title ? payload.title : "Unknown Problem",
      pageUrl: payload && payload.pageUrl ? payload.pageUrl : "",
      startedAt,
      source: payload && payload.source ? payload.source : "manual",
      tabId: payload && typeof payload.tabId === "number" ? payload.tabId : null
    };

    await saveState(state);
    return state.activeTimer;
  }

  async function clearActiveTimer() {
    const state = await getState();
    const previous = state.activeTimer || null;
    state.activeTimer = null;
    await saveState(state);
    return previous;
  }

  function buildInsights(state, orderedSubmissions) {
    if (!orderedSubmissions.length) {
      return {
        focusDay: null,
        dayReview: {
          summary: "No submissions tracked yet.",
          solvedCount: 0,
          mediumHardCount: 0,
          topicSnapshot: [],
          strengths: [],
          weaknesses: [],
          suggestions: []
        },
        interviewReadiness: {
          strengths: [],
          weaknesses: [],
          suggestions: []
        },
        analytics: null,
        aiCoaching: {
          dayReview: null,
          interviewCoach: null
        }
      };
    }

    const focusDay = pickFocusDay(orderedSubmissions);
    const daySubmissions = orderedSubmissions.filter((submission) => submission.acceptedDay === focusDay);
    const tagCounts = countTags(orderedSubmissions);
    const dayTagCounts = countTags(daySubmissions);
    const feedbackSummary = summarizeFeedback(state, orderedSubmissions);
    const dayFeedbackSummary = summarizeFeedback(state, daySubmissions);
    const solvedTagSet = new Set(Object.keys(tagCounts));
    const dayReview = buildDayReview(daySubmissions, dayTagCounts, dayFeedbackSummary);
    const interviewReadiness = buildInterviewReadiness(
      state,
      orderedSubmissions,
      solvedTagSet,
      tagCounts,
      feedbackSummary
    );
    const analytics = buildAnalyticsPayload(
      state,
      focusDay,
      daySubmissions,
      tagCounts,
      dayReview,
      interviewReadiness,
      feedbackSummary
    );

    return {
      focusDay,
      dayReview,
      interviewReadiness,
      analytics,
      aiCoaching: {
        dayReview: matchCoachingRecord(state.aiCoaching && state.aiCoaching.dayReview, analytics.dayReview.inputHash),
        interviewCoach: matchCoachingRecord(state.aiCoaching && state.aiCoaching.interviewCoach, analytics.interviewCoach.inputHash)
      }
    };
  }

  function pickFocusDay(orderedSubmissions) {
    const today = utils.isoDay(new Date());
    const todayEntry = orderedSubmissions.find((submission) => submission.acceptedDay === today);
    return todayEntry ? today : orderedSubmissions[0].acceptedDay;
  }

  function buildDayReview(daySubmissions, dayTagCounts, dayFeedbackSummary) {
    const solvedCount = utils.unique(daySubmissions.map((submission) => submission.slug)).length;
    const mediumHardCount = daySubmissions.filter((submission) => {
      const difficulty = (submission.difficulty || "").toLowerCase();
      return difficulty === "medium" || difficulty === "hard";
    }).length;
    const languages = utils.unique(daySubmissions.map((submission) => submission.language).filter(Boolean));
    const timedSubmissions = daySubmissions.filter((submission) => Number.isFinite(submission.durationMs) && submission.durationMs > 0);
    const averageDurationMs = timedSubmissions.length
      ? Math.round(timedSubmissions.reduce((sum, submission) => sum + submission.durationMs, 0) / timedSubmissions.length)
      : null;
    const topicSnapshot = Object.entries(dayTagCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([tag, count]) => `${tag} (${count})`);
    const strengths = [];
    const weaknesses = [];
    const suggestions = [];

    if (solvedCount >= 3) {
      strengths.push("You put together a real practice block with multiple accepted problems in one day.");
    }

    if (mediumHardCount >= 2) {
      strengths.push("You spent time on medium or hard work, which is the right territory for stronger interview prep.");
    }

    if (languages.length === 1 && languages[0] !== "Unknown") {
      strengths.push(`You stayed in ${languages[0]}, which helps build interview fluency in one language instead of context switching.`);
    }

    if (topicSnapshot.length >= 3) {
      strengths.push("You touched multiple topic areas in the same day, which is great for breadth.");
    }

    if (averageDurationMs !== null && averageDurationMs <= 25 * 60 * 1000) {
      strengths.push("Your recorded solve times were pretty efficient, which is a good sign for interview pacing.");
    }

    if (dayFeedbackSummary.warningCount >= 2) {
      weaknesses.push("Several submissions triggered readability or structure warnings, so slow down for a quick refactor pass after you get Accepted.");
    }

    if (mediumHardCount === 0) {
      weaknesses.push("This day leaned mostly easy, so it may not stretch interview depth enough on its own.");
    }

    if (topicSnapshot.length <= 1 && solvedCount >= 2) {
      weaknesses.push("The day was concentrated in one topic area. Mixing patterns usually gives better interview carryover.");
    }

    if (!daySubmissions.some((submission) => submission.code)) {
      weaknesses.push("Code capture was unavailable for this day, so the coaching is based mostly on metadata.");
    }

    if (averageDurationMs !== null && averageDurationMs >= 50 * 60 * 1000) {
      weaknesses.push("Your recorded solve times ran long, which may signal that pattern recognition or debugging speed still needs reps.");
    }

    if (mediumHardCount < solvedCount) {
      suggestions.push("Add one medium problem after your easy warm-up so each practice day includes at least one interview-level rep.");
    }

    if (dayFeedbackSummary.ids["excessive-nesting"]) {
      suggestions.push("Review one of today’s accepted solutions and rewrite it using earlier exits or a helper function to reduce nesting.");
    }

    if (dayFeedbackSummary.ids["edge-case-guards"]) {
      suggestions.push("Before submitting, do a 20-second edge-case pass for empty input, one-element input, and null-style conditions.");
    }

    if (!suggestions.length) {
      suggestions.push("Keep the same daily rhythm and finish each solve with a short complexity and edge-case recap.");
    }

    return {
      summary: buildDaySummary(solvedCount, mediumHardCount, topicSnapshot),
      solvedCount,
      mediumHardCount,
      averageDurationMs,
      timedSubmissionCount: timedSubmissions.length,
      topicSnapshot,
      strengths,
      weaknesses,
      suggestions
    };
  }

  function buildDaySummary(solvedCount, mediumHardCount, topicSnapshot) {
    const parts = [
      `${solvedCount} accepted ${solvedCount === 1 ? "problem" : "problems"}`
    ];

    if (mediumHardCount) {
      parts.push(`${mediumHardCount} medium/hard`);
    }

    if (topicSnapshot.length) {
      parts.push(`top topics: ${topicSnapshot.join(", ")}`);
    }

    return parts.join(" • ");
  }

  function buildInterviewReadiness(state, orderedSubmissions, solvedTagSet, tagCounts, feedbackSummary) {
    const strengths = [];
    const weaknesses = [];
    const suggestions = [];
    const difficultyCounts = countBy(orderedSubmissions, (submission) => submission.difficulty || "Unknown");
    const missingAreas = CORE_AREAS.filter((area) => !area.tags.some((tag) => solvedTagSet.has(tag)));
    const underrepresentedAreas = CORE_AREAS.filter((area) => {
      const total = area.tags.reduce((sum, tag) => sum + (tagCounts[tag] || 0), 0);
      return total > 0 && total < 2;
    });

    if ((difficultyCounts.Hard || 0) >= 2 || (difficultyCounts.Medium || 0) >= 5) {
      strengths.push("You already have meaningful exposure to interview-grade difficulty, not just easy warm-ups.");
    }

    if (state.aggregates.currentStreak >= 3) {
      strengths.push("Your current streak shows consistent repetition, which matters a lot more than occasional marathon sessions.");
    }

    if (Object.keys(tagCounts).length >= 6) {
      strengths.push("Your tracked solves cover a healthy spread of topics, which is a strong signal for broad interview readiness.");
    }

    if (feedbackSummary.warningCount === 0 && orderedSubmissions.length >= 3) {
      strengths.push("Your recent accepted solutions are not triggering obvious structural warnings, which suggests decent code hygiene.");
    }

    if ((difficultyCounts.Medium || 0) < 3) {
      weaknesses.push("You likely need more medium problems, since big-tech screens and onsite rounds live heavily in that range.");
    }

    if ((difficultyCounts.Hard || 0) === 0) {
      weaknesses.push("There is no tracked hard problem yet. You do not need many, but a few hard reps help for tougher Google-style follow-ups.");
    }

    if (missingAreas.length >= 3) {
      weaknesses.push("Several core interview patterns are still missing from your tracked history, so your preparation may be too narrow.");
    }

    if (feedbackSummary.ids["vague-variable-naming"] || feedbackSummary.ids["long-function"]) {
      weaknesses.push("Some accepted solutions still show readability issues. Interviewers care about explanation clarity, not just correctness.");
    }

    missingAreas.slice(0, 3).forEach((area) => {
      suggestions.push({
        title: `Practice ${area.label}`,
        reason: "This pattern is either missing or not yet visible in your tracked history.",
        drills: area.drills
      });
    });

    underrepresentedAreas.slice(0, 2).forEach((area) => {
      suggestions.push({
        title: `Deepen ${area.label}`,
        reason: "You have some exposure here, but not enough repetition yet to make the pattern feel automatic.",
        drills: area.drills
      });
    });

    if (feedbackSummary.ids["edge-case-guards"]) {
      suggestions.push({
        title: "Train edge-case review reps",
        reason: "A few of your solves would benefit from stronger early guard handling.",
        drills: ["empty input checks", "one-element cases", "null or out-of-range handling"]
      });
    }

    if (!suggestions.length) {
      suggestions.push({
        title: "Raise the bar with mixed mock sets",
        reason: "Your tracked set looks balanced enough that the next value is realistic interview simulation.",
        drills: ["1 easy warm-up", "2 mediums from different topics", "1 hard follow-up review"]
      });
    }

    return {
      strengths,
      weaknesses,
      suggestions: suggestions.slice(0, 5)
    };
  }

  function summarizeFeedback(state, submissions) {
    const ids = {};
    let warningCount = 0;

    submissions.forEach((submission) => {
      const feedback = state.feedbackBySubmissionId[submission.id] || [];
      feedback.forEach((item) => {
        ids[item.id] = (ids[item.id] || 0) + 1;
        if (item.severity === "warning") {
          warningCount += 1;
        }
      });
    });

    return {
      ids,
      warningCount
    };
  }

  function buildAnalyticsPayload(state, focusDay, daySubmissions, tagCounts, dayReview, interviewReadiness, feedbackSummary) {
    const totalDifficulty = countBy(state.submissions, (submission) => normalizeDifficulty(submission.difficulty));
    const todayDifficulty = countBy(daySubmissions, (submission) => normalizeDifficulty(submission.difficulty));
    const todayTopics = Object.entries(countTags(daySubmissions))
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
    const allTopics = Object.entries(tagCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    const timedAllSubmissions = state.submissions.filter((submission) => Number.isFinite(submission.durationMs) && submission.durationMs > 0);
    const timedDaySubmissions = daySubmissions.filter((submission) => Number.isFinite(submission.durationMs) && submission.durationMs > 0);
    const dayFacts = {
      focusDay,
      solvedCount: dayReview.solvedCount,
      mediumHardCount: dayReview.mediumHardCount,
      timedSubmissionCount: timedDaySubmissions.length,
      averageSolveMinutes: dayReview.averageDurationMs ? Math.round(dayReview.averageDurationMs / 60000) : null,
      solveTimes: timedDaySubmissions.map((submission) => ({
        slug: submission.slug,
        title: submission.title,
        minutes: Math.round(submission.durationMs / 60000),
        difficulty: normalizeDifficulty(submission.difficulty)
      })),
      difficultyBreakdown: todayDifficulty,
      topicSnapshot: todayTopics,
      languages: utils.unique(daySubmissions.map((submission) => submission.language).filter(Boolean)),
      warningSignals: Object.keys(summarizeFeedback(state, daySubmissions).ids),
      summary: dayReview.summary
    };

    const interviewFacts = {
      totalSolved: state.aggregates.totalSolved,
      currentStreak: state.aggregates.currentStreak,
      timedSubmissionCount: timedAllSubmissions.length,
      averageSolveMinutes: timedAllSubmissions.length
        ? Math.round(timedAllSubmissions.reduce((sum, submission) => sum + submission.durationMs, 0) / timedAllSubmissions.length / 60000)
        : null,
      fastestSolveMinutes: timedAllSubmissions.length
        ? Math.round(Math.min(...timedAllSubmissions.map((submission) => submission.durationMs)) / 60000)
        : null,
      slowestSolveMinutes: timedAllSubmissions.length
        ? Math.round(Math.max(...timedAllSubmissions.map((submission) => submission.durationMs)) / 60000)
        : null,
      totalDifficulty,
      topicCoverage: allTopics,
      warningSignals: Object.keys(feedbackSummary.ids),
      strengths: interviewReadiness.strengths,
      weaknesses: interviewReadiness.weaknesses,
      suggestions: interviewReadiness.suggestions
    };

    return {
      dayReview: {
        facts: dayFacts,
        inputHash: utils.simpleHash(JSON.stringify(dayFacts))
      },
      interviewCoach: {
        facts: interviewFacts,
        inputHash: utils.simpleHash(JSON.stringify(interviewFacts))
      }
    };
  }

  function matchCoachingRecord(record, expectedHash) {
    if (!record || record.inputHash !== expectedHash) {
      return null;
    }
    return record;
  }

  function sanitizeSettings(settings) {
    const merged = {
      ...defaultState().settings,
      ...settings
    };

    return {
      aiProvider: merged.aiProvider,
      openaiModel: merged.openaiModel,
      hasOpenAIKey: Boolean(merged.openaiApiKey)
    };
  }

  function normalizeDifficulty(value) {
    const text = String(value || "").toLowerCase();
    if (text === "easy") {
      return "easy";
    }
    if (text === "medium" || text === "med.") {
      return "medium";
    }
    if (text === "hard") {
      return "hard";
    }
    return "unknown";
  }

  function countTags(submissions) {
    const counts = {};
    submissions.forEach((submission) => {
      (submission.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }

  function countBy(items, selector) {
    return items.reduce((counts, item) => {
      const key = selector(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function findExistingSubmission(state, submission, allowLooseMatch = false) {
    return state.submissions.find((item) => {
      if (item.dedupeKey === submission.dedupeKey) {
        return true;
      }

      if (submission.externalKey && item.externalKey === submission.externalKey) {
        return true;
      }

      if (!allowLooseMatch) {
        return false;
      }

      return (
        item.slug === submission.slug &&
        item.acceptedDay === submission.acceptedDay &&
        item.language === submission.language
      );
    });
  }

  function mergeSubmission(target, source) {
    target.pageUrl = target.pageUrl || source.pageUrl;
    target.title = target.title || source.title;
    target.slug = target.slug || source.slug;
    target.difficulty = target.difficulty === "Unknown" ? source.difficulty : target.difficulty;
    target.tags = target.tags && target.tags.length ? target.tags : source.tags;
    target.language = target.language === "Unknown" ? source.language : target.language;
    target.code = target.code || source.code;
    target.codeSource = target.codeSource === "unavailable" ? source.codeSource : target.codeSource;
    target.codeUnavailableReason = target.codeUnavailableReason || source.codeUnavailableReason;
    target.detectedFrom = target.detectedFrom || source.detectedFrom;
    target.externalKey = target.externalKey || source.externalKey || null;
    target.durationMs = Number.isFinite(target.durationMs) ? target.durationMs : source.durationMs;
    target.timerStartedAt = target.timerStartedAt || source.timerStartedAt || null;
    target.timerStoppedAt = target.timerStoppedAt || source.timerStoppedAt || null;
  }

  global.LeetTrackerStorage = {
    STORAGE_KEY,
    defaultState,
    getPopupData,
    getState,
    getSettings,
    getActiveTimer,
    importHistorySubmissions,
    initialize,
    saveState,
    saveSettings,
    saveAICoaching,
    startTimer,
    clearActiveTimer,
    clearImportedHistory,
    deleteSubmission,
    storeAcceptedSubmission
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
