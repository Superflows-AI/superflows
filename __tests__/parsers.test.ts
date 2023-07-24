import { describe, expect, it } from "@jest/globals";
import {
  parseFunctionCall,
  parseGPTStreamedData,
  parseOutput,
} from "../lib/parsers/parsers";

describe("Parse output", () => {
  it("should not error", () => {
    const output = parseOutput(
      "Reasoning: We have successfully retrieved the recent information about Mr. Daniel Solís Martínez's case. The most recent event is an insurance note related to water damage from a plumbing issue. The claim has not yet been completed and the case has been passed on to WekLaw.\n" +
        "\n" +
        "Plan:\n" +
        "- Inform the user about the retrieved information.\n" +
        "\n" +
        "Commands:\n"
    );
    expect(output).toBeDefined();
    expect(output.reasoning).toBe(
      "We have successfully retrieved the recent information about Mr. Daniel Solís Martínez's case. The most recent event is an insurance note related to water damage from a plumbing issue. The claim has not yet been completed and the case has been passed on to WekLaw."
    );
    expect(output.plan).toBe(
      "- Inform the user about the retrieved information."
    );
    expect(output.tellUser).toBe("");
    expect(output.commands).toStrictEqual([]);
    expect(output.completed).toBe(true);
  });
  it("should not error including tell user", () => {
    const output = parseOutput(
      "Reasoning:\n" +
        "The user's request is vague and needs clarification. We need to understand what kind of trap they are referring to, for which customer this is for, and what the context of the scheduling is about.\n" +
        "\n" +
        "Plan:\n" +
        "- Ask the user for more information about the type of trap, the customer involved, and any other relevant details.\n" +
        "\n" +
        "Tell user:\n" +
        "Could you please provide more information? Who is the customer we need to schedule a trap for and what type of trap are we talking about?\n"
    );
    expect(output).toBeDefined();
    expect(output.reasoning).toBe(
      "The user's request is vague and needs clarification. We need to understand what kind of trap they are referring to, for which customer this is for, and what the context of the scheduling is about."
    );
    expect(output.plan).toBe(
      "- Ask the user for more information about the type of trap, the customer involved, and any other relevant details."
    );
    expect(output.tellUser).toBe(
      "Could you please provide more information? Who is the customer we need to schedule a trap for and what type of trap are we talking about?"
    );
    expect(output.commands).toStrictEqual([]);
    expect(output.completed).toBe(true);
  });
  it("should not error no plan, no commands", () => {
    const output = parseOutput(
      "Reasoning: We have successfully retrieved the recent information about Mr. Nestor Alfaras's case.\n" +
        "\n" +
        "Tell user: The most recent update for Mr. Nestor Alfaras's case is an insurance note which has been completed. The subproject type was Plumbing and the details were passed on to WekLaw.\n"
    );
    expect(output).toBeDefined();
    expect(output.reasoning).toBe(
      "We have successfully retrieved the recent information about Mr. Nestor Alfaras's case."
    );
    expect(output.plan).toBe("");
    expect(output.tellUser).toBe(
      "The most recent update for Mr. Nestor Alfaras's case is an insurance note which has been completed. The subproject type was Plumbing and the details were passed on to WekLaw."
    );
    expect(output.commands).toStrictEqual([]);
    expect(output.completed).toBe(true);
  });
  it("should not error no plan, no commands", () => {
    const output = parseOutput(
      'Reasoning: The search results show multiple individuals with the last name "Martinez". I need to clarify which Mr. Martinez the user is referring to.\n' +
        "\n" +
        "Plan:\n" +
        "- Ask the user to provide more information about Mr. Martinez so we can identify the correct person.\n" +
        "\n" +
        "Tell user: We have multiple customers with the last name Martinez. Could you please provide more information, such as a first name, to help identify the correct Mr. Martinez?"
    );
    expect(output).toBeDefined();
    expect(output.reasoning).toBe(
      'The search results show multiple individuals with the last name "Martinez". I need to clarify which Mr. Martinez the user is referring to.'
    );
    expect(output.plan).toBe(
      "- Ask the user to provide more information about Mr. Martinez so we can identify the correct person."
    );
    expect(output.tellUser).toBe(
      "We have multiple customers with the last name Martinez. Could you please provide more information, such as a first name, to help identify the correct Mr. Martinez?"
    );
    expect(output.commands).toStrictEqual([]);
    expect(output.completed).toBe(true);
  });
  it("should not output 'invalid input format:'", () => {
    const output = parseOutput(
      "Reasoning: The search results show multiple individuals with"
    );
    expect(output).toBeDefined();
    expect(output.reasoning).toBe(
      "The search results show multiple individuals with"
    );
    expect(output.plan).toBe("");
    expect(output.tellUser).toBe("");
    expect(output.commands).toStrictEqual([]);
    expect(output.completed).toBe(false);
  });
});

