import { convertToGraphData } from "../../../../lib/v2/edge-runtime/dataAnalysis";
import { ExecuteCode2Item } from "../../../../lib/types";
import { dataAnalysisActionName } from "../../../../lib/builtinActions";

describe("convertToGraphData", () => {
  const logMess1: Extract<ExecuteCode2Item, { type: "log" }> = {
    type: "log",
    args: { message: "log message 1" },
  };
  it("3x logMess1", () => {
    const out = convertToGraphData([logMess1, logMess1, logMess1]);
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: "log message 1\nlog message 1\nlog message 1",
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
        content: "log message 1\nlog message 1",
      },
      {
        role: "graph",
        content: {
          graphTitle: "plot 1",
          type: "line",
          data: [{ x: 1, y: 2 }],
          xLabel: "x",
          yLabel: "y",
        },
      },
    ]);
  });
  // Combine plots into 1 plot
  it("2x plotMess1, 2x logMess1", () => {
    const out = convertToGraphData(
      JSON.parse(JSON.stringify([logMess1, plotMess1, plotMess1, logMess1])),
      // [logMess1, plotMess1, plotMess1, logMess1],
    );
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: "log message 1\nlog message 1",
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
  // Check the automated message about code running is added
  it("1x plotMess1", () => {
    const out = convertToGraphData([plotMess1]);
    expect(out).toStrictEqual([
      {
        role: "function",
        name: dataAnalysisActionName,
        content: "Plot generated successfully",
      },
      {
        role: "graph",
        content: {
          graphTitle: "plot 1",
          type: "line",
          data: [{ x: 1, y: 2 }],
          xLabel: "x",
          yLabel: "y",
        },
      },
    ]);
  });
});
