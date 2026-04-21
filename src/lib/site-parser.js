(function attachSiteParser(global) {
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

  function queryFirstText(documentRef, selectors) {
    for (const selector of selectors) {
      const element = documentRef.querySelector(selector);
      const text = utils.visibleText(element);
      if (text) {
        return text;
      }
    }

    return "";
  }

  function extractTitle(documentRef, locationRef) {
    const headingText = queryFirstText(documentRef, [
      "div[data-track-load='description_content'] h1",
      "main h1",
      "h1"
    ]);

    const titleFromHeading = headingText.replace(/^\d+\.\s*/, "");
    if (titleFromHeading) {
      return titleFromHeading;
    }

    const titleElement = documentRef.querySelector("title");
    const titleText = utils.normalizeWhitespace(titleElement ? titleElement.textContent : "");
    const titleMatch = titleText.match(/^(?:\d+\.\s*)?(.+?)\s*-\s*LeetCode/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    const slug = utils.slugFromPath(locationRef.pathname);
    return slug
      ? slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "Unknown Problem";
  }

  function extractDifficulty(documentRef) {
    const directMatch = queryFirstText(documentRef, [
      "[diff]",
      "[data-difficulty]",
      "div[data-track-load='description_content'] [class*='text-difficulty']"
    ]);

    const directDifficulty = directMatch.match(/\b(Easy|Medium|Hard)\b/i);
    if (directDifficulty) {
      return capitalize(directDifficulty[1]);
    }

    const visibleElements = Array.from(documentRef.querySelectorAll("button, div, span, p"));
    for (const element of visibleElements) {
      const text = utils.visibleText(element);
      if (/^(Easy|Medium|Hard)$/i.test(text)) {
        return capitalize(text);
      }
    }

    return "Unknown";
  }

  function extractTags(documentRef) {
    const tagLinks = Array.from(documentRef.querySelectorAll("a[href*='/tag/'], a[href*='/topic/']"));
    const tags = tagLinks
      .map((link) => utils.visibleText(link))
      .filter(Boolean)
      .filter((value) => value.length < 40);

    return utils.unique(tags).slice(0, 12);
  }

  function extractLanguage(documentRef) {
    const selectors = [
      "[data-cy='lang-select']",
      "button[id*='headlessui-listbox-button']",
      "button[class*='lang']",
      "[data-track-load='code_editor'] button"
    ];

    for (const selector of selectors) {
      const elements = Array.from(documentRef.querySelectorAll(selector));
      for (const element of elements) {
        const text = utils.visibleText(element);
        const language = LANGUAGE_NAMES.find((candidate) => text.includes(candidate));
        if (language) {
          return language;
        }
      }
    }

    const pageText = utils.visibleText(documentRef.body);
    const language = LANGUAGE_NAMES.find((candidate) => {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp("\\b" + escaped + "\\b").test(pageText);
    });

    return language || "Unknown";
  }

  function extractCode(documentRef) {
    const textareaSelectors = [
      "textarea[data-cy='code-editor']",
      "textarea[class*='inputarea']",
      "textarea"
    ];

    for (const selector of textareaSelectors) {
      const element = documentRef.querySelector(selector);
      const value = element && typeof element.value === "string" ? element.value.trim() : "";
      if (value) {
        return {
          code: value,
          source: "textarea"
        };
      }
    }

    const monacoLines = Array.from(documentRef.querySelectorAll(".monaco-editor .view-lines .view-line"))
      .map((line) => line.textContent.replace(/\u00a0/g, " "))
      .join("\n")
      .trim();

    if (monacoLines) {
      return {
        code: monacoLines,
        source: "monaco-view-lines"
      };
    }

    const codeMirrorLines = Array.from(documentRef.querySelectorAll(".CodeMirror-code pre"))
      .map((line) => line.textContent)
      .join("\n")
      .trim();

    if (codeMirrorLines) {
      return {
        code: codeMirrorLines,
        source: "codemirror"
      };
    }

    return {
      code: null,
      source: "unavailable",
      unavailableReason: "Editor content is not readable from the current page DOM."
    };
  }

  function findAcceptedSignal(documentRef) {
    const scopedSelectors = [
      "[role='dialog']",
      "[data-e2e-locator*='result']",
      "[class*='result']",
      "[class*='submission']",
      "[data-e2e-locator*='submission']",
      "[id*='submission']",
      "main",
      "body"
    ];

    for (const selector of scopedSelectors) {
      const containers = Array.from(documentRef.querySelectorAll(selector));
      if (selector === "body" && documentRef.body) {
        containers.push(documentRef.body);
      }

      for (const container of containers) {
        const text = utils.visibleText(container);
        if (!text) {
          continue;
        }

        const accepted = /\b(Accepted|Success)\b/i.test(text);
        const submissionContext =
          /\b(Runtime|Memory|Testcase|Test Case|Beats|Submitted|All test cases passed|Passed)\b/i.test(text);

        if (accepted && submissionContext) {
          return {
            source: selector,
            signature: utils.simpleHash(text.slice(0, 500))
          };
        }
      }
    }

    return null;
  }

  function extractProblemMetadata(documentRef, locationRef) {
    const slug = utils.slugFromPath(locationRef.pathname);

    return {
      title: extractTitle(documentRef, locationRef),
      slug: slug || "unknown-problem",
      difficulty: extractDifficulty(documentRef),
      tags: extractTags(documentRef),
      language: extractLanguage(documentRef)
    };
  }

  function capitalize(value) {
    const text = String(value || "").toLowerCase();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  global.LeetTrackerSiteParser = {
    extractCode,
    extractProblemMetadata,
    findAcceptedSignal
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
