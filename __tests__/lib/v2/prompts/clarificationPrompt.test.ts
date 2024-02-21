import { parseClarificationOutput } from "../../../../lib/v2/prompts/clarificationPrompt";

describe("parseOutput", () => {
  it("expected format: unclear", () => {
    expect(
      parseClarificationOutput(`Thoughts:
1. Think step-by-step: break down the user's request in extreme detail. Be verbose
2. identify the type of answer the user wants (e.g. a person, product, or company)
3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)
4. identify unclear phrases (e.g. 'last quarter', 'best')
5. identify if the request requires data analysis
6. identify clear metrics and dates when data analysis is required

Clear: False

Tell user: Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise`),
    ).toEqual({
      thoughts:
        "1. Think step-by-step: break down the user's request in extreme detail. Be verbose\n2. identify the type of answer the user wants (e.g. a person, product, or company)\n3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)\n4. identify unclear phrases (e.g. 'last quarter', 'best')\n5. identify if the request requires data analysis\n6. identify clear metrics and dates when data analysis is required",
      clear: false,
      tellUser:
        'Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise',
    });
  });
  it("expected format: clear", () => {
    expect(
      parseClarificationOutput(`Thoughts:
1. Think step-by-step: break down the user's request in extreme detail. Be verbose
2. identify the type of answer the user wants (e.g. a person, product, or company)
3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)
4. identify unclear phrases (e.g. 'last quarter', 'best')
5. identify if the request requires data analysis
6. identify clear metrics and dates when data analysis is required

`),
    ).toEqual({
      thoughts:
        "1. Think step-by-step: break down the user's request in extreme detail. Be verbose\n2. identify the type of answer the user wants (e.g. a person, product, or company)\n3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)\n4. identify unclear phrases (e.g. 'last quarter', 'best')\n5. identify if the request requires data analysis\n6. identify clear metrics and dates when data analysis is required",
      clear: true,
      tellUser: "",
    });
  });
  it("no thoughts: unclear", () => {
    expect(
      parseClarificationOutput(`Clear: False

Tell user: Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise`),
    ).toEqual({
      thoughts: "",
      clear: false,
      tellUser:
        'Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise',
    });
  });
  it("no thoughts: clear", () => {
    expect(parseClarificationOutput(``)).toEqual({
      thoughts: "",
      clear: true,
      tellUser: "",
    });
  });
});
