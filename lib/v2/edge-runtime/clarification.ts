import { StreamingStepInput } from "@superflows/chat-ui-react/dist/src/lib/types";
import { exponentialRetryWrapper } from "../../utils";
import {
  parseAnthropicStreamedData,
  parseGPTStreamedData,
} from "../../parsers/parsers";
import {
  replacePlaceholdersDuringStreaming,
  streamResponseToUser,
} from "../../edge-runtime/angelaUtils";
import {
  GPTChatFormatToClaudeInstant,
  streamLLMResponse,
} from "../../queryLLM";
import {
  impossibleExplanation,
  isUserRequestPossibleLLMParams,
  isUserRequestPossiblePrompt,
  ParsedRequestPossibleOutput,
  parseRequestPossibleOutput,
} from "../prompts/isUserRequestPossible";
import { ChatGPTMessage } from "../../models";
import {
  clarificationLLMParams,
  clarificationPrompt,
  parseClarificationOutput,
  ParsedClarificationOutput,
} from "../prompts/clarificationPrompt";
import { Action, Organization } from "../../types";

if (!process.env.CLARIFICATION_MODEL) {
  throw new Error("CLARIFICATION_MODEL env var is not defined");
}
const clarificationModel = process.env.CLARIFICATION_MODEL;

if (!process.env.IS_USER_REQUEST_POSSIBLE_MODEL) {
  throw new Error("IS_USER_REQUEST_POSSIBLE_MODEL env var is not defined");
}
const isUserRequestPossibleModel = process.env.IS_USER_REQUEST_POSSIBLE_MODEL;

