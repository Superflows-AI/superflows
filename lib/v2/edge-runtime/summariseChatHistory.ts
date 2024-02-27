import { ChatGPTMessage } from "../../models";
import { exponentialRetryWrapper } from "../../utils";
import { getLLMResponse } from "../../queryLLM";
import {
  chatHistorySummaryPrompt,
  summariseChatHistoryLLMParams,
} from "../prompts/summariseChatHistory";

export async function summariseChatHistory(
  chatHistory: ChatGPTMessage[],
  language: string | null,
): Promise<string> {
  const { prompt, numPastMessagesIncluded, pastConvTokenCount } =
    chatHistorySummaryPrompt(chatHistory, language);
  console.log("Prompt for summariseChatHistory: ", prompt[0].content);
  const use4 = numPastMessagesIncluded > 5 || pastConvTokenCount > 100;
  let out: string = await exponentialRetryWrapper(
    getLLMResponse,
    [
      prompt,
      summariseChatHistoryLLMParams,
      use4 ? "gpt-4-0125-preview" : "gpt-3-turbo-0125",
    ],
    3,
  );
  console.log("Summarised user request:", out);
  if (!out) {
    out = await exponentialRetryWrapper(
      getLLMResponse,
      [prompt, summariseChatHistoryLLMParams, "gpt-3-turbo-0125"],
      3,
    );
  }
  return out;
}
