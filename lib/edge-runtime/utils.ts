import { getTokenCount } from "../utils";
import { ChatGPTMessage, GPTMessageInclSummary } from "../models";
import { DBChatMessage } from "../types";
import { MAX_TOKENS_OUT, USAGE_LIMIT } from "../consts";
import suggestions1 from "../../public/presets/1/suggestions.json";
import suggestions2 from "../../public/presets/2/suggestions.json";
import { SupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../database.types";

export function DBChatMessageToGPT(
  message: DBChatMessage
): GPTMessageInclSummary {
  if (message.role === "function") {
    let content: string;
    try {
      // Below conversion to JSON and back to string remove all newlines, indentation etc
      // which are empty tokens. This can cut tokens by ~half
      content = JSON.stringify(JSON.parse(message.content));
    } catch (e) {
      // If invalid JSON
      content = message.content;
    }

    return {
      role: message.role,
      content: content,
      name: message.name!,
      summary: message.summary ?? undefined,
    };
  }
  return {
    role: message.role as "user" | "assistant",
    content: message.content,
  };
}

export function MessageInclSummaryToGPT(
  message: GPTMessageInclSummary
): ChatGPTMessage {
  const out = {
    ...message,
    content:
      "summary" in message
        ? message?.summary ?? message.content
        : message.content,
  };
  if ("summary" in out) delete out.summary;
  return out;
}

export function removeOldestFunctionCalls(
  chatGptPrompt: ChatGPTMessage[],
  model: "3" | "3-16k" | "4",
  maxTokensOut: number = MAX_TOKENS_OUT
): ChatGPTMessage[] {
  /** Remove old function calls if over the context limit **/
  let tokenCount = getTokenCount(chatGptPrompt);
  const maxTokens = model === "3" ? 4096 : model === "3-16k" ? 16384 : 8192;
  const originalTokenCount = tokenCount;
  let numberRemoved = 0;
  // Keep removing until under the context limit
  while (tokenCount >= maxTokens - maxTokensOut) {
    // Removes the oldest function call
    const oldestFunctionCallIndex = chatGptPrompt.findIndex(
      // 204 since 4 tokens are added to the prompt for each message
      (m) => m.role === "function" && getTokenCount([m]) >= 204
    );
    if (oldestFunctionCallIndex === -1) {
      // No function calls left to remove
      break;
    }
    chatGptPrompt[oldestFunctionCallIndex].content = "Cut due to context limit";
    tokenCount = getTokenCount(chatGptPrompt);
    numberRemoved += 1;
  }
  console.info(
    "Removed " +
      numberRemoved +
      " function calls due to context limit. Original token count: " +
      originalTokenCount +
      ", new token count: " +
      tokenCount
  );
  return chatGptPrompt;
}

export function getJsonMIMEType<inObj>(
  inputDict: Record<string, inObj> | undefined | null
): inObj | undefined {
  if (!inputDict) return undefined;
  if ("application/json" in inputDict) {
    return inputDict["application/json"];
  } else if ("*/*" in inputDict) {
    return inputDict["*/*"];
  } else if ("*/json" in inputDict) {
    return inputDict["*/*"];
  } else {
    return undefined;
  }
}

export function getHeader(
  headers: { [key: string]: string } | Headers | null,
  name: string
): string | null {
  if (headers === null) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  // @ts-ignore
  return headers[name] || headers[name.toLowerCase()] || null;
}

export async function getFreeTierUsage(
  supabase: SupabaseClient<Database>,
  orgId: number
): Promise<{ overLimit: boolean; numQueriesMade: number }> {
  // The number of first messages sent by the organization's users
  // This count is just for free tier users. All messages should count to avoid spam.
  // For paying customers, we only count full AI responses against their usage (see below).
  const usageRes = await supabase
    .from("chat_messages")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .eq("role", "user");
  if (usageRes.error) throw new Error(usageRes.error.message);
  let numQueriesMade = usageRes.count ?? 0;
  const messagesSent = usageRes.data.map((message) => message.content);
  // This accounts for the suggestions of a preset. The preset adds 3 messages to the DB
  if (
    numQueriesMade &&
    (suggestions1.every((s) => messagesSent.includes(s)) ||
      suggestions2.every((s) => messagesSent.includes(s)))
  ) {
    // 3 suggestions, so reduce by 3
    numQueriesMade -= 3;
  }
  return { overLimit: numQueriesMade >= USAGE_LIMIT, numQueriesMade };
}
