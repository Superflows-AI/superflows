import {
  ActionPlusApiInfo,
  BertieGraphData,
  ExecuteCode2Item,
  Organization,
} from "../../types";
import { Database } from "../../database.types";
import { getDataAnalysisPrompt } from "../prompts/dataAnalysis";
import { exponentialRetryWrapper } from "../../utils";
import { getLLMResponse, GPTChatFormatToPhind } from "../../queryLLM";
import { FunctionMessage } from "../../models";
import { parseDataAnalysis } from "../prompts/dataAnalysis";
import {
  GraphMessage,
  LoadingMessage,
  StreamingStepInput,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { LlmResponseCache } from "../../edge-runtime/llmResponseCache";
import { dataAnalysisActionName } from "../builtinActions";
import { isFormDataLike } from "form-data-encoder";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // The existence of these is checked by answers
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
  {
    auth: {
      persistSession: false,
    },
  },
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
  userApiKey?: string,
): Promise<ExecuteCode2Item[] | { error: string } | null> {
  streamInfo({ role: "loading", content: "Performing data analysis" });
  const dataAnalysisPrompt = getDataAnalysisPrompt({
    question: instruction,
    selectedActions: filteredActions,
    orgInfo: org,
    userDescription,
    thoughts,
  });
  console.log(
    "Data analysis prompt:",
    JSON.stringify(GPTChatFormatToPhind(dataAnalysisPrompt)),
  );

  let llmResponse = await cache.checkBertieAnalyticsCache(
    dataAnalysisPrompt[1].content,
    filteredActions.map((a) => a.name),
    org.id,
    supabase,
  );
  console.log("LLM response from cache:", llmResponse);
  if (llmResponse) {
    // Parse the result
    let parsedCode = parseDataAnalysis(llmResponse, filteredActions);
    if (parsedCode !== null) {
      if ("error" in parsedCode) return parsedCode;
      console.info("Parsed LLM response from cache:", parsedCode.code);
      // Send code to supabase edge function to execute
      const res = await supabase.functions.invoke("execute-code-2", {
        body: JSON.stringify({
          actionsPlusApi: filteredActions,
          org,
          code: parsedCode.code,
          userApiKey,
        }),
      });

      if (!res.error) {
        const returnedData = res.data as ExecuteCode2Item[] | null;
        const codeOk = checkCodeExecutionOutput(returnedData, conversationId);
        if (codeOk) {
          // Save to DB for possible reuse later - run async
          void saveAnalyticsToDB(
            dataAnalysisPrompt[1].content,
            llmResponse,
            org.id,
            dbData,
            true,
            filteredActions.map((a) => a.name),
          );
          return returnedData;
        }
      }
      console.error(
        `Error executing code for conversation ${conversationId}: ${res.error}`,
      );
    }
  }
  var promiseFinished = false;
  const graphData = await Promise.race(
    [1, 2, 3].map(async (i) => {
      console.log("\nCode gen run", i);
      let parallelGraphData: ExecuteCode2Item[] | null = null,
        nLoops = 0;
      while (parallelGraphData === null && nLoops < 3 && !promiseFinished) {
        defaultDataAnalysisParams = {
          ...defaultDataAnalysisParams,
          temperature: nLoops === 0 && i === 0 ? 0.1 : 0.8,
        };
        nLoops += 1;
        const parallelLlmResponse = await exponentialRetryWrapper(
          getLLMResponse,
          [
            dataAnalysisPrompt,
            defaultDataAnalysisParams,
            process.env.CODE_GEN_LLM ?? defaultCodeGenModel,
          ],
          3,
        );
        console.info("\nRaw LLM response:", parallelLlmResponse);

        // Parse the result
        let parsedCode = parseDataAnalysis(
          parallelLlmResponse,
          filteredActions,
        );
        if (parsedCode === null) {
          streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
          continue;
        }
        if ("error" in parsedCode) return parsedCode;
        if (promiseFinished) return { error: "Another promise settled first" };
        streamInfo({ role: "loading", content: "Executing code" });
        console.info("Parsed LLM response:", parsedCode.code);

        // Send code to supabase edge function to execute
        const res = await supabase.functions.invoke("execute-code-2", {
          body: JSON.stringify({
            actionsPlusApi: filteredActions,
            org,
            code: parsedCode.code,
            userApiKey,
          }),
        });
        if (promiseFinished) return { error: "Another promise settled first" };

        if (res.error) {
          console.error(
            `Error executing code for conversation ${conversationId}: ${res.error}`,
          );
          streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
          continue;
        }

        const returnedData = res.data as ExecuteCode2Item[] | null;
        const codeOk = checkCodeExecutionOutput(
          returnedData,
          conversationId,
          nLoops,
        );
        if (!codeOk) {
          streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
          continue;
        }
        // For type-safety (doesn't ever get called)
        if (returnedData === null) continue;

        parallelGraphData = returnedData;
      }
      if (!promiseFinished) {
        if (parallelGraphData === null) {
          console.error(
            `Failed to execute code for conversation ${conversationId} after 3 attempts`,
          );
          return { error: "Failed to execute code" };
        }
        console.log(`Async run ${i} succeeded`);
        promiseFinished = true;
        return parallelGraphData;
      }
      return {
        error:
          "Another promise settled first - this should never be in the logs",
      };
    }),
  );
  if ("error" in graphData) return { error: "Failed to execute code" };
  console.info(
    "Data analysis response:",
    graphData.map((item) =>
      item.type === "plot"
        ? {
            type: item.type,
            args: { ...item.args, data: item.args.data?.slice(0, 5) },
          }
        : item,
    ),
  );
  // Save to DB for possible reuse later - run async
  void saveAnalyticsToDB(
    dataAnalysisPrompt[1].content,
    llmResponse,
    org.id,
    dbData,
    true,
    filteredActions.map((a) => a.name),
  );
  return graphData;
}

