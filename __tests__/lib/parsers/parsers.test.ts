import { describe, expect, it } from "@jest/globals";
import {
  parseLegacyAnthropicStreamedData,
  parseFollowUpSuggestions,
  parseGPTStreamedData,
  parseClaude3StreamedData,
} from "../../../lib/parsers/parsers";

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

  it("test spaces dealt with ok with chunk split mid sentence", () => {
    const firstChunk = `data: {"choices":[{"index":0,"delta":{"content":"double `;
    const nextChunk = ` space"},"finish_reason":null}]}`;
    const output1 = parseGPTStreamedData(firstChunk);
    const incompleteChunk = output1.incompleteChunk;
    const output2 = parseGPTStreamedData(incompleteChunk + nextChunk);

    console.log(output2);

    expect(output2).toStrictEqual({
      completeChunks: ["double  space"],
      done: false,
      incompleteChunk: null,
    });
  });
});

describe("parseFollowUpSuggestions", () => {
  it("Simple", () => {
    const out = parseFollowUpSuggestions(`- How are you feeling?
- What's up with you?
- What time is it right now .com?`);
    expect(out).toStrictEqual([
      "How are you feeling?",
      "What's up with you?",
      "What time is it right now .com?",
    ]);
  });
  it("Empty lines", () => {
    const out = parseFollowUpSuggestions(`- How are you feeling?


- What's up with you?
- What time is it right now .com?`);
    expect(out).toStrictEqual([
      "How are you feeling?",
      "What's up with you?",
      "What time is it right now .com?",
    ]);
  });
  it("Extra text", () => {
    const out =
      parseFollowUpSuggestions(`Absolutely! Let me handle that for you right away.

- How are you feeling?
- What's up with you?
- What time is it right now .com?`);
    expect(out).toStrictEqual([
      "How are you feeling?",
      "What's up with you?",
      "What time is it right now .com?",
    ]);
  });
  it("4 suggestions", () => {
    const out = parseFollowUpSuggestions(`- How are you feeling?
- What's up with you?
- What time is it right now .com?
- Who are you really?`);
    expect(out).toStrictEqual([
      "How are you feeling?",
      "What's up with you?",
      "What time is it right now .com?",
      "Who are you really?",
    ]);
  });
  it("Start with 'suggested question 1:'", () => {
    const out =
      parseFollowUpSuggestions(`- Suggested question 1: How are you feeling?
- Suggested question 2: What's up with you?
- Suggested question 3: What time is it right now .com?`);
    expect(out).toStrictEqual([
      "How are you feeling?",
      "What's up with you?",
      "What time is it right now .com?",
    ]);
  });
  it("Starts with 'suggestion 1:'", () => {
    const out = parseFollowUpSuggestions(`- Suggestion 2: How are you feeling?
- Suggestion 2: What's up with you?
- Suggestion 3: What time is it right now .com?`);
    expect(out).toStrictEqual([
      "How are you feeling?",
      "What's up with you?",
      "What time is it right now .com?",
    ]);
  });
});

describe("parseLegacyAnthropicStreamedData", () => {
  it("anthropic example", () => {
    const testStr = `event: completion
data: {"type":"completion","id":"compl_01XMs74TyRye1whxj41pJrQh","completion":" The","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01XMs74TyRye1whxj41pJrQh"}

event: completion
data: {"type":"completion","id":"compl_01XMs74TyRye1whxj41pJrQh","completion":" user","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01XMs74TyRye1whxj41pJrQh"}


`;
    const out = parseLegacyAnthropicStreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: [" The", " user"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("contains ping", () => {
    const testStr = `event: completion
data: {"type":"completion","id":"compl_01LS1aVyfLdGMbWKGNY9YQMq","completion":" The","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01LS1aVyfLdGMbWKGNY9YQMq"}

event: completion
data: {"type":"completion","id":"compl_01LS1aVyfLdGMbWKGNY9YQMq","completion":" user","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01LS1aVyfLdGMbWKGNY9YQMq"}

event: ping
data: {"type": "ping"}

event: completion
data: {"type":"completion","id":"compl_01LS1aVyfLdGMbWKGNY9YQMq","completion":" wants","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01LS1aVyfLdGMbWKGNY9YQMq"}

event: completion
data: {"type":"completion","id":"compl_01LS1aVyfLdGMbWKGNY9YQMq","completion":" a","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01LS1aVyfLdGMbWKGNY9YQMq"}
`;
    const out = parseLegacyAnthropicStreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: [" The", " user", " wants", " a"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("real world: incomplete chunk", () => {
    const testStr = ` 
 {"type":"completion","id":"compl_01LS1aVyfLdGMbWKGNY9YQMq","completion":" visualization","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01LS1aVyfLdGMbWKGNY9YQMq"}


claudeOutString: event: completion
data: {"type":"completion","id":"compl_01LS1aVyfLdGMbWKGNY9YQMq","completion":" of","stop_reason":null,"model":"claude-instant-1.2","stop":null,"log_id":"compl_01LS1aVyfLdGMbWKGNY9YQMq"}


`;
    const out = parseLegacyAnthropicStreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: [" visualization", " of"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("real world: incomplete chunk", () => {
    const testStr = `event: completion
data: {"t`;
    const out = parseLegacyAnthropicStreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: [],
      done: false,
      incompleteChunk: 'completion\ndata: {"t',
    });
  });
});

describe("parseClaude3StreamedData", () => {
  it("claude message start", () => {
    const testStr = `event: message_start
data: {"type": "message_start", "message": {"id": "msg_1nZdL29xx5MUA1yADyHTEsnR8uuvGzszyY", "type": "message", "role": "assistant", "content": [], "model": "claude-3-opus-20240229", "stop_reason": null, "stop_sequence": null, "usage": {"input_tokens": 25, "output_tokens": 1}}}
`;
    const out = parseClaude3StreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: [],
      done: false,
      incompleteChunk: null,
    });
  });
  it("claude message start with text", () => {
    const testStr = `event: message_start
data: {"type": "message_start", "message": {"id": "msg_1nZdL29xx5MUA1yADyHTEsnR8uuvGzszyY", "type": "message", "role": "assistant", "content": ["Hello"], "model": "claude-3-opus-20240229", "stop_reason": null, "stop_sequence": null, "usage": {"input_tokens": 25, "output_tokens": 1}}}
`;
    const out = parseClaude3StreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: ["Hello"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("contains ping", () => {
    const testStr = `event: content_block_start
data: {"type": "content_block_start", "index":0, "content_block": {"type": "text", "text": ""}}

event: ping
data: {"type": "ping"}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}
`;
    const out = parseClaude3StreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: ["", "Hello"],
      done: false,
      incompleteChunk: null,
    });
  });
  it("incomplete chunk", () => {
    const testStr = `event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text`;
    const out = parseClaude3StreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: ["Hello"],
      done: false,
      incompleteChunk: `content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text`,
    });
  });
  it("When the fun stops; stop", () => {
    const testStr = `event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "!"}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: message_delta
data: {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence":null, "usage":{"output_tokens": 15}}}

event: message_stop
data: {"type": "message_stop"}`;
    const out = parseClaude3StreamedData(testStr);
    expect(out).toStrictEqual({
      completeChunks: ["!"],
      done: true,
      incompleteChunk: null,
    });
  });
});
