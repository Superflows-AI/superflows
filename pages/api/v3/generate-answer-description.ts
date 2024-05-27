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
  Action,
  ApprovalAnswer,
  ApprovalAnswerMessage,
  ApprovalQuestion,
  Organization,
  OrgJoinIsPaidFinetunedModels,
} from "../../../lib/types";
import { z } from "zod";
import {
  codeFnNameDescriptionGenerationPrompt,
  ParsedResponse,
  parseFnNameDescriptionOut,
  SimilarFunction,
} from "../../../lib/v3/prompts_parsers/descriptionGeneration";
import {
  exponentialRetryWrapper,
  logPrompt,
  range,
  snakeToCamel,
} from "../../../lib/utils";
import { parseFilteringOutputv3 } from "../../../lib/v3/prompts_parsers/filtering";
import { parseCodeGenv3 } from "../../../lib/v3/prompts_parsers/codeGen";
import { getLLMResponse } from "../../../lib/queryLLM";
import { Session } from "@supabase/auth-helpers-react";
import { ChatGPTMessage } from "../../../lib/models";

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

export const GenerateDescriptionZod = z.object({
  answer_id: z.string(),
});

export type GenerateAnswerOfflineType = z.infer<typeof GenerateDescriptionZod>;

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
    console.log("/api/v3/generate-answer-description called!");
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
      !isValidBody<GenerateAnswerOfflineType>(
        requestData,
        GenerateDescriptionZod,
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
      const authToken = req.headers.get("Authorization");
      if (
        authToken &&
        // If the user is authenticated with the service level key, allow access
        authToken.includes(process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "")
      ) {
        const answerData = await serviceLevelSupabase
          .from("approval_answers")
          .select("org_id, organizations(*, profiles(id))")
          .eq("id", requestData.answer_id)
          .single();
        if (answerData.error) throw new Error(answerData.error.message);
        if (
          !answerData.data.organizations ||
          !answerData.data.organizations.profiles
        ) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers,
          });
        }
        session = {
          user: { id: answerData.data.organizations!.profiles[0].id },
        } as Session;
      } else {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers,
        });
      }
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

    // All approval info
    const { data: approvalAnswersDataArr, error: approvalAnswersError } =
      await supabase
        .from("approval_answers")
        .select(
          "approved,generation_failed,is_generating, approval_questions(id,primary_question,text), approval_answer_messages(*)",
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

    // Get similar function names used in both docs and code answers
    let primaryQ = approvalAnswersData.approval_questions.find(
      (q) => q.primary_question,
    );
    if (!primaryQ) {
      primaryQ = approvalAnswersData.approval_questions[0];
    }
    const { data: embeddingData, error: embeddingErr } = await supabase
      .from("approval_questions")
      .select("embedding")
      .eq("id", primaryQ.id)
      .single();
    if (embeddingErr) throw new Error(embeddingErr.message);
    // Get similar function names
    let { data: matches, error } = await supabase.rpc(
      "search_approved_answers_with_group_ranking",
      {
        query_embedding: embeddingData.embedding,
        similarity_threshold: -1,
        // Really 6 since the best match to this answer is itself
        match_count: 7,
        _org_id: org.id,
      },
    );
    if (error) {
      throw new Error("ERROR: " + error.message);
    }
    // Cut the gap from top to 0.2 max
    let similarFunctions: SimilarFunction[] = [];
    if (matches) {
      matches = matches
        // Remove the current answer
        .filter((m) => m.answer_id !== requestData.answer_id)
        .filter(
          (m: any) => matches![0].mean_similarity - m.mean_similarity <= 0.2,
        );
      const { data: matchesFnNames, error: matchesFnNamesError } =
        await supabase
          .from("approval_answers")
          .select("fnName, description")
          .in(
            "id",
            matches.map((m) => m.answer_id),
          );
      if (matchesFnNamesError) {
        throw new Error(matchesFnNamesError.message);
      }
      similarFunctions = matchesFnNames.filter(Boolean);
    }
    console.log(
      "Similar function names",
      similarFunctions.map((m) => m.fnName),
    );

    // If it's a docs answer, go a different path
    const isDocs = approvalAnswersData.approval_answer_messages.some(
      (q) =>
        // Poorly named for this purpose, but function messages are only used by docs answers
        q.message_type === "function",
    );

    // Try 3 times to generate a unique function name - failing this, add a number to the end
    let parsedOut: ParsedResponse | null = null,
      runCount = 0,
      complete = false;
    while (runCount < 3 && !complete) {
      runCount++;
      if (isDocs) {
        throw new Error(
          "Docs answers not supported in function name description generation",
        );
      }
      const output = await generateFnNameAndDescription(
        approvalAnswersData,
        primaryQ,
        org,
        similarFunctions,
      );
      if (!("functionName" in output)) return output;
      parsedOut = output;

      // Check if clashes with a fnName already in the DB
      const { data: existingAnswer, error: existingAnswerError } =
        await supabase
          .from("approval_answers")
          .select("fnName, description")
          .eq("fnName", parsedOut.functionName)
          .neq("id", requestData.answer_id);
      if (existingAnswerError) throw new Error(existingAnswerError.message);
      if (existingAnswer.length > 0) {
        console.warn(`Name clash: ${parsedOut.functionName} already exists`);
        // Add to similar functions so next prompt it will know not to use this name again
        similarFunctions.unshift(existingAnswer[0]);
      } else complete = true;
    }
    if (parsedOut === null) {
      throw new Error("Failed to generate function name and description");
    }
    if (!complete) {
      // Look for fnNames with 2-9 appended on the end
      const { data: existingAnswer, error: existingAnswerError } =
        await supabase
          .from("approval_answers")
          .select("fnName, description")
          .in(
            "fnName",
            range(2, 10).map((n) => parsedOut!.functionName + n),
          )
          .neq("id", requestData.answer_id);
      if (existingAnswerError) throw new Error(existingAnswerError.message);
      // If no matches, append 2 - otherwise increment the highest number match + 1 (extremely rare)
      if (existingAnswer.length === 0) {
        parsedOut.functionName += "2";
      } else {
        const sortedExistingAnswers = existingAnswer.sort((a, b) =>
          a.fnName > b.fnName ? 1 : -1,
        );
        const lastNumber = parseInt(
          sortedExistingAnswers[sortedExistingAnswers.length - 1].fnName.slice(
            -1,
          ),
        );
        parsedOut.functionName += (lastNumber + 1).toString();
      }
    }

    // Store in DB
    const { error: updateErr } = await supabase
      .from("approval_answers")
      .update({
        fnName: parsedOut.functionName,
        description: parsedOut.description,
      })
      .eq("id", requestData.answer_id);
    if (updateErr) throw new Error(updateErr.message);

    return new Response(JSON.stringify({ message: "Success!" }), {
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

async function generateFnNameAndDescription(
  approvalAnswersData: Pick<
    ApprovalAnswer,
    "approved" | "generation_failed" | "is_generating"
  > & {
    approval_questions: Pick<
      ApprovalQuestion,
      "id" | "primary_question" | "text"
    >[];
    approval_answer_messages: ApprovalAnswerMessage[];
  },
  primaryQ: Pick<ApprovalQuestion, "id" | "primary_question" | "text">,
  org: Pick<
    Organization,
    "id" | "name" | "description" | "chat_to_docs_enabled"
  >,
  similarFunctions: SimilarFunction[],
): Promise<ParsedResponse | Response> {
  let prompt: ChatGPTMessage[]; // Used when paths below rejoin
  // if (isDocs) {
  //   const docsCall = approvalAnswersData.approval_answer_messages.find(
  //     (q) => q.message_type === "function",
  //   );
  //   if (!docsCall) {
  //     throw new Error("No docs call despite there being one earlier");
  //   } else if (
  //     // Absurd check to make TS happy
  //     docsCall.generated_output === null ||
  //     docsCall.generated_output.length === 0 ||
  //     typeof docsCall.generated_output[0] !== "object" ||
  //     docsCall.generated_output[0] === null ||
  //     !("content" in docsCall.generated_output[0]) ||
  //     !docsCall.generated_output[0].content
  //   ) {
  //     throw new Error("No generated output for docs call");
  //   }
  //   prompt = docsFnNameDescriptionGenerationPrompt({
  //     userRequest: primaryQ.text,
  //     org: org,
  //     docsMessage: docsCall.generated_output[0]!.content.toString(),
  //     similarFnNames: similarFunctions,
  //   });
  // } else {
  // Get all variable info
  const { data: approvalVariableData, error: approvalVariableError } =
    await serviceLevelSupabase
      .from("approval_variables")
      .select("*")
      .eq("org_id", org.id);
  if (approvalVariableError) throw new Error(approvalVariableError.message);

  // Get actions
  const { data: activeActions, error: actionErr } = await serviceLevelSupabase
    .from("actions")
    .select("*")
    .match({ active: true, org_id: org.id });
  if (actionErr) throw new Error(actionErr.message);

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

  const codeMessage = approvalAnswersData.approval_answer_messages.find(
    (m) => m.message_type === "code",
  );
  if (!codeMessage) {
    return new Response(
      JSON.stringify({
        error: "No code message associated with this answer id",
      }),
      { status: 400, headers },
    );
  }
  if (approvalAnswersData.approval_questions.length === 0) {
    return new Response(
      JSON.stringify({
        error: "No questions associated with this answer id",
      }),
      { status: 400, headers },
    );
  }
  const filteringMessage = approvalAnswersData.approval_answer_messages.find(
    (m) => m.message_type === "filtering",
  );
  if (!filteringMessage) {
    return new Response(
      JSON.stringify({
        error: "No filtering message associated with this answer id",
      }),
      { status: 400, headers },
    );
  }
  const filteredActions = parseFilteringOutputv3(
    filteringMessage.raw_text,
    activeActions.map((a) => snakeToCamel(a.name)),
  )
    .selectedFunctions.filter((fn) =>
      // Only include functions actually used in the code
      parseCodeGenv3(codeMessage.raw_text).code.includes(fn),
    )
    .map((fn) => activeActions.find((a) => snakeToCamel(a.name) === fn))
    .filter(Boolean) as Action[];

  prompt = codeFnNameDescriptionGenerationPrompt({
    userRequest: primaryQ.text,
    org: org,
    code: codeMessage.raw_text,
    filteredActions,
    variables: approvalVariableData,
    similarFnNames: similarFunctions,
  });
  // }

  logPrompt(prompt);
  const llmResponse = await exponentialRetryWrapper(
    getLLMResponse,
    [
      prompt,
      { temperature: 0.4, max_tokens: 200, stop: ["</functionName"] },
      "anthropic/claude-3-opus-20240229",
    ],
    3,
  );
  const parsedOut = parseFnNameDescriptionOut(
    `<description>${llmResponse}</functionName>`,
  );
  console.log(
    `LLM Response:\n${llmResponse}\n\nParsed: ${JSON.stringify(parsedOut)}`,
  );
  return parsedOut;
}
