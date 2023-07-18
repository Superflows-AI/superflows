import { createClient } from "@supabase/supabase-js";
import JSON5 from "json5";

const dJSON = require("dirty-json");

import { NextApiRequest, NextApiResponse } from "next";
import {
  OpenAPISchema as OpenAPISchema,
  RequestMethod,
} from "../../../lib/models";
import apiMockPrompt from "../../../lib/prompts/apiMock";
import { getOpenAIResponse } from "../../../lib/queryOpenAI";
import { Action, Organization } from "../../../lib/types";
import {
  chunkKeyValuePairs,
  deepMerge,
  exponentialRetryWrapper,
  splitPath,
} from "../../../lib/utils";

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
  method: RequestMethod,
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

// Bring me my Bow of burning gold:
const supabase = createClient(
  // Bring me my arrows of desire:
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Bring me my Spear: O clouds unfold!
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
  // Bring me my Chariot of fire!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const queryParams = req.query;
  const org_id = Number(req.headers["org_id"]);
  const slug = queryParams.slug as string[];
  delete queryParams.slug;
  const method = req.method as RequestMethod;

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
  if (error) throw new Error(error.message);

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", org_id);
  if (orgError) throw orgError;

  const matchingAction = org_id
    ? getMatchingAction(org_id, actions, method, slug)
    : null;

  const pathParameters =
    matchingAction?.path?.includes("{") && matchingAction?.path?.includes("}")
      ? getPathParameters(matchingAction.path, slug)
      : {};

  const orgInfo = orgData.length === 1 ? orgData[0] : undefined;
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

  const schema =
    (response.content?.["application/json"]?.schema as OpenAPISchema) ?? null;

  const properties = schema ? propertiesFromSchema(schema) : null;

  // TODO - deal with arrays (probably better off overhauling the JSON structure rather than trying to split and rejoin arrays)
  if (schema && properties && schema.type === "object") {
    const allJson = await mockWithChunkedResponse(
      schema,
      matchingAction,
      queryParams,
      slug,
      method,
      pathParameters,
      req,
      orgInfo
    );

    res.status(responseCode ? Number(responseCode) : 200).json(allJson);
    return;
  }

  // Hierarchy of fallbacks if we don't have full schema etc
  const fallback =
    response.content?.["application/json"].schema ||
    response.content?.["application/json"] ||
    response.content ||
    response;

  console.log(
    "Could not find properties in schema, mocking whole response body in one prompt"
  );
  const json = await mockResponse(
    fallback,
    matchingAction,
    queryParams,
    slug,
    method,
    pathParameters,
    req.body,
    orgInfo
  );

  res.status(responseCode ? Number(responseCode) : 200).json(json);
}

function propertiesFromSchema(schema: OpenAPISchema) {
  return schema.properties
    ? schema.properties
    : schema.items?.properties
    ? schema.items?.properties
    : null;
}

async function mockWithChunkedResponse(
  schema: OpenAPISchema,
  matchingAction: Action | null,
  queryParams: Partial<{ [key: string]: string | string[] }>,
  slug: string[],
  method: RequestMethod,
  pathParameters: { [name: string]: string },
  req: NextApiRequest,
  orgInfo: any
) {
  // This should be a load of key-value pairs so it should not be too hard to split up but possible alternative structures
  const chunkedProperties = chunkKeyValuePairs(
    propertiesFromSchema(schema)!,
    5
  );

  const allJson = await Promise.all(
    chunkedProperties.map((chunk) =>
      mockResponse(
        subsampleSchemaProperties(schema, chunk),
        matchingAction,
        queryParams,
        slug,
        method,
        pathParameters,
        req.body,
        orgInfo
      )
    )
  );

  return allJson.reduce((acc, obj) => deepMerge(acc, obj), {});
}

function subsampleSchemaProperties(
  schema: OpenAPISchema,
  propertiesSubset: { [key: string]: any }
) {
  let responseTypeSubset: OpenAPISchema = {};
  let required: string[] | undefined;

  if (schema.properties) {
    required = schema.required?.filter((item: string) =>
      Object.keys(propertiesSubset).includes(item)
    );
    responseTypeSubset = {
      ...schema,
      properties: propertiesSubset,
      required,
    };
  } else if (schema.items?.properties) {
    if (schema.items.required) {
      required = schema.items.required.filter((item: string) =>
        Object.keys(propertiesSubset).includes(item)
      );
    }

    responseTypeSubset = {
      ...schema,
      items: {
        ...schema.items,
        properties: propertiesSubset,
        required,
      },
    };
  }
  return responseTypeSubset;
}

async function mockResponse(
  responseType: OpenAPISchema | object,
  matchingAction: Action | null,
  queryParams: Partial<{ [key: string]: string | string[] }>,
  slug: string[],
  method: RequestMethod,
  pathParameters: { [name: string]: string },
  requestBodyParameters: { [key: string]: any },
  orgInfo: Organization
) {
  const prompt = apiMockPrompt(
    matchingAction?.path ?? slug.join("/"),
    method,
    pathParameters,
    queryParams,
    requestBodyParameters,
    responseType,
    orgInfo
  );

  console.log("\n\n\n\nMock Prompt:\n\n", prompt[1].content, "\n\n\n\n");

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
      throw e; // TODO: probably best to fallback to ignore the broken chunk
    }
  }
  return json;
}
