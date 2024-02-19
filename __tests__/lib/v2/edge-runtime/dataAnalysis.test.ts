import {
  convertToGraphData,
  ensureDataWellFormatted,
} from "../../../../lib/v2/edge-runtime/dataAnalysis";
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

describe("ensureDataWellFormatted", () => {
  it("x and y present: do nothing", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        { x: 1, y: 2 },
        { x: 1, y: 2 },
      ],
      labels: { x: "date", y: "value" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("x missing, get from labels", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { date: 1, y: 2 },
        // @ts-ignore
        { date: 1, y: 2 },
      ],
      labels: { x: "date", y: "value" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("x missing, get from labels (lowercase)", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { date: 1, y: 2 },
        // @ts-ignore
        { date: 1, y: 2 },
      ],
      labels: { x: "Date", y: "value" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("y missing, get from labels", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { x: 1, value: 2 },
        // @ts-ignore
        { x: 1, value: 2 },
      ],
      labels: { x: "date", y: "value" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("y missing, get from labels, remove units", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { x: 1, age: 23, value: 2 },
        // @ts-ignore
        { x: 1, age: 23, value: 2 },
      ],
      labels: { x: "Date", y: "Value ($)" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2, age: 23 },
      { x: 1, y: 2, age: 23 },
    ]);
  });
  it("y missing, get from order", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { x: 1, value: 2 },
        // @ts-ignore
        { x: 1, value: 2 },
      ],
      labels: { x: "Date", y: "Units ($)" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("y missing, get from labels, out of order", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { value: 2, x: 1 },
        // @ts-ignore
        { value: 2, x: 1 },
      ],
      labels: { x: "Date", y: "Value ($)" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("x & y missing, get from labels", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { value: 2, date: 1 },
        // @ts-ignore
        { value: 2, date: 1 },
      ],
      labels: { x: "Date", y: "Value ($)" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
  it("x & y missing, get from order", () => {
    const out = ensureDataWellFormatted({
      title: "title",
      type: "line",
      data: [
        // @ts-ignore
        { date: 1, value: 2 },
        // @ts-ignore
        { date: 1, value: 2 },
      ],
      labels: { x: "Mornings", y: "Units ($)" },
    });
    expect(out).toStrictEqual([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
    ]);
  });
});
