import { ChatGPTMessage, ChatGPTParams } from "../../models";
import { exponentialRetryWrapper } from "../../utils";
import { streamLLMResponse } from "../../queryLLM";
import {
  parseLegacyAnthropicStreamedData,
  parseGPTStreamedData,
  parseClaude3StreamedData,
} from "../../parsers/parsers";
import { replacePlaceholdersDuringStreaming } from "../../edge-runtime/angelaUtils";

export async function streamWithEarlyTermination(
  prompt: ChatGPTMessage[],
  params: ChatGPTParams,
  model: string,
  shouldTerminate: (rawOutput: string) => boolean,
  handleStreamingToUser: (transformed: string, rawOutput: string) => void,
  promptName: string, // For logs
  initialRawOutput: string = "",
  placeholderToOriginalMap: Record<string, string> = {},
): Promise<{ raw: string; transformed: string } | null> {
  /** IMPORTANT: The function outputs the raw message, the handle streaming
   * function has both raw and transformed outputs.
   * null output means there's been an error **/
  const startTime = Date.now();
  let res = await exponentialRetryWrapper(
    streamLLMResponse,
    [prompt, params, model],
    3,
  );
  if (res === null || "message" in res) {
    console.error(
      `${promptName} LLM API call failed. The error was: ${JSON.stringify(
        res,
      )}`,
    );
    return null;
  }

  // Stream response chunk by chunk
  const decoder = new TextDecoder();
  const reader = res.getReader();

  let rawOutput = initialRawOutput,
    transformedOutput = initialRawOutput,
    done = false,
    incompleteChunk = "",
    first = true;
  let placeholderBuffer = "";
  const usingPlaceholderMap = Object.keys(placeholderToOriginalMap).length > 0;
  const parseChunk = model.includes("claude-3")
    ? parseClaude3StreamedData
    : model.startsWith("anthropic")
    ? parseLegacyAnthropicStreamedData
    : parseGPTStreamedData;

  // https://web.dev/streams/#asynchronous-iteration
  while (!done) {
    const { value, done: doneReading } = await reader.read();

    done = doneReading;
    if (done) break;
    const contentItems = parseChunk(incompleteChunk + decoder.decode(value));

    incompleteChunk = contentItems.incompleteChunk ?? "";

    for (let content of contentItems.completeChunks) {
      // Sometimes starts with a newline
      if (first) {
        content = content.trimStart();
        first = false;
      }

      rawOutput += content;
      if (usingPlaceholderMap) {
        // Replace variables with their real values so URL1 is replaced by the actual URL
        ({ content, placeholderBuffer } = replacePlaceholdersDuringStreaming(
          content,
          placeholderBuffer,
          placeholderToOriginalMap,
        ));
      }
      transformedOutput += content;

      if (content) {
        handleStreamingToUser(transformedOutput, rawOutput);
        if (shouldTerminate(rawOutput)) {
          console.log(
            `${promptName} LLM stream completed in ${
              (Date.now() - startTime) / 1000
            }s:\n${rawOutput}`,
          );
          // Cancel stream
          reader.releaseLock();
          await res.cancel();
          return { raw: rawOutput, transformed: transformedOutput };
        }
      }
    }
    done = contentItems.done;
  }
  return { raw: rawOutput, transformed: transformedOutput };
}
