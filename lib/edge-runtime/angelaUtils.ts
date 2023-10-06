import { FunctionCall } from "@superflows/chat-ui-react";
import { GPTMessageInclSummary } from "../models";

export function updatePastAssistantMessage(
  command: FunctionCall,
  nonSystemMessages: GPTMessageInclSummary[],
) {
  /** Updates the history of the assistant message to include the filled-in parameters in the command
   *
   * E.g. from
   * test(a=b)
   *
   * where requiredParam was missing to
   * test(a=b, requiredParam=value)
   * **/
  const newCommandLine = `${command.name}(${Object.entries(command.args)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(", ")})`;

  // Update the last assistant message in the nonSystemMessages array
  const lastAssistantMessageIndex =
    nonSystemMessages.length -
    1 -
    nonSystemMessages.reverse().findIndex((m) => m.role === "assistant");
  nonSystemMessages.reverse(); // Reverse back to original order

  nonSystemMessages[lastAssistantMessageIndex].content = nonSystemMessages[
    lastAssistantMessageIndex
  ].content
    .split("\n") // Split into lines
    .map((line) => {
      // Below checks if it's the same function call as the one we're updating
      if (line.startsWith(command.name + "(") && line.trim().endsWith(")")) {
        return newCommandLine;
      }
      return line;
    })
    .join("\n"); // Re-join lines
}
