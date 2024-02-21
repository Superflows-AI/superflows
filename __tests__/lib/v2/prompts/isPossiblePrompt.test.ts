import { parseRequestPossibleOutput } from "../../../../lib/v2/prompts/isUserRequestPossible";

describe("parseOutput", () => {
  it("expected format: impossible", () => {
    expect(
      parseRequestPossibleOutput(`Thoughts:
1. Think step-by-step: break down the user's request in extreme detail. Be verbose
2. identify the type of answer the user wants (e.g. a person, product, or company)
3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)
4. identify unclear phrases (e.g. 'last quarter', 'best')
5. identify if the request requires data analysis
6. identify clear metrics and dates when data analysis is required

Possible: False

Tell user: Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise`),
    ).toEqual({
      thoughts:
        "1. Think step-by-step: break down the user's request in extreme detail. Be verbose\n2. identify the type of answer the user wants (e.g. a person, product, or company)\n3. consider if the type of answer is unclear, given FUNCTIONS (e.g. a person could be a customer or employee)\n4. identify unclear phrases (e.g. 'last quarter', 'best')\n5. identify if the request requires data analysis\n6. identify clear metrics and dates when data analysis is required",
      possible: false,
      tellUser:
        'Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise',
    });
  });
  it("expected format: possible", () => {
    expect(
      parseRequestPossibleOutput(`Thoughts:
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
      possible: true,
      tellUser: "",
    });
  });
  it("no thoughts: impossible", () => {
    expect(
      parseRequestPossibleOutput(`Possible: False

Tell user: Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise`),
    ).toEqual({
      thoughts: "",
      possible: false,
      tellUser:
        'Ask clarifying questions here. Be friendly (example: start with "Sure!"). Be concise',
    });
  });
  it("no thoughts: possible", () => {
    expect(parseRequestPossibleOutput(``)).toEqual({
      thoughts: "",
      possible: true,
      tellUser: "",
    });
  });
  it("Not possible, no 'tell user' text", () => {
    expect(
      parseRequestPossibleOutput(
        `Possible: False\n\nI'm afraid I'm not a person, but am an Acme CRM AI assistant. I can help you with your CRM data. If you have any questions about your CRM data, feel free to ask!`,
      ),
    ).toEqual({
      thoughts: "",
      possible: false,
      tellUser:
        "I'm afraid I'm not a person, but am an Acme CRM AI assistant. I can help you with your CRM data. If you have any questions about your CRM data, feel free to ask!",
    });
  });
  it("just tell user", () => {
    expect(
      parseRequestPossibleOutput(
        `I'm afraid I'm not a person, but am an Acme CRM AI assistant. I can help you with your CRM data. If you have any questions about your CRM data, feel free to ask!`,
      ),
    ).toEqual({
      thoughts: "",
      possible: false,
      tellUser:
        "I'm afraid I'm not a person, but am an Acme CRM AI assistant. I can help you with your CRM data. If you have any questions about your CRM data, feel free to ask!",
    });
  });
});
