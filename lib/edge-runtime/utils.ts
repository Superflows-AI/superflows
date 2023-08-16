import { getTokenCount } from "../utils";
import { ChatGPTMessage } from "../models";
import { DBChatMessage } from "../types";

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
  chatGptPrompt: ChatGPTMessage[]
): ChatGPTMessage[] {
  /** Remove old function calls if over the context limit **/
  let tokenCount = getTokenCount(chatGptPrompt);
  const originalTokenCount = tokenCount;
  let numberRemoved = 0;
  // Keep removing until under the context limit
  while (tokenCount >= 8192) {
    // Removes the oldest function call
    const oldestFunctionCallIndex = chatGptPrompt.findIndex(
      (m) => m.role === "function"
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
