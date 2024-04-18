import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { Database } from "../../../lib/database.types";
import {
  getSessionFromCookie,
  isValidBody,
} from "../../../lib/edge-runtime/utils";
import {
  ActionTagJoinApiAndHeaders,
  OrgJoinIsPaidFinetunedModels,
} from "../../../lib/types";
import { z } from "zod";
import { Cassius } from "../../../lib/v3/edge-runtime/ai";

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

export const GenerateAnswerOfflineZod = z.object({
  answer_id: z.string(),
  user_api_key: z.optional(z.string()),
});

export type GenerateAnswerOfflineType = z.infer<
  typeof GenerateAnswerOfflineZod
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
    console.log("/api/v3/generate-answer-offline called!");
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

    const { session } = await getSessionFromCookie(req);
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

    const authRes = await serviceLevelSupabase
      .from("organizations")
      .select(
        "id,name,api_key,description,model,sanitize_urls_first,language,chat_to_docs_enabled,chatbot_instructions,bertie_enabled,fallback_to_bertie,yond_cassius, is_paid(is_premium), finetuned_models(openai_name), profiles!inner(id)",
      )
      .eq("profiles.id", session.user.id)
      .single();
    if (authRes.error) throw new Error(authRes.error.message);
    const org: Omit<
      OrgJoinIsPaidFinetunedModels,
      "fun_loading_messages" | "enable_data_analysis"
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
    } else if (!org.yond_cassius) {
      return new Response(
        JSON.stringify({
          error: "Approval not enabled, so this feature is not available",
        }),
        { status: 403, headers },
      );
    }

    // Validate that the request body is of the correct format
    const requestData = await req.json();
    if (
      !isValidBody<GenerateAnswerOfflineType>(
        requestData,
        GenerateAnswerOfflineZod,
      )
    ) {
      return new Response(JSON.stringify({ message: "Invalid request body" }), {
        status: 400,
        headers,
      });
    }
    console.log("Req body", requestData);

    // All approval info
    const { data: approvalAnswersDataArr, error: approvalAnswersError } =
      await serviceLevelSupabase
        .from("approval_answers")
        .select(
          "approved,generation_failed,is_generating, approval_questions(primary_question, text), approval_answer_messages(*)",
        )
        .match({ id: requestData.answer_id, org_id: org.id });
    if (approvalAnswersError) throw new Error(approvalAnswersError.message);
    if (!approvalAnswersDataArr || approvalAnswersDataArr.length === 0)
      return new Response(JSON.stringify({ error: "Answer_id invalid" }), {
        status: 400,
        headers,
      });
    const approvalAnswersData = approvalAnswersDataArr[0];

    // Ensure it's not already generating an answer or failed to generate
    if (approvalAnswersData.is_generating) {
      return new Response(
        JSON.stringify({
          error: "Answer is already being generated",
        }),
        { status: 400, headers },
      );
    } else if (approvalAnswersData.generation_failed) {
      return new Response(
        JSON.stringify({
          error: "Answer already attempted and failed to generate",
        }),
        { status: 400, headers },
      );
    } else if (
      !approvalAnswersData.approval_questions ||
      approvalAnswersData.approval_questions.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "No questions associated with this answer id",
        }),
        { status: 400, headers },
      );
    }

    // Update DB to be generating an answer
    const { error: updateApprovalAnswersErr } = await serviceLevelSupabase
      .from("approval_answers")
      .update({ is_generating: true })
      .eq("id", requestData.answer_id);
    if (updateApprovalAnswersErr) {
      throw new Error(updateApprovalAnswersErr.message);
    }

    // Get all variable info
    const { data: approvalVariableData, error: approvalVariableError } =
      await serviceLevelSupabase
        .from("approval_variables")
        .select("*")
        .eq("org_id", org.id);
    if (approvalVariableError) throw new Error(approvalVariableError.message);

    // Get actions
    const { data: actionsWithTagsData, error: actionTagErr } =
      await serviceLevelSupabase
        .from("action_tags")
        .select("*,actions!inner(*),apis(*, fixed_headers(*))")
        .eq("org_id", org.id)
        .eq("actions.active", true);
    if (actionTagErr) throw new Error(actionTagErr.message);
    const actionsWithTags: ActionTagJoinApiAndHeaders[] =
      actionsWithTagsData ?? [];

    const activeActions = actionsWithTags!
      .map((tag) => {
        // Store the api_host with each action
        return tag.actions.map((a) => ({
          ...a,
          api: tag.apis!,
          headers: tag.apis?.fixed_headers ?? [],
        }));
      })
      .flat()
      .filter((action) => action.active);

    if (
      !activeActions ||
      (activeActions.length === 0 && !org.chat_to_docs_enabled)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "You have no active actions set for your organization. Add them if you have access to the Superflows dashboard or reach out to your IT team.",
        }),
        { status: 400, headers },
      );
    }
    activeActions.forEach((action) => {
      // Check that every action has an api_host
      if (!action.api.api_host) {
        return new Response(
          JSON.stringify({
            error: `No API host found for action with name: ${action.name} - add an API host on the API settings page`,
          }),
          { status: 400, headers },
        );
      }
    });

    console.log(
      `${activeActions.length} active actions found: ${JSON.stringify(
        activeActions.map((a) => a.name),
      )}`,
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        const success = await Cassius(
          controller,
          requestData,
          activeActions,
          org!,
          approvalAnswersData,
          approvalVariableData,
        );
        const { error: noLongerGeneratingErr } = await serviceLevelSupabase
          .from("approval_answers")
          .update({ is_generating: false, generation_failed: !success })
          .eq("id", requestData.answer_id);
        if (noLongerGeneratingErr) {
          throw new Error(noLongerGeneratingErr.message);
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
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
