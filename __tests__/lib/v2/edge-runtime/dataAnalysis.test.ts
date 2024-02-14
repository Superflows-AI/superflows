import { convertToGraphData } from "../../../../lib/v2/edge-runtime/dataAnalysis";
import { ExecuteCode2Item } from "../../../../lib/types";
import { dataAnalysisActionName } from "../../../../lib/builtinActions";

describe("convertToGraphData", () => {
  const logMess1 = {
    type: "log",
    args: { message: "log message 1" },
  } as Extract<ExecuteCode2Item, { type: "log" }>;
  it("3x logMess1", () => {
    const out = convertToGraphData([logMess1, logMess1, logMess1]);
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: `Logs from code execution and API calls for ${dataAnalysisActionName}:
log message 1
log message 1
log message 1`,
      },
    ]);
  });
  const plotMess1: Extract<ExecuteCode2Item, { type: "plot" }> = {
    type: "plot",
    args: {
      title: "plot 1",
      type: "line",
      data: [{ x: 1, y: 2 }],
      labels: { x: "x", y: "y" },
    },
  };
  // Include a plot
  it("1x plotMess1, 2x logMess1", () => {
    const out = convertToGraphData([logMess1, plotMess1, logMess1]);
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: `Logs from code execution and API calls for ${dataAnalysisActionName}:
log message 1
log message 1`,
      },
      {
        role: "graph",
        content: {
          graphTitle: "plot 1",
          type: "value", // Converts to value
          data: [{ x: 1, y: 2 }],
          xLabel: "x",
          yLabel: "y",
        },
      },
    ]);
  });
  const plotMess2: Extract<ExecuteCode2Item, { type: "plot" }> = {
    type: "plot",
    args: {
      title: "plot 2",
      type: "line",
      data: [{ x: 3, y: 4 }],
      labels: { x: "x", y: "y" },
    },
  };
  // Combine plots into 1 plot
  it("2x plotMess1, 2x logMess1", () => {
    const out = convertToGraphData(
      JSON.parse(JSON.stringify([logMess1, plotMess1, plotMess1, logMess1])),
    );
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: `Logs from code execution and API calls for ${dataAnalysisActionName}:
log message 1
log message 1`,
      },
      {
        role: "graph",
        content: {
          graphTitle: "plot 1",
          type: "line",
          data: [
            { x: 1, y: 2 },
            { x: 1, y: 2 },
          ],
          xLabel: "x",
          yLabel: "y",
        },
      },
    ]);
  });
  it("3x plotMess1, 2x plotMess2, 2x logMess1", () => {
    const out = convertToGraphData(
      JSON.parse(
        JSON.stringify([
          logMess1,
          plotMess1,
          plotMess2,
          plotMess1,
          plotMess2,
          plotMess1,
        ]),
      ),
    );
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: `Logs from code execution and API calls for ${dataAnalysisActionName}:
log message 1`,
      },
      {
        role: "graph",
        content: {
          graphTitle: "plot 1",
          type: "line",
          data: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 1, y: 2 },
          ],
          xLabel: "x",
          yLabel: "y",
        },
      },
    ]);
  });
  // Check the automated message about code running is added
  it("1x plotMess1", () => {
    const out = convertToGraphData([plotMess1]);
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: `Logs from code execution and API calls for ${dataAnalysisActionName}:

Plot generated successfully`,
      },
      {
        role: "graph",
        content: {
          graphTitle: "plot 1",
          type: "value",
          data: [{ x: 1, y: 2 }],
          xLabel: "x",
          yLabel: "y",
        },
      },
    ]);
  });
});
