import { ChatGPTMessage } from "../../models";
import { exponentialRetryWrapper } from "../../utils";
import { getLLMResponse } from "../../queryLLM";
import {
  chatHistorySummaryPrompt,
  summariseChatHistoryLLMParams,
} from "../prompts/summariseChatHistory";
import log from "../../coflow";

export async function summariseChatHistory(
  chatHistory: ChatGPTMessage[],
  language: string | null,
  orgId: number,
): Promise<string> {
  const { prompt, numPastMessagesIncluded, pastConvTokenCount } =
    chatHistorySummaryPrompt(chatHistory, language);
  console.log("Prompt for summariseChatHistory: ", prompt[0].content);
  const use4 = numPastMessagesIncluded >= 5 || pastConvTokenCount > 100;
  let out: string = await exponentialRetryWrapper(
    getLLMResponse,
    [
      prompt,
      summariseChatHistoryLLMParams,
      use4 ? "gpt-4" : "gpt-4-0125-preview",
    ],
    3,
  );
  console.log("Summarised user request:", out);
  if (!out) {
    out = await exponentialRetryWrapper(
      getLLMResponse,
      [prompt, summariseChatHistoryLLMParams, "gpt-3.5-turbo-0125"],
      3,
    );
    void log(
      [...prompt, { role: "assistant", content: out }],
      "gpt-3.5-turbo-0125",
      orgId,
    );
  } else {
    void log(
      [...prompt, { role: "assistant", content: out }],
      use4 ? "gpt-4" : "gpt-4-0125-preview",
      orgId,
    );
  }
  return out;
}
