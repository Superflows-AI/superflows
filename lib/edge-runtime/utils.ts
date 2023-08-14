import { ActionTagJoin, DBChatMessage } from "../types";
import { ChatGPTMessage } from "../models";

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
