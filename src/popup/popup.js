(function bootstrapPopup() {
  const totalSolvedNode = document.getElementById("total-solved");
  const currentStreakNode = document.getElementById("current-streak");
  const focusDayNode = document.getElementById("focus-day");
  const dayReviewNode = document.getElementById("day-review");
  const interviewCoachNode = document.getElementById("interview-coach");
  const recentCountNode = document.getElementById("recent-count");
  const recentListNode = document.getElementById("recent-list");
  const resyncButton = document.getElementById("resync-button");
  const openHistoryButton = document.getElementById("open-history-button");
  const openSettingsButton = document.getElementById("open-settings-button");
  const clearImportedButton = document.getElementById("clear-imported-button");
  const generateDayAIButton = document.getElementById("generate-day-ai-button");
  const generateInterviewAIButton = document.getElementById("generate-interview-ai-button");
  const syncStatusNode = document.getElementById("sync-status");
  const syncTimestampNode = document.getElementById("sync-timestamp");
  const toggleButtons = Array.from(document.querySelectorAll(".panel-toggle"));

  initializeToggles();
  initializeActions();

  loadPopup();

  async function loadPopup() {
    const response = await chrome.runtime.sendMessage({
      type: "leetcode/getPopupData"
    });

    if (!response || !response.ok) {
      renderError(response ? response.error : "Unknown popup error.");
      return;
    }

    renderPopup(response.data);
  }

  function renderPopup(data) {
    totalSolvedNode.textContent = String(data.aggregates.totalSolved || 0);
    currentStreakNode.textContent = String(data.aggregates.currentStreak || 0);
    recentCountNode.textContent = `${data.recentAccepted.length} submissions`;
    renderSyncMeta(data.sync);
    renderDayReview(data.insights, data.settings);
    renderInterviewCoach(data.insights, data.settings);

    if (!data.recentAccepted.length) {
      recentListNode.innerHTML =
        '<p class="empty-state">Solve a LeetCode problem and get an Accepted result to start tracking progress here.</p>';
      return;
    }

    recentListNode.innerHTML = "";

    data.recentAccepted.forEach((submission) => {
      const card = document.createElement("article");
      card.className = "submission-card";

      const header = document.createElement("div");
      header.className = "submission-header";

      const titleWrap = document.createElement("div");
      const title = document.createElement("div");
      title.className = "submission-title";
      title.textContent = submission.title;

      const subtitle = document.createElement("div");
      subtitle.className = "submission-subtitle";
      subtitle.textContent = window.LeetTrackerUtils.formatShortDate(submission.acceptedAt);

      titleWrap.appendChild(title);
      titleWrap.appendChild(subtitle);

      const difficulty = document.createElement("span");
      const normalizedDifficulty = normalizeDifficulty(submission.difficulty);
      difficulty.className = `difficulty-pill ${normalizedDifficulty.toLowerCase()}`;
      difficulty.textContent = normalizedDifficulty;

      header.appendChild(titleWrap);
      header.appendChild(difficulty);
      card.appendChild(header);

      if (submission.tags.length) {
        const tagsRow = document.createElement("div");
        tagsRow.className = "tags-row";
        submission.tags.slice(0, 5).forEach((tag) => {
          const tagNode = document.createElement("span");
          tagNode.className = "tag-pill";
          tagNode.textContent = tag;
          tagsRow.appendChild(tagNode);
        });
        card.appendChild(tagsRow);
      }

      const feedbackList = document.createElement("div");
      feedbackList.className = "feedback-list";

      submission.feedback.forEach((item) => {
        const feedbackItem = document.createElement("div");
        feedbackItem.className = `feedback-item ${item.severity || "info"}`;

        const feedbackTitle = document.createElement("div");
        feedbackTitle.className = "feedback-title";
        feedbackTitle.textContent = item.title;

        const feedbackMessage = document.createElement("div");
        feedbackMessage.className = "feedback-message";
        feedbackMessage.textContent = item.message;

        feedbackItem.appendChild(feedbackTitle);
        feedbackItem.appendChild(feedbackMessage);
        feedbackList.appendChild(feedbackItem);
      });

      card.appendChild(feedbackList);

      const actions = document.createElement("div");
      actions.className = "submission-actions";

      const source = document.createElement("span");
      source.className = "source-chip";
      source.textContent = submission.detectedFrom === "submissions-page" ? "history sync" : "live capture";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;
        const response = await chrome.runtime.sendMessage({
          type: "leetcode/deleteSubmission",
          payload: {
            submissionId: submission.id
          }
        });

        if (!response || !response.ok || !response.deleted) {
          deleteButton.disabled = false;
          setSyncStatus(response && response.error ? response.error : "Could not delete that entry.");
          return;
        }

        setSyncStatus("Entry deleted.");
        loadPopup();
      });

      actions.appendChild(source);
      actions.appendChild(deleteButton);
      card.appendChild(actions);
      recentListNode.appendChild(card);
    });
  }

  function renderError(message) {
    recentListNode.innerHTML = `<p class="empty-state">Unable to load tracker data: ${message}</p>`;
  }

  function initializeToggles() {
    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        if (!targetId) {
          return;
        }

        const target = document.getElementById(targetId);
        const indicator = document.querySelector(`[data-indicator="${targetId}"]`);
        if (!target || !indicator) {
          return;
        }

        const collapsed = target.classList.toggle("is-collapsed");
        indicator.textContent = collapsed ? "Show" : "Hide";
      });
    });
  }

  function initializeActions() {
    resyncButton.addEventListener("click", async () => {
      setActionLoading(true);
      setSyncStatus("Syncing...");

      const response = await chrome.runtime.sendMessage({
        type: "leetcode/resyncFromHistoryPage"
      });

      setActionLoading(false);

      if (!response || !response.ok) {
        setSyncStatus(response && response.error ? response.error : "Could not resync from the history page.");
        return;
      }

      if (!response.rowsFound) {
        setSyncStatus("No accepted submissions from today found on the current progress/history page.");
      } else if (response.importedCount || response.updatedCount) {
        setSyncStatus(`Synced ${response.importedCount} new and ${response.updatedCount} existing solves from ${response.pageType || "history"}.`);
      } else {
        setSyncStatus("History page re-read. No changes were needed.");
      }

      await loadPopup();
    });

    openHistoryButton.addEventListener("click", async () => {
      setActionLoading(true);
      const response = await chrome.runtime.sendMessage({
        type: "leetcode/openHistoryPage"
      });
      setActionLoading(false);
      setSyncStatus(response && response.ok ? "Progress page ready." : "Could not open progress page.");
    });

    openSettingsButton.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });

    clearImportedButton.addEventListener("click", async () => {
      setActionLoading(true);
      const response = await chrome.runtime.sendMessage({
        type: "leetcode/clearImportedHistory"
      });
      setActionLoading(false);

      if (!response || !response.ok) {
        setSyncStatus(response && response.error ? response.error : "Could not clear imported history.");
        return;
      }

      setSyncStatus(`Removed ${response.removedCount} imported entr${response.removedCount === 1 ? "y" : "ies"}.`);
      await loadPopup();
    });

    generateDayAIButton.addEventListener("click", async () => {
      await generateAICoaching("day");
    });

    generateInterviewAIButton.addEventListener("click", async () => {
      await generateAICoaching("interview");
    });
  }

  function renderSyncMeta(sync) {
    if (!sync || !sync.lastHistorySyncAt) {
      syncTimestampNode.textContent = "No history sync yet";
      return;
    }

    syncTimestampNode.textContent = `Last sync: ${formatDateTime(sync.lastHistorySyncAt)}`;
  }

  function setActionLoading(isLoading) {
    resyncButton.disabled = isLoading;
    openHistoryButton.disabled = isLoading;
    openSettingsButton.disabled = isLoading;
    clearImportedButton.disabled = isLoading;
  }

  function toggleAIButtons(isLoading) {
    generateDayAIButton.disabled = isLoading;
    generateInterviewAIButton.disabled = isLoading;
  }

  function setSyncStatus(message) {
    syncStatusNode.textContent = message;
  }

  function renderDayReview(insights, settings) {
    if (!insights || !insights.focusDay) {
      focusDayNode.textContent = "No tracked day";
      dayReviewNode.innerHTML =
        '<p class="empty-state">Your daily review will appear after tracked Accepted submissions.</p>';
      return;
    }

    focusDayNode.textContent = insights.focusDay;
    dayReviewNode.innerHTML = "";

    const summaryCard = document.createElement("article");
    summaryCard.className = "coach-card";
    summaryCard.innerHTML = `
      <h3>Practice snapshot</h3>
      <p class="coach-summary">${escapeHtml(insights.dayReview.summary)}</p>
    `;
    dayReviewNode.appendChild(summaryCard);

    dayReviewNode.appendChild(
      buildPointCard("What went well", insights.dayReview.strengths, "positive")
    );
    dayReviewNode.appendChild(
      buildPointCard("Needs attention", insights.dayReview.weaknesses, "warning")
    );
    dayReviewNode.appendChild(
      buildPointCard("How to improve tomorrow", insights.dayReview.suggestions, "info")
    );
    dayReviewNode.appendChild(
      buildAICard("AI perspective", insights.aiCoaching && insights.aiCoaching.dayReview, settings)
    );
  }

  function renderInterviewCoach(insights, settings) {
    if (!insights) {
      interviewCoachNode.innerHTML =
        '<p class="empty-state">More targeted suggestions will appear as you build a submission history.</p>';
      return;
    }

    interviewCoachNode.innerHTML = "";
    interviewCoachNode.appendChild(
      buildPointCard("Strengths", insights.interviewReadiness.strengths, "positive")
    );
    interviewCoachNode.appendChild(
      buildPointCard("Gaps to close", insights.interviewReadiness.weaknesses, "warning")
    );

    const suggestionCard = document.createElement("article");
    suggestionCard.className = "coach-card";
    suggestionCard.innerHTML = "<h3>Recommended next problem types</h3>";

    const suggestionList = document.createElement("div");
    suggestionList.className = "coach-list";

    insights.interviewReadiness.suggestions.forEach((suggestion) => {
      const item = document.createElement("div");
      item.className = "coach-point info";

      const title = document.createElement("span");
      title.className = "suggestion-title";
      title.textContent = suggestion.title;

      const reason = document.createElement("div");
      reason.textContent = suggestion.reason;

      const drills = document.createElement("div");
      drills.className = "drill-row";
      drills.textContent = `Try: ${suggestion.drills.join(" • ")}`;

      item.appendChild(title);
      item.appendChild(reason);
      item.appendChild(drills);
      suggestionList.appendChild(item);
    });

    suggestionCard.appendChild(suggestionList);
    interviewCoachNode.appendChild(suggestionCard);
    interviewCoachNode.appendChild(
      buildAICard("AI perspective", insights.aiCoaching && insights.aiCoaching.interviewCoach, settings)
    );
  }

  function buildPointCard(title, items, tone) {
    const card = document.createElement("article");
    card.className = "coach-card";

    const heading = document.createElement("h3");
    heading.textContent = title;
    card.appendChild(heading);

    if (!items || !items.length) {
      const empty = document.createElement("p");
      empty.className = "coach-summary";
      empty.textContent = "More tracked submissions will make this section smarter.";
      card.appendChild(empty);
      return card;
    }

    const list = document.createElement("div");
    list.className = "coach-list";

    items.forEach((item) => {
      const point = document.createElement("div");
      point.className = `coach-point ${tone}`;
      point.textContent = item;
      list.appendChild(point);
    });

    card.appendChild(list);
    return card;
  }

  function buildAICard(title, record, settings) {
    const card = document.createElement("article");
    card.className = "coach-card";

    const heading = document.createElement("h3");
    heading.textContent = title;
    card.appendChild(heading);

    if (!settings || !settings.hasOpenAIKey) {
      const empty = document.createElement("p");
      empty.className = "coach-summary";
      empty.textContent = "AI coaching is optional. Add your own OpenAI API key in settings to enable narrative coaching.";
      card.appendChild(empty);
      return card;
    }

    if (!record || !record.content) {
      const empty = document.createElement("p");
      empty.className = "coach-summary";
      empty.textContent = "No AI narrative generated yet for this snapshot.";
      card.appendChild(empty);
      return card;
    }

    if (record.content.summary) {
      const summary = document.createElement("p");
      summary.className = "coach-summary";
      summary.textContent = record.content.summary;
      card.appendChild(summary);
    }

    if (Array.isArray(record.content.strengths) && record.content.strengths.length) {
      card.appendChild(buildSimpleList(record.content.strengths, "positive"));
    }

    if (Array.isArray(record.content.weaknesses) && record.content.weaknesses.length) {
      card.appendChild(buildSimpleList(record.content.weaknesses, "warning"));
    }

    if (Array.isArray(record.content.suggestions) && record.content.suggestions.length) {
      if (typeof record.content.suggestions[0] === "string") {
        card.appendChild(buildSimpleList(record.content.suggestions, "info"));
      } else {
        const list = document.createElement("div");
        list.className = "coach-list";
        record.content.suggestions.forEach((suggestion) => {
          const item = document.createElement("div");
          item.className = "coach-point info";

          const titleNode = document.createElement("span");
          titleNode.className = "suggestion-title";
          titleNode.textContent = suggestion.title || "Suggestion";

          const reason = document.createElement("div");
          reason.textContent = suggestion.reason || "";

          item.appendChild(titleNode);
          item.appendChild(reason);

          if (Array.isArray(suggestion.drills) && suggestion.drills.length) {
            const drills = document.createElement("div");
            drills.className = "drill-row";
            drills.textContent = `Try: ${suggestion.drills.join(" • ")}`;
            item.appendChild(drills);
          }

          list.appendChild(item);
        });
        card.appendChild(list);
      }
    }

    return card;
  }

  function buildSimpleList(items, tone) {
    const list = document.createElement("div");
    list.className = "coach-list";
    items.forEach((item) => {
      const point = document.createElement("div");
      point.className = `coach-point ${tone}`;
      point.textContent = item;
      list.appendChild(point);
    });
    return list;
  }

  async function generateAICoaching(kind) {
    setSyncStatus("Generating AI coaching...");
    toggleAIButtons(true);

    const response = await chrome.runtime.sendMessage({
      type: "leetcode/generateAiCoaching",
      payload: { kind }
    });

    toggleAIButtons(false);

    if (!response || !response.ok) {
      setSyncStatus(response && response.error ? response.error : "Could not generate AI coaching.");
      return;
    }

    setSyncStatus(kind === "day" ? "AI daily coaching updated." : "AI interview coaching updated.");
    await loadPopup();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function normalizeDifficulty(value) {
    const text = String(value || "").toLowerCase();
    if (text === "easy") {
      return "Easy";
    }

    if (text === "medium" || text === "med.") {
      return "Medium";
    }

    if (text === "hard") {
      return "Hard";
    }

    return "Unknown";
  }
})();
