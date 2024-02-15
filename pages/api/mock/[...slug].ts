import { createClient } from "@supabase/supabase-js";
import tokenizer from "gpt-tokenizer";

import { OpenAPIV3_1 } from "openapi-types";

import { ChatMessage } from "gpt-tokenizer/src/GptEncoding";
import { NextApiRequest, NextApiResponse } from "next";
import { Chunk, Properties, RequestMethod } from "../../../lib/models";
import apiMockPrompt from "../../../lib/prompts/apiMock";
import { getLLMResponse, getSecondaryModel } from "../../../lib/queryLLM";
import { Action } from "../../../lib/types";
import {
  addGPTdataToProperties,
  exponentialRetryWrapper,
  jsonReconstruct,
  jsonSplitter,
  objectNotEmpty,
  propertiesToChunks,
  splitPath,
  chunksToProperties,
} from "../../../lib/utils";
import { getJsonMIMEType } from "../../../lib/edge-runtime/utils";

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
  slug: string[],
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
      (match) => match.path,
    )}. Returning first match.`,
  );
  return [matches[0]];
}

export function getMatchingAction(
  org_id: number,
  actions: Action[],
  method: RequestMethod,
  slug: string[],
): Action | null {
  // Note: Assumes you have already filtered by request method

  const slugString = "/" + slug.join("/");

  let matches = actions.filter((action) => {
    return action.path && slugMatchesPath(action.path, slugString);
  });

  if (matches.length === 0) {
    console.log(
      `Could not match slug "${slugString}" with method "${method}" to any action in the database for organisation "${org_id}"`,
    );
    return null;
  }

  if (matches.length > 1) matches = processMultipleMatches(matches, slug);

  console.log(
    `Successfully matched slug "${slugString}" to action with path "${matches[0].path}"`,
  );

  return matches[0];
}

export function getPathParameters(
  path: string,
  querySlugs: string[],
): { [name: string]: string } {
  let variables: { [name: string]: string } = {};
  const urlSlugs = path.split("/").filter((slug) => slug !== "");
  if (urlSlugs.length !== querySlugs.length)
    throw new Error(
      `Path and query slugs lengths do not match: [${urlSlugs}] AND [${querySlugs}]`,
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
  process.env.API_SUPABASE_URL ?? process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
  // Bring me my Chariot of fire!
  {
    auth: {
      persistSession: false,
    },
  },
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  console.log("mock api called");
  const queryParams = req.query;
  const org_id = Number(req.headers["org_id"]);
  if (isNaN(org_id)) {
    res.status(400).json({
      message: `Internal error: Invalid org_id header "${org_id}"`,
    });
    return;
  }
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

  // Get all actions for this org and HTTP method
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
  const response: OpenAPIV3_1.ResponseObject =
    matchingAction && matchingAction.responses
      ? ((responseCode = Object.keys(matchingAction.responses).find(
          (key) => Number(key) >= 200 && Number(key) < 300,
        )),
        responses[responseCode ?? ""] ?? {})
      : {};

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

  // Use the accept header to determine the response schema - default to json
  const acceptHeader = (req.headers["accept"] ??
    req.headers["Accept"] ??
    "application/json") as string;
  const schema =
    (response.content?.[acceptHeader]?.schema as OpenAPIV3_1.SchemaObject) ??
    null;
  const properties = schema ? propertiesFromSchema(schema) : null;

  // Just deal with the first layer of nesting for now
  // If the array is nested it will be mocked as an object
  const isArray = schema?.type === "array";

  if (properties) {
    const gptResultAsJson = await getMockedProperties(
      properties,
      matchingAction?.path ?? slug.join("/"),
      method,
      requestParameters,
      orgInfo,
      isArray,
    );

    res.status(responseCode ? Number(responseCode) : 200).json(gptResultAsJson);
    return;
  }

  // Hierarchy of fallbacks if we don't have full schema etc
  const fallback =
    getJsonMIMEType(response.content)?.schema ||
    getJsonMIMEType(response.content) ||
    response.content ||
    response;

  console.log(
    "Could not find properties in schema, mocking whole response body in one prompt",
  );
  const json = await getMockedProperties(
    fallback,
    matchingAction?.path ?? slug.join("/"),
    method,
    requestParameters,
    orgInfo,
  );

  res.status(responseCode ? Number(responseCode) : 200).json(json);
}

export async function getMockedProperties(
  openApiProperties: { [key: string]: any },
  requestPath: string,
  method: RequestMethod,
  requestParameters: Chunk[] | null,
  orgInfo?: {
    name: string;
    description: string;
    model: string;
  },
  isArray: boolean = false,
): Promise<Record<string, any>> {
  const chunks = jsonSplitter(openApiProperties);
  const allProperties = chunksToProperties(chunks);

  const hardCodedProperties: Properties = {};
  const propertiesForAi: Properties = {};

  for (const [key, value] of Object.entries(allProperties)) {
    const type = value.type?.toLowerCase() ?? "";
    if (["object", "array"].includes(type)) continue;
    // If the type is boolean we don't really need to ask gpt to mock it
    // we just randomly choose from true and false
    if (type === "boolean") {
      value.data = isArray
        ? Array.from({ length: 3 }, () => Math.random() >= 0.5)
        : Math.random() >= 0.5;
      hardCodedProperties[key] = {
        data: value.data,
        type: "boolean",
        path: value.path,
      };
    } else {
      propertiesForAi[key] = value;
    }
  }

  const messages = apiMockPrompt(
    requestPath,
    method,
    requestParameters,
    propertiesForAi,
    orgInfo,
    isArray,
  );

  const nTokens = tokenizer.encodeChat(
    messages as ChatMessage[],
    "gpt-3.5-turbo",
  ).length;

  const openAiResponse = await exponentialRetryWrapper(
    getLLMResponse,
    // Output tokens count towards your total token count
    [
      messages,
      { max_tokens: 600 },
      getSecondaryModel(
        orgInfo?.model ?? nTokens < 4096 - 600
          ? "gpt-3.5-turbo-0613"
          : "gpt-3.5-turbo-16k-0613",
      ),
    ],
    3,
  );

  if (openAiResponse.length === 0) return { message: "Call to OpenAI failed" };

  if (isArray)
    return rebuildPropertiesArray(
      hardCodedProperties,
      propertiesForAi,
      openAiResponse,
      allProperties,
    );
  return rebuildProperties(
    hardCodedProperties,
    propertiesForAi,
    openAiResponse,
    allProperties,
  );
}

function rebuildProperties(
  hardCodedProperties: Properties,
  propertiesForAi: Properties,
  openAiResponse: string,
  transformed: Properties,
) {
  const reAdded = addGPTdataToProperties(propertiesForAi, openAiResponse);
  const newChunks = propertiesToChunks(
    Object.assign({}, transformed, { ...reAdded, ...hardCodedProperties }),
  );
  return removePropertiesItems(jsonReconstruct(newChunks));
}

function rebuildPropertiesArray(
  hardCodedProperties: Properties,
  propertiesForAi: Properties,
  openAiResponse: string,
  transformed: Properties,
) {
  const arrayResponse = [];
  // Loop through each array element
  for (let idx = 0; idx < 3; idx++) {
    // Stick the result from the gpt call back on
    const readded = addGPTdataToProperties(
      propertiesForAi,
      openAiResponse,
      idx,
    );

    // hardcoded properties are a whole array, so we need to index
    let hardcodedProperiesIdx: Properties = {};
    for (let [key, value] of Object.entries(hardCodedProperties)) {
      hardcodedProperiesIdx[key] = {
        ...value,
        data: value.data[idx],
      };
    }

    const newChunks = propertiesToChunks(
      Object.assign({}, transformed, { ...readded, ...hardcodedProperiesIdx }),
    );
    arrayResponse.push(jsonReconstruct(newChunks));
  }
  return removePropertiesItems(arrayResponse);
}

function propertiesFromSchema(schema: OpenAPIV3_1.SchemaObject) {
  if (schema.properties) return schema.properties;
  if ("items" in schema && schema.items && "properties" in schema.items)
    return schema.items.properties;
  return null;
}

export function removePropertiesItems(json: object): object {
  /** This is a hack to remove all mentions of 'properties'
   *  and 'items' from the json output by the mocking.
   *
   *  If the object had deliberate 'properties' or 'items' keys,
   *  they'd be removed too. **/
  if (Array.isArray(json)) {
    return json.map(removePropertiesItems);
  } else if (typeof json === "object") {
    const processedArray = Object.entries(json).map(([key, value]) => {
      if (
        (key === "properties" || key === "items") &&
        typeof value === "object"
      ) {
        return removePropertiesItems(value);
      }
      return { [key]: removePropertiesItems(value) };
    });
    return Object.assign({}, ...processedArray);
  }
  return json;
}
