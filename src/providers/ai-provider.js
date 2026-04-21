(function attachAIProvider(global) {
  async function analyzeSubmission() {
    return [];
  }

  async function generateDailyReview() {
    return null;
  }

  async function generateInterviewCoach() {
    return null;
  }

  function getProvider(providerName) {
    if (!providerName || providerName === "stub") {
      return {
        name: "stub",
        analyzeSubmission,
        generateDailyReview,
        generateInterviewCoach
      };
    }

    if (providerName === "openai") {
      return createOpenAIProvider();
    }

    return {
      name: "stub",
      analyzeSubmission,
      generateDailyReview,
      generateInterviewCoach
    };
  }

  function createOpenAIProvider() {
    return {
      name: "openai",
      analyzeSubmission,
      generateDailyReview(facts, settings) {
        return generateCoachingJSON("daily", facts, settings);
      },
      generateInterviewCoach(facts, settings) {
        return generateCoachingJSON("interview", facts, settings);
      }
    };
  }

  async function generateCoachingJSON(mode, facts, settings) {
    if (!settings || !settings.openaiApiKey) {
      throw new Error("Add an OpenAI API key in settings first.");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.openaiApiKey}`
      },
      body: JSON.stringify({
        model: settings.openaiModel || "gpt-5-mini",
        input: [
          {
            role: "developer",
            content: buildInstructions(mode)
          },
          {
            role: "user",
            content: JSON.stringify(facts)
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText.slice(0, 180)}`);
    }

    const result = await response.json();
    return parseJSONOutput(extractOutputText(result));
  }

  function buildInstructions(mode) {
    if (mode === "daily") {
      return [
        "You are coaching a LeetCode user using only supplied deterministic analytics.",
        "Do not invent counts, streaks, tags, or solve history.",
        "Return strict JSON with keys: summary, strengths, weaknesses, suggestions.",
        "Each of strengths, weaknesses, suggestions must be an array of 2 to 4 short strings.",
        "summary must be one concise sentence."
      ].join(" ");
    }

    return [
      "You are coaching a user for big-tech software engineering interviews using only supplied deterministic analytics.",
      "Do not invent counts, streaks, or topic coverage.",
      "Return strict JSON with keys: summary, strengths, weaknesses, suggestions.",
      "strengths and weaknesses must be arrays of 2 to 4 short strings.",
      "suggestions must be an array of 2 to 5 objects with keys title, reason, drills.",
      "Each drills value must be an array of 2 to 4 short strings.",
      "summary must be one concise sentence."
    ].join(" ");
  }

  function extractOutputText(result) {
    if (typeof result.output_text === "string" && result.output_text.trim()) {
      return result.output_text.trim();
    }

    const textParts = [];
    (result.output || []).forEach((item) => {
      (item.content || []).forEach((content) => {
        if (content.type === "output_text" && content.text) {
          textParts.push(content.text);
        }
      });
    });

    return textParts.join("\n").trim();
  }

  function parseJSONOutput(text) {
    const raw = String(text || "").trim();
    if (!raw) {
      throw new Error("OpenAI returned empty output.");
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      const fenced = raw.match(/```json\s*([\s\S]+?)```/i) || raw.match(/```([\s\S]+?)```/i);
      if (fenced) {
        return JSON.parse(fenced[1].trim());
      }
      throw new Error("OpenAI output was not valid JSON.");
    }
  }

  global.LeetTrackerAIProvider = {
    getProvider
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
