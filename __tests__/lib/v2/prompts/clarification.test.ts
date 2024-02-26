import { parseClarificationOutput } from "../../../../lib/v2/prompts/clarification";
import tokenizer from "gpt-tokenizer";

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
  it("stream in real response", () => {
    const response = `The is asking how to perform an action ("add a user rather than asking a question.
2. From the FUNCTIONS provided, there is no FUNCTION called "addUser" or similar.
3. However, there is a FUNCTION called "createContact" which could be used to add a user.

Clear: False

Tell user: Sure! It sounds like you want to add a new contact. To do that, we\'ll need some more details from you like the contact\'s name, email address, and which company they belong to. Once we have those details, I can use the createContact FUNCTION to add the new user for you. What other information can you provide?`;
    const tokens = tokenizer.encode(response);
    for (let i = 0; i < tokens.length; i++) {
      const partial = tokenizer.decode(tokens.slice(0, i));
      const parsed = parseClarificationOutput(partial);

      expect(
        "1. The user's request is to add a user, but there is no mention of users or any related data in the provided functions.\n2. The available functions are related to searching and updating companies, contacts, engagements, tasks and deals.\n3. As there is no function available to add a user, it is not possible to fulfill the user's request.",
      ).toContain(parsed.thoughts);
      if (parsed.tellUser) {
        expect(parsed.clear).toBe(false);
      }
      expect(
        "Sure! It sounds like you want to add a new contact. To do that, we'll need some more details from you like the contact's name, email address, and which company they belong to. Once we have those details, I can use the createContact FUNCTION to add the new user for you. What other information can you provide?",
      ).toContain(parsed.tellUser);
    }
  });
});
