import { sanitizeMessages } from "../../lib/edge-runtime/apiResponseSimplification";

describe("sanitizeMessages", () => {
  it("should remove ids from messages", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content: '{"id":"183bd6ff-e8fd-44a6-a3a8-eed9cb1082df"}',
        name: "test",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"id":"ID1"}',
        name: "test",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
    });
  });
  it("should give non-unique ids when ids match across messages", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content: '{"id":"183bd6ff-e8fd-44a6-a3a8-eed9cb1082df"}',
        name: "test1",
      },
      {
        role: "function",
        content: '{"id":"183bd6ff-e8fd-44a6-a3a8-eed9cb1082df"}',
        name: "test2",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"id":"ID1"}',
        name: "test1",
      },
      {
        role: "function",
        content: '{"id":"ID1"}',
        name: "test2",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
    });
  });
  it("should give unique ids across messages", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content: '{"id":"183bd6ff-e8fd-44a6-a3a8-eed9cb1082df"}',
        name: "test1",
      },
      {
        role: "function",
        content: '{"id":"ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10"}',
        name: "test2",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"id":"ID1"}',
        name: "test1",
      },
      {
        role: "function",
        content: '{"id":"ID2"}',
        name: "test2",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
      "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10": "ID2",
    });
  });
  it("should remove urls from messages", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content: '{"url":"https://www.google.com"}',
        name: "test",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"url":"URL1"}',
        name: "test",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "https://www.google.com": "URL1",
    });
  });
  it("should give non-unique url variables across messages when they match", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content: '{"url":"https://www.google.com"}',
        name: "test",
      },
      {
        role: "function",
        content: '{"url":"https://www.google.com"}',
        name: "test",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"url":"URL1"}',
        name: "test",
      },
      {
        role: "function",
        content: '{"url":"URL1"}',
        name: "test",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "https://www.google.com": "URL1",
    });
  });
  it("should give unique url variables across messages", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content: '{"url":"https://www.google.com"}',
        name: "test",
      },
      {
        role: "function",
        content: '{"url":"https://www.superflows.ai"}',
        name: "test",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"url":"URL1"}',
        name: "test",
      },
      {
        role: "function",
        content: '{"url":"URL2"}',
        name: "test",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "https://www.google.com": "URL1",
      "https://www.superflows.ai": "URL2",
    });
  });
  it("mixed example", () => {
    const { cleanedMessages, valueVariableMap } = sanitizeMessages([
      {
        role: "function",
        content:
          '{"url":"https://www.google.com", "nested": {"an id": "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df"}}',
        name: "test",
      },
      {
        role: "function",
        content:
          '{"url":"https://www.superflows.ai", "an id": "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10"}',
        name: "test",
      },
    ]);
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"url":"URL1","nested":{"an id":"ID1"}}',
        name: "test",
      },
      {
        role: "function",
        content: '{"url":"URL2","an id":"ID2"}',
        name: "test",
      },
    ]);
    expect(valueVariableMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
      "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10": "ID2",
      "https://www.google.com": "URL1",
      "https://www.superflows.ai": "URL2",
    });
  });
});