export function checkCodeExecutionOutput(
  returnedData: ExecuteCode2Item[] | null,
  conversationId: number,
  nLoops?: number,
): boolean {
  // If data field is null
  if (returnedData === null || returnedData.length === 0) {
    console.error(
      `Failed to write valid code for conversation ${conversationId}${
        nLoops ? `, attempt ${nLoops}/3` : ""
      }`,
    );
    return false;
  }
  // If error messages in the data output
  const errorMessages = returnedData.filter((m) => m.type === "error");
  if (errorMessages.length > 0) {
    console.error(
      `Error executing code for conversation ${conversationId}${
        nLoops ? `, attempt ${nLoops}/3` : ""
      }:\n${errorMessages
        // @ts-ignore
        .map((m) => m.args.message)
        .join("\n")}`,
    );
    return false;
  }
  // If 1 plot with missing data
  const plotMessages = returnedData.filter((m) => m.type === "plot");
  if (plotMessages.length === 1) {
    const plotArgs = plotMessages[0].args as BertieGraphData;
    if (
      // No data (exception is if it's a table or value)
      (plotArgs.type !== "table" || plotArgs.data.length === 1) &&
      plotArgs.data.every((d) => Object.keys(d).length <= 1)
    ) {
      console.error(
        `Missing columns in data output by code for conversation ${conversationId}${
          nLoops ? `, attempt ${nLoops}/3` : ""
        }:\n${plotMessages
          // @ts-ignore
          .map((m) => m.args.message)
          .join("\n")}`,
      );
      return false;
    }
  }
  // If only calls, return false - no logs (an answer might be written in a log) or plots
  return (
    returnedData.filter((m) => ["log", "plot"].includes(m.type)).length > 0
  );
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
    content:
      `Logs from code execution and API calls for ${dataAnalysisActionName}:\n` +
      executeCodeResponse
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

  const plotMessages = plotItems.map(formatPlotData);

  // We add a line saying "Plot generated successfully" to the bottom of the function message
  // if there are no log messages and no error messages
  if (executeCodeResponse.filter((m) => m.type === "log").length === 0) {
    functionMessage.content +=
      plotMessages.length > 0
        ? "\nPlot generated successfully"
        : "\nCode executed successfully";
  }

  return [functionMessage, ...plotMessages];
}

