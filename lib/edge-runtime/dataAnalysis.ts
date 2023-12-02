import { ActionPlusApiInfo, Organization } from "../types";
import { Database, Json } from "../database.types";
import { getDataAnalysisPrompt, getVarNames } from "../prompts/dataAnalysis";
import { exponentialRetryWrapper } from "../utils";
import { getLLMResponse } from "../queryLLM";
import { ChatGPTParams, FunctionMessageInclSummary } from "../models";
import { parseDataAnalysisResponse } from "../parsers/dataAnalysis";
import { FunctionCall } from "@superflows/chat-ui-react";
import { GraphData } from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { dataAnalysisActionName } from "../builtinActions";

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
  commands: FunctionCall[],
  actions: ActionPlusApiInfo[],
  functionMessages: Record<string, FunctionMessageInclSummary>,
  org: Pick<Organization, "name" | "description">,
): Promise<GraphData | { error: string } | null> {
  console.log({
    instruction,
    commands,
    actions,
    functionMessages,
    org,
  });
  // Make data analysis call
  const actionData = commands
    .map((command, idx) => {
      console.log(idx, command.name);
      let output: Json = functionMessages[idx]?.content;
      try {
        output = JSON.parse(functionMessages[idx]?.content);
      } catch {}
      return {
        action: actions.find((a) => a.name === command.name)!,
        args: command.args,
        output,
      };
    })
    // Remove the data analysis action
    .filter((a) => a.action.name !== dataAnalysisActionName);

  console.log("actionData", actionData);

  const varNames = getVarNames(actionData);
  console.log("varNames", varNames);
  const dataAnalysisPrompt = getDataAnalysisPrompt(
    instruction,
    actionData,
    varNames,
    org,
  );
  console.log("dataAnalysisPrompt", dataAnalysisPrompt);
  let llmResponse = await exponentialRetryWrapper(
    getLLMResponse,
    [dataAnalysisPrompt, defaultDataAnalysisParams, "gpt-4-0613"],
    3,
  );
  console.log("LLM response:", llmResponse);

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

  // Send code to supabase edge function to execute
  const data = Object.assign(
    {},
    ...actionData.map((a, idx) => {
      return {
        [varNames[idx]]: a.output,
      };
    }),
  );
  console.log("Data", data);
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
