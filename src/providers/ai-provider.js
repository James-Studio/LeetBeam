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
      analyzeSubmission(submission, settings) {
        return analyzeSubmissionWithOpenAI(submission, settings);
      },
      generateDailyReview(facts, settings) {
        return generateCoachingJSON("daily", facts, settings);
      },
      generateInterviewCoach(facts, settings) {
        return generateCoachingJSON("interview", facts, settings);
      }
    };
  }

  async function analyzeSubmissionWithOpenAI(submission, settings) {
    if (!settings || !settings.openaiApiKey) {
      return [];
    }

    const result = await requestJSON(
      buildSubmissionInstructions(),
      {
        title: submission.title,
        slug: submission.slug,
        difficulty: submission.difficulty,
        language: submission.language,
        tags: submission.tags || [],
        durationMinutes: Number.isFinite(submission.durationMs) ? Math.round(submission.durationMs / 60000) : null,
        durationSeconds: Number.isFinite(submission.durationMs) ? Math.round(submission.durationMs / 1000) : null,
        timerStartedAt: submission.timerStartedAt || null,
        timerStoppedAt: submission.timerStoppedAt || null,
        acceptedAt: submission.acceptedAt,
        code: submission.code || null,
        codeUnavailableReason: submission.codeUnavailableReason || null
      },
      settings
    );

    return normalizeFeedback(result && result.feedback);
  }

  async function generateCoachingJSON(mode, facts, settings) {
    if (!settings || !settings.openaiApiKey) {
      throw new Error("Add an OpenAI API key in settings first.");
    }

    return requestJSON(buildInstructions(mode), facts, settings);
  }

  async function requestJSON(instructions, facts, settings) {
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
            content: instructions
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

  function buildSubmissionInstructions() {
    return [
      "You are reviewing one accepted LeetCode submission using only the supplied submission facts.",
      "Use solve duration if it is present, but do not assume timing exists.",
      "Do not claim the solution is incorrect because it was accepted.",
      "Return strict JSON with key feedback.",
      "feedback must be an array of 0 to 3 objects.",
      "Each object must have keys id, severity, title, message.",
      "severity must be one of info, warning, positive.",
      "Keep each message short, concrete, and grounded in the supplied code or solve-time context.",
      "If timing is present, you may comment on pacing or debugging efficiency without sounding judgmental."
    ].join(" ");
  }

  function buildInstructions(mode) {
    if (mode === "daily") {
      return [
        "You are coaching a LeetCode user using only supplied deterministic analytics.",
        "Do not invent counts, streaks, tags, or solve history.",
        "Treat solve-time data as optional and only reference it when provided.",
        "Return strict JSON with keys: summary, strengths, weaknesses, suggestions.",
        "Each of strengths, weaknesses, suggestions must be an array of 2 to 4 short strings.",
        "summary must be one concise sentence."
      ].join(" ");
    }

    return [
      "You are coaching a user for big-tech software engineering interviews using only supplied deterministic analytics.",
      "Do not invent counts, streaks, or topic coverage.",
      "Treat solve-time data as optional and only reference it when provided.",
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

  function normalizeFeedback(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item, index) => {
        const title = typeof item?.title === "string" ? item.title.trim() : "";
        const message = typeof item?.message === "string" ? item.message.trim() : "";

        if (!title || !message) {
          return null;
        }

        return {
          id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `ai-feedback-${index + 1}`,
          severity: normalizeSeverity(item.severity),
          title,
          message
        };
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  function normalizeSeverity(value) {
    return value === "positive" || value === "warning" || value === "info" ? value : "info";
  }

  global.LeetTrackerAIProvider = {
    getProvider
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
