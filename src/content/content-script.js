(function bootstrapContentScript(global) {
  const parser = global.LeetTrackerSiteParser;
  const utils = global.LeetTrackerUtils;
  const PROMPT_DISMISS_KEY = "leetbeamTimerPromptDismissals";

  let lastSubmissionSignature = null;
  let debounceTimer = null;
  let submitPollTimer = null;
  let submitPollAttempts = 0;
  let captureArmedUntil = 0;
  let uiRefreshTimer = null;
  let clockTickTimer = null;
  let activeTimer = null;
  let routeKey = global.location.pathname;
  let widgetRoot = null;
  let widgetButton = null;
  let widgetStatus = null;
  let widgetElapsed = null;
  let widgetHint = null;
  let widgetDismiss = null;
  let widgetRecall = null;

  function isCaptureArmed() {
    return Date.now() < captureArmedUntil;
  }

  function scheduleScan() {
    if (!isCaptureArmed()) {
      return;
    }

    global.clearTimeout(debounceTimer);
    debounceTimer = global.setTimeout(scanForAcceptedSubmission, 900);
  }

  function armCaptureWindow(durationMs = 2 * 60 * 1000) {
    captureArmedUntil = Date.now() + durationMs;
    scheduleScan();
  }

  function scheduleUIRefresh() {
    global.clearTimeout(uiRefreshTimer);
    uiRefreshTimer = global.setTimeout(renderTimerWidget, 120);
  }

  function startSubmitPolling() {
    global.clearInterval(submitPollTimer);
    submitPollAttempts = 0;
    armCaptureWindow();
    submitPollTimer = global.setInterval(() => {
      submitPollAttempts += 1;
      scanForAcceptedSubmission();

      if (submitPollAttempts >= 20) {
        global.clearInterval(submitPollTimer);
        submitPollTimer = null;
      }
    }, 1500);
  }

  function scanForAcceptedSubmission() {
    if (!isCaptureArmed()) {
      return;
    }

    const acceptedSignal = parser.findAcceptedSignal(document);
    if (!acceptedSignal) {
      return;
    }

    const metadata = parser.extractProblemMetadata(document, global.location);
    if (!metadata.slug) {
      return;
    }

    const codeResult = parser.extractCode(document);
    const submissionSignature = [
      acceptedSignal.signature,
      metadata.slug,
      metadata.language,
      utils.simpleHash(codeResult.code || "no-code")
    ].join(":");

    if (submissionSignature === lastSubmissionSignature) {
      return;
    }

    lastSubmissionSignature = submissionSignature;
    captureArmedUntil = 0;
    global.clearInterval(submitPollTimer);
    submitPollTimer = null;

    chrome.runtime.sendMessage(
      {
        type: "leetcode/acceptedSubmission",
        payload: {
          pageUrl: global.location.href,
          title: metadata.title,
          slug: metadata.slug,
          difficulty: metadata.difficulty,
          tags: metadata.tags,
          language: metadata.language,
          code: codeResult.code,
          codeSource: codeResult.source,
          codeUnavailableReason: codeResult.unavailableReason || null,
          acceptedAt: new Date().toISOString(),
          detectedFrom: acceptedSignal.source
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.debug("Leet tracker message failed", chrome.runtime.lastError.message);
          return;
        }

        if (response && response.timerStopped) {
          activeTimer = null;
        }

        renderTimerWidget();
      }
    );
  }

  function ensureWidget() {
    if (widgetRoot) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      .leetbeam-timer {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        width: min(320px, calc(100vw - 24px));
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        border: 1px solid rgba(46, 62, 82, 0.18);
        border-radius: 18px;
        background: rgba(255, 252, 246, 0.96);
        box-shadow: 0 18px 40px rgba(17, 24, 39, 0.14);
        backdrop-filter: blur(14px);
        font-family: "Inter", "Segoe UI", sans-serif;
        color: #1f2937;
      }
      .leetbeam-timer[data-state="running"] {
        border-color: rgba(15, 118, 110, 0.24);
        background: rgba(240, 253, 250, 0.97);
      }
      .leetbeam-timer[hidden] {
        display: none;
      }
      .leetbeam-timer-button {
        flex: 0 0 auto;
        width: 46px;
        height: 46px;
        border: 0;
        border-radius: 14px;
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 10px 22px rgba(234, 88, 12, 0.28);
      }
      .leetbeam-timer[data-state="running"] .leetbeam-timer-button {
        background: linear-gradient(135deg, #0f766e, #0d9488);
        box-shadow: 0 10px 22px rgba(13, 148, 136, 0.24);
      }
      .leetbeam-timer-button svg {
        width: 22px;
        height: 22px;
      }
      .leetbeam-timer-copy {
        min-width: 0;
        flex: 1 1 auto;
      }
      .leetbeam-timer-status {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #9a3412;
      }
      .leetbeam-timer[data-state="running"] .leetbeam-timer-status {
        color: #115e59;
      }
      .leetbeam-timer-elapsed {
        margin-top: 3px;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.1;
      }
      .leetbeam-timer-hint {
        margin-top: 5px;
        font-size: 12px;
        line-height: 1.45;
        color: #475569;
      }
      .leetbeam-timer-dismiss {
        flex: 0 0 auto;
        border: 0;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 2px;
      }
      .leetbeam-timer-recall {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483647;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border: 1px solid rgba(46, 62, 82, 0.18);
        border-radius: 999px;
        background: rgba(255, 252, 246, 0.96);
        color: #1f2937;
        box-shadow: 0 14px 32px rgba(17, 24, 39, 0.12);
        backdrop-filter: blur(14px);
        font-family: "Inter", "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .leetbeam-timer-recall svg {
        width: 16px;
        height: 16px;
      }
      .leetbeam-timer-recall[hidden] {
        display: none;
      }
      .leetbeam-timer[data-pulse="true"] {
        animation: leetbeamTimerPulse 1.1s ease-in-out 2;
      }
      @keyframes leetbeamTimerPulse {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      @media (max-width: 720px) {
        .leetbeam-timer {
          right: 12px;
          bottom: 12px;
          width: calc(100vw - 24px);
        }
      }
    `;

    widgetRoot = document.createElement("div");
    widgetRoot.className = "leetbeam-timer";
    widgetRoot.hidden = true;
    widgetRoot.innerHTML = `
      <button type="button" class="leetbeam-timer-button" aria-label="Start LeetBeam timer">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 2h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="14" r="7" stroke="currentColor" stroke-width="1.8"/>
        </svg>
      </button>
      <div class="leetbeam-timer-copy">
        <div class="leetbeam-timer-status">Ready to start</div>
        <div class="leetbeam-timer-elapsed">Start timing</div>
        <div class="leetbeam-timer-hint">Press the clock when you begin solving. LeetBeam will stop it automatically after an Accepted submit.</div>
      </div>
      <button type="button" class="leetbeam-timer-dismiss" aria-label="Dismiss timer prompt">x</button>
    `;

    widgetRecall = document.createElement("button");
    widgetRecall.type = "button";
    widgetRecall.className = "leetbeam-timer-recall";
    widgetRecall.hidden = true;
    widgetRecall.setAttribute("aria-label", "Show LeetBeam timer");
    widgetRecall.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 2h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M12 8v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="14" r="7" stroke="currentColor" stroke-width="1.8"/>
      </svg>
      <span>Timer</span>
    `;

    widgetButton = widgetRoot.querySelector(".leetbeam-timer-button");
    widgetStatus = widgetRoot.querySelector(".leetbeam-timer-status");
    widgetElapsed = widgetRoot.querySelector(".leetbeam-timer-elapsed");
    widgetHint = widgetRoot.querySelector(".leetbeam-timer-hint");
    widgetDismiss = widgetRoot.querySelector(".leetbeam-timer-dismiss");

    widgetButton.addEventListener("click", onTimerButtonClick);
    widgetDismiss.addEventListener("click", dismissPromptForCurrentProblem);
    widgetRecall.addEventListener("click", restorePromptForCurrentProblem);

    document.documentElement.appendChild(style);
    document.documentElement.appendChild(widgetRoot);
    document.documentElement.appendChild(widgetRecall);
  }

  function getCurrentProblem() {
    const metadata = parser.extractProblemMetadata(document, global.location);
    if (!metadata || !metadata.slug) {
      return null;
    }
    return metadata;
  }

  function findSubmitButton() {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((button) => /\bSubmit\b/i.test(utils.visibleText(button))) || null;
  }

  function canUseTimerOnPage() {
    return Boolean(getCurrentProblem());
  }

  function isSubmitTrigger(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    const submitLike = target.closest(
      [
        "button",
        "[role='button']",
        "[data-e2e-locator*='submit']",
        "[data-cy*='submit']",
        "[id*='submit']",
        "[class*='submit']",
        "[aria-label*='submit' i]",
        "[title*='submit' i]"
      ].join(", ")
    );

    if (!submitLike) {
      return false;
    }

    const text = utils.visibleText(submitLike);
    const locator =
      submitLike.getAttribute("data-e2e-locator") ||
      submitLike.getAttribute("data-cy") ||
      submitLike.getAttribute("aria-label") ||
      submitLike.getAttribute("title") ||
      "";

    return /\bsubmit\b/i.test(text) || /\bsubmit\b/i.test(locator);
  }

  function getPromptDismissals() {
    try {
      return JSON.parse(global.sessionStorage.getItem(PROMPT_DISMISS_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function isPromptDismissed(slug) {
    const dismissals = getPromptDismissals();
    return Boolean(slug && dismissals[slug]);
  }

  function dismissPromptForCurrentProblem() {
    const metadata = getCurrentProblem();
    if (!metadata || !metadata.slug) {
      if (widgetRoot) {
        widgetRoot.hidden = true;
      }
      if (widgetRecall) {
        widgetRecall.hidden = true;
      }
      return;
    }

    const dismissals = getPromptDismissals();
    dismissals[metadata.slug] = true;
    global.sessionStorage.setItem(PROMPT_DISMISS_KEY, JSON.stringify(dismissals));
    renderTimerWidget();
  }

  function restorePromptForCurrentProblem() {
    const metadata = getCurrentProblem();
    if (!metadata || !metadata.slug) {
      return;
    }

    clearPromptDismissal(metadata.slug);
    renderTimerWidget();
    pulseWidget("LeetBeam timer is back. Tap the clock whenever you want to start or manage timing.");
  }

  async function refreshActiveTimer() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "leetcode/getActiveTimer"
      });

      if (response && response.ok) {
        activeTimer = response.activeTimer || null;
      }
    } catch (error) {
      console.debug("Could not read active timer", error);
    }

    renderTimerWidget();
  }

  async function onTimerButtonClick() {
    const metadata = getCurrentProblem();
    if (!metadata) {
      return;
    }

    if (activeTimer && activeTimer.slug === metadata.slug) {
      await chrome.runtime.sendMessage({
        type: "leetcode/clearActiveTimer"
      });
      activeTimer = null;
      renderTimerWidget();
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "leetcode/startTimer",
      payload: {
        pageUrl: global.location.href,
        title: metadata.title,
        slug: metadata.slug,
        source: "floating-clock"
      }
    });

    if (response && response.ok) {
      activeTimer = response.activeTimer || null;
      clearPromptDismissal(metadata.slug);
      renderTimerWidget();
    }
  }

  function clearPromptDismissal(slug) {
    if (!slug) {
      return;
    }

    const dismissals = getPromptDismissals();
    if (!dismissals[slug]) {
      return;
    }

    delete dismissals[slug];
    global.sessionStorage.setItem(PROMPT_DISMISS_KEY, JSON.stringify(dismissals));
  }

  function pulseWidget(message) {
    if (!widgetRoot || widgetRoot.hidden) {
      return;
    }

    if (message && widgetHint) {
      widgetHint.textContent = message;
    }

    widgetRoot.dataset.pulse = "false";
    global.requestAnimationFrame(() => {
      widgetRoot.dataset.pulse = "true";
    });
  }

  function renderTimerWidget() {
    ensureWidget();

    const metadata = getCurrentProblem();
    if (!metadata || !canUseTimerOnPage()) {
      widgetRoot.hidden = true;
      if (widgetRecall) {
        widgetRecall.hidden = true;
      }
      stopClockTick();
      return;
    }

    const activeForThisProblem = activeTimer && activeTimer.slug === metadata.slug;
    const timerRunningElsewhere = activeTimer && !activeForThisProblem;
    const promptDismissed = isPromptDismissed(metadata.slug);

    const showMinimized = promptDismissed && !activeForThisProblem;
    widgetRoot.hidden = showMinimized;
    if (widgetRecall) {
      widgetRecall.hidden = !showMinimized;
    }
    widgetRoot.dataset.state = activeForThisProblem ? "running" : "idle";
    widgetButton.setAttribute("aria-label", activeForThisProblem ? "Stop LeetBeam timer" : "Start LeetBeam timer");
    widgetDismiss.hidden = activeForThisProblem || promptDismissed;

    if (activeForThisProblem) {
      widgetStatus.textContent = "Timing this solve";
      widgetElapsed.textContent = utils.formatDurationClock(Date.now() - new Date(activeTimer.startedAt).getTime());
      widgetHint.textContent = "Submit on LeetCode as usual. LeetBeam will stop automatically if the result is Accepted.";
      startClockTick();
      return;
    }

    stopClockTick();

    if (timerRunningElsewhere) {
      widgetStatus.textContent = "Timer already running";
      widgetElapsed.textContent = activeTimer.title || "Another problem";
      widgetHint.textContent = "Tap the clock to switch timing to this problem instead.";
      return;
    }

    if (showMinimized) {
      stopClockTick();
      return;
    }

    widgetStatus.textContent = "Ready to start";
    widgetElapsed.textContent = "Start timing";
    if (promptDismissed) {
      widgetHint.textContent = "Tap the clock whenever you want to begin timing this solve.";
      return;
    }

    widgetHint.textContent = findSubmitButton()
      ? "Press the clock when you begin solving. It is meant to be quicker than LeetCode's built-in timer."
      : "Press the clock whenever you start working. LeetBeam will keep timing even if the submit controls load later.";
  }

  function startClockTick() {
    if (clockTickTimer) {
      return;
    }

    clockTickTimer = global.setInterval(() => {
      if (!widgetElapsed || !activeTimer) {
        return;
      }

      widgetElapsed.textContent = utils.formatDurationClock(Date.now() - new Date(activeTimer.startedAt).getTime());
    }, 1000);
  }

  function stopClockTick() {
    global.clearInterval(clockTickTimer);
    clockTickTimer = null;
  }

  function handleRouteChange() {
    if (routeKey === global.location.pathname) {
      return;
    }

    routeKey = global.location.pathname;
    captureArmedUntil = 0;
    lastSubmissionSignature = null;
    global.clearInterval(submitPollTimer);
    submitPollTimer = null;
    refreshActiveTimer();
  }

  function patchHistory(methodName) {
    const original = global.history[methodName];
    if (typeof original !== "function") {
      return;
    }

    global.history[methodName] = function patchedHistoryMethod() {
      const result = original.apply(this, arguments);
      global.setTimeout(handleRouteChange, 0);
      return result;
    };
  }

  const observer = new MutationObserver(() => {
    handleRouteChange();
    if (!isCaptureArmed() && activeTimer && getCurrentProblem() && activeTimer.slug === getCurrentProblem().slug) {
      if (parser.findAcceptedSignal(document)) {
        armCaptureWindow(10 * 1000);
      }
    }
    scheduleScan();
    scheduleUIRefresh();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      if (isSubmitTrigger(target)) {
        startSubmitPolling();

        const metadata = getCurrentProblem();
        if (!activeTimer && metadata && !isPromptDismissed(metadata.slug)) {
          renderTimerWidget();
          pulseWidget("Start the LeetBeam clock when you begin the next fresh solve. It will stop on Accepted automatically.");
        }
      }
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }

      if (isSubmitTrigger(target)) {
        startSubmitPolling();
      }
    },
    true
  );

  patchHistory("pushState");
  patchHistory("replaceState");

  global.addEventListener("popstate", handleRouteChange);
  global.addEventListener("hashchange", handleRouteChange);

  refreshActiveTimer();
})(window);
