(function attachFeedbackEngine(global) {
  function analyzeSubmission(submission) {
    const feedback = [];
    const code = submission.code || "";
    const lines = code.split(/\r?\n/);
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

    if (!code.trim()) {
      feedback.push({
        id: "code-unavailable",
        severity: "info",
        title: "Code capture unavailable",
        message: submission.codeUnavailableReason || "The page did not expose editor content, so only metadata was stored."
      });

      return feedback;
    }

    addVariableNamingFeedback(code, feedback);
    addNestingFeedback(lines, feedback);
    addFunctionLengthFeedback(code, feedback);
    addEdgeCaseFeedback(submission, code, feedback);
    addTimingFeedback(submission, feedback);

    if (!feedback.length) {
      feedback.push({
        id: "clean-structure",
        severity: "positive",
        title: "Solid baseline structure",
        message: "No obvious structural issues were detected by the local rules."
      });
    } else if (nonEmptyLines.length <= 20) {
      feedback.push({
        id: "compact-solution",
        severity: "positive",
        title: "Compact solution",
        message: "The implementation is short, which often makes follow-up review easier."
      });
    }

    return feedback;
  }

  function addVariableNamingFeedback(code, feedback) {
    const variableMatches = Array.from(code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g));
    const names = variableMatches.map((match) => match[1]);

    if (!names.length) {
      return;
    }

    const vagueNames = names.filter((name) => {
      return /^(tmp|temp|val|value|data|res|result|obj|item|node|arr|ans|x|y|z)$/i.test(name);
    });
    const singleCharNames = names.filter((name) => /^[a-zA-Z]$/.test(name) && !/^[ijkn]$/.test(name));

    if (vagueNames.length >= 2 || singleCharNames.length >= 3) {
      feedback.push({
        id: "vague-variable-naming",
        severity: "warning",
        title: "Variable naming could be sharper",
        message: "Several variables use short or generic names. More descriptive names can make future review faster."
      });
    }
  }

  function addNestingFeedback(lines, feedback) {
    let depth = 0;
    let maxDepth = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const closingBraces = (line.match(/}/g) || []).length;
      depth = Math.max(0, depth - closingBraces);

      if (/\b(if|for|while|switch|try)\b/.test(line) && /[{:]?$/.test(line)) {
        depth += 1;
        maxDepth = Math.max(maxDepth, depth);
      }

      const openingBraces = (line.match(/{/g) || []).length;
      if (!/\b(if|for|while|switch|try)\b/.test(line)) {
        depth += openingBraces;
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    if (maxDepth >= 4) {
      feedback.push({
        id: "excessive-nesting",
        severity: "warning",
        title: "Nested control flow is getting deep",
        message: "The solution appears to nest several branches or loops. Early returns or helper functions may improve readability."
      });
    }
  }

  function addFunctionLengthFeedback(code, feedback) {
    const blocks = Array.from(code.matchAll(/(?:function\s+\w+\s*\([^)]*\)|\w+\s*=\s*\([^)]*\)\s*=>|class\s+\w+\s*{)/g));
    if (!blocks.length) {
      return;
    }

    const longBlock = blocks.some((match) => {
      const startIndex = match.index || 0;
      const snippet = code.slice(startIndex, startIndex + 2000);
      const blockLines = snippet.split(/\r?\n/).slice(0, 50);
      return blockLines.filter((line) => line.trim()).length > 35;
    });

    if (longBlock) {
      feedback.push({
        id: "long-function",
        severity: "warning",
        title: "Function length is fairly long",
        message: "A longer function can be harder to debug later. Splitting setup, traversal, or helpers may help."
      });
    }
  }

  function addEdgeCaseFeedback(submission, code, feedback) {
    const tags = submission.tags || [];
    const normalized = code.toLowerCase();
    const hasGuard = /\bif\s*\(|\?\s*.*:|return\s+.*\|\|/.test(code);

    if (hasGuard) {
      return;
    }

    const tagsNeedingGuard = ["Array", "String", "Linked List", "Tree", "Binary Tree"];
    const shouldSuggestGuard = tags.some((tag) => tagsNeedingGuard.includes(tag)) || /(null|undefined|\[\]|length)/i.test(code);

    if (shouldSuggestGuard) {
      feedback.push({
        id: "edge-case-guards",
        severity: "info",
        title: "Consider explicit edge-case guards",
        message: "This problem type often benefits from early checks for empty inputs, null references, or single-item cases."
      });
    }

    if ((submission.difficulty || "").toLowerCase() === "hard" && !/memo|cache|dp|visited|stack|queue/.test(normalized)) {
      feedback.push({
        id: "hard-problem-structure",
        severity: "info",
        title: "Worth reviewing complexity tradeoffs",
        message: "Hard problems often hide edge-case or complexity traps. A quick pass on time and space tradeoffs may be valuable."
      });
    }
  }

  function addTimingFeedback(submission, feedback) {
    if (!Number.isFinite(submission.durationMs) || submission.durationMs <= 0) {
      return;
    }

    const totalMinutes = Math.round(submission.durationMs / 60000);
    const friendlyDuration = totalMinutes <= 1 ? "about 1 minute" : `${totalMinutes} minutes`;
    let message = `LeetBeam recorded a solve time of ${friendlyDuration} for this accepted run.`;

    if (totalMinutes >= 60) {
      message += " That usually means the problem is worth a deliberate post-solve review so the pattern becomes faster next time.";
    } else if (totalMinutes <= 15) {
      message += " That is a strong pace for interview-style reps.";
    }

    feedback.push({
      id: "solve-time",
      severity: totalMinutes <= 15 ? "positive" : "info",
      title: "Solve time recorded",
      message
    });
  }

  global.LeetTrackerFeedbackEngine = {
    analyzeSubmission
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
