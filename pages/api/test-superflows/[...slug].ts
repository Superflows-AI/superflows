import { createClient } from "@supabase/supabase-js";
import JSON5 from "json5";
import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../lib/database.types";
import { RequestMethods } from "../../../lib/models";
import apiMockPrompt from "../../../lib/prompts/apiMock";
import { Action } from "../../../lib/types";
import { getOpenAIResponse } from "../../../lib/queryOpenAI";
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
  let regexPath = path
    .replace(/\//g, "\\/")
    .replace(/{.*?}/g, "([-a-zA-Z0-9@:%_+.~#?&/=]*)");
  const regex = new RegExp("^" + regexPath + "$");

  const res = regex.test(slug);
  return res;
}

function processMultipleMatches(matches: Action[], slug: string[]): Action[] {
  /* 
  For example when slug is 'api/v1/Customers/location' 
  It may match /api/v1/Customers/location and /api/v1/Customers/{id}
  */

  // This deals with the example in the docstring. May need to add more cases
  const match = matches.filter((match) => {
    const split = match.path?.split("/") ?? [];
    return split[split.length - 1] === slug[slug.length - 1];
  });

  if (match.length != 1)
    throw new Error(
      "Need to deal with more cases in the processMultipleMatches function" // TODO: catch this error and give a more sensible message
    );

  return match;
}

async function getResponseType(
  org_id: string,
  method: RequestMethods,
  slug: string[]
): Promise<object> {
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
    return {};
  }

  if (matches.length > 1) matches = processMultipleMatches(matches, slug);

  console.log(
    `Successfully matched slug "${slugString}" to action with path "${matches[0].path}"`
  );

  return matches[0].responses as object;
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

  const expectedResponseType = org_id
    ? await getResponseType(org_id as string, method, slug)
    : {};

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", org_id);
  if (orgError) throw orgError;
  const orgInfo = orgData.length == 1 ? orgData[0] : undefined;

  const prompt = apiMockPrompt(
    slug as string[],
    method,
    queryParams,
    req.body,
    expectedResponseType,
    orgInfo
  );
  console.log("PROMPT:\n\n", prompt[0].content, "\n\n");

  const response = await exponentialRetryWrapper(
    getOpenAIResponse,
    [prompt, {}, "4"],
    3
  );

  // const response = "{}";

  // console.log("queryParams", queryParams);
  // console.log("body params", JSON.stringify(req.body));
  // console.log("SLUG", slug);
  // res.status(200).send({});
  console.log("RESPONSE", response);

  // JSON5 means we don't have to enforce double quotes and no trailing commas
  const json = JSON5.parse(response);

  res.status(200).send({ json });
}
