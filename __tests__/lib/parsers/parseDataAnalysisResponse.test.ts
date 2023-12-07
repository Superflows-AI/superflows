import { parseDataAnalysisResponse } from "../../../lib/parsers/dataAnalysis";

describe("parseDataAnalysisResponse", () => {
  it("basic", () => {
    const code = parseDataAnalysisResponse(`Thoughts: I am. I think. I will.

Code:
\`\`\`
var graphData = {
    graphTitle: "title",
    type: "line",
    data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
    ],
    xLabel: "x",
    yLabel: "y",
};
\`\`\``);
    expect(code).toEqual({
      code: `var graphData = {
    graphTitle: "title",
    type: "line",
    data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
    ],
    xLabel: "x",
    yLabel: "y",
};`,
    });
  });
  it("all options for end of ``` line", () => {
    const options = ["js", "javascript", "ts", "typescript"];
    for (const option of options) {
      const code = parseDataAnalysisResponse(`Thoughts: I am. I think. I will.

Code:
\`\`\`${option}
var graphData = {
    graphTitle: "title",
    type: "line",
    data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
    ],
    xLabel: "x",
    yLabel: "y",
};
\`\`\``);
      expect(code).toEqual({
        code: `var graphData = {
    graphTitle: "title",
    type: "line",
    data: [
        { x: 1, y: 2 },
        { x: 2, y: 3 },
    ],
    xLabel: "x",
    yLabel: "y",
};`,
      });
    }
  });
  it("no code", () => {
    const code = parseDataAnalysisResponse(`Thoughts: I am. I think. I will.`);
    expect(code).toEqual(null);
  });
  it("includes fetch()", () => {
    const code = parseDataAnalysisResponse(`Thoughts: I am. I think. I will.

Code:
\`\`\`
fetch("https://some-url.com")
\`\`\``);
    expect(code).toEqual(null);
  });
  it("graphData not defined", () => {
    const code = parseDataAnalysisResponse(`Thoughts: I am. I think. I will.

Code:
\`\`\`
let nonIllegalCode = "123";
\`\`\``);
    expect(code).toEqual(null);
  });
  it("functionOutput redefined", () => {
    const code = parseDataAnalysisResponse(
      `Thoughts: I am. I think. I will.

Code:
\`\`\`
let graphData = "123";
let functionOutput = "456";
\`\`\``,
      ["functionOutput"],
    );
    expect(code).toEqual(null);
  });
  it("Code throws error", () => {
    const code = parseDataAnalysisResponse(`Thoughts: I am. I think. I will.

Code:
\`\`\`
throw new Error("This is an error");
\`\`\``);
    expect(code).toEqual({ error: "This is an error" });
  });
});
