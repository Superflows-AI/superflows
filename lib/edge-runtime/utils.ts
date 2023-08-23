import { getTokenCount } from "../utils";
import { ChatGPTMessage } from "../models";
import { DBChatMessage } from "../types";
import { MAX_TOKENS_OUT } from "../consts";
import { z } from "zod";

export function isValidBody<T extends Record<string, unknown>>(
  body: any,
  bodySchema: z.ZodType<any>
): body is T {
  const { success } = bodySchema.safeParse(body);
  return success;
}

export function DBChatMessageToGPT(message: DBChatMessage): ChatGPTMessage {
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
    };
  }
  return {
    role: message.role as "user" | "assistant",
    content: message.content,
  };
}

export function removeOldestFunctionCalls(
  chatGptPrompt: ChatGPTMessage[],
  model: "3" | "3-16k" | "4",
  maxTokensOut: number = MAX_TOKENS_OUT
): ChatGPTMessage[] {
  const maxTokens = model === "3" ? 4096 : model === "3-16k" ? 16384 : 8192;
  /** Remove old function calls if over the context limit **/
  let tokenCount = getTokenCount(chatGptPrompt);
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
