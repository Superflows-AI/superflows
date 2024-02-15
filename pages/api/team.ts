import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { z } from "zod";
import { Database } from "../../lib/database.types";

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: ["**/node_modules/@superflows/chat-ui-react/**"],
};

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}
if (!process.env.SERVICE_LEVEL_KEY_SUPABASE) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

// Bring me my Bow of burning gold:
const supabase = createClient<Database>(
  // Bring me my arrows of desire:
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE,
  // Bring me my Chariot of fire!
  {
    auth: {
      persistSession: false,
    },
  },
);

const GetTeamZod = z.object({
  org_id: z.number(),
});
type GetTeamType = z.infer<typeof GetTeamZod>;

const headers = { "Content-Type": "application/json" };

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Only GET requests allowed",
      }),
      { status: 405, headers },
    );
  }
  const params = new URLSearchParams(req.url.split("?")[1]);
  const org_id = Number(params.get("org_id"));

  if (isNaN(org_id)) {
    return new Response(JSON.stringify({ message: "Invalid parameters" }), {
      status: 400,
      headers,
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email_address, avatar_url")
    .eq("org_id", org_id);

  if (error) {
    console.error(error.message);
    return new Response(
      JSON.stringify({ message: "Error fetching data: " + error.message }),
      {
        status: 500,
        headers,
      },
    );
  }
  if (data === null) {
    console.error("No data returned from organizations select");
    return new Response(JSON.stringify({ message: "Error fetching data" }), {
      status: 500,
      headers,
    });
  }
  return new Response(JSON.stringify(data), { status: 200, headers });
}
