import { ChatGPTMessage } from "./models";

export default async function log(
  chatHistory: ChatGPTMessage[],
  model: string,
  orgId: number,
): Promise<void> {
  if (
    process.env
      .COFLOW_BLACKLIST!.split("\n")
      .filter(Boolean)
      .map(Number)
      .includes(orgId)
  ) {
    return;
  }
  await fetch("https://server.joincoflow.com/llm-log/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.COFLOW_API_KEY,
      llm_used: model,
      openai_messages: chatHistory,
    }),
  });
}
