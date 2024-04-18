import { BertieGraphData, ExecuteCode2Item } from "../../types";
import {
  checkPlotData,
  formatPlotData,
} from "../../v2/edge-runtime/dataAnalysis";
import {
  AssistantMessage,
  ErrorMessage,
  GraphMessage,
} from "@superflows/chat-ui-react/dist/src/lib/types";
import { FunctionMessage } from "../../models";
import { dataAnalysisActionName } from "../../v2/builtinActions";

export function checkCodeExecutionOutput(
  returnedData: ExecuteCode2Item[] | null,
): { isValid: true } | { isValid: false; error: string } {
  // If data field is null
  if (returnedData === null || returnedData.length === 0) {
    return { isValid: false, error: "No output data from generated code" };
  }
  // If error messages in the data output
  const errorMessages = returnedData.filter((m) => m.type === "error");
  if (errorMessages.length > 0) {
    return {
      isValid: false,
      error: errorMessages.map((m) => m.args.message).join("\n"),
    };
  }
  // If there are log messages starting with the word Error or ERROR
  const logMessages = returnedData.filter((m) => m.type === "log");
  if (
    logMessages.some(
      (m) => "message" in m.args && m.args.message.match(/^E(rror|RROR)/),
    )
  ) {
    return {
      isValid: false,
      error: logMessages.map((m) => m.args.message).join("\n"),
    };
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
      return {
        isValid: false,
        error: `Missing columns in data output by code: ${plotMessages
          // @ts-ignore
          .map((m) => m.args.message)
          .join("\n")}`,
      };
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
      return {
        isValid: false,
        error: `Insufficient number of not-null columns in data output by code:\n${plotMessages
          .map((m) => m.args.message)
          .join("\n")}`,
      };
    }
    if (
      isValue &&
      Object.values(plotArgs.data[0]).filter((v) => !isNaN(v) && v !== null)
        .length === 0
    ) {
      return {
        isValid: false,
        error: `No number in value data: ${JSON.stringify(
          plotArgs.data,
          undefined,
          2,
        )}`,
      };
    }
  }
  // If only calls, return false - no plots or logs (an answer might be written in a log)
  const plotOrLog =
    returnedData.filter(
      (m) => m.type === "log" || (m.type === "plot" && checkPlotData(m.args)),
    ).length > 0;
  if (!plotOrLog) {
    return { isValid: false, error: "No plot or log output by generated code" };
  }
  return { isValid: true };
}

export function convertToGraphData(
  executeCodeResponse: ExecuteCode2Item[],
  // ): (GraphMessage | FunctionMessage | ErrorMessage | AssistantMessage)[] {
): (GraphMessage | FunctionMessage | ErrorMessage)[] {
  if (executeCodeResponse.length === 0) {
    throw new Error("No logs, errors or API calls from code execution");
  }
  let functionMessage: FunctionMessage = {
    role: "function",
    name: "logs",
    content:
      `Logs and API calls from code execution:\n` +
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
  // If you want log messages shown to users
  // let functionMessage: FunctionMessage = {
  //   role: "function",
  //   name: "logs",
  //   content:
  //     `Logs from code execution:\n` +
  //     executeCodeResponse
  //       .filter((m) => m.type === "call")
  //       .map(
  //         (m) =>
  //           `${m.args.name}(${Object.entries(m.args.params)
  //             .map(([key, value]) => `${key}=${value}`)
  //             .join(", ")})`,
  //       )
  //       .join("\n"),
  // };

  const errorMessages: ErrorMessage[] = executeCodeResponse
    .filter((m) => m.type === "error")
    .map((m) => ({
      role: "error",
      content: m.args.message,
    }));

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

  // const assistantMessage: AssistantMessage = {
  //   role: "assistant",
  //   content: executeCodeResponse
  //     .filter((m) => m.type === "log")
  //     .map((m) => `${m.args.message}`)
  //     .slice(0, 5)
  //     .join("\n"),
  // };

  // return [functionMessage, ...errorMessages, ...plotMessages, assistantMessage];
  return [functionMessage, ...errorMessages, ...plotMessages];
}
