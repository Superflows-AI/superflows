interface ParsedStreamedData {
  completeChunks: string[];
  incompleteChunk: string | null;
  done: boolean;
}

export function parseGPTStreamedData(gptOutString: string): ParsedStreamedData {
  const output = {
    completeChunks: [] as string[],
    incompleteChunk: null,
    done: false,
  } as ParsedStreamedData;

  gptOutString
    // Filter out the "OPENROUTER PROCESSING" chunks if using openrouter
    .replaceAll(": OPENROUTER PROCESSING", "")
    .split("data: ")
    .filter((l: string) => l.trim())
    .map((line: string) => {
      if (line.includes("[DONE]")) {
        output.done = true;
        return output;
      }
      try {
        const choice = JSON.parse(line.trim()).choices[0];
        const content = "delta" in choice ? choice.delta.content : choice.text;
        if (content) output.completeChunks.push(content);
      } catch (e) {
        output.incompleteChunk = line;
        return output;
      }
    });
  return output;
}

export function parseAnthropicStreamedData(
  claudeOutString: string,
): ParsedStreamedData {
  const output = {
    completeChunks: [] as string[],
    incompleteChunk: null,
    done: false,
  } as ParsedStreamedData;
  console.log("claudeOutString:", claudeOutString);

  if (claudeOutString.includes("event: completion")) {
    claudeOutString
      .split("event: completion")
      .filter((l: string) => l.trim())
      .forEach((line: string) => {
        line = line.replaceAll("data: ", "");
        try {
          const parsedLine = JSON.parse(line.trim());
          const choice = parsedLine.completion;
          if (choice) output.completeChunks.push(choice);
          if (parsedLine.stop_reason) {
            output.done = true;
          }
        } catch (e) {
          output.incompleteChunk = line;
          return output;
        }
      });
  }
  return output;
}

export function parseFollowUpSuggestions(text: string): string[] {
  const suggestedQuestionRegex =
    /^([Ss]uggested [Qq]uestion|Suggestion) (\d: |\d\?)/;
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0 && line.startsWith("-"))
    .map((line) => {
      let out = line.slice(1).trim();
      // If the suggestion starts with "Suggested Question 1:" or similar, remove it
      let match;
      if ((match = suggestedQuestionRegex.exec(out))) {
        out = out.replace(match[0], "");
      }
      return out;
    });
}
