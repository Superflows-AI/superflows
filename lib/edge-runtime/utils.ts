import { ChatGPTMessage } from "../models";
import { Action, ChatMessage } from "../types";

export async function getActiveActions(
  orgId: number
): Promise<Action[] | undefined> {
  let authRequestResult = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/actions?select=*%29&active=is.true&org_id=eq.${orgId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_LEVEL_KEY_SUPABASE}`,
        APIKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
    }
  );
  const jsonResponse = await authRequestResult.json();
  if (jsonResponse.error) throw new Error(jsonResponse.error.message);
  return jsonResponse;
}

export async function getConversation(
  conversationId: number
): Promise<ChatGPTMessage[] | undefined> {
  // Below gets the action groups and actions that are active
  let authRequestResult = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/chat_messages?select=*&conversation_id=eq.${conversationId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_LEVEL_KEY_SUPABASE}`,
        APIKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
    }
  );
  const jsonResponse = await authRequestResult.json();
  if (jsonResponse.error) throw new Error(jsonResponse.error.message);
  console.log("jsonResponse", jsonResponse);
  if (jsonResponse && jsonResponse.length > 0) {
    // @ts-ignore
    return (jsonResponse as ChatMessage[])
      .sort((m1, m2) => m1.conversation_index - m2.conversation_index)
      .map((m) =>
        m.role !== "function"
          ? {
              role: m.role,
              content: m.content,
            }
          : {
              role: m.role,
              content: m.content,
              name: m.name,
            }
      );
  }
  return jsonResponse;
}
