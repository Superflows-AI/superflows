import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { getRelevantDocChunks } from "../../lib/embed-docs/docsSearch";
import { NextRequest } from "next/server";
import { OrgJoinIsPaidFinetunedModels } from "../../lib/types";

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
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE,
  // Bring me my Chariot of fire!
);

const headers = { "Content-Type": "application/json" };

export default async function handler(req: NextRequest): Promise<Response> {
  try {
    // Handle non-POST requests
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({
          error: "Only GET requests allowed",
        }),
        { status: 405, headers },
      );
    }

    // Authenticate that the user is allowed to use this API
    const orgApiKey = req.headers
      .get("Authorization")
      ?.replace("Bearer ", "")
      .replace("bearer ", "");

    if (!orgApiKey) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers,
      });
    }

    let org: OrgJoinIsPaidFinetunedModels | null = null;
    if (orgApiKey) {
      const authRes = await supabase
        .from("organizations")
        .select("*, is_paid(*), finetuned_models(*)")
        .eq("api_key", orgApiKey);
      if (authRes.error) throw new Error(authRes.error.message);
      org = authRes.data?.[0] ?? null;
    }
    if (!org) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers,
      });
    }
    if (!org.chat_to_docs_enabled) {
      return new Response(
        JSON.stringify({
          error: "Chat to docs is not enabled for this organization",
        }),
        {
          status: 401,
          headers,
        },
      );
    }

    // Validate that the request body is of the correct format
    const requestData = new URLSearchParams(req.url.split("?")[1]);
    if (!requestData.has("query")) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }

    const relevantDocs = await getRelevantDocChunks(
      requestData.get("query")!,
      org.id,
      3,
      supabase,
    );
    return new Response(relevantDocs.text, {
      status: 200,
      headers,
    });
  } catch (e) {
    let message: string;
    if (typeof e === "string") {
      message = e;
    } else if (e instanceof Error) {
      message = e.message;
    } else message = "Internal Server Error";
    console.error(e);
    return new Response(
      JSON.stringify({
        error: message,
      }),
      { status: 500, headers },
    );
  }
}
