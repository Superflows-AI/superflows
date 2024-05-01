import { languageLine, parseTellUser } from "./utils";
import { ChatGPTMessage } from "../../models";
import { getTokenCount } from "../../utils";

export const summariseChatHistoryLLMParams = {
  temperature: 0.0,
  max_tokens: 400,
};

export function chatHistorySummaryPrompt(
  chatHistory: ChatGPTMessage[],
  language: string | null,
): {
  prompt: ChatGPTMessage[];
  numPastMessagesIncluded: number;
  pastConvTokenCount: number;
} {
  const { pastConversation, numPastMessagesIncluded } =
    getChatHistoryText(chatHistory);
  return {
    prompt: [
      {
        role: "system",
        content: `Paraphrase the user's most recent request as an instruction. This should include relevant information they've given from past messages (PAST_CONVERSATION). This instruction alone is passed to an AI that will carry it out.

PAST_CONVERSATION:
"""
${pastConversation}
"""

RULES:
1. DO NOT reply to the user
2. DO NOT summarise the assistant's messages
3. Include ALL relevant information from PAST_CONVERSATION - especially when previously requested by the assistant
4. Write from the user's perspective - in the first-person. Start with I/Tell me/Who/What/How
5. If the user doesn't answer the assistant's most recent clarifying question, leave this aspect ambiguous in the instruction
6. ${languageLine(language)}
7. If the PAST_CONVERSATION is irrelevant to the user's request, simply repeat the user's message`,
      },
    ],
    numPastMessagesIncluded,
    pastConvTokenCount: getTokenCount(pastConversation),
  };
}

export function getChatHistoryText(chatHistory: ChatGPTMessage[]): {
  pastConversation: string;
  numPastMessagesIncluded: number;
} {
  const filteredHist = chatHistory.filter(
    (m, i) =>
      m.role === "user" ||
      (m.role === "assistant" &&
        chatHistory[i + 1].role === "user" &&
        parseTellUser(m.content)),
  );
  const messagesIncluded = filteredHist.slice(
    // Only include the last 11 messages
    Math.max(0, filteredHist.length - 11),
  );
  return {
    pastConversation: messagesIncluded
      .map(
        (m, idx, arr) =>
          `${m.role === "user" ? "User" : "Assistant"}${
            ![0, arr.length - 1].includes(idx)
              ? ""
              : idx === 0
              ? " (oldest)"
              : " (most recent)"
          }: ${m.role === "user" ? m.content : parseTellUser(m.content)}`,
      )
      .join("\n\n"),
    numPastMessagesIncluded: messagesIncluded.length,
  };
}
