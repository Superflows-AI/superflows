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
