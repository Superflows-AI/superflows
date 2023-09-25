import { describe, expect, it } from "@jest/globals";
import { parseGPTStreamedData } from "../lib/parsers/parsers";

describe("Parse GPT Streaming output", () => {
  it("First streamed response", () => {
    const testStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}


`;
    const output = parseGPTStreamedData(testStr);
    expect(output).toStrictEqual({
      completeChunks: ["Hello"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("Exclamation mark", () => {
    const exStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual({
      completeChunks: ["!"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("Done", () => {
    const exStr = `data: [DONE]`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual({
      completeChunks: [],
      done: true,
      incompleteChunk: null,
    });
  });
  it("Done in 2nd chunk", () => {
    const exStr = `data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"."},"finish_reason":null}]}

data: [DONE]`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual({
      completeChunks: ["."],
      done: true,
      incompleteChunk: null,
    });
  });
  it("two complete chunks, 1 incomplete chunk", () => {
    const exStr = `
    data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"yee hawww"},"finish_reason":null}]}
    data: {"id":"chatcmpl-7W2geutswow6tPpTjHSJZMDcKFoAY","object":"chat.completion.chunk","created":1687871180,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":"cowboy"},"finish_reason":null}]}
data: {"id": 123`;
    const output = parseGPTStreamedData(exStr);
    expect(output).toStrictEqual({
      completeChunks: ["yee hawww", "cowboy"],
      done: false,
      incompleteChunk: `{"id": 123`,
    });
  });
});
