export function parseGPTStreamedData(
  gptOutString: string
): string[] | undefined {
  try {
    return gptOutString
      .split("data: ")
      .filter((l: string) => l.trim())
      .map((line: string) => {
        if (line.includes("[DONE]")) return "[DONE]";
        return JSON.parse(line.trim()).choices[0].delta.content;
      })
      .filter((l: string) => l);
  } catch (e) {
    console.warn(
      `Error parsing GPT output string: ${gptOutString}. Error: ${e}`
    );
    return undefined;
  }
}
