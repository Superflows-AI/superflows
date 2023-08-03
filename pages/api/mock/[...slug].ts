import { createClient } from "@supabase/supabase-js";
import tokenizer from "gpt-tokenizer";

import { OpenAPIV3_1 } from "openapi-types";

import { ChatMessage } from "gpt-tokenizer/src/GptEncoding";
import { NextApiRequest, NextApiResponse } from "next";
import { Chunk, Properties, RequestMethod } from "../../../lib/models";
import apiMockPrompt from "../../../lib/prompts/apiMock";
import { getOpenAIResponse } from "../../../lib/queryOpenAI";
import { Action } from "../../../lib/types";
import {
  addGPTdataToProperties,
  exponentialRetryWrapper,
  jsonReconstruct,
  jsonSplitter,
  objectNotEmpty,
  propertiesToChunks,
  splitPath,
  transformProperties,
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

  console.error(
    `Failed to match slug: "${slug}" to single action. Candidate paths: ${matches.map(
      (match) => match.path
    )}. Returning first match.`
  );
  return [matches[0]];
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
  console.log("mock api called");
  const queryParams = req.query;
  const org_id = Number(req.headers["org_id"]);
  // Used below to extract path parameters
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
      ? ((responseCode = Object.keys(matchingAction.responses).find(
          (key) => Number(key) >= 200 && Number(key) < 300
        )),
        responses[responseCode ?? ""] ?? {})
      : {};

  const schema =
    (response.content?.["application/json"]
      ?.schema as OpenAPIV3_1.SchemaObject) ?? null;

  const requestParameters =
    objectNotEmpty(pathParameters) ||
    objectNotEmpty(queryParams) ||
    objectNotEmpty(req.body)
      ? [
          ...jsonSplitter(pathParameters),
          ...jsonSplitter(queryParams),
          ...jsonSplitter(req.body),
        ]
      : null;

  // TODO: properties can be set as array or object by the schema, currently not
  // dealing with this
  const properties = schema ? propertiesFromSchema(schema) : null;

  // Just deal with the first layer of nesting for now
  const isArray = schema?.type === "array";

  if (properties) {
    const gptResultAsJson = await getMockedProperties(
      properties,
      matchingAction?.path ?? slug.join("/"),
      method,
      requestParameters,
      orgInfo,
      isArray
    );

    res.status(responseCode ? Number(responseCode) : 200).json(gptResultAsJson);
    return;
  }

  // Hierarchy of fallbacks if we don't have full schema etc
  const fallback =
    response.content?.["application/json"]?.schema ||
    response.content?.["application/json"] ||
    response.content ||
    response;

  console.log(
    "Could not find properties in schema, mocking whole response body in one prompt"
  );
  const json = await getMockedProperties(
    fallback,
    matchingAction?.path ?? slug.join("/"),
    method,
    requestParameters,
    orgInfo
  );

  res.status(responseCode ? Number(responseCode) : 200).json(json);
}

export async function getMockedProperties(
  properties: { [key: string]: any },
  requestPath: string,
  method: RequestMethod,
  requestParameters: Chunk[] | null,
  orgInfo?: {
    name: string;
    description: string;
  },
  isArray: boolean = false
): Promise<Record<string, any>> {
  const chunks = jsonSplitter(properties);

  const allProperties = transformProperties(chunks);
  const propertiesForAi = Object.entries(allProperties)
    .filter(
      ([_, value]) =>
        value.type?.toLowerCase() !== "object" &&
        value.type?.toLowerCase() !== "array"
    )
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  // const hardCodedProperties: Properties = {};
  // const propertiesForAi: Properties = {};

  // for (const [key, value] of Object.entries(allProperties)) {
  //   const type = value.type?.toLowerCase() ?? "";
  //   if (["object", "array"].includes(type)) continue;
  //   if (type === "boolean") {
  //     value.data = isArray
  //       ? Array.from({ length: 3 }, () => Math.random() >= 0.5)
  //       : Math.random() >= 0.5;
  //     hardCodedProperties[key] = value.data;
  //   } else {
  //     propertiesForAi[key] = value;
  //   }
  // }

  // // take the first half of primitiveOnly
  // const sliced: Properties = Object.keys(propertiesForAi)
  //   .slice(0, 10)
  //   .reduce(
  //     (result, key) => ((result[key] = propertiesForAi[key]), result),
  //     {} as Properties
  //   );

  const prompt = apiMockPrompt(
    requestPath,
    method,
    requestParameters,
    propertiesForAi,
    orgInfo,
    isArray
  );
  console.log("Prompt:\n", prompt[1].content);

  const encoded = tokenizer.encodeChat(
    prompt as ChatMessage[],
    "gpt-3.5-turbo"
  );
  const nTokens = encoded.length;

  const openAiResponse = await exponentialRetryWrapper(
    getOpenAIResponse,
    [prompt, {}, nTokens < 4000 ? "3" : "3-16k"],
    3
  );

  console.log("Response:\n", openAiResponse);

  if (openAiResponse.length === 0) return { message: "Call to openai failed" };

  if (isArray)
    return rebuildPropertiesArray(
      propertiesForAi,
      openAiResponse,
      allProperties
    );
  return rebuildProperties(propertiesForAi, openAiResponse, allProperties);
}

function rebuildProperties(
  primitiveOnly: Properties,
  openAiResponse: string,
  transformed: Properties
) {
  const readded = addGPTdataToProperties(primitiveOnly, openAiResponse);
  const newChunks = propertiesToChunks(Object.assign({}, transformed, readded));
  return jsonReconstruct(newChunks);
}

function rebuildPropertiesArray(
  primitiveOnly: Properties,
  openAiResponse: string,
  transformed: Properties
) {
  const arrayResponse = [];
  for (let idx = 0; idx < 3; idx++) {
    const readded = addGPTdataToProperties(
      { ...primitiveOnly },
      openAiResponse,
      idx
    );
    const newChunks = propertiesToChunks(
      Object.assign({}, transformed, readded)
    );
    console.log("newChunks", newChunks);
    arrayResponse.push(jsonReconstruct(newChunks));
  }
  return arrayResponse;
}

function propertiesFromSchema(schema: OpenAPIV3_1.SchemaObject) {
  if (schema.properties) return schema.properties;
  if ("items" in schema && schema.items && "properties" in schema.items)
    return schema.items.properties;
  return null;
}