export function formatPlotData(
  plotMessage: Extract<ExecuteCode2Item, { type: "plot" }>,
): GraphMessage {
  let graphData = plotMessage.args;
  if (graphData.type !== "table") {
    graphData.data = ensureXandYinData(graphData);

    // Must ensure that the y value is a number
    graphData.data.forEach((item, idx) => {
      if (typeof item.y === "string") {
        const num = Number(item.y);
        if (!isNaN(num)) {
          item.y = num;
        }
      } else if (typeof item.y === "object" && !Array.isArray(item.y)) {
        // Find the first number in the object and use that as y
        const key = Object.keys(item.y).find(
          (k) => typeof item.y[k] === "number",
        );
        if (key) {
          item.y.y = item.y[key];
          delete item.y[key];
        }
        graphData.data[idx] = { ...item, ...item.y };
      }
    });
  }
  return {
    role: "graph",
    content: {
      type: graphData.data.length === 1 ? "value" : graphData.type,
      // TODO: Fix below typing issues by making the functions type safe
      // @ts-ignore
      data: graphData.data,
      xLabel: graphData.labels?.x ?? "",
      yLabel: graphData.labels?.y ?? "",
      graphTitle: graphData.title,
    },
  };
}

export function ensureXandYinData(
  graphData: BertieGraphData,
): BertieGraphData["data"] {
  /** If there is no x and y in the data and it's not a table, we want to convert it to having
   *  x and y.
   *
   *  1. We first check the labels and match against the keys in the data. If the labels
   *  are the same as the keys, we convert these to x & y.
   *  2. If the labels are not the same as the keys, we go on the order of key-value pairs in
   *  the data and convert the first key to x and the second key to y.
   * **/
  if (
    graphData.type === "table" ||
    graphData.data.some((item) => "x" in item && "y" in item)
  ) {
    return graphData.data;
  }

  // Either x or y is missing from all data points - we want to make a mapping
  const mapping: { x?: string; y?: string } = {}; // E.g. { "x": "date", "y": "value" }
  const xMissing = graphData.data.every((item) => !("x" in item));
  const yMissing = graphData.data.every((item) => !("y" in item));

  // First, check the labels to see if we can work out what x and y should be
  const keys = new Set();
  graphData.data.forEach((item) => {
    Object.keys(item).forEach((key) => keys.add(key));
  });
  const xLabel = graphData.labels?.x ?? "";
  if (xMissing) {
    if (keys.has(xLabel)) {
      mapping.x = xLabel;
      keys.delete(xLabel);
    } else if (keys.has(xLabel.toLowerCase())) {
      mapping.x = xLabel.toLowerCase();
      keys.delete(xLabel.toLowerCase());
    }
  }
  // Below we remove the units from the labels (look for something in brackets and cut it)
  const yLabel = graphData.labels?.y.match(/([^(]*)(?: \(.+\))?$/)?.[1] ?? "";
  if (yMissing) {
    if (keys.has(yLabel)) {
      mapping.y = yLabel;
    } else if (keys.has(yLabel.toLowerCase())) {
      mapping.y = yLabel.toLowerCase();
    }
  }

  // If the labels haven't helped, we'll just use the first key as x and the second as y
  if (xMissing && !("x" in mapping)) {
    const key = Array.from(keys)[0] as string;
    mapping.x = key;
    keys.delete(key);
  }
  if (yMissing && !("y" in mapping)) {
    let key = Array.from(keys)[0] as string;
    let i = 1;
    while (
      (key === "x" ||
        graphData.data.some((item) => typeof item[key] !== "number")) &&
      i < keys.size
    ) {
      key = Array.from(keys)[i] as string;
      i += 1;
    }
    mapping.y = key;
  }

  // Use the mapping to update the data
  Object.entries(mapping).forEach(([key, value]) => {
    graphData.data.forEach((item) => {
      item[key] = item[value];
      delete item[value];
    });
  });
  return graphData.data;
}
