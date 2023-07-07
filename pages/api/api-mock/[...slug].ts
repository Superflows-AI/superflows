import { createClient } from "@supabase/supabase-js";
import JSON5 from "json5";

const dJSON = require("dirty-json");

import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../lib/database.types";
import { RequestMethods } from "../../../lib/models";
import apiMockPrompt from "../../../lib/prompts/apiMock";
import { getOpenAIResponse } from "../../../lib/queryOpenAI";
import { Action, OrgJoinIsPaid } from "../../../lib/types";
import { exponentialRetryWrapper, splitPath } from "../../../lib/utils";

if (process.env.SERVICE_LEVEL_KEY_SUPABASE === undefined) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!");
}

export function slugMatchesPath(path: string, slug: string): boolean {
  if (splitPath(path).length !== splitPath(slug).length) return false;

  // Match path to slug but allow for {} slugs to match anything
  let regexPath =
    path
      .replace(/\//g, "\\/")
      .replace(/{.*?}/g, "([-a-zA-Z0-9@:%_+.~#?&/=]*)") + "?";

  const regex = new RegExp("^" + regexPath + "$");

  return regex.test(slug);
}

export function processMultipleMatches(
  matches: Action[],
  slug: string[]
): Action[] {
  // slug = 'api/v1/Customers/location'. matches = /api/v1/Customers/location and /api/v1/Customers/{id}.
  const matchEnd = matches.filter((match) => {
    const split = match.path?.split("/").filter((arr) => arr !== "") ?? [];
    return split[split.length - 1] === slug[slug.length - 1];
  });
  if (matchEnd.length === 1) return matchEnd;

  const paramMatcher = (slugSegment: string, pathSegment: string) =>
    (pathSegment.includes("{") && pathSegment.includes("}")) ||
    slugSegment === pathSegment;

  // slug = 'api/v2/Coordinators/1234'. matches = "/api/v2/Coordinators/{id}". "/api/v2/Coordinators/location"
  const matchWithParams = matches.filter((match) => {
    const split = match.path?.split("/").filter((arr) => arr !== "") ?? [];
    return slug.every((slugSegment, i) => paramMatcher(slugSegment, split[i]));
  });

  if (matchWithParams.length === 1) return matchWithParams;

  throw new Error(
    `Failed to match slug: "${slug}" to single action. Candidate paths: ${matches.map(
      (match) => match.path
    )}`
  );
}

export function getMatchingAction(
  org_id: number,
  actions: Action[],
  method: RequestMethods,
  slug: string[]
): Action | null {
  // Note: Assumes you have already filtered by request method

  const slugString = "/" + slug.join("/");

  let matches = actions.filter((action) => {
    return action.path && slugMatchesPath(action.path, slugString);
  });

  if (matches.length === 0) {
    console.log(
      `Could not match slug "${slugString}" with method "${method}" to any action in the database for organisation "${org_id}"`
    );
    return null;
  }

  if (matches.length > 1) matches = processMultipleMatches(matches, slug);

  console.log(
    `Successfully matched slug "${slugString}" to action with path "${matches[0].path}"`
  );

  return matches[0];
}

export function getPathParameters(
  path: string,
  querySlugs: string[]
): { [name: string]: string } {
  let variables: { [name: string]: string } = {};
  const urlSlugs = path.split("/").filter((slug) => slug !== "");
  if (urlSlugs.length !== querySlugs.length)
    throw new Error(
      `Path and query slugs lengths do not match: [${urlSlugs}] AND [${querySlugs}]`
    );

  for (let index = 0; index < urlSlugs.length; index++) {
    // slicing to remove { and } from urlSlugs variable name
    if (urlSlugs[index].startsWith("{") && urlSlugs[index].endsWith("}")) {
      const variableName = urlSlugs[index].slice(1, urlSlugs[index].length - 1);
      variables[variableName] = querySlugs[index];
    }
  }
  return variables;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const queryParams = req.query;
  const org_id = Number(req.headers["org_id"]);
  const slug = queryParams.slug as string[];
  delete queryParams.slug;
  const method = req.method as RequestMethods;

  // Authenticate the user
  const authUserSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      global: { headers: { Authorization: req.headers.authorization ?? "" } },
    }
  );
  // Bring me my Bow of burning gold:
  const supabase = createClient(
    // Bring me my arrows of desire:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    // Bring me my Spear: O clouds unfold!
    process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
    // Bring me my Chariot of fire!
  );

  // Authenticate that the user is allowed to use this API
  let token = (req.headers["Authorization"] as string)
    ?.replace("Bearer ", "")
    .replace("bearer ", "");
  if (token) {
    const authRes = await supabase
      .from("organizations")
      .select("*, is_paid(*)")
      .eq("api_key", token)
      .single();
    if (authRes.error) throw new Error(authRes.error.message);
  }

  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .eq("org_id", org_id)
    .eq("request_method", method.toLowerCase())
    .eq("active", true);

  if (error) throw error;

  const matchingAction = org_id
    ? getMatchingAction(org_id, actions, method, slug)
    : null;

  const pathParameters =
    matchingAction?.path?.includes("{") && matchingAction?.path?.includes("}")
      ? getPathParameters(matchingAction.path, slug)
      : {};

  const responses = matchingAction?.responses as { [key: string]: any };

  let responseCode;
  // Search for a 2xx response starting at 200
  const response =
    matchingAction && matchingAction.responses
      ? ((responseCode = Object.entries(matchingAction.responses).find(
          ([key, value]) => Number(key) >= 200 && Number(key) < 300
        )?.[0]),
        responses[responseCode ?? ""] ?? {})
      : {};

  const expectedResponseType =
    response.content?.["application/json"]?.schema ?? response;

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", org_id);
  if (orgError) throw orgError;

  const orgInfo = orgData.length === 1 ? orgData[0] : undefined;

  const prompt = apiMockPrompt(
    matchingAction?.path ?? slug.join("/"),
    method,
    pathParameters,
    queryParams,
    req.body,
    expectedResponseType,
    orgInfo
  );
  const openAiResponse = await exponentialRetryWrapper(
    getOpenAIResponse,
    [prompt, {}, "3"],
    3
  );

  let json;
  try {
    // JSON5 means we don't have to enforce double quotes and no trailing commas
    json = JSON5.parse(openAiResponse);
  } catch (e) {
    // The dirty json parser is opinionated and imperfect but can e.g. parse this:
    // {
    //   "a": 1,
    //   "b": 2,,
    //   "c": 3
    // }
    try {
      json = dJSON.parse(openAiResponse);
    } catch (e) {
      console.log("Failed to parse response as JSON", openAiResponse);
      throw e;
    }
  }

  res.status(responseCode ? Number(responseCode) : 200).send(json);
}
