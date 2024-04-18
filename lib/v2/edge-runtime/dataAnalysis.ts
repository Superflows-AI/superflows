import {
  ActionPlusApiInfo,
  BertieGraphData,
  ExecuteCode2Item,
  Organization,
} from "../../types";
import { Database } from "../../database.types";
import { FunctionMessage } from "../../models";
import {
  GraphMessage,
  LoadingMessage,
  StreamingStepInput,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { createClient } from "@supabase/supabase-js";
import { LlmResponseCache } from "../../edge-runtime/llmResponseCache";
import { dataAnalysisActionName } from "../builtinActions";
import {
  getOpusOrGPTDataAnalysisPrompt,
  GPTDataAnalysisLLMParams,
  parseOpusOrGPTDataAnalysis,
  parseGeneratedCode,
  shouldTerminateDataAnalysisStreaming,
} from "../prompts/dataAnalysis";
import { streamWithEarlyTermination } from "./utils";
import log from "../../coflow";
import { sendFunLoadingMessages } from "../../funLoadingMessages";

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
  org: Pick<
    Organization,
    | "id"
    | "name"
    | "description"
    | "chatbot_instructions"
    | "fun_loading_messages"
  >,
  dbData: { conversationId: number; index: number },
  userDescription: string,
  cache: LlmResponseCache,
  streamInfo: (step: StreamingStepInput) => void,
  userApiKey?: string,
): Promise<ExecuteCode2Item[] | { error: string } | null> {
  if (!org.fun_loading_messages) {
    streamInfo({ role: "loading", content: "Performing data analysis" });
  }
  // Either sends fun loading messages or does nothing
  let slowFnWrapper = org.fun_loading_messages
    ? sendFunLoadingMessages
    : (p: Promise<any>) => p;
  let llmResponse = await cache.checkBertieAnalyticsCache(
    instruction,
    filteredActions.map((a) => a.name),
    org.id,
    supabase,
  );
  console.log("LLM response from cache:", llmResponse);
  if (llmResponse) {
    // Parse the result
    let parsedCode;
    if (llmResponse.includes("```")) {
      parsedCode = parseOpusOrGPTDataAnalysis(llmResponse, filteredActions);
    } else {
      parsedCode = parseGeneratedCode(llmResponse, filteredActions);
    }
    if (parsedCode !== null) {
      if ("error" in parsedCode) return parsedCode;
      console.info("Parsed LLM response from cache:", parsedCode.code);
      if (!org.fun_loading_messages)
        streamInfo({ role: "loading", content: "Executing code" });
      // Send code to supabase edge function to execute
      const res = await slowFnWrapper(
        supabase.functions.invoke("execute-code-2", {
          body: JSON.stringify({
            actionsPlusApi: filteredActions,
            org,
            code: parsedCode.code,
            userApiKey,
          }),
        }),
        streamInfo,
      );

      if (!res.error) {
        const returnedData = res.data as ExecuteCode2Item[] | null;
        const codeOk = checkCodeExecutionOutput(
          returnedData,
          dbData.conversationId,
        );
        if (codeOk.isValid) {
          // Save to DB for possible reuse later - run async
          void saveAnalyticsToDB(
            instruction,
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
        `Error executing code for conversation ${dbData.conversationId}: ${res.error}`,
      );
    }
  }

  const dataAnalysisPrompt = getOpusOrGPTDataAnalysisPrompt({
    question: instruction,
    selectedActions: filteredActions,
    orgInfo: org,
    userDescription,
  });
  console.log(
    "Code-gen data analysis prompt:",
    JSON.stringify(dataAnalysisPrompt),
  );
  var promiseFinished = false;
  const promiseOut:
    | { graphData: ExecuteCode2Item[]; llmResponse: string }
    | { error: string } = await slowFnWrapper(
    Promise.race([
      // Data analysis
      ...[1, 2].map(
        async (
          i,
        ): Promise<
          | { graphData: ExecuteCode2Item[]; llmResponse: string }
          | { error: string }
        > => {
          let parallelGraphData: ExecuteCode2Item[] | null = null,
            nLoops = 0;
          let parallelLlmResponse = "";
          // Retry if it fails once
          while (parallelGraphData === null && nLoops < 2) {
            nLoops += 1;
            const streamedOut = await streamWithEarlyTermination(
              dataAnalysisPrompt,
              {
                ...GPTDataAnalysisLLMParams,
                temperature: nLoops === 0 ? 0.1 : 0.8,
              },
              i === 1 ? "gpt-4" : "anthropic/claude-3-opus-20240229",
              shouldTerminateDataAnalysisStreaming,
              () => {}, // Don't stream as of yet - we want to for debugging purposes
              i === 1 ? "GPT data analysis" : "Opus data analysis",
            );
            if (streamedOut === null) {
              // If it fails, wait 25 seconds (so the other LLM can finish) and then return an error
              await new Promise((resolve) => setTimeout(resolve, 25000));
              return { error: "Stream failed" };
            }
            void log(
              [
                ...dataAnalysisPrompt,
                { role: "assistant", content: streamedOut },
              ],
              i === 1 ? "gpt-4" : "anthropic/claude-3-opus-20240229",
              org.id,
            );
            parallelLlmResponse = streamedOut;
            if (promiseFinished)
              return { error: "Another promise settled first" };

            // Parse the result
            let parsedCode = parseOpusOrGPTDataAnalysis(
              parallelLlmResponse,
              filteredActions,
            );
            if (parsedCode === null) {
              streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
              continue;
            }
            if ("error" in parsedCode) return parsedCode;
            if (promiseFinished)
              return { error: "Another promise settled first" };
            if (!org.fun_loading_messages)
              streamInfo({ role: "loading", content: "Executing code" });
            console.info(
              `${i === 1 ? "GPT" : "Opus"} parsed code:`,
              parsedCode.code,
            );

            // Send code to supabase edge function to execute
            const res = await supabase.functions.invoke("execute-code-2", {
              body: JSON.stringify({
                actionsPlusApi: filteredActions,
                org,
                code: parsedCode.code,
                userApiKey,
              }),
            });
            if (promiseFinished)
              return { error: "Another promise settled first" };

            if (res.error) {
              console.error(
                `Error executing generated code for conversation ${dbData.conversationId}: ${res.error}`,
              );
              streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
              continue;
            }
            if (!Array.isArray(res.data)) {
              console.error(
                `ERROR: Invalid output from code-gen for conversation ${
                  dbData.conversationId
                }: ${JSON.stringify(res.data, undefined, 2)}`,
              );
              streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
              continue;
            }

            const returnedData = res.data as ExecuteCode2Item[] | null;
            const codeOk = checkCodeExecutionOutput(
              returnedData,
              dbData.conversationId,
              nLoops,
            );
            if (!codeOk.isValid) {
              if (codeOk.retry) {
                streamInfo(nLoops <= 1 ? madeAMistake : anotherMistake);
                continue;
              } else {
                return {
                  error: returnedData?.find(
                    (m) =>
                      m.type === "error" &&
                      m.args.message.includes('"status": 4'),
                    // @ts-ignore
                  )!.args.message,
                };
              }
            }
            // For type-safety (doesn't ever get called)
            if (returnedData === null) continue;

            parallelGraphData = returnedData;
          }
          if (!promiseFinished) {
            if (parallelGraphData === null) {
              console.error(
                `Failed to execute generated code for conversation ${dbData.conversationId} after 2 attempts`,
              );
              return { error: "Failed to execute code" };
            }
            console.log(`GPT code-gen run ${i} succeeded`);
            promiseFinished = true;
            return {
              graphData: parallelGraphData,
              llmResponse: parallelLlmResponse,
            };
          }
          return {
            error:
              "Another promise settled first - this should never be in the logs",
          };
        },
      ),
    ]),
    streamInfo,
  );
  promiseFinished = true;
  if ("error" in promiseOut) return promiseOut;
  const graphData = promiseOut.graphData;
  console.info(
    "Data analysis response:",
    graphData.map((item) =>
      item.type === "plot"
        ? {
            type: item.type,
            args: { ...item.args, data: item.args.data?.slice(0, 5) },
          }
        : item.type === "call"
        ? {
            type: item.type,
            args: {
              ...item.args,
              params: JSON.stringify(item.args.params, undefined, 2).slice(
                0,
                200,
              ),
            },
          }
        : item,
    ),
  );
  // Save to DB for possible reuse later - run async
  if (promiseOut.llmResponse) {
    void saveAnalyticsToDB(
      instruction,
      promiseOut.llmResponse,
      org.id,
      dbData,
      true,
      filteredActions.map((a) => a.name),
    );
  }
  return graphData;
}

export function checkCodeExecutionOutput(
  returnedData: ExecuteCode2Item[] | null,
  conversationId: number,
  nLoops?: number,
): { isValid: boolean; retry: boolean } {
  // If data field is null
  if (returnedData === null || returnedData.length === 0) {
    console.error(
      `ERROR: Failed to write valid code for conversation ${conversationId}${
        nLoops ? `, attempt ${nLoops}/2` : ""
      }`,
    );
    return { isValid: false, retry: true };
  }
  // If error messages in the data output
  const errorMessages = returnedData.filter((m) => m.type === "error");
  if (errorMessages.length > 0) {
    console.error(
      `ERROR executing code for conversation ${conversationId}${
        nLoops ? `, attempt ${nLoops}/2` : ""
      }:\n${errorMessages
        // @ts-ignore
        .map((m) => m.args.message)
        .join("\n")}`,
    );
    // Any 4XX status code is a permanent error
    // @ts-ignore
    if (errorMessages.some((m) => m.args.message.includes('"status": 4'))) {
      return { isValid: false, retry: false };
    }
    return { isValid: false, retry: true };
  }
  // If there are log messages starting with the word Error or ERROR
  const logMessages = returnedData.filter((m) => m.type === "log");
  if (
    logMessages.some(
      (m) => "message" in m.args && m.args.message.match(/^E(rror|RROR)/),
    )
  ) {
    console.error(
      `ERROR executing code for conversation ${conversationId}${
        nLoops ? `, attempt ${nLoops}/2` : ""
      }:\n${logMessages
        // @ts-ignore
        .map((m) => m.args.message)
        .join("\n")}`,
    );
    return { isValid: false, retry: true };
  }

  // If 1 plot with missing data
  const plotMessages = returnedData.filter((m) => m.type === "plot");
  if (plotMessages.length === 1) {
    const plotArgs = plotMessages[0].args as BertieGraphData;
    const isValue = plotArgs.data.length === 1;
    const isTable = plotArgs.type === "table";
    if (
      // No data (exception is if it's a table or value)
      !isTable &&
      !isValue &&
      // Every data point has only 1 key
      // @ts-ignore
      plotArgs.data.every((d) => Object.keys(d).length <= 1)
    ) {
      console.error(
        `ERROR: Missing columns in data output by code for conversation ${conversationId}${
          nLoops ? `, attempt ${nLoops}/2` : ""
        }:\n${plotMessages
          // @ts-ignore
          .map((m) => m.args.message)
          .join("\n")}`,
      );
      return { isValid: false, retry: true };
    }
    const minNonNullsAllowed = isValue || isTable ? 1 : 2;
    if (
      // @ts-ignore
      plotArgs.data.every(
        // @ts-ignore
        (d) =>
          Object.values(d).filter(
            // @ts-ignore
            (v) => !["", undefined, null, "undefined", "null"].includes(v),
          ).length < minNonNullsAllowed,
      )
    ) {
      console.error(
        `ERROR: Insufficient number of not-null columns in data output by code for conversation ${conversationId}${
          nLoops ? `, attempt ${nLoops}/2` : ""
        }:\n${plotMessages
          // @ts-ignore
          .map((m) => m.args.message)
          .join("\n")}`,
      );
      return { isValid: false, retry: true };
    }
    if (
      isValue &&
      Object.values(plotArgs.data[0]).filter((v) => !isNaN(v) && v !== null)
        .length === 0
    ) {
      console.error("ERROR: No number in value data: ", plotArgs.data);
      return { isValid: false, retry: true };
    }
  }
  // If only calls, return false - no plots or logs (an answer might be written in a log)
  const plotOrLog =
    returnedData.filter(
      (m) => m.type === "log" || (m.type === "plot" && checkPlotData(m.args)),
    ).length > 0;
  return { isValid: plotOrLog, retry: !plotOrLog };
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
  let plotItems = executeCodeResponse
    .filter((g) => g.type === "plot")
    // Convert other graph types to bar
    .map((g) => {
      if (!["line", "bar", "table"].includes(g.args.type))
        return {
          ...g,
          type: "bar",
        };
      return g;
    }) as {
    type: "plot";
    args: BertieGraphData;
  }[];

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
      // @ts-ignore
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

export function checkPlotData(data: any): boolean {
  // data must be an object and not an array
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    console.log("checkPlotData: Data is not an object", data);
    return false;
  }
  if (!["title", "data", "type"].every((keyName) => keyName in data)) {
    console.log("checkPlotData: Data does not have title, data and type", data);
    return false;
  }
  if (
    !Array.isArray(data.data) ||
    data.data.some(
      (item: any) =>
        item === null || typeof item !== "object" || Array.isArray(item),
    )
  ) {
    console.log("checkPlotData: Data.data is not an array of objects", data);
    return false;
  }
  return true;
}

export function formatPlotData(plotMessage: {
  type: "plot";
  args: BertieGraphData;
}): GraphMessage {
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
          (k) => !isNaN(item.y[k]) && item.y[k] !== null,
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
): { [key: string]: any }[] {
  /** If there is no x and y in the data and it's not a table, we want to convert it to having
   *  x and y.
   *
   *  1. We first check the labels and match against the keys in the data. If the labels
   *  are the same as the keys, we convert these to x & y.
   *  2. If the labels are not the same as the keys, we go on the order of key-value pairs in
   *  the data and convert the first key to x and the second key to y.
   * **/
  if (graphData.data.some((item) => Array.isArray(item))) {
    graphData.data = graphData.data.map((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const newObj: Record<string, string | number> = {
          x: item[0],
          y: item[1],
        };
        item.slice(2).forEach((val, idx) => {
          newObj[idx.toString()] = val;
        });
        return newObj;
      }
      return item;
    });
  }
  // For typing reasons
  let graphDataOut = graphData.data as { [key: string]: any }[];
  if (
    graphData.type === "table" ||
    graphDataOut.every((item) => "x" in item && "y" in item)
  ) {
    return graphDataOut;
  }

  // Either x or y is missing from all data points - we want to make a mapping
  const mapping: { x?: string; y?: string } = {}; // E.g. { "x": "date", "y": "value" }
  const xMissing = graphDataOut.every((item) => !("x" in item));
  const yMissing = graphDataOut.every((item) => !("y" in item));

  // First, check the labels to see if we can work out what x and y should be
  const keys = new Set();
  graphDataOut.forEach((item) => {
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
        graphDataOut.some((item) => typeof item[key] !== "number")) &&
      i < keys.size
    ) {
      key = Array.from(keys)[i] as string;
      i += 1;
    }
    mapping.y = key;
  }

  // Use the mapping to update the data
  Object.entries(mapping).forEach(([key, value]) => {
    graphDataOut.forEach((item) => {
      item[key] = item[value];
      delete item[value];
    });
  });
  return graphDataOut;
}
