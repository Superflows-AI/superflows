import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://cdn.skypack.dev/@upstash/ratelimit@latest";

let redis: Redis | null = null,
  ratelimit: Ratelimit | null = null;
if (
  Deno.env.get("UPSTASH_REDIS_REST_URL") &&
  Deno.env.get("UPSTASH_REDIS_REST_TOKEN")
) {
  redis = new Redis({
    url: Deno.env.get("UPSTASH_REDIS_REST_URL"),
    token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN"),
  });

  // Rate limit is 30 requests per 10 seconds
  ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(30, "10 s"),
  });
}

const ExecuteCode = z.object({
  data: z.record(z.string(), z.any()),
  code: z.string(),
});

type ExecuteCodeType = z.infer<typeof ExecuteCode>;

const headers = { "content-type": "application/json" };

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  // Auth check
  if (authHeader !== "Bearer " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return new Response(JSON.stringify({ error: "Invalid auth" }), {
      status: 401,
      headers,
    });
  }

  // Check that the user hasn't surpassed the rate limit
  if (ratelimit) {
    // If over limit, success is false
    const { success } = await ratelimit.limit(authHeader.split("earer")[1]);
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

  // Validate that the request body is of the correct format
  const requestData = await req.json();
  if (!isValidBody<ExecuteCodeType>(requestData, ExecuteCode)) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers,
    });
  }

  // Prompt-injection defence code is on the NextJS side
  // Format the code based on LLM output
  const data = requestData.data;
  const initialiseDataString = Object.keys(requestData.data)
    .map((key) => {
      return `const ${key} = data.${key};`;
    })
    .join("\n");

  const code = `${initialiseDataString}
${requestData.code}
graphData`;
  console.log("Code\n" + code);
  console.log("Data\n", data);

  // Last line must be graphData since this is what's output and we ask the LLM to include it
  let result;
  try {
    result = eval(code);
    console.log("Result\n", result);

    // TODO: Ensure the output is of the correct format (after it has been returned)
    return new Response(JSON.stringify(result), {
      headers,
    });
  } catch (e) {
    console.error("Error executing code", e);
    return new Response(
      JSON.stringify({ error: ("" + e).split("Error: ")[1] }),
      {
        headers,
      },
    );
  }
});

export function isValidBody<T extends Record<string, unknown>>(
  body: any,
  bodySchema: z.ZodType<any>,
): body is T {
  const safeParseOut = bodySchema.safeParse(body);
  if ("error" in safeParseOut) {
    console.error(
      "Error parsing request body: " + safeParseOut.error.toString(),
    );
  }
  return safeParseOut.success;
}
