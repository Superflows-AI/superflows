import { parseOpusOrGPTDataAnalysis } from "../../../../lib/v2/prompts/dataAnalysisGPT";

describe("Success", () => {
  it("Remove text afterwards", () => {
    expect(
      parseOpusOrGPTDataAnalysis(
        "Plan:\n1. Think\n2. step-by-step\n\n```\n// Write code here\nasync function main() {\n\treturn searchDeals();\n}\n\nmain();\n```\n\nText can go here",
        [{ name: "search_deals" }],
      ),
    ).toStrictEqual({
      code: "async function main() {\n\treturn searchDeals();\n}\n\nawait main();",
    });
  });
});

describe("Errors", () => {
  it("Empty", () => {
    expect(
      parseOpusOrGPTDataAnalysis(
        "Plan:\n1. Think\n2. step-by-step\n\n```// Write code here\n```",
        [],
      ),
    ).toBeNull();
  });
  it("No code block", () => {
    expect(
      parseOpusOrGPTDataAnalysis("Plan:\n1. Think\n2. step-by-step\n", []),
    ).toBeNull();
  });
});
