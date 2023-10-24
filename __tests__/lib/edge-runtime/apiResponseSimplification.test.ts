import {
  sanitizeMessages,
  removeUrlsFromMarkdown,
} from "../../../lib/edge-runtime/apiResponseSimplification";

describe("sanitizeMessages", () => {
  it("should remove ids from messages", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
        {
          role: "function",
          content: '{"id":"183bd6ff-e8fd-44a6-a3a8-eed9cb1082df"}',
          name: "test",
        },
      ],
      false,
    );
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"id":"ID1"}',
        name: "test",
      },
    ]);
    expect(originalToPlaceholderMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
    });
  });
  it("should give non-unique ids when ids match across messages", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
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
      ],
      false,
    );
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
    expect(originalToPlaceholderMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
    });
  });
  it("should give unique ids across messages", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
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
      ],
      false,
    );
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
    expect(originalToPlaceholderMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
      "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10": "ID2",
    });
  });
  it("should remove urls from messages", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
        {
          role: "function",
          content: '{"url":"https://www.google.com"}',
          name: "test",
        },
      ],
      false,
    );
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content: '{"url":"URL1"}',
        name: "test",
      },
    ]);
    expect(originalToPlaceholderMap).toEqual({
      "https://www.google.com": "URL1",
    });
  });
  it("should give non-unique url variables across messages when they match", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
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
      ],
      false,
    );
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
    expect(originalToPlaceholderMap).toEqual({
      "https://www.google.com": "URL1",
    });
  });
  it("should give unique url variables across messages", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
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
      ],
      false,
    );
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
    expect(originalToPlaceholderMap).toEqual({
      "https://www.google.com": "URL1",
      "https://www.superflows.ai": "URL2",
    });
  });
  it("mixed example", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
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
      ],
      false,
    );
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
    expect(originalToPlaceholderMap).toEqual({
      "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df": "ID1",
      "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10": "ID2",
      "https://www.google.com": "URL1",
      "https://www.superflows.ai": "URL2",
    });
  });
  it("mixed objects and strings example", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
        {
          role: "function",
          content:
            "This is a Markdown string\n\n[Check out more about Markdown](/markdown/check-it-out)",
          name: "test",
        },
        {
          role: "function",
          content:
            '{"url":"https://www.superflows.ai", "an id": "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10"}',
          name: "test",
        },
      ],
      false,
    );
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content:
          "This is a Markdown string\n\n[Check out more about Markdown](URL1)",
        name: "test",
      },
      {
        role: "function",
        content: '{"url":"URL2","an id":"ID1"}',
        name: "test",
      },
    ]);
    expect(originalToPlaceholderMap).toEqual({
      "ff183bd6-e8fd-a3a8-44a6-82dfeed9cb10": "ID1",
      "/markdown/check-it-out": "URL1",
      "https://www.superflows.ai": "URL2",
    });
  });
  it("chat-to-docs example", () => {
    const { cleanedMessages, originalToPlaceholderMap } = sanitizeMessages(
      [
        {
          role: "function",
          content:
            "This is a Markdown string\n\n[Check out more about Markdown](/markdown/check-it-out)",
          name: "test",
        },
        {
          role: "function",
          content:
            "Woah blimey, here's another [one](https://superflows.ai)!\n\nAnd the [Markdown](/markdown/check-it-out) one is fine too",
          name: "test",
        },
      ],
      false,
    );
    expect(cleanedMessages).toEqual([
      {
        role: "function",
        content:
          "This is a Markdown string\n\n[Check out more about Markdown](URL1)",
        name: "test",
      },
      {
        role: "function",
        content:
          "Woah blimey, here's another [one](URL2)!\n\nAnd the [Markdown](URL1) one is fine too",
        name: "test",
      },
    ]);
    expect(originalToPlaceholderMap).toEqual({
      "/markdown/check-it-out": "URL1",
      "https://superflows.ai": "URL2",
    });
  });
});

describe("removeUrlsFromMarkdown", () => {
  it("Nothing to remove", () => {
    const out = removeUrlsFromMarkdown("hello https://google.com");
    expect(out.cleanedMarkdown).toEqual("hello https://google.com");
    expect(out.urlStore).toEqual({});
  });
  it("1 URL to remove", () => {
    const out = removeUrlsFromMarkdown("[hello](https://google.com)");
    expect(out.cleanedMarkdown).toEqual("[hello](URL1)");
    expect(out.urlStore).toEqual({ "https://google.com": "URL1" });
  });
  it("2 URLs to remove", () => {
    const out = removeUrlsFromMarkdown(
      "[hello](https://google.com) this is [not a drill!](https://superflows.ai)",
    );
    expect(out.cleanedMarkdown).toEqual(
      "[hello](URL1) this is [not a drill!](URL2)",
    );
    expect(out.urlStore).toEqual({
      "https://google.com": "URL1",
      "https://superflows.ai": "URL2",
    });
  });
  it("3 URLs to remove - 2 repeats", () => {
    const out = removeUrlsFromMarkdown(
      "[hello](https://google.com) this is [not a drill!](https://superflows.ai)\n\nYou should [say hello again](https://google.com)",
    );
    expect(out.cleanedMarkdown).toEqual(
      "[hello](URL1) this is [not a drill!](URL2)\n\nYou should [say hello again](URL1)",
    );
    expect(out.urlStore).toEqual({
      "https://google.com": "URL1",
      "https://superflows.ai": "URL2",
    });
  });
  it("3 URLs + 1 image to remove", () => {
    const out = removeUrlsFromMarkdown(
      "[hello](https://google.com) this is [not a drill!](https://superflows.ai)\n![Tangerine dream](/images/tangerine.png)\nYou should [say hello again](https://google.com)",
    );
    expect(out.cleanedMarkdown).toEqual(
      "[hello](URL1) this is [not a drill!](URL2)\n![Tangerine dream](URL3)\nYou should [say hello again](URL1)",
    );
    expect(out.urlStore).toEqual({
      "https://google.com": "URL1",
      "https://superflows.ai": "URL2",
      "/images/tangerine.png": "URL3",
    });
  });
  it("3 URLs + 1 image + pre-existing URLs in store", () => {
    const out = removeUrlsFromMarkdown(
      "[hello](https://google.com) this is [not a drill!](https://superflows.ai)\n![Tangerine dream](/images/tangerine.png)\nYou should [say hello again](https://google.com)",
      {
        "https://superflows.ai/pricing": "URL1",
        "https://superflows.ai": "URL2",
      },
    );
    expect(out.cleanedMarkdown).toEqual(
      "[hello](URL3) this is [not a drill!](URL2)\n![Tangerine dream](URL4)\nYou should [say hello again](URL3)",
    );
    expect(out.urlStore).toEqual({
      "https://superflows.ai/pricing": "URL1",
      "https://superflows.ai": "URL2",
      "https://google.com": "URL3",
      "/images/tangerine.png": "URL4",
    });
  });
});
