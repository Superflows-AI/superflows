import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { Database } from "../../lib/database.types";
import {
  getSessionFromCookie,
  isValidBody,
} from "../../lib/edge-runtime/utils";
import { OrgJoinIsPaidFinetunedModels } from "../../lib/types";
import { z } from "zod";
import { queryEmbedding } from "../../lib/queryLLM";
import { fillVariables } from "../../lib/v3/utils";

export const config = {
  runtime: "edge",
  // Edge gets upset with our use of recharts in chat-ui-react.
  regions: ["iad1", "cle1"],
  // TODO: Make it possible to import chat-ui-react without recharts
  unstable_allowDynamic: [
    "**/node_modules/@superflows/chat-ui-react/**",
    "**/node_modules/lodash/**",
  ],
};

export const EmbedAndSaveAlternativesZod = z.object({
  questions: z.array(z.string()),
});

export type EmbedAndSaveAlternativesType = z.infer<
  typeof EmbedAndSaveAlternativesZod
>;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined!");
}
if (!process.env.SERVICE_LEVEL_KEY_SUPABASE) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}
if (!process.env.NEXT_PUBLIC_DETECT_LANGUAGE_KEY) {
  console.warn(
    `Warning: NEXT_PUBLIC_DETECT_LANGUAGE_KEY environment variable is not defined!

Set up an account on https://detectlanguage.com/ and add the api key as NEXT_PUBLIC_DETECT_LANGUAGE_KEY to ensure Superflows replies in the same language the user writes in.`,
  );
}

let redis: Redis | null = null,
  ratelimitProduction: Ratelimit | null = null;
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  redis = Redis.fromEnv();
  // Production tier rate limit is 30 requests per 10 seconds
  ratelimitProduction = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, "10 s"),
  });
}

// Bring me my Bow of burning gold:
const serviceLevelSupabase = createClient<Database>(
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

export default async function handler(req: NextRequest) {
  try {
    console.log("/api/generate-alternative-questions called!");
    if (req.method === "OPTIONS") {
      // Handle CORS preflight request
      return new Response(undefined, { status: 200 });
    }
    if (req.method !== "POST") {
      // Handle non-POST requests
      return new Response(
        JSON.stringify({
          error: "Only POST requests allowed",
        }),
        { status: 405, headers },
      );
    }

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    if (
      !isValidBody<EmbedAndSaveAlternativesType>(
        requestData,
        EmbedAndSaveAlternativesZod,
      )
    ) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }
    console.log("Req body", requestData);

    let supabase = serviceLevelSupabase;
    let { session, supabase: localSupabase } = await getSessionFromCookie(req);
    if (localSupabase) supabase = localSupabase;
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers,
      });
    }

    // Check that the user hasn't surpassed the production rate limit (protects DB query below)
    if (ratelimitProduction) {
      // If over limit, success is false
      const { success } = await ratelimitProduction.limit(session.user.id);
      if (!success) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit (30 requests/10s)" }),
          {
            status: 429,
            headers,
          },
        );
      }
    }

    const authRes = await supabase
      .from("organizations")
      .select(
        "id,name,api_key,description,model,sanitize_urls_first,language,chat_to_docs_enabled,chatbot_instructions,bertie_enabled,fallback_to_bertie,yond_cassius, is_paid(is_premium), finetuned_models(openai_name), profiles!inner(id)",
      )
      .eq("profiles.id", session.user.id)
      .single();
    if (authRes.error) throw new Error(authRes.error.message);
    const org: Omit<
      OrgJoinIsPaidFinetunedModels,
      "fun_loading_messages" | "enable_data_analysis" | "bertie_disable_direct"
    > & {
      profiles: { id: string }[];
    } = authRes.data ?? null;
    if (!org.is_paid[0].is_premium) {
      return new Response(
        JSON.stringify({
          error: "Approval feature only available to paid users",
        }),
        { status: 403, headers },
      );
    }

    const { data: variableData, error: varErr } = await supabase
      .from("approval_variables")
      .select("*")
      .eq("org_id", authRes.data.id);
    if (varErr) throw new Error(varErr.message);
    if (variableData === null || variableData.length === 0) {
      return new Response(JSON.stringify({ error: "No variable data found" }), {
        status: 400,
        headers,
      });
    }
    const variableDefaults: Record<string, any> = Object.fromEntries(
      variableData.map((v) => [v.name, v.default]),
    );
    const variableStrings = variableData.map((v) => ({
      name: v.name,
      variableStr: `${v.name}: ${v.type} // ${v.description}`,
    }));
    console.log(variableDefaults, variableStrings);
    const embedAllObj = variableData.reduce((acc, v) => {
      if (v.embed_all) {
        let type = v.type.trim();
        if (type.endsWith(")[]") && type.startsWith("(")) {
          // Set it to each of the options as solo options
          type = type.slice(1, -3).trim();
        }
        if (type.match(/^".+"(\s*\|\s*".+")+$/)) {
          // This regex checks if it's a string enum type with multiple options
          acc[v.name] = type.split("|").map((t) => t.trim().slice(1, -1));
        }
      }
      return acc;
    }, {} as Record<string, string[]>);

    const allRequests = requestData.questions.map((text, i) => ({
      text,
      embedded_text: text,
      primary_question: i === 0,
      variable_values: {},
    }));
    const requestsToEmbed = fillVariables(
      allRequests,
      variableDefaults,
      embedAllObj,
    );
    console.log(`${requestsToEmbed.length} requests to embed`);

    const start = new Date();
    const embeddings = await queryEmbedding(
      requestsToEmbed.map((r) => r.embedded_text),
      "text-embedding-3-large",
    );
    const end = new Date();
    const time = Number(end) - Number(start);
    console.log(`Took ${time}ms to embed ${requestsToEmbed.length} requests`);

    return new Response(
      JSON.stringify({
        data: requestsToEmbed.map(
          ({ text, embedded_text, primary_question, variable_values }, i) => ({
            text,
            embedding: embeddings[i],
            embedded_text,
            primary_question,
            user_added: primary_question,
            variable_values,
          }),
        ),
      }),
      {
        status: 200,
        headers,
      },
    );
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
