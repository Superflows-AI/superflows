import { NextRequest } from "next/server";
import { Database } from "../database.types";
import { ActionGroupJoinActions } from "../types";

export async function getOrgFromToken(
  req: NextRequest
): Promise<Database["public"]["Tables"]["organizations"]["Row"] | undefined> {
  let token = req.headers
    .get("Authorization")
    ?.replace("Bearer ", "")
    .replace("bearer ", "");
  if (token) {
    // const hashedToken = await hashOnEdgeRuntime(token);
    let authRequestResult = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/organizations?api_key=eq.${token}&select=*`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SERVICE_LEVEL_KEY_SUPABASE}`,
          APIKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
      }
    );
    const jsonResponse = await authRequestResult.json();
    if (jsonResponse.error) throw new Error(jsonResponse.error.message);
    return jsonResponse[0];
  }
  return undefined;
}

// async function hashOnEdgeRuntime(message: string): Promise<string> {
//   const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
//   const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
//   const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
//   return (
//     hashArray
//       // .map((b) => b.toString(16).padStart(1, "0"))
//       .map((b) => b.toString(16))
//       .join("")
//   ); // convert bytes to hex string
// }

export async function getActiveActionGroupsAndActions(
  orgId: number
): Promise<ActionGroupJoinActions[] | undefined> {
  // Below gets the action groups and actions that are active
  let authRequestResult = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/action_groups?select=*%2Cactions%21inner%28*%29&actions.active=is.true&org_id=eq.${orgId}`,
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
