import { StreamingStepInput } from "@superflows/chat-ui-react/dist/src/lib/types";
import { exponentialRetryWrapper } from "../../utils";
import { streamResponseToUser } from "../../edge-runtime/angelaUtils";
import { streamLLMResponse } from "../../queryLLM";
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
import { streamWithEarlyTermination } from "./utils";

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
const FASTMODEL = "gpt-4o";

export type Route = "DOCS" | "DIRECT" | "CODE";

export type PreProcessOutType = {
  message: ChatGPTMessage | null;
  possible: boolean;
  clear: boolean;
  actions: ActionPlusApiInfo[];
  route: Route;
};

export async function LLMPreProcess(args: {
  userRequest: string;
  actions: ActionPlusApiInfo[];
  org: Pick<
    Organization,
    | "id"
    | "name"
    | "description"
    | "chat_to_docs_enabled"
    | "api_key"
    | "bertie_disable_direct"
  >;
  userDescription: string;
  conversationId: number;
  language: string | null;
  streamInfo: (step: StreamingStepInput) => void;
  currentHost: string;
}): Promise<PreProcessOutType> {
  // Cross-thread variables
  var streamedText = "",
    isPossible: boolean | null = null,
    isDocs: boolean | null = null;
  // Run filtering, clarification and routing prompts in parallel in Promise.all()
  const outs = await Promise.all([
    // Run filtering
    (async (): Promise<
      | {
          output: string;
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
        args.org,
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
            actions,
          };
        }

        // Stream response chunk by chunk
        rawOutput = await streamResponseToUser(res, args.streamInfo);
      }
      streamedText += rawOutput;

      return {
        output: rawOutput,
        actions,
      };
    })(),
    (async (): Promise<
      { output: string; parsed: ParsedClarificationOutput } | { error: string }
    > => {
      // Run clarification
      const prompt = clarificationPrompt(args);
      let loggedStreamingClarification = false;
      console.log(`Clarification prompt:`, JSON.stringify(prompt));
      const rawOutput = await streamWithEarlyTermination(
        prompt,
        clarificationLLMParams,
        clarificationModel,
        () => false,
        (rawOutput: string) => {
          if (isPossible && isDocs === false) {
            if (loggedStreamingClarification) {
              console.log(
                "isPossible is true and isDocs is false, so now streaming clarification!",
              );
              loggedStreamingClarification = true;
            }
            const newText = parseClarificationOutput(
              rawOutput,
            ).tellUser.replace(streamedText, "");
            args.streamInfo({ role: "assistant", content: newText });
            streamedText += newText;
          }
        },
        "Clarification",
        "Thoughts:\n1. ",
        {
          FUNCTIONS: "operations",
          "FUNCTION ": "operation ",
        },
      );
      if (rawOutput === null) {
        return { error: "Call to Language Model API failed" };
      }
      return {
        output: rawOutput.transformed,
        parsed: parseClarificationOutput(rawOutput.transformed),
      };
    })(),
    // Run routing - should the request go to DOCS, DIRECT, or CODE?
    (async (): Promise<Route | { error: string }> => {
      if (!args.org.chat_to_docs_enabled && args.org.bertie_disable_direct) {
        return "CODE";
      }
      const prompt = routingPrompt({
        ...args,
        actions: args.actions.filter((a) => a.name !== searchDocsActionName),
        isAnthropic: true,
      });
      console.log(`Routing prompt:`, JSON.stringify(prompt));
      let rawOutput = await streamWithEarlyTermination(
        prompt,
        routingLLMParams,
        routingModel,
        (rawOutput: string) =>
          isPossible === false || parseRoutingOutput(rawOutput, true) !== null,
        () => {},
        "Routing",
        "Thoughts:\n1. ",
      );
      if (rawOutput === null) {
        return { error: "Call to Language Model API failed" };
      }
      const parsedOutput = parseRoutingOutput(rawOutput.transformed, false);
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
  if (
    // If routing failed, use the output from filtering & don't remove the search docs action
    (typeof outs[2] === "object" && "error" in outs[2]) ||
    // If no actions are possible, user has already been told this is impossible
    actions.length === 0
  ) {
    route = "DIRECT";
  } else {
    route = outs[2] as Route;
    if (route !== "DOCS") {
      actions = actions.filter((a) => a.name !== searchDocsActionName);
    }
  }

  const possible = "error" in outs[0] || outs[0].actions.length > 0;
  const clear = "error" in outs[1] || outs[1].parsed.clear;
  const out: PreProcessOutType = {
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
    actions,
    route,
  };
  console.log("Clarification output:", {
    ...out,
    actions: out.actions.map((a) => a.name),
  });
  return out;
}
