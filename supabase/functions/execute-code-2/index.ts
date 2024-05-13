import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Redis } from "https://esm.sh/@upstash/redis";
import { Ratelimit } from "https://cdn.skypack.dev/@upstash/ratelimit@latest";
import { Timeout } from "https://deno.land/x/timeout/mod.ts";
import {
  exponentialRetryWrapper,
  formatError,
  formatString,
  snakeToCamel,
} from "./utils.ts";
import {
  constructHttpRequest,
  makeHttpRequest,
  processAPIoutput,
} from "./requests.ts";
import { ActionPlusApiInfo } from "./types.ts";

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
  actionsPlusApi: z.array(
    z.object({
      action_type: z.string(),
      active: z.boolean(),
      api_id: z.string(),
      created_at: z.string(),
      description: z.string(),
      id: z.number(),
      keys_to_keep: z.any(),
      name: z.string(),
      org_id: z.nullable(z.number()),
      parameters: z.any(),
      path: z.nullable(z.string()),
      request_body_contents: z.any(),
      request_method: z.nullable(z.string()),
      responses: z.any(),
      tag: z.nullable(z.number()),
      api: z.object({
        api_host: z.string(),
        auth_header: z.string(),
        auth_query_param_name: z.string(),
        auth_scheme: z.nullable(z.string()),
        created_at: z.string(),
        id: z.string(),
        name: z.string(),
        org_id: z.number(),
      }),
      headers: z.array(
        z.object({
          api_id: z.string(),
          created_at: z.string(),
          id: z.string(),
          name: z.string(),
          value: z.string(),
        }),
      ),
    }),
  ),
  org: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
  }),
  code: z.string(),
  userApiKey: z.optional(z.string()),
});

type ExecuteCodeType = z.infer<typeof ExecuteCode>;

const headers = { "content-type": "application/json" };

Deno.serve(async (req) => {
  /**
   * Worth mentioning that variables are DELIBERATELY NAMED ERRATICALLY
   * since we don't want the AI to use them
   * **/
  // This adds a debugging number to the console.info() calls so it's
  // clear which are from which request
  const ranNum = Math.floor(Math.random() * 1000);
  const originalDebug = console.debug;
  console.debug = function () {
    const args = Array.prototype.slice.call(arguments);
    args.unshift(`${ranNum}:`);
    originalDebug.apply(console, args);
  };
  const originalInfo = console.info;
  console.info = function () {
    const args = Array.prototype.slice.call(arguments);
    args.unshift(`${ranNum}:`);
    originalInfo.apply(console, args);
  };
  console.info("Request received");
  let authHeader = req.headers.get("Authorization");
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
  // To block the code string from having access to the auth header
  authHeader = undefined;

  // Validate that the request body is of the correct format
  const requestData = await req.json();
  if (!isValidBody<ExecuteCodeType>(requestData, ExecuteCode)) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers,
    });
  }

  const builtinFunctionCalls: {
    type: "plot" | "log" | "error" | "call" | "call-human-format";
    args: object;
  }[] = [];

  // Prompt-injection defence code is on the NextJS side
  // Format the code based on LLM output
  const actionFunctions = requestData.actionsPlusApi
    .map((action: ActionPlusApiInfo) => {
      const camelName = snakeToCamel(action.name);
      return {
        [camelName]: async (params: Record<string, unknown>) => {
          const { url, requestOptions, logMessage } = constructHttpRequest({
            action,
            parameters: params,
            organization: requestData.org,
            userApiKey: requestData.userApiKey ?? "",
          });
          const out = await exponentialRetryWrapper(
            makeHttpRequest,
            [url, requestOptions, Deno.env.NEXT_HOSTNAME],
            2,
          );
          builtinFunctionCalls.push({
            type: "call",
            args: { name: camelName, params },
          });
          builtinFunctionCalls.push({
            type: "call-human-format",
            args: { message: logMessage },
          });
          if (out.isError) {
            throw new Error(
              `API error (${camelName}): ${JSON.stringify(
                out.output,
                undefined,
                2,
              )}`,
            );
          }
          const processed = processAPIoutput(out.output, action);
          console.debug(
            `${camelName} API response:`,
            Array.isArray(processed)
              ? // API responses can be very long
                JSON.stringify(processed.slice(0, 2), undefined, 2).slice(
                  0,
                  1000,
                ) + "\n..."
              : processed,
          );
          return processed;
        },
      };
    })
    .reduce((a, b) => ({ ...a, ...b }), {});

  const fnDefinitions = requestData.actionsPlusApi
    .map(
      (action: ActionPlusApiInfo) =>
        `async function ${snakeToCamel(action.name)}(args) {
  return await actionFunctions.${snakeToCamel(action.name)}(args ?? {});
}`,
    )
    .join("\n\n");

  function plot(
    title: string,
    type: "line" | "bar",
    data: { x: number | string; y: string }[],
    labels?: { x: string; y: string },
  ) {
    builtinFunctionCalls.push({
      type: "plot",
      args: { title, type, data, labels },
    });
  }
  // Wrap in an async function and call it to
  // const code = `
  const code = `${fnDefinitions}

async function doNotWriteAnotherFunctionCalledThis() {

// AI code starts below
${requestData.code}

return builtinFunctionCalls;
}

// Get promise from eval() call, await it outside the eval 
//  (awaits at top level are not allowed in here)
const aVariableNameThatMustNotBeRepeated = doNotWriteAnotherFunctionCalledThis();
aVariableNameThatMustNotBeRepeated
`;
  console.debug("Code\n" + code);

  // Last line must be builtinFunctionCalls since this is what's output and we ask the LLM to include it
  let result;
  const originalLog = console.log;
  console.log = (message, ...otherParams) => {
    builtinFunctionCalls.push({
      type: "log",
      args: { message: formatString(message, ...otherParams) },
    });
  };
  const originalErr = console.error;
  console.error = (message, ...otherParams) => {
    builtinFunctionCalls.push({
      type: "error",
      args: {
        message: `${message} ${otherParams.map((p) => p.toString())}`,
      },
    });
  };
  try {
    // Run code, await result
    result = eval(code);
    // Timeout if the code takes >60s to run
    result = await Timeout.race([result], 60000);

    // Reset console functions
    console.log = originalLog;
    console.error = originalErr;
    console.info("Result\n", result);

    // Ensure the output is of the correct format (after it has been returned)
    return new Response(JSON.stringify(result), {
      headers,
    });
  } catch (e) {
    console.error = originalErr;
    console.warn("Error executing code", e);
    return new Response(
      JSON.stringify([
        // Include previous output messages in output for debugging purposes
        ...builtinFunctionCalls,
        {
          type: "error",
          args: { message: formatError(e, code) },
        },
      ]),
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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function convertIsoToHumanReadable(dateStr: string): string {
  let date = new Date(dateStr);

  let day = date.getDate();
  let monthIndex = date.getMonth();
  let year = date.getFullYear();

  let suffix = "th";
  if ([1, 21, 31].includes(day)) {
    suffix = "st";
  } else if ([2, 22].includes(day)) {
    suffix = "nd";
  } else if ([3, 23].includes(day)) {
    suffix = "rd";
  }

  return `${day}${suffix} ${monthNames[monthIndex]} ${year}`;
}
