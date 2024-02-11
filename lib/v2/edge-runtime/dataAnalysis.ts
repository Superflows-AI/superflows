import { ActionPlusApiInfo, ExecuteCode2Item, Organization } from "../../types";
import { Database } from "../../database.types";
import { getDataAnalysisPrompt } from "../prompts/dataAnalysis";
import { exponentialRetryWrapper, roughSizeOfObject } from "../../utils";
import { getLLMResponse } from "../../queryLLM";
import {
  ChatGPTMessage,
  FunctionMessage,
  GPTMessageInclSummary,
} from "../../models";
import { parseDataAnalysis } from "../prompts/dataAnalysis";
import {
  AssistantMessage,
  DebugMessage,
  ErrorMessage,
  GraphData,
  GraphMessage,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { LlmResponseCache } from "../../edge-runtime/llmResponseCache";
import { dataAnalysisActionName } from "../../builtinActions";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
);

export const defaultDataAnalysisParams = {
  max_tokens: 800,
  temperature: 0.1,
  top_k: 50,
  frequency_penalty: 1,
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

const defaultCodeGenModel = "Phind/Phind-CodeLlama-34B-v2";

export async function runDataAnalysis(
  instruction: string,
  filteredActions: ActionPlusApiInfo[],
  // fullChatHistory: GPTMessageInclSummary[],
  org: Pick<Organization, "id" | "name" | "description">,
  dbData: { conversationId: number; index: number },
  userDescription: string,
  // cache: LlmResponseCache,
  thoughts: string,
): Promise<ExecuteCode2Item[] | { error: string } | null> {
  const dataAnalysisPrompt = getDataAnalysisPrompt({
    question: instruction,
    selectedActions: filteredActions,
    orgInfo: org,
    userDescription,
    thoughts,
  });
  console.log("Data analysis prompt:", dataAnalysisPrompt);

  // let { llmResponse, graphData } = await cache.checkAnalyticsCache(
  //   dataAnalysisPrompt[1].content,
  //   org.id,
  //   fullChatHistory,
  //   supabase,
  // );
  // if (graphData) {
  //   await saveAnalyticsToDB(
  //     dataAnalysisPrompt[1].content,
  //     llmResponse,
  //     org.id,
  //     dbData,
  //   );
  //   return graphData as GraphData;
  // } else if (llmResponse) {
  //   let parsedCode = parseDataAnalysis(llmResponse);
  //   if (parsedCode === null || "error" in parsedCode) return parsedCode;
  //   await saveAnalyticsToDB(
  //     dataAnalysisPrompt[1].content,
  //     llmResponse,
  //     org.id,
  //     dbData,
  //   );
  //   const res = await supabase.functions.invoke("execute-code-2", {
  //     body: JSON.stringify({
  //       actionsPlusApi: filteredActions,
  //       org,
  //       code: parsedCode.code,
  //     }),
  //   });
  //   graphData = res.data;
  //   console.info("Data analysis response: ", graphData);
  //
  //   // Check data returned is of the correct format
  //   if (graphData && !("error" in graphData)) {
  //     const validGraphData =
  //       "type" in graphData &&
  //       "data" in graphData &&
  //       Array.isArray(graphData.data) &&
  //       graphData.data.every(
  //         (d: any) => typeof d === "object" && "x" in d && "y" in d,
  //       );
  //     if (!validGraphData) {
  //       console.info(
  //         "Data analysis response was not of the correct format. Returning null",
  //       );
  //       return { error: "Data analysis mode failed to output valid code" };
  //     }
  //   }
  //   return graphData as GraphData;
  // }

  // const graphDatas = (
  // await Promise.all(
  //   [1, 2, 3].map(async (i) => {
  let llmResponse = await exponentialRetryWrapper(
    getLLMResponse,
    [
      dataAnalysisPrompt,
      defaultDataAnalysisParams,
      process.env.CODE_GEN_LLM ?? defaultCodeGenModel,
    ],
    3,
  );
  console.info("\nRaw LLM response:", llmResponse);

  // Parse the result
  let parsedCode = parseDataAnalysis(llmResponse);
  if (parsedCode === null || "error" in parsedCode) return parsedCode;
  console.info("Parsed LLM response:", parsedCode.code);

  // Save to DB for possible reuse later
  await saveAnalyticsToDB(
    dataAnalysisPrompt[1].content,
    llmResponse,
    org.id,
    dbData,
  );

  // Send code to supabase edge function to execute
  // console.log(
  //   `Rough object sizes:\n${Object.entries(data).map(
  //     // @ts-ignore
  //     ([key, value]) => key + ": ~" + roughSizeOfObject(value) + " bytes",
  //   )}`,
  // );
  const res = await supabase.functions.invoke("execute-code-2", {
    body: JSON.stringify({
      actionsPlusApi: filteredActions,
      org,
      code: parsedCode.code,
    }),
  });
  const graphData = res.data as ExecuteCode2Item[];
  console.info("Data analysis response: ", graphData);
  return graphData;

  // // Check data returned is of the correct format
  // if (graphData && !("error" in graphData)) {
  //   const validGraphData =
  //     "type" in graphData &&
  //     "data" in graphData &&
  //     Array.isArray(graphData.data) &&
  //     graphData.data.every(
  //       (d: any) => typeof d === "object" && "x" in d && "y" in d,
  //     );
  //   if (!validGraphData) {
  //     console.info(
  //       "Data analysis response was not of the correct format. Returning null",
  //     );
  //     return { error: "Data analysis mode failed to output valid code" };
  //   }
  // }
  // return graphData as GraphData;
  // }),
  // )
  // ).filter(
  //   (out) =>
  //     out !== null &&
  //     out !== undefined &&
  //     !("error" in out) &&
  //     Array.isArray(out) &&
  //     out.length > 0,
  // );
  // if (graphDatas.length === 0) {
  //   return { error: "Data analysis mode failed to output valid code" };
  // }
  // return graphDatas[0] as GraphData;
}

export function convertToGraphData(
  executeCodeResponse: ExecuteCode2Item[],
): (GraphMessage | ErrorMessage | FunctionMessage)[] {
  // TODO: Do some more of the features I came up with
  let functionMessage: FunctionMessage = {
    role: "function",
    name: dataAnalysisActionName,
    content: executeCodeResponse
      .filter((m) => ["call", "log"].includes(m.type))
      .map((m) =>
        m.type === "log"
          ? m.args.message
          : // @ts-ignore
            `${m.args.name}(${Object.entries(m.args.params)
              .map(([key, value]) => `${key}=${value}`)
              .join(", ")})`,
      )
      .join("\n"),
  };

  const errorMessages: ErrorMessage[] = executeCodeResponse
    .filter((m) => m.type === "error")
    .map((e) => {
      // @ts-ignore
      return { role: "error", content: e.args.message };
    });

  if (!functionMessage.content && errorMessages.length === 0)
    throw new Error("No logs, errors or API calls from code execution");

  const plotMessages: GraphMessage[] = (
    executeCodeResponse.filter((g) => g.type === "plot") as Extract<
      ExecuteCode2Item,
      { type: "plot" }
    >[]
  ).map((g) => ({
    role: "graph",
    content: {
      type: g.args.type === "table" ? "bar" : g.args.type,
      data: g.args.data,
      xLabel: g.args.labels.x,
      yLabel: g.args.labels.y,
      graphTitle: g.args.title,
    },
  }));

  // We add a line saying "Plot generated successfully" to the bottom of the function message
  // if there are no log messages and no error messages
  if (
    executeCodeResponse.filter((m) => m.type === "log").length === 0 &&
    errorMessages.length === 0
  ) {
    functionMessage.content +=
      plotMessages.length > 0
        ? "\nPlot generated successfully"
        : "\nCode executed successfully";
  }

  return [functionMessage, ...plotMessages, ...errorMessages];
}
