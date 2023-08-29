import { describe, it, expect } from "@jest/globals";
import { getSummarizeTextPrompt } from "../../lib/prompts/summarizeText";

describe("getSummarizeTextPrompt", () => {
  it("basic prompt", () => {
    // @ts-ignore
    const summarizePrompt = getSummarizeTextPrompt("This is a test", {
      name: "test",
      description: "test description",
    });
    expect(summarizePrompt).toEqual([
      {
        role: "system",
        content: `Your task is to summarize a document using bullet points and short simple sentences.

For context of what to include in your summary, you are working for test. test description

Your response should be a maximum of 6 bullet points. Only use one, two or three bullet points if you can. Only write short simple sentences. Only write one sentence per bullet point. Be as succinct as possible.

Include all important facts, numbers and statistics. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!

Do not include legal disclaimers, privacy policies or copyright information.

Your summary should follow this format:
- Bullet 1
- Bullet 2

The user's message will be the text to summarize.

Total word limit of the summary: 200 words`,
      },
      {
        role: "user",
        content: "This is a test",
      },
    ]);
  });
});
