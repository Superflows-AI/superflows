import { Action, ActionPlusApiInfo, Organization } from "../types";
import { Database, Json } from "../database.types";
import {
  CalledAction,
  getDataAnalysisPrompt,
  getVarNames,
} from "../prompts/dataAnalysis";
import { exponentialRetryWrapper, roughSizeOfObject } from "../utils";
import { getLLMResponse } from "../queryLLM";
import {
  ChatGPTParams,
  FunctionMessage,
  GPTMessageInclSummary,
} from "../models";
import { parseDataAnalysisResponse } from "../parsers/dataAnalysis";
import { parseOutput } from "@superflows/chat-ui-react";
import {
  AssistantMessage,
  GraphData,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { dataAnalysisActionName } from "../builtinActions";
import { getAssistantFnMessagePairs } from "./angelaUtils";
import _, { findLastIndex } from "lodash";
import { LlmResponseCache } from "./llmResponseCache";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
  {
    auth: {
      persistSession: false,
    },
  },
);

export const defaultDataAnalysisParams: ChatGPTParams = {
  // This max tokens number is the maximum output tokens
  max_tokens: 1400,
  temperature: 0.5,
  top_p: 1,
  frequency_penalty: 0.1,
  presence_penalty: 0,
};

type NonUserMessage = FunctionMessage | AssistantMessage;

async function saveAnalyticsToDB(
  instructionMessage: string,
  llmResponse: string,
  orgId: number,
  dbData: { conversationId: number; index: number },
) {
  const insertRes = await supabase.from("analytics_code_snippets").insert({
    // The user message contents
    instruction_message: instructionMessage,
    output: llmResponse,
    org_id: orgId,
    conversation_id: dbData.conversationId,
    conversation_index: dbData.index,
  });
  if (insertRes.error) {
    console.error(
      "Failed to insert analytics code snippet to DB:",
      insertRes.error,
    );
  }
}

export async function runDataAnalysis(
  instruction: string,
  actions: ActionPlusApiInfo[],
  fullChatHistory: GPTMessageInclSummary[],
  org: Pick<Organization, "id" | "name" | "description">,
  dbData: { conversationId: number; index: number },
  cache: LlmResponseCache,
): Promise<GraphData | { error: string } | null> {
  // Step by step, go back through user-response sequences until we find the last function
  // message that's not a data analysis call
  const relevantMessages = getRelevantMessages(fullChatHistory);
  if (!relevantMessages) {
    console.info("No relevant messages found");
    return {
      error: "Cannot perform data analysis: no APIs called",
    };
  }

  // We want to get the output of all API calls since last user message from responseMessages:
  // First, split responseMessages into an array of pairs of assistant message & sequence of
  // function messages that follow it
  const assistantFnMessagePairs = getAssistantFnMessagePairs(relevantMessages);

  // Then convert to 'CalledAction' format
  const calledActions = getCalledActions(assistantFnMessagePairs, actions);
  const varNames = getVarNames(calledActions);
  console.log(
    "varNames",
    varNames,
    "number of calledActions:",
    calledActions.length,
  );
  const dataAnalysisPrompt = getDataAnalysisPrompt(
    instruction,
    calledActions,
    varNames,
    org,
  );

  let { llmResponse, graphData } = await cache.checkAnalyticsCache(
    dataAnalysisPrompt[1].content,
    org.id,
    fullChatHistory,
    supabase,
  );
  if (graphData) {
    await saveAnalyticsToDB(
      dataAnalysisPrompt[1].content,
      llmResponse,
      org.id,
      dbData,
    );
    return graphData as GraphData;
  }

  if (!llmResponse) {
    console.info(`dataAnalysisPrompt: SYSTEM
---
${dataAnalysisPrompt[0].content}

USER
---
${dataAnalysisPrompt[1].content}`);
    llmResponse = await exponentialRetryWrapper(
      getLLMResponse,
      [dataAnalysisPrompt, defaultDataAnalysisParams, "gpt-4-0613"],
      3,
    );
    console.info("LLM response:", llmResponse);
  }

  // Parse the result
  let parsedCode = parseDataAnalysisResponse(llmResponse);
  // Retry strategy - if it outputs something that isn't valid, try again once with same prompt
  if (!parsedCode) {
    console.info("Failed to parse data analysis response. Trying again...");
    llmResponse = await exponentialRetryWrapper(
      getLLMResponse,
      [dataAnalysisPrompt, defaultDataAnalysisParams, "gpt-4-0613"],
      3,
    );
    parsedCode = parseDataAnalysisResponse(llmResponse);
    if (!parsedCode) {
      console.info("Failed to parse data analysis response on the 2nd time!");
      return { error: "Data analysis mode failed to output valid code" };
    }
  }
  if ("error" in parsedCode) return parsedCode;

  // Save to DB for possible reuse later
  await saveAnalyticsToDB(
    dataAnalysisPrompt[1].content,
    llmResponse,
    org.id,
    dbData,
  );

  // Send code to supabase edge function to execute
  const data = Object.assign(
    {},
    ...calledActions.map((a, idx) => {
      return {
        [varNames[idx]]: a.output,
      };
    }),
  );

  console.log(
    `Rough object sizes:\n${Object.entries(data).map(
      // @ts-ignore
      ([key, value]) => key + ": ~" + roughSizeOfObject(value) + " bytes",
    )}`,
  );
  const res = await supabase.functions.invoke("execute-code", {
    body: JSON.stringify({
      code: parsedCode.code,
      data,
    }),
  });
  graphData = res.data;
  console.info("Data analysis response: ", graphData);

  // Check data returned is of the correct format
  if (graphData && !("error" in graphData)) {
    const validGraphData =
      "type" in graphData &&
      "data" in graphData &&
      Array.isArray(graphData.data) &&
      graphData.data.every(
        (d: any) => typeof d === "object" && "x" in d && "y" in d,
      );
    if (!validGraphData) {
      console.info(
        "Data analysis response was not of the correct format. Returning null",
      );
      return { error: "Data analysis mode failed to output valid code" };
    }
  }
  return graphData as GraphData;
}

