import { ChatGPTMessage } from "../models";
import { Organization } from "../types";

export const summariseEmailGPTParams = {
  temperature: 0.7,
  max_tokens: 400,
  frequency_penalty: 0.5,
  presence_penalty: 0,
};

export function getSummarizeTextPrompt(
  textToSummarize: string,
  organization: Omit<Organization, "created_at" | "join_link_id">,
): ChatGPTMessage[] {
  return [
    {
      role: "system",
      content: `Your task is to summarize a document using bullet points and short simple sentences.

For context of what to include in your summary, you are working for ${organization.name}. ${organization.description}

Your response should be a maximum of 6 bullet points. Only use three, four or five bullet points if you can. Only write short simple sentences. Only write one sentence per bullet point. Be as succinct as possible.

Include ALL numbers and statistics. THIS IS VERY IMPORTANT! DO NOT FORGET THIS! YOU SHOULD BE PARANOID THAT YOU MIGHT FORGET THIS!

DO NOT include legal disclaimers, privacy policies or copyright information. DO NOT FORGET THIS!

Your summary should follow this format:
- Bullet 1
- Bullet 2

The user's message will be the text to summarize.

Total word limit of the summary: 200 words`,
    },
    {
      role: "user",
      content: textToSummarize,
    },
  ];
}