export async function runClarificationAndStreamResponse(args: {
  userRequest: string;
  selectedActions: Action[];
  orgInfo: Pick<Organization, "name" | "description">;
  userDescription: string;
  conversationId: number;
  streamInfo: (step: StreamingStepInput) => void;
}): Promise<{
  message: ChatGPTMessage | null;
  possible: boolean;
  clear: boolean;
}> {
  const placeholderToOriginalMap = {
    FUNCTIONS: "functions",
    FUNCTION: "function",
  };

  var streamedText = "",
    isPossible = null;

  // Run isPossible and clarification prompts in parallel in Promise.all()
  const outs = await Promise.all([
    // Run isPossible
    (async (): Promise<
      | { output: string; parsed: ParsedRequestPossibleOutput }
      | { error: string }
    > => {
      const prompt = isUserRequestPossiblePrompt(args);
      console.log("Prompt for isUserRequestPossible: ", prompt[0].content);
      const res = await exponentialRetryWrapper(
        streamLLMResponse,
        [prompt, isUserRequestPossibleLLMParams, isUserRequestPossibleModel],
        3,
      );
      if (res === null || "message" in res) {
        console.error(
          `OpenAI API call failed for conversation with id: ${
            args.conversationId
          }. The error was: ${JSON.stringify(res)}`,
        );
        return { error: "Call to Language Model API failed" };
      }

      // Stream response chunk by chunk
      const decoder = new TextDecoder();
      const reader = res.getReader();
      let parsedOutput: ParsedRequestPossibleOutput;

      let rawOutput = "",
        done = false,
        incompleteChunk = "",
        first = true;
      // Below buffer is used to store the partial value of a variable if it's split across multiple chunks
      let placeholderBuffer = "";

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
          //  so FUNCTIONS is replaced by the actual URL
          ({ content, placeholderBuffer } = replacePlaceholdersDuringStreaming(
            content,
            placeholderBuffer,
            placeholderToOriginalMap,
          ));
          if (content) {
            parsedOutput = parseRequestPossibleOutput(rawOutput);
            // If the output contains a "Tell user:" section, it's impossible. Also stream the reason to the user
            if (isPossible === null && parsedOutput.tellUser) {
              console.log("Tell user is present, so now streaming tellUser!");
              isPossible = false;
            }
            if (isPossible === false) {
              args.streamInfo({ role: "assistant", content });
              streamedText += content;
            }
          }
        }
        done = contentItems.done;
      }
      // If not possible, yet no explanation of why, we do _another_ stream to get the explanation
      if (isPossible === false && streamedText === "") {
        console.log("No tell user section, so now streaming explanation!");
        const prompt = impossibleExplanation({
          thoughts: parsedOutput!.thoughts,
          ...args,
        });
        console.log("Prompt for impossibleExplanation: ", prompt[0].content);
        const res = await exponentialRetryWrapper(
          streamLLMResponse,
          [prompt, { temperature: 0.6, max_tokens: 300 }, "gpt-3.5-turbo"],
          3,
        );
        if (res === null || "message" in res) {
          console.error(
            `OpenAI API call failed for conversation with id: ${
              args.conversationId
            }. The error was: ${JSON.stringify(res)}`,
          );
          args.streamInfo({
            role: "error",
            content: "Call to Language Model API failed",
          });
          return {
            output: rawOutput,
            parsed: parseRequestPossibleOutput(rawOutput),
          };
        }

        // Stream response chunk by chunk
        rawOutput += `\n\nTell user:\n${await streamResponseToUser(
          res,
          args.streamInfo,
        )}`;
      }

      return {
        output: rawOutput,
        parsed: parseRequestPossibleOutput(rawOutput),
      };
    })(),
    (async (): Promise<
      { output: string; parsed: ParsedClarificationOutput } | { error: string }
    > => {
      // Run clarification
      const prompt = clarificationPrompt(args);
      console.log(
        "Prompt for clarification: ",
        GPTChatFormatToClaudeInstant(prompt).slice(1500),
      );
      const res = await exponentialRetryWrapper(
        streamLLMResponse,
        [prompt, clarificationLLMParams, clarificationModel],
        3,
      );
      if (res === null || "message" in res) {
        console.error(
          `Anthropic API call failed for conversation with id: ${
            args.conversationId
          }. The error was: ${JSON.stringify(res)}`,
        );
        return { error: "Call to Language Model API failed" };
      }

      // Stream response chunk by chunk
      const decoder = new TextDecoder();
      const reader = res.getReader();

      let rawOutput = "Thoughts:\n1. ",
        done = false,
        incompleteChunk = "",
        first = true;
      let parsedOutput: ParsedClarificationOutput;
      // Below buffer is used to store the partial value of a variable if it's split across multiple chunks
      let placeholderBuffer = "";

      // https://web.dev/streams/#asynchronous-iteration
      while (!done) {
        const { value, done: doneReading } = await reader.read();

        done = doneReading;
        if (done) break;

        const contentItems = parseAnthropicStreamedData(
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
          ({ content, placeholderBuffer } = replacePlaceholdersDuringStreaming(
            content,
            placeholderBuffer,
            placeholderToOriginalMap,
          ));

          if (content) {
            parsedOutput = parseClarificationOutput(rawOutput);
            if (isPossible) {
              console.log(
                "isPossible is true, so now streaming clarification!",
              );
              const newText = parsedOutput.tellUser.replace(streamedText, "");
              args.streamInfo({ role: "assistant", content: newText });
              streamedText += newText;
            }
          }
        }
        done = contentItems.done;
      }
      return { output: rawOutput, parsed: parseClarificationOutput(rawOutput) };
    })(),
  ]);
  console.log("isPossible and clarification outputs", outs);

  // If clarification finishes before isPossible
  if (!("error" in outs[1]) && !outs[1].parsed.clear && !streamedText) {
    console.log("Anthropic beat GPT!");
    streamedText = outs[1].parsed.tellUser;
    args.streamInfo({ role: "assistant", content: outs[1].parsed.tellUser });
  }

  // TODO: Add caching of isPossible and clarification outputs
  const possible = "error" in outs[0] || outs[0].parsed.possible;
  const clear = "error" in outs[1] || outs[1].parsed.clear;
  return {
    message:
      !possible && !("error" in outs[0]) && outs[0].parsed.tellUser
        ? { role: "assistant", content: outs[0].output }
        : !clear && !("error" in outs[1]) && outs[1].parsed.tellUser
        ? { role: "assistant", content: outs[1].output }
        : null,
    possible,
    clear,
  };
}
