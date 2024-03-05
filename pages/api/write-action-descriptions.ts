import { NextRequest } from "next/server";
import { Database } from "../../lib/database.types";
import { createClient } from "@supabase/supabase-js";
import { isValidBody } from "../../lib/edge-runtime/utils";
import { z } from "zod";
import {
  parseActionDescription,
  writeActionDescriptionLLMParams,
  writeActionDescriptionPrompt,
} from "../../lib/v2/prompts/writeActionDescription";
import { exponentialRetryWrapper } from "../../lib/utils";
import { getLLMResponse } from "../../lib/queryLLM";

export const config = {
  runtime: "edge",
};

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}
if (!process.env.SERVICE_LEVEL_KEY_SUPABASE) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}
if (!process.env.WRITE_ACTION_FILTERING_DESCRIPTION_MODEL) {
  throw new Error("WRITE_ACTION_FILTERING_DESCRIPTION_MODEL is not defined!");
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

const headers = { "Content-Type": "application/json" };

const WriteActionDescriptionZod = z.object({
  org_id: z.number(),
  action_ids: z.array(z.number()),
});
type WriteActionDescriptionType = z.infer<typeof WriteActionDescriptionZod>;

export default async function handler(req: NextRequest): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Only POST requests allowed", { status: 405, headers });
  }
  const reqBody = await req.json();
  if (
    !isValidBody<WriteActionDescriptionType>(reqBody, WriteActionDescriptionZod)
  ) {
    return new Response("Invalid request body", { status: 400, headers });
  }
  // Check key is service level key
  const authHeader = req.headers.get("Authorization");
  if (
    !authHeader ||
    !authHeader.includes(process.env.SERVICE_LEVEL_KEY_SUPABASE!)
  ) {
    return new Response("Unauthorized", { status: 401, headers });
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get the actions from the database
  const orgResponse = await supabase
    .from("actions")
    .select("*, organizations(name, description)")
    .eq("org_id", reqBody.org_id)
    .in("id", reqBody.action_ids);
  if (orgResponse.error) {
    console.error(orgResponse.error);
    return new Response(orgResponse.error.message, { status: 500, headers });
  }
  console.log(
    "Total actions found:",
    orgResponse.data.map((a) => a.name),
  );
  let actions = orgResponse.data.filter((a) => !a.filtering_description);
  // Limit to 40 actions max
  if (actions.length > 40) {
    actions = actions.filter((a) => a.active).slice(0, 40);
  }
  console.log(
    "Chosen action names:",
    actions.map((a) => a.name),
  );

  // Generate action filtering_descriptions
  await Promise.all(
    actions.map(async (action) => {
      const prompt = writeActionDescriptionPrompt({
        action,
        org: action.organizations!,
      });
      console.log("WRITE ACTIONS PROMPT:", prompt[0].content);
      const llmOut = await exponentialRetryWrapper(
        getLLMResponse,
        [
          prompt,
          writeActionDescriptionLLMParams,
          process.env.WRITE_ACTION_FILTERING_DESCRIPTION_MODEL!,
        ],
        3,
      );
      const out = parseActionDescription(llmOut);
      console.log(`WRITE ACTIONS OUT ${action.name}:`, out);
      // Update the action descriptions in the database
      const updateRes = await supabase
        .from("actions")
        .update({ filtering_description: out })
        .eq("id", action.id);
      if (updateRes.error) {
        console.error(updateRes.error);
      }
    }),
  );
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}
