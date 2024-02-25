import { snakeToCamel } from "../../utils";
import { Action } from "../../types";
import { ChatGPTMessage } from "../../models";

export function parseTellUser(output: string): string {
  // If no "Keyword: " is found, return the whole output
  if (!output.match(/^.+:\s?/m)) {
    return output;
  }

  // If "Tell user:" is found, return the string after it, but before the next "Keyword: "
  if (output.includes("Tell user:")) {
    const textAfterTellUser = output.split("Tell user:")[1];
    return textAfterTellUser.split(/^.+:\s?$/m)[0].trim();
  }

  // Otherwise, return an empty string
  return "";
}

export function getActionFilteringDescriptions(
  selectedActions: Pick<Action, "name" | "filtering_description">[],
): string {
  const builtinActions = [
    {
      name: "plot_graph",
      filtering_description: "Plots a graph or table to be shown to the user",
    },
  ];
  return builtinActions
    .concat(selectedActions)
    .map(
      (a, idx) =>
        `${idx + 1}. ${snakeToCamel(a.name)}: ${a.filtering_description}`,
    )
    .join("\n");
}

export function getChatHistorySummary(
  chatHistory: ChatGPTMessage[],
  isClaude: boolean = false,
): string {
  return chatHistory
    .slice(0, -1)
    .filter(
      (m, i) =>
        m.role === "user" ||
        (m.role === "assistant" &&
          chatHistory[i + 1].role === "user" &&
          parseTellUser(m.content)),
    )
    .map(
      (m) =>
        `${m.role === "user" ? (isClaude ? "Human" : "User") : "Assistant"}: ${
          m.role === "user" ? m.content : parseTellUser(m.content)
        }`,
    )
    .join("\n\n");
}

export function languageLine(
  language: string | null,
  keywordsStr?: string,
): string {
  let out = language
    ? `Your reply should be written in ${language}`
    : `Write in the same language as the user`;
  if (keywordsStr) {
    out += `, but NEVER translate ${keywordsStr} - these MUST remain in English`;
  }
  return out;
}
