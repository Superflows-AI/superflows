import { Action, ActionPlusApiInfo, Organization } from "../types";
import { Database, Json } from "../database.types";
import {
  CalledAction,
  getDataAnalysisPrompt,
  getVarNames,
} from "../prompts/dataAnalysis";
import { exponentialRetryWrapper } from "../utils";
import { getLLMResponse } from "../queryLLM";
import { ChatGPTParams, FunctionMessage } from "../models";
import { parseDataAnalysisResponse } from "../parsers/dataAnalysis";
import { parseOutput } from "@superflows/chat-ui-react";
import {
  AssistantMessage,
  GraphData,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { dataAnalysisActionName } from "../builtinActions";
import { getAssistantFnMessagePairs } from "./angelaUtils";
import _ from "lodash";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
);

const defaultDataAnalysisParams: ChatGPTParams = {
  // This max tokens number is the maximum output tokens
  max_tokens: 1400,
  temperature: 0.5,
  top_p: 1,
  frequency_penalty: 0.1,
  presence_penalty: 0,
};

export async function runDataAnalysis(
  instruction: string,
  actions: ActionPlusApiInfo[],
  responseMessages: (FunctionMessage | AssistantMessage)[],
  org: Pick<Organization, "id" | "name" | "description">,
  dbData: { conversationId: number; index: number },
): Promise<GraphData | { error: string } | null> {
  // We want to get the output of all API calls since last user message from responseMessages:
  // First, split responseMessages into an array of pairs of assistant message & sequence of
  // function messages that follow it
  const assistantFnMessagePairs = getAssistantFnMessagePairs(responseMessages);
  // Then convert to 'CalledAction' format
  const calledActions = getCalledActions(assistantFnMessagePairs, actions);

  const varNames = getVarNames(calledActions);
  console.log("varNames", varNames);
  const dataAnalysisPrompt = getDataAnalysisPrompt(
    instruction,
    calledActions,
    varNames,
    org,
  );
  console.info("dataAnalysisPrompt", dataAnalysisPrompt);
  let llmResponse = await exponentialRetryWrapper(
    getLLMResponse,
    [dataAnalysisPrompt, defaultDataAnalysisParams, "gpt-4-0613"],
    3,
  );
  console.info("LLM response:", llmResponse);

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
  // Save to DB for debugging
  const insertRes = await supabase.from("analytics_code_snippets").insert({
    output: llmResponse,
    org_id: org.id,
    conversation_id: dbData.conversationId,
    conversation_index: dbData.index,
  });
  if (insertRes.error) {
    console.error(
      "Failed to insert analytics code snippet to DB:",
      insertRes.error,
    );
  }

  // Send code to supabase edge function to execute
  const data = Object.assign(
    {},
    ...calledActions.map((a, idx) => {
      return {
        [varNames[idx]]: a.output,
      };
    }),
  );
  const res = await supabase.functions.invoke("execute-code", {
    body: JSON.stringify({
      code: parsedCode.code,
      data: data,
    }),
  });
  console.info("Data analysis response: ", res.data);

  // Check data returned is of the correct format
  if (res.data && !("error" in res.data)) {
    const validGraphData =
      "type" in res.data &&
      "data" in res.data &&
      Array.isArray(res.data.data) &&
      res.data.data.every(
        (d: any) => typeof d === "object" && "x" in d && "y" in d,
      );
    if (!validGraphData) {
      console.info(
        "Data analysis response was not of the correct format. Returning null",
      );
      return { error: "Data analysis mode failed to output valid code" };
    }
  }
  return res.data;
}

function getCalledActions(
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
          // Remove the data analysis action
          .filter((a) => a.action.name !== dataAnalysisActionName)
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
