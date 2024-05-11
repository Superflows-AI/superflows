import { FunctionCall } from "@superflows/chat-ui-react";
import { FunctionMessage, GPTMessageInclSummary } from "../models";
import { swapKeysValues } from "../utils";
import { parseGPTStreamedData } from "../parsers/parsers";
import {
  AssistantMessage,
  StreamingStepInput,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import _ from "lodash";

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
  console.log("Updating past assistant message with command:", command);
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

export async function streamResponseToUser(
  res: ReadableStream,
  streamInfo: (step: StreamingStepInput) => void,
  originalToPlaceholderMap?: Record<string, string>,
): Promise<string> {
  const decoder = new TextDecoder();
  const reader = res.getReader();
  let rawOutput = "";
  let done = false;
  let incompleteChunk = "";
  let first = true;
  // Below buffer is used to store the partial value of a variable if it's split across multiple chunks
  let placeholderBuffer = "";
  const placeholderToOriginalMap = originalToPlaceholderMap
    ? swapKeysValues(originalToPlaceholderMap)
    : undefined;
  console.log("placeholder to original map: ", placeholderToOriginalMap);
  // https://web.dev/streams/#asynchronous-iteration
  while (!done) {
    const { value, done: doneReading } = await reader.read();

    done = doneReading;
    if (done) break;

    const contentItems = parseGPTStreamedData(
      incompleteChunk + decoder.decode(value),
    );

    incompleteChunk = contentItems.incompleteChunk ?? "";

    for (let content of contentItems.completeChunks) {
      // Sometimes starts with a newline
      if (first) {
        content = content.trimStart();
        first = false;
      }
      // Raw output is the actual output from the LLM!
      rawOutput += content;
      // What streams back to the user has the variables replaced with their real values
      //  so URL1 is replaced by the actual URL
      if (placeholderToOriginalMap) {
        ({ content, placeholderBuffer } = replacePlaceholdersDuringStreaming(
          content,
          placeholderBuffer,
          placeholderToOriginalMap,
        ));
      }

      if (content) streamInfo({ role: "assistant", content });
    }

    if (contentItems.done) {
      done = true;
      break;
    }
  }
  return stripExampleFunctions(rawOutput);
}

export function replacePlaceholdersDuringStreaming(
  content: string,
  placeholderBuffer: string,
  placeholderToOriginalMap: Record<string, string>,
): {
  content: string;
  placeholderBuffer: string;
} {
  // If there's something in the placeholderBuffer, we need to add it to the start of the content
  content = placeholderBuffer + content;
  // Empty buffer after adding it to the content
  placeholderBuffer = "";

  // Check if there's a full match: if so, replace the variable with the value
  // Note: we get a full match even if the number hasn't finished outputting (e.g.
  // URL1 is output, but the next chunk is a 0 to make it URL10)
  const placeholderKeys = Object.keys(placeholderToOriginalMap)
    // Got to order with keys which are subsets of others last (e.g. URL11 before URL1)
    .sort((a, b) => (a.includes(b) ? 1 : -1));

  const fullPlaceholderMatch =
    // /(?:((?:URL|ID)[1-9][0-9]*)\b|(FUNCTIONS?) )/g.exec(content);
    new RegExp(`(${placeholderKeys.join("|")})`).exec(content);
  if (fullPlaceholderMatch !== null) {
    // Full match - e.g. URL6 or ID2. Time to replace it with the actual value
    const matchedString = fullPlaceholderMatch[1];
    console.log(
      "Full match with string:",
      matchedString,
      placeholderToOriginalMap[matchedString],
    );
    if (matchedString in placeholderToOriginalMap) {
      content = content.replaceAll(
        matchedString,
        placeholderToOriginalMap[matchedString],
      );
    }
    // If the variable isn't in the map, it means it's not a variable,
    // this is a rare case where IDX is in the string by chance anyway. Do nothing
    return { content, placeholderBuffer };
  }

  // ID7 takes up 2 tokens "ID" and "7", so we need to check if there's a partial
  // match with the first half (which ends immediately after the ID/URL)
  const partialMatch = endsWithPartialMatch(content, placeholderKeys);
  if (partialMatch) {
    console.log("Partial match with string:", content);
    placeholderBuffer = content;
    content = "";
  }
  return { content, placeholderBuffer };
}

function endsWithPartialMatch(str: string, candidates: string[]): boolean {
  return candidates.some((candidate) => {
    for (let i = 0; i < candidate.length; i++) {
      if (str.endsWith(candidate.substring(0, i + 1))) {
        return true;
      }
    }
    return false;
  });
}

export function stripExampleFunctions(rawOutput: string): string {
  /**
   * Often if the LLM doesn't output any useful commands, it will output
   * the functions given as examples in the prompt (e.g. FUNCTION_1 and FUNCTION_2)
   * manually strip this out of the response.
   */

  const functionPattern = /(FUNCTION_1\([^)]*\)|FUNCTION_2\([^)]*\))/g;
  return rawOutput.replace(functionPattern, "");
}

export function getAssistantFnMessagePairs(
  responseMessages: (FunctionMessage | AssistantMessage)[],
): (AssistantMessage & {
  functionMessages: FunctionMessage[];
})[] {
  /** Split responseMessages into an array of objects, each with an assistant
   *  message and sequence of function messages that follow it
   **/
  // TODO: known bug that if the LLM outputs identical assistant messages then this will include
  //  too many function messages in the functionMessages arrays of later repetitions of the repeated
  //  assistant message
  // Get the assistant messages
  const assistantMessages = responseMessages.filter(
    (m) => m.role === "assistant",
  ) as AssistantMessage[];

  return assistantMessages.map((assistMsg: AssistantMessage, idx: number) => {
    const currentAssistantMessageIdx = responseMessages.findIndex((m) =>
      _.isEqual(m, assistMsg),
    );
    const nextAssistantMessage = assistantMessages[idx + 1];
    const nextAssistantMessageIdx = nextAssistantMessage
      ? responseMessages.findIndex((m) => _.isEqual(m, nextAssistantMessage))
      : responseMessages.length + 1;
    const functionMessages = responseMessages.filter(
      (m, mi) =>
        m.role === "function" &&
        currentAssistantMessageIdx < mi &&
        mi < nextAssistantMessageIdx,
    ) as FunctionMessage[];
    return {
      ...assistMsg,
      functionMessages,
    };
  });
}
