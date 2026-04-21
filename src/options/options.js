(function bootstrapOptions() {
  const form = document.getElementById("settings-form");
  const providerNode = document.getElementById("ai-provider");
  const apiKeyNode = document.getElementById("openai-api-key");
  const modelNode = document.getElementById("openai-model");
  const statusNode = document.getElementById("save-status");

  loadSettings();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusNode.textContent = "Saving...";

    const response = await chrome.runtime.sendMessage({
      type: "leetcode/saveSettings",
      payload: {
        aiProvider: providerNode.value,
        openaiApiKey: apiKeyNode.value.trim(),
        openaiModel: modelNode.value.trim() || "gpt-5-mini"
      }
    });

    statusNode.textContent = response && response.ok ? "Saved." : (response && response.error) || "Could not save settings.";
  });

  async function loadSettings() {
    const response = await chrome.runtime.sendMessage({
      type: "leetcode/getSettings"
    });

    if (!response || !response.ok) {
      statusNode.textContent = "Could not load settings.";
      return;
    }

    providerNode.value = response.settings.aiProvider || "stub";
    modelNode.value = response.settings.openaiModel || "gpt-5-mini";
    statusNode.textContent = response.settings.hasOpenAIKey ? "Key already saved." : "Ready";
  }
})();
