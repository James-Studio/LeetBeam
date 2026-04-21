(function bootstrapHistorySync(global) {
  const parser = global.LeetTrackerHistoryParser;
  const utils = global.LeetTrackerUtils;

  let lastSyncSignature = null;
  let debounceTimer = null;

  function scheduleSync() {
    global.clearTimeout(debounceTimer);
    debounceTimer = global.setTimeout(syncTodayHistory, 1000);
  }

  function syncTodayHistory() {
    const rows = parser.extractTodayAcceptedRows(document, global.location, new Date());
    const signature = utils.simpleHash(JSON.stringify(rows));

    if (!rows.length || signature === lastSyncSignature) {
      return;
    }

    lastSyncSignature = signature;

    chrome.runtime.sendMessage(
      {
        type: "leetcode/importHistoryRows",
        payload: {
          rows
        }
      },
      () => {
        if (chrome.runtime.lastError) {
          console.debug("Leet tracker history sync failed", chrome.runtime.lastError.message);
        }
      }
    );
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "leetcode/forceHistorySync") {
      return false;
    }

    const rows = parser.extractTodayAcceptedRows(document, global.location, new Date());
    const signature = utils.simpleHash(JSON.stringify(rows));
    lastSyncSignature = signature;

    chrome.runtime.sendMessage(
      {
        type: "leetcode/importHistoryRows",
        payload: {
          rows
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            error: chrome.runtime.lastError.message
          });
          return;
        }

        sendResponse({
          ok: true,
          rowsFound: rows.length,
          importedCount: response && response.importedCount ? response.importedCount : 0,
          updatedCount: response && response.updatedCount ? response.updatedCount : 0
        });
      }
    );

    return true;
  });

  const observer = new MutationObserver(() => {
    scheduleSync();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  scheduleSync();
})(window);
