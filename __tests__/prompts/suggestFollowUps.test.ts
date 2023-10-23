import { filterConversationForFollowUps } from "../../lib/prompts/suggestFollowUps";

describe("filterConversationForFollowUps", () => {
  it("Simple", () => {
    const out = filterConversationForFollowUps([
      {
        role: "user",
        content: "Hello",
      },
    ]);
    expect(out).toEqual([
      {
        role: "user",
        content: "Hello",
      },
    ]);
  });
  it("Simple 2", () => {
    const out = filterConversationForFollowUps([
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "Hi",
      },
    ]);
    expect(out).toEqual([
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "Hi",
      },
    ]);
  });
  it("Actually requires filtering", () => {
    const out = filterConversationForFollowUps([
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "Hi",
      },
      {
        role: "function",
        name: "summarizeText",
        content: "This is a summary",
      },
      {
        role: "assistant",
        content: "I returned a summary",
      },
    ]);
    expect(out).toEqual([
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "I returned a summary",
      },
    ]);
  });
  it("Requires filtering 2", () => {
    const out = filterConversationForFollowUps([
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "Hi",
      },
      {
        role: "function",
        name: "summarizeText",
        content: "This is a summary",
      },
      {
        role: "assistant",
        content: "I returned a summary",
      },
      {
        role: "user",
        content: "Thanks for that",
      },
      {
        role: "assistant",
        content: "What is going on???",
      },
      {
        role: "function",
        name: "summarizeText",
        content: "This shouldn't be shown!!!",
      },
      {
        role: "assistant",
        content: "You're welcome",
      },
    ]);
    expect(out).toEqual([
      {
        role: "user",
        content: "Hello",
      },
      {
        role: "assistant",
        content: "I returned a summary",
      },
      {
        role: "user",
        content: "Thanks for that",
      },
      {
        role: "assistant",
        content: "You're welcome",
      },
    ]);
  });
});