describe("parseFunctionCall", () => {
  it("hyphenated argument name", () => {
    const str = `get_account(gtmhub-accountId="64b17ac6548041a751aaf2f6", id_team="64b17ac6548041a751aaf2f7")`;
    const output = parseFunctionCall(str);
    const expectedOutput = {
      name: "get_account",
      args: {
        "gtmhub-accountId": "64b17ac6548041a751aaf2f6",
        id_team: "64b17ac6548041a751aaf2f7",
      },
    };
    expect(output).toStrictEqual(expectedOutput);
  });
  it("object passed to function", () => {
    const str = `create_goal(gtmhub-accountId='64b94e50c1815107739582f9', goal={"title": "Close sales"}, ownerIds=['64b94e50c1815107739582fa'], sessionId='64b94e50c1815107739582fc')`;
    const output = parseFunctionCall(str);
    const expectedOutput = {
      name: "create_goal",
      args: {
        "gtmhub-accountId": "64b94e50c1815107739582f9",
        goal: { title: "Close sales" },
        ownerIds: ["64b94e50c1815107739582fa"],
        sessionId: "64b94e50c1815107739582fc",
      },
    };
    expect(output).toStrictEqual(expectedOutput);
  });

  it("correctly parses function with floating point argument", () => {
    const str = `set_coordinates(x=3.14, y=0.98)`;
    const output = parseFunctionCall(str);
    const expectedOutput = {
      name: "set_coordinates",
      args: { x: 3.14, y: 0.98 },
    };
    expect(output).toEqual(expectedOutput);
  });
  it("correctly parses function mixed argument types", () => {
    const str = `set_coordinates(x=3.14, placeName="The Moon", y=0.98)`;
    const output = parseFunctionCall(str);
    const expectedOutput = {
      name: "set_coordinates",
      args: { x: 3.14, y: 0.98, placeName: "The Moon" },
    };
    expect(output).toEqual(expectedOutput);
  });
  it("string has a comma in it", () => {
    const str = `set_coordinates(x=3.14, placeName="The Moon, the sun", y=0.98)`;
    const output = parseFunctionCall(str);
    const expectedOutput = {
      name: "set_coordinates",
      args: { x: 3.14, y: 0.98, placeName: "The Moon, the sun" },
    };
    expect(output).toEqual(expectedOutput);
  });
  it("string has a comma and single quotes in it", () => {
    const str = `set_coordinates(x=3.14, placeName="The Moon, 'very nice eh', the sun", y=0.98)`;
    const output = parseFunctionCall(str);
    const expectedOutput = {
      name: "set_coordinates",
      args: {
        x: 3.14,
        y: 0.98,
        placeName: "The Moon, 'very nice eh', the sun",
      },
    };
    expect(output).toEqual(expectedOutput);
  });
  // TODO: This fails may cause an issue in the future
  // it("string has escaped quote in it", () => {
  //   const str = `set_coordinates(x=3.14, placeName="The Moon,\\" sun ", y=0.98)`;
  //   const output = parseFunctionCall(str);
  //   const expectedOutput = {
  //     name: "set_coordinates",
  //     args: {
  //       x: 3.14,
  //       y: 0.98,
  //       placeName: 'The Moon," sun ',
  //     },
  //   };
  //   expect(output).toEqual(expectedOutput);
  // });
  it("returns function with no arguments when none are provided", () => {
    const str = `do_something()`;
    const output = parseFunctionCall(str);
    const expectedOutput = { name: "do_something", args: {} };
    expect(output).toEqual(expectedOutput);
  });
  it("throws an error when function call format is invalid", () => {
    const str = `getAccount "64b17ac6548041a751aaf2f6" "64b17ac6548041a751aaf2f7"`;
    expect(() => parseFunctionCall(str)).toThrowError(
      "Invalid function call format: " + str
    );
  });
});

describe("Parse GPT Streaming output", () => {
  it("First streamed response", () => {
    const testStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}


`;
    const output = parseGPTStreamedData(testStr);
    expect(output).toStrictEqual(["Hello"]);
  });
  it("Exclamation mark", () => {
    const exStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual(["!"]);
  });
  it("Done", () => {
    const exStr = `data: [DONE]`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual(["[DONE]"]);
  });
  it("Done", () => {
    const exStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"."},"finish_reason":null}]}

data: [DONE]`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual([".", "[DONE]"]);
  });
});
