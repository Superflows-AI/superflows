import { describe, expect, it } from "@jest/globals";
import { parseGPTStreamedData } from "../lib/parsers/parsers";

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
  it("Done in 2nd chunk", () => {
    const exStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"."},"finish_reason":null}]}

data: [DONE]`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual([".", "[DONE]"]);
  });
});
