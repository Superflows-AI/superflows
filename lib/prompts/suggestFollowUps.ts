import { getIntroText } from "./chatBot";
import { ChatGPTMessage, GPTMessageInclSummary } from "../models";

export function getFollowUpSuggestionSystemPrompt(
  userDescription: string | undefined,
  orgInfo: {
    name: string;
    description: string;
  },
  language: string | null,
): { role: "system"; content: string } {
  const userDescriptionSection = userDescription
    ? `\nThe following describes the user: ${userDescription}\n`
    : "";
  return {
    role: "system",
    content: `${getIntroText(orgInfo)}

Your task is to generate 3 suggested follow-up questions that the user might ask to continue the conversation.
${userDescriptionSection}
DO NOT UNDER ANY CIRCUMSTANCES reply to the user

Provide the 3 suggested questions as a bullet-point list like below:
- Suggested question 1?
- Suggested question 2?
- Suggested question 3?

Write in ${language ?? "the same language the user writes in"}.

Keep the suggestions extremely short and concise. THIS IS VERY IMPORTANT. You cannot fathom how disappointed I will be if you give long suggestions`,
  };
}

export function filterConversationForFollowUps(
  conversation: GPTMessageInclSummary[],
): ChatGPTMessage[] {
  return conversation.filter((m, idx) => {
    return (
      m.role === "user" ||
      // Assistant that are the last in a sequence of assistant & function messages
      conversation[idx + 1]?.role === "user" ||
      // Most recent assistant message
      idx === conversation.length - 1
    );
  });
}
