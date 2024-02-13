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
  LoadingMessage,
  StreamingStepInput,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { LlmResponseCache } from "../../edge-runtime/llmResponseCache";
import { dataAnalysisActionName } from "../../builtinActions";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
);

export var defaultDataAnalysisParams = {
  max_tokens: 800,
  temperature: 0.1,
  top_k: 50,
  frequency_penalty: 1,
};

async function saveAnalyticsToDB(
  instructionMessage: string,
  llmResponse: string,
  orgId: number,
  dbData: { conversationId: number; index: number },
  bertie?: boolean,
  chosenActions?: string[],
): Promise<void> {
  const insertRes = await supabase.from("analytics_code_snippets").insert({
    instruction_message: instructionMessage, // The user message contents
    output: llmResponse,
    org_id: orgId,
    conversation_id: dbData.conversationId,
    conversation_index: dbData.index,
    is_bertie: bertie ?? false,
    chosen_actions: chosenActions ?? [],
  });
  if (insertRes.error) {
    console.error(
      "Failed to insert analytics code snippet to DB:",
      insertRes.error,
    );
  }
}

const defaultCodeGenModel = "Phind/Phind-CodeLlama-34B-v2";

const madeAMistake = {
  role: "loading",
  content: "Made a mistake. Retrying",
} as LoadingMessage;

const anotherMistake = {
  role: "loading",
  content: "Another mistake. Retrying 1 last time",
} as LoadingMessage;

export async function runDataAnalysis(
  instruction: string,
  filteredActions: ActionPlusApiInfo[],
  // fullChatHistory: GPTMessageInclSummary[],
  org: Pick<Organization, "id" | "name" | "description">,
  dbData: { conversationId: number; index: number },
  userDescription: string,
  cache: LlmResponseCache,
  thoughts: string,
  conversationId: number,
  streamInfo: (step: StreamingStepInput) => void,
): Promise<ExecuteCode2Item[] | { error: string } | null> {
  const dataAnalysisPrompt = getDataAnalysisPrompt({
    question: instruction,
    selectedActions: filteredActions,
    orgInfo: org,
    userDescription,
    thoughts,
  });
  console.log("Data analysis prompt:", dataAnalysisPrompt);

  let llmResponse = await cache.checkBertieAnalyticsCache(
    dataAnalysisPrompt[1].content,
    filteredActions.map((a) => a.name),
    org.id,
    supabase,
  );
  console.log("LLM response from cache:", llmResponse);

  let graphData: ExecuteCode2Item[] | null = null,
    nLoops = 0;
  while (graphData === null && nLoops < 3) {
    defaultDataAnalysisParams = {
      ...defaultDataAnalysisParams,
      temperature: nLoops === 0 ? 0.1 : 0.8,
    };
    // const graphDatas = (
    // await Promise.all(
    //   [1, 2, 3].map(async (i) => {
    if (!llmResponse) {
      llmResponse = await exponentialRetryWrapper(
        getLLMResponse,
        [
          dataAnalysisPrompt,
          defaultDataAnalysisParams,
          process.env.CODE_GEN_LLM ?? defaultCodeGenModel,
        ],
        3,
      );
      console.info("\nRaw LLM response:", llmResponse);
    }

    // Parse the result
    let parsedCode = parseDataAnalysis(llmResponse);
    if (parsedCode === null || "error" in parsedCode) return parsedCode;
    console.info("Parsed LLM response:", parsedCode.code);

    // Send code to supabase edge function to execute
    const res = await supabase.functions.invoke("execute-code-2", {
      body: JSON.stringify({
        actionsPlusApi: filteredActions,
        org,
        code: parsedCode.code,
      }),
    });
    nLoops += 1;

    const returnedData = res.data as ExecuteCode2Item[] | null;
    if (res.error) {
      console.error(
        `Error executing code for conversation ${conversationId}: ${res.error}`,
      );
      llmResponse = "";
      streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
      continue;
    }
    // If data field is null
    if (returnedData === null) {
      console.error(
        `Failed to write valid code for conversation ${conversationId} after 3 attempts`,
      );
      llmResponse = "";
      streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
      continue;
    }
    // If error messages in the data output
    const errorMessages = returnedData.filter((m) => m.type === "error");
    if (errorMessages.length > 0) {
      console.error(
        `Error executing code for conversation ${conversationId}:\n${errorMessages
          // @ts-ignore
          .map((m) => m.args.message)
          .join("\n")}`,
      );
      llmResponse = "";
      streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
      continue;
    }

    graphData = returnedData;
    console.info("Data analysis response: ", graphData);
  }
  if (graphData === null) {
    console.error(
      `Failed to execute code for conversation ${conversationId} after 3 attempts`,
    );
    return { error: "Failed to execute code" };
  }
  // Save to DB for possible reuse later
  await saveAnalyticsToDB(
    dataAnalysisPrompt[1].content,
    llmResponse,
    org.id,
    dbData,
    true,
    filteredActions.map((a) => a.name),
  );
  return graphData;
}

export function convertToGraphData(
  executeCodeResponse: ExecuteCode2Item[],
): (GraphMessage | FunctionMessage)[] {
  if (executeCodeResponse.length === 0) {
    throw new Error("No logs, errors or API calls from code execution");
  }
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

  const errorMessages: string[] = executeCodeResponse
    .filter((m) => m.type === "error")
    // @ts-ignore
    .map((e) => e.args.message);
  if (errorMessages.length > 0) {
    throw new Error(
      `Error messages found in code execution:\n${errorMessages.join("\n")}`,
    );
  }

  // Sometimes the AI will write a for loop and put the plot() call in the loop, leading to multiple plots which were
  // meant to be 1, each with 1 data point. We combine these out here
  let plotItems = executeCodeResponse.filter(
    (g) => g.type === "plot",
  ) as Extract<ExecuteCode2Item, { type: "plot" }>[];

  const originalDataLengths = plotItems.map((g) => g.args.data.length);
  plotItems = plotItems
    .map((g1, idx, items) => {
      const matchedPlotIdx = plotItems.findIndex((g2, i) => {
        if (i >= idx) return false;
        return (
          g1.args.labels?.x === g2.args.labels?.x &&
          g1.args.labels?.y === g2.args.labels?.y &&
          g1.args.data.length === 1 &&
          originalDataLengths[i] === 1
        );
      });
      if (matchedPlotIdx === -1) return g1;
      items[matchedPlotIdx].args.data.push(g1.args.data[0]);
      return undefined;
    })
    .filter((g) => g !== undefined) as Extract<
    ExecuteCode2Item,
    { type: "plot" }
  >[];

  const plotMessages = plotItems
    .map(
      (g) =>
        ({
          role: "graph",
          content: {
            type: g.args.data.length === 1 ? "value" : g.args.type,
            data: g.args.data,
            xLabel: g.args.labels?.x ?? "",
            yLabel: g.args.labels?.y ?? "",
            graphTitle: g.args.title,
          },
        } as GraphMessage),
    )
    // Remove empty plots
    .filter((g) => g.content.data.length > 0);

  // We add a line saying "Plot generated successfully" to the bottom of the function message
  // if there are no log messages and no error messages
  if (executeCodeResponse.filter((m) => m.type === "log").length === 0) {
    functionMessage.content += Boolean(functionMessage.content) ? "\n\n" : "";
    functionMessage.content +=
      plotMessages.length > 0
        ? "Plot generated successfully"
        : "Code executed successfully";
  }

  return [functionMessage, ...plotMessages];
}
