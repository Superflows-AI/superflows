import { ActionTagJoinActions, DBChatMessage } from "../types";
import { ChatGPTMessage } from "../models";

export async function getActiveActionTagsAndActions(
  orgId: number
): Promise<ActionTagJoinActions[] | undefined> {
  // Below gets the action tags and actions that are active
  let authRequestResult = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/action_tags?select=*%2Cactions%21inner%28*%29&actions.active=is.true&org_id=eq.${orgId}`,
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

export function DBChatMessageToGPT(message: DBChatMessage): ChatGPTMessage {
  if (message.role === "function")
    return {
      role: message.role,
      content: message.content,
      name: message.name!,
    };
  return {
    role: message.role as "user" | "assistant",
    content: message.content,
  };
}
