import { ChatGPTMessage } from "../../models";
import { exponentialRetryWrapper } from "../../utils";
import { getLLMResponse } from "../../queryLLM";
import {
  chatHistorySummaryPrompt,
  summariseChatHistoryLLMParams,
} from "../prompts/summariseChatHistory";

export async function summariseChatHistory(
  chatHistory: ChatGPTMessage[],
  userDescription: string,
  language: string | null,
): Promise<string> {
  const prompt = chatHistorySummaryPrompt(
    chatHistory,
    userDescription,
    language,
  );
  console.log("Prompt for summariseChatHistory: ", prompt[0].content);
  let out: string = await exponentialRetryWrapper(
    getLLMResponse,
    [prompt, summariseChatHistoryLLMParams, "gpt-4-0125-preview"],
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
