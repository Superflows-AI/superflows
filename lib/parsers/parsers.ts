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

export function parseLegacyAnthropicStreamedData(
  claudeOutString: string,
): ParsedStreamedData {
  const output = {
    completeChunks: [] as string[],
    incompleteChunk: null,
    done: false,
  } as ParsedStreamedData;

  claudeOutString
    .split("event: ")
    .filter((l: string) => l.trim())
    .forEach((line: string) => {
      try {
        const parsedLine = JSON.parse(line.match(/\{[^}]*}/)![0].trim());
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
  return output;
}

export function parseClaude3StreamedData(
  claudeOutString: string,
): ParsedStreamedData {
  const output = {
    completeChunks: [] as string[],
    incompleteChunk: null,
    done: false,
  } as ParsedStreamedData;

  claudeOutString
    .split("event: ")
    .filter((l: string) => l.trim())
    .forEach((line: string) => {
      try {
        const parsedLine = JSON.parse(line.match(/\{.*}/)![0].trim());
        if ("message_start" === parsedLine.type) {
          output.completeChunks = output.completeChunks.concat(
            parsedLine.message.content,
          );
        } else if ("content_block_start" === parsedLine.type) {
          output.completeChunks.push(parsedLine.content_block.text);
        } else if ("content_block_delta" === parsedLine.type) {
          output.completeChunks.push(parsedLine.delta.text);
        } else if (parsedLine.type === "message_stop") {
          output.done = true;
        } else return;
      } catch (e) {
        output.incompleteChunk = line;
        return;
      }
    });
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
