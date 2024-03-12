import { StreamingStepInput } from "@superflows/chat-ui-react/dist/src/lib/types";
import { exponentialRetryWrapper } from "../../utils";
import { parseAnthropicStreamedData } from "../../parsers/parsers";
import {
  replacePlaceholdersDuringStreaming,
  streamResponseToUser,
} from "../../edge-runtime/angelaUtils";
import {
  GPTChatFormatToClaudeInstant,
  streamLLMResponse,
} from "../../queryLLM";
import { ChatGPTMessage } from "../../models";
import {
  clarificationLLMParams,
  clarificationPrompt,
  parseClarificationOutput,
  ParsedClarificationOutput,
} from "../prompts/clarification";
import { ActionPlusApiInfo, Organization } from "../../types";
import { filterActions } from "./filterActions";
import { explainNotPossiblePrompt } from "../prompts/explainNotPossible";
import {
  parseRoutingOutput,
  routingLLMParams,
  routingPrompt,
} from "../prompts/routing";
import {
  getSearchDocsAction,
  searchDocsActionName,
} from "../../builtinActions";

if (!process.env.CLARIFICATION_MODEL) {
  throw new Error("CLARIFICATION_MODEL env var is not defined");
}
const clarificationModel = process.env.CLARIFICATION_MODEL;

if (!process.env.ROUTING_MODEL) {
  throw new Error("ROUTING_MODEL env var is not defined");
}
const routingModel = process.env.ROUTING_MODEL;

if (!process.env.IS_USER_REQUEST_POSSIBLE_MODEL) {
  throw new Error("IS_USER_REQUEST_POSSIBLE_MODEL env var is not defined");
}
const FASTMODEL = "ft:gpt-3.5-turbo-0613:superflows:general-2:81WtjDqY";

export type Route = "DOCS" | "DIRECT" | "CODE";

