(function bootstrapContentScript(global) {
  const parser = global.LeetTrackerSiteParser;
  const utils = global.LeetTrackerUtils;

  let lastSubmissionSignature = null;
  let debounceTimer = null;
  let submitPollTimer = null;
  let submitPollAttempts = 0;
  let captureArmedUntil = 0;

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

  function startSubmitPolling() {
    global.clearInterval(submitPollTimer);
    submitPollAttempts = 0;
    captureArmedUntil = Date.now() + 2 * 60 * 1000;
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
      () => {
        if (chrome.runtime.lastError) {
          console.debug("Leet tracker message failed", chrome.runtime.lastError.message);
        }
      }
    );
  }

  const observer = new MutationObserver(() => {
    scheduleScan();
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

      const button = target.closest("button");
      const text = button ? utils.visibleText(button) : "";
      if (/\bSubmit\b/i.test(text)) {
        startSubmitPolling();
      }
    },
    true
  );

  global.addEventListener("popstate", () => {
    captureArmedUntil = 0;
    global.clearInterval(submitPollTimer);
    submitPollTimer = null;
  });
  global.addEventListener("hashchange", () => {
    captureArmedUntil = 0;
    global.clearInterval(submitPollTimer);
    submitPollTimer = null;
  });
})(window);
