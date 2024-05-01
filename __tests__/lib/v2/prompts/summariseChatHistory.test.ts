import { getChatHistoryText } from "../../../../lib/v2/prompts/summariseChatHistory";

describe("summariseChatHistory", () => {
  it("", () => {
    const historyText = getChatHistoryText([
      {
        role: "user",
        content: "I want to book a flight to Paris",
      },
      {
        role: "assistant",
        content: "Sure, when would you like to go?",
      },
      {
        role: "user",
        content: "Next week",
      },
      {
        role: "function",
        name: "getChatHistoryText",
        content: "I'm sorry, I don't understand",
      },
    ]);
    expect(historyText).toEqual({
      pastConversation:
        "User (oldest): I want to book a flight to Paris\n\nAssistant: Sure, when would you like to go?\n\nUser (most recent): Next week",
      numPastMessagesIncluded: 3,
    });
  });
});
