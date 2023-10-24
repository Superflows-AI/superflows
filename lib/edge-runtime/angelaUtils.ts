import { FunctionCall } from "@superflows/chat-ui-react";
import { GPTMessageInclSummary, StreamingStepInput } from "../models";
import { swapKeysValues } from "../utils";
import { parseGPTStreamedData } from "../parsers/parsers";

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
  const fullPlaceholderMatch = /(URL|ID)[1-9]+/g.exec(content);
  if (fullPlaceholderMatch !== null) {
    console.log("Full match:", fullPlaceholderMatch);
    // Full match - e.g. URL6 or ID2. Time to replace it with the actual value
    const matchedString = fullPlaceholderMatch[0];
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
  const partialPlaceholderMatch = /(UR?L?|ID?)$/g.exec(content);
  if (partialPlaceholderMatch !== null) {
    placeholderBuffer = content;
    content = "";
  }
  return { content, placeholderBuffer };
}

export function stripExampleFunctions(rawOutput: string): string {
  /**
   * Often if the LLM doesn't output any useful commands, it will output
   * the functions given as examples in the prompt (e.g. FUNCTION_1 and FUNCTION_2)
   * manually strip this out of the response.
   */

  const functionPattern = /(FUNCTION_1\([^\)]*\)|FUNCTION_2\([^\)]*\))/g;
  return rawOutput.replace(functionPattern, "");
}
