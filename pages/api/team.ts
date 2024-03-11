import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { Database } from "../../lib/database.types";
import { getSessionFromCookie } from "../../lib/edge-runtime/utils";

export const config = {
  runtime: "edge",
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

const headers = {
  "Content-Type": "application/json",
  "Cache-control": "no-store",
};

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        error: "Only GET requests allowed",
      }),
      { status: 405, headers },
    );
  }
  const session = await getSessionFromCookie(req);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }
  const usersProfileRes = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", session.user.id)
    .single();
  if (usersProfileRes.error) {
    return new Response(JSON.stringify({ error: "Error fetching data" }), {
      status: 500,
      headers,
    });
  }
  if (usersProfileRes.data === null || usersProfileRes.data.org_id === null) {
    return new Response(JSON.stringify({ error: "User doesn't have an org" }), {
      status: 400,
      headers,
    });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email_address, avatar_url")
    .eq("org_id", usersProfileRes.data!.org_id);

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