export function getCalledActions(
  assistantFnMessagePairs: (AssistantMessage & {
    functionMessages: FunctionMessage[];
  })[],
  actions: Action[],
): CalledAction[] {
  const calledActions = assistantFnMessagePairs
    .map((pair) => {
      const parsedOutput = parseOutput(pair.content);

      // TODO: Remove API calls since last successful data analysis call
      return (
        parsedOutput.commands
          // Remove the data analysis action
          .filter((command) => command?.name !== dataAnalysisActionName)
          .map((command, idx) => {
            let output: Json = pair.functionMessages[idx]?.content;
            try {
              output = JSON.parse(pair.functionMessages[idx]?.content);
            } catch {}
            return {
              action: actions.find((a) => a.name === command.name)!,
              args: command.args,
              output,
            };
          })
      );
    })
    .flat();

  return calledActions
    .reverse()
    .filter((a, idx) => {
      // Keep most recent call if identical calls are made >once
      const earliestCall =
        calledActions.findIndex(
          (otherAction) =>
            otherAction.action.name === a.action.name &&
            _.isEqual(otherAction.args, a.args),
        ) ?? idx;
      return idx === earliestCall;
      // Reversed it earlier, so need to re-reverse
    })
    .reverse();
}

export function getRelevantMessages(
  chatHistory: GPTMessageInclSummary[],
): NonUserMessage[] | null {
  /** A semi-common error the LLM makes is not including the API calls required for
   * data analysis in the same output as the data analysis call. So if there are no
   * API calls we check previous query-response sections in the chat history. **/
  let lastUserIdx = -1;

  for (let i = 0; i < chatHistory.length; i++) {
    lastUserIdx = findLastIndex(
      chatHistory.slice(0, lastUserIdx),
      (m) => m.role === "user",
    );
    const relevantMessages = chatHistory
      .slice(lastUserIdx)
      .filter(
        (m) =>
          m.role !== "user" &&
          (m.role !== "function" || m.name !== dataAnalysisActionName),
      ) as NonUserMessage[];
    if (relevantMessages.filter((m) => m.role === "function").length > 0) {
      console.log("Found non-data analysis function call");
      return relevantMessages;
    } else if (lastUserIdx === 0) {
      // Terminate early if you reach the start of the chat history
      return null;
    }
  }
  return null;
}