export async function LLMPreProcess(args: {
  userRequest: string;
  actions: ActionPlusApiInfo[];
  org: Pick<
    Organization,
    "id" | "name" | "description" | "chat_to_docs_enabled" | "api_key"
  >;
  userDescription: string;
  conversationId: number;
  language: string | null;
  streamInfo: (step: StreamingStepInput) => void;
  currentHost: string;
}): Promise<{
  message: ChatGPTMessage | null;
  possible: boolean;
  clear: boolean;
  thoughts: string[];
  actions: ActionPlusApiInfo[];
  route: Route;
}> {
  // Cross-thread variables
  var streamedText = "",
    isPossible = null,
    isDocs = null;
  const startTime = Date.now();
  // Run filtering, clarification and routing prompts in parallel in Promise.all()
  const outs = await Promise.all([
    // Run filtering
    (async (): Promise<
      | {
          output: string;
          // parsed: ParsedRequestPossibleOutput;
          thoughts: string[];
          actions: ActionPlusApiInfo[];
        }
      | { error: string }
    > => {
      // This adds the 'Search docs' action if it's enabled
      const localActions = args.org.chat_to_docs_enabled
        ? [getSearchDocsAction(args.org, args.currentHost), ...args.actions]
        : args.actions;
      const { thoughts, actions } = await filterActions(
        args.userRequest,
        localActions,
        args.org.name,
        FASTMODEL,
      );
      console.log(
        "SETTING isPossible, filtering output",
        actions.map((a) => a.name),
      );
      isPossible = actions.length > 0;

      // If not possible, yet no explanation of why, we do _another_ stream to get the explanation
      // if (isPossible === false && streamedText === "") {
      let rawOutput = "";
      if (actions.length === 0) {
        console.log("No tell user section, so now streaming explanation!");
        const prompt = explainNotPossiblePrompt({
          thoughts: thoughts[0],
          ...args,
        });
        console.log("Prompt for explainNotPossible: ", prompt[0].content);
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
            output: "",
            thoughts,
            actions,
          };
        }

        // Stream response chunk by chunk
        rawOutput = await streamResponseToUser(res, args.streamInfo);
      }
      streamedText += rawOutput;

      return {
        output: rawOutput,
        thoughts,
        actions,
      };
    })(),
    (async (): Promise<
      { output: string; parsed: ParsedClarificationOutput } | { error: string }
    > => {
      // Run clarification
      const prompt = clarificationPrompt(args);
      console.log(
        "Prompt for clarification: ",
        JSON.stringify(GPTChatFormatToClaudeInstant(prompt).slice(1500)),
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
      const placeholderToOriginalMap = {
        FUNCTIONS: "operations",
        FUNCTION: "operation",
      };

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
            if (isPossible && isDocs === false) {
              console.log(
                "isPossible is true and isDocs is false, so now streaming clarification!",
              );
              const newText = parsedOutput.tellUser.replace(streamedText, "");
              args.streamInfo({ role: "assistant", content: newText });
              streamedText += newText;
            }
          }
        }
        done = contentItems.done;
      }
      console.log(
        `Clarification output after ${Date.now() - startTime}ms:\n${rawOutput}`,
      );
      return { output: rawOutput, parsed: parseClarificationOutput(rawOutput) };
    })(),
    // Run routing - should the request go to DOCS, DIRECT, or CODE?
    (async (): Promise<Route | { error: string }> => {
      const prompt = routingPrompt({
        ...args,
        actions: args.actions.filter((a) => a.name !== searchDocsActionName),
        isAnthropic: true,
      });
      console.log(
        "Prompt for routing: ",
        JSON.stringify(GPTChatFormatToClaudeInstant(prompt)),
      );
      let res = await exponentialRetryWrapper(
        streamLLMResponse,
        [prompt, routingLLMParams, routingModel],
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
      let parsedOutput: { thoughts: string; choice: string } | null = null;

      // https://web.dev/streams/#asynchronous-iteration
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        if (isPossible === false) {
          console.log("CANCELLING BECAUSE ISPOSSIBLE IS FALSE");
          // When filtering finishes and says this is impossible before this completes, we cancel the stream
          reader.releaseLock();
          await res.cancel();
          break;
        }

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

          if (content) {
            parsedOutput = parseRoutingOutput(rawOutput, true);
            if (parsedOutput !== null) {
              console.log(
                `Routing output after ${
                  Date.now() - startTime
                }ms:\n${rawOutput}`,
              );
              console.log("Parsed output", parsedOutput);
              // Cancel stream
              reader.releaseLock();
              await res.cancel();
              if (["DIRECT", "DOCS", "CODE"].includes(parsedOutput.choice)) {
                isDocs = parsedOutput.choice === "DOCS";
                return parsedOutput.choice as Route;
              } else {
                // What if it returns an invalid answer?
                console.error(
                  `Routing output is not valid: ${JSON.stringify(
                    parsedOutput,
                  )}`,
                );
                return { error: "Routing output is not valid" };
              }
            }
          }
        }
        done = contentItems.done;
      }
      console.log(
        `Routing output after ${Date.now() - startTime}ms:\n${rawOutput}`,
      );
      parsedOutput = parseRoutingOutput(rawOutput, false);
      if (
        parsedOutput !== null &&
        ["DIRECT", "DOCS", "CODE"].includes(parsedOutput.choice)
      ) {
        isDocs = parsedOutput.choice === "DOCS";
        return parsedOutput.choice as Route;
      }
      console.error(
        `Routing output is not valid: ${JSON.stringify(parsedOutput)}`,
      );
      return { error: "Invalid routing output" };
    })(),
  ]);

  // If clarification finishes before isPossible
  if (
    !("error" in outs[1]) &&
    !outs[1].parsed.clear &&
    !streamedText &&
    isDocs === false
  ) {
    console.log(
      "Streaming full clarification output because it is possible, unclear and not a docs question.",
    );
    streamedText = outs[1].parsed.tellUser;
    args.streamInfo({ role: "assistant", content: outs[1].parsed.tellUser });
  }

  let actions = "error" in outs[0] ? [] : outs[0].actions;
  let route: Route;
  if (typeof outs[2] === "object" && "error" in outs[2]) {
    // If routing failed, use the output from filtering & don't remove the search docs action
    route = "DIRECT";
  } else {
    route = outs[2] as Route;
    if (route !== "DOCS") {
      actions = actions.filter((a) => a.name !== searchDocsActionName);
    }
  }

  // TODO: Add caching of filtering, clarification and routing outputs
  const possible = "error" in outs[0] || outs[0].actions.length > 0;
  const clear = "error" in outs[1] || outs[1].parsed.clear;
  return {
    message:
      !possible && !("error" in outs[0]) && outs[0].output
        ? {
            role: "assistant",
            content: outs[0].output.replace(/Possible: False\n\n/, ""),
          }
        : !clear && !("error" in outs[1]) && outs[1].parsed.tellUser
        ? {
            role: "assistant",
            content: outs[1].output.replace(/Clear: False\n\n/, ""),
          }
        : null,
    possible,
    clear,
    thoughts: "error" in outs[0] ? [] : outs[0].thoughts,
    actions,
    route,
  };
}
