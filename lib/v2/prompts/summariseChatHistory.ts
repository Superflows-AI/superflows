import { languageLine, parseTellUser } from "./utils";
import { ChatGPTMessage } from "../../models";
import { getTokenCount } from "../../utils";

export const summariseChatHistoryLLMParams = {
  temperature: 0.0,
  max_tokens: 300,
};

export function chatHistorySummaryPrompt(
  chatHistory: ChatGPTMessage[],
  org: { name: string; description: string },
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
        content: `Condense the user's most recent unanswered request. This should include relevant information they've given from the PAST_CONVERSATION. The instruction you write alone is passed to an AI that will carry it out, with no other context.
${org.name ? `\nYou're embedded in ${org.name}. ` : ""}${
          org.description ?? ""
        }${org.name || org.description ? "\n" : ""}
EXAMPLE 1:
"""
Past conversation:
---
User (oldest): Which product sells best?

Assistant (most recent: Over what time period? And do you want best by revenue or unit sales?
---

User message: last year, revenue

Correct output: What was the best selling product by revenue last year?
"""

EXAMPLE 2:
"""
Past conversation:
---
User (oldest): What are the predicted sales for the next 6 months?

Assistant (most recent): Above is a table of the predicted sales revenue for the next 6 months.
---

User message: Plot this month by month for me

Correct output: Plot the predicted sales revenue for the next 6 months month by month
"""

PAST_CONVERSATION:
"""
${pastConversation}
"""

USER_MESSAGE: ${chatHistory[chatHistory.length - 1].content}

RULES:
1. DO NOT reply to USER_MESSAGE
2. DO NOT summarise the assistant's messages
3. Include all relevant information from PAST_CONVERSATION. Your output must be standalone and fully describe the user's request
4. Write from the user's perspective - in the first-person
5. NEVER reference past messages in the conversation. Example: don't say "the previous table"
6. ${languageLine(language)}
7. If the PAST_CONVERSATION is irrelevant to the user's request, simply repeat USER_MESSAGE
8. If the user hasn't made a request which is unanswered, repeat USER_MESSAGE
9. Use identical terminology to the user where possible`,
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
      .slice(0, -1)
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
