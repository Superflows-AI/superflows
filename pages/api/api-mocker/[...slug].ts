import { createClient } from "@supabase/supabase-js";
import JSON5 from "json5";

const dJSON = require("dirty-json");

import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../lib/database.types";
import { RequestMethods } from "../../../lib/models";
import apiMockPrompt from "../../../lib/prompts/apiMock";
import { getOpenAIResponse } from "../../../lib/queryOpenAI";
import { Action } from "../../../lib/types";
import { exponentialRetryWrapper } from "../../../lib/utils";

if (process.env.SERVICE_LEVEL_KEY_SUPABASE === undefined) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!");
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
);

function slugMatchesPath(path: string, slug: string): boolean {
  let regexPath =
    path
      .replace(/\//g, "\\/")
      .replace(/{.*?}/g, "([-a-zA-Z0-9@:%_+.~#?&/=]*)") + "?";

  const regex = new RegExp("^" + regexPath + "$");

  const res = regex.test(slug);
  return res;
}

export function processMultipleMatches(
  matches: Action[],
  slug: string[]
): Action[] {
  /*
  For example when slug is 
  It may match 
  */

  // slug = 'api/v1/Customers/location'. matches = /api/v1/Customers/location and /api/v1/Customers/{id}.
  const matchEnd = matches.filter((match) => {
    const split = match.path?.split("/") ?? [];
    return split[split.length - 1] === slug[slug.length - 1];
  });
  if (matchEnd.length === 1) return matchEnd;

  // slug = 'api/v2/Coordinators/1234'. matches = "/api/v2/Coordinators/{id}". "/api/v2/Coordinators/location"
  const matchPenultimate = matches.filter((match) => {
    const split = match.path?.split("/") ?? [];
    return (
      split[split.length - 1].includes("}") &&
      split[split.length - 1].includes("{") &&
      split[split.length - 2] === slug[slug.length - 2]
    );
  });
  if (matchPenultimate.length === 1) return matchPenultimate;

  throw new Error(
    `Failed to match slug: "${slug}" to single action. Candidate paths: ${matches.map(
      (match) => match.path
    )}`
  );
}

async function getMatchingAction(
  org_id: string,
  method: RequestMethods,
  slug: string[]
): Promise<Action | null> {
  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .eq("org_id", org_id)
    .eq("request_method", method.toLowerCase())
    .eq("active", true);

  if (error) throw error;
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

function getPathParameters(
  path: string,
  querySlugs: string[]
): { [name: string]: string } {
  let variables: { [name: string]: string } = {};
  console.log("pathyyyy", path);
  const urlSlugs = path.split("/").filter((slug) => slug !== "");
  if (urlSlugs.length !== querySlugs.length)
    throw new Error(
      `Path and query slugs lengths do not match: [${urlSlugs}] AND  [${querySlugs}]`
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
  const org_id = req.headers["org_id"];
  const slug = queryParams.slug as string[];
  delete queryParams.slug;
  const method = req.method as RequestMethods;

  const matchingAction = org_id
    ? await getMatchingAction(org_id as string, method, slug)
    : null;

  if (
    matchingAction &&
    !matchingAction.responses &&
    !("200" in (matchingAction.responses as object))
  ) {
    throw new Error("200 not in response type"); // TODO: probably a 201 in some cases
  }

  const pathParameters =
    matchingAction?.path?.includes("{") && matchingAction?.path?.includes("}")
      ? getPathParameters(matchingAction.path, slug)
      : {};

  // @ts-ignore
  const response = matchingAction.responses["200"];
  const expectedResponseType =
    response.content?.["application/json"]?.schema ?? response;

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", org_id);
  if (orgError) throw orgError;

  const orgInfo = orgData.length == 1 ? orgData[0] : undefined;

  const prompt = apiMockPrompt(
    matchingAction?.path ?? slug.join("/"),
    method,
    pathParameters,
    queryParams,
    req.body,
    expectedResponseType,
    orgInfo
  );
  console.log("PROMPT:\n\n", prompt[1].content, "\n\n");

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
    json = dJSON.parse(openAiResponse);
  }
  res.status(200).send({ json });
}
