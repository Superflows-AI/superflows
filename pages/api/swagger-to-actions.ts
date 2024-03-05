import SwaggerParser from "@apidevtools/swagger-parser";
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { z } from "zod";
import { stripTrailingAndCurly } from "../../lib/utils";
import { OpenAPIV3_1 } from "openapi-types";
import { isValidBody } from "../../lib/edge-runtime/utils";

if (process.env.SERVICE_LEVEL_KEY_SUPABASE === undefined) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!");
}

const supabase = createClient<Database>(
  process.env.API_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_LEVEL_KEY_SUPABASE!,
  {
    auth: {
      persistSession: false,
    },
  },
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb", // Allows parsing of larger swagger files
    },
  },
  maxDuration: 60,
};

const SwaggerEndpointZod = z.object({
  org_id: z.number(),
  swagger: z.record(z.any()),
  api_id: z.optional(z.string()),
});
type SwaggerEndpointType = z.infer<typeof SwaggerEndpointZod>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({
      message: "Only POST requests allowed",
    });
    return;
  }
  if (!isValidBody<SwaggerEndpointType>(req.body, SwaggerEndpointZod)) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const orgId = req.body.org_id;
  const swagger = req.body.swagger;
  let dereferencedSwagger: OpenAPIV3_1.Document;
  try {
    console.log("Validating swagger");
    // Allow info.version = null(!!)
    if ("info" in swagger)
      swagger.info.version = swagger.info.version ?? "1.0.0";
    if (swagger.swagger && swagger.swagger.startsWith("2.")) {
      res.status(400).json({
        message: "Swagger version 2 not supported",
        // This format is used to display errors in the UI
        error: {
          "1": {
            message:
              "Swagger version 2 not supported: convert to version 3: https://stackoverflow.com/questions/59749513/how-to-convert-openapi-2-0-to-openapi-3-0",
          },
        },
      });
      return;
    }
    // @ts-ignore
    dereferencedSwagger = await SwaggerParser.validate(swagger, {
      dereference: { circular: "ignore" },
      validate: { spec: false },
    });
  } catch (err) {
    console.error("Error validating swagger", err);
    res.status(400).json({ message: "Not a valid OpenAPI spec", error: err });
    return;
  }
  if (!dereferencedSwagger.paths) throw Error("No paths");

  // If no api_id, add an API object
  let api_id = req.body.api_id ?? "";
  const authInfo = getAuthInfoFromSpec(
    dereferencedSwagger.components?.securitySchemes as Record<
      string,
      OpenAPIV3_1.SecuritySchemeObject
    >,
  );
  const api_host =
    dereferencedSwagger.servers
      ?.reverse()
      .find((server) => server.url.startsWith("https://"))?.url ?? "";
  if (!api_id) {
    const apiResp = await supabase
      .from("apis")
      .insert({
        org_id: orgId,
        name: dereferencedSwagger.info.title,
        api_host,
        auth_header: authInfo?.auth_header ?? "Authorization",
        auth_scheme: authInfo?.auth_scheme ?? null,
      })
      .select();
    if (apiResp.error) throw apiResp.error;
    api_id = apiResp.data[0].id;
  } else {
    const apiResp = await supabase
      .from("apis")
      .update({
        api_host,
        auth_header: authInfo?.auth_header ?? "Authorization",
        auth_scheme: authInfo?.auth_scheme ?? null,
      })
      .eq("id", api_id);
    if (apiResp.error) throw apiResp.error;
  }

  // We store actions in tags. This stores the action_tags id for the row with the name of the tag
  let tagNameToId: { [name: string]: number } = {};

  console.log("Adding tags..");
  for (const tagObj of dereferencedSwagger.tags ?? []) {
    const actionTagResponse = await supabase
      .from("action_tags")
      .insert({
        name: tagObj.name,
        description: tagObj.description,
        org_id: orgId,
        api_id,
      })
      .select();
    if (actionTagResponse.error) throw actionTagResponse.error;
    if (actionTagResponse.data.length === 0) {
      throw new Error("No action tag created");
    }
    tagNameToId[tagObj.name] = actionTagResponse.data[0].id;
  }

  console.log("Adding paths...");
  let actionInserts: Database["public"]["Tables"]["actions"]["Insert"][] = [];
  for (const [path, pathObj] of Object.entries(dereferencedSwagger.paths)) {
    if (pathObj === undefined) {
      continue;
    }

    for (const [method, methodObj] of Object.entries(pathObj)) {
      if (typeof methodObj === "string") {
        console.log("Skipping methodObj because it's a string");
        continue;
      }
      if (Array.isArray(methodObj)) {
        console.log("Skipping methodObj because it's an array");
        continue;
      }
      const tagName = methodObj.tags?.[0] ?? stripTrailingAndCurly(path);
      let actionTagId: number;
      if (tagName in tagNameToId) {
        actionTagId = tagNameToId[tagName];
      } else {
        // This is used as the name of the action tag - strip trailing slash and curly braces
        const existingActionTagResp = await supabase
          .from("action_tags")
          .select("*")
          .eq("name", tagName)
          .eq("org_id", orgId);
        if (existingActionTagResp.error) {
          res.status(500).send(existingActionTagResp);
          return;
        }
        if (
          existingActionTagResp.data === null ||
          existingActionTagResp.data.length === 0
        ) {
          // Add to action_tags table
          const actionTagResponse = await supabase
            .from("action_tags")
            .insert({ name: tagName, org_id: orgId, api_id })
            .select();
          if (actionTagResponse.error) {
            res.status(500).send(actionTagResponse);
            return;
          }
          if (actionTagResponse.data.length === 0) {
            throw new Error("No action tag created");
          }
          actionTagId = actionTagResponse.data[0].id;
        } else {
          actionTagId = existingActionTagResp.data[0].id;
        }
        tagNameToId[tagName] = actionTagId;
      }
      let description =
        replaceMarkdownLinks(methodObj.description ?? methodObj.summary) ??
        method.toUpperCase() + " " + path;
      actionInserts.push({
        name:
          operationIdToFunctionName(methodObj.operationId) ??
          requestToFunctionName(method, methodObj, path),
        description: description,
        active: ["get"].includes(method),
        org_id: orgId,
        tag: actionTagId,
        action_type: "http",
        path: path,
        // @ts-ignore
        parameters: methodObj?.parameters ?? null,
        // @ts-ignore
        request_body_contents: methodObj.requestBody?.content ?? null,
        request_method: method,
        // @ts-ignore
        responses: methodObj?.responses ?? null,
        api_id,
        // By default, require confirmation for all actions except GET
        requires_confirmation: !["get"].includes(method),
      });
    }
  }
  // Don't insert if already in database (previously uploaded this swagger file)
  const actionResp = await supabase
    .from("actions")
    .select("name")
    .eq("org_id", orgId);
  if (actionResp.error) {
    res.status(500).send(actionResp);
    return;
  }
  const existingActionNames = actionResp.data.map((action) => action.name);
  actionInserts = actionInserts.filter(
    (action) => !existingActionNames.includes(action.name!),
  );
  let actionIds: number[] = [];
  for (let i = 0; i < Math.ceil(actionInserts.length / 100); i++) {
    const actionInsertResp = await supabase
      .from("actions")
      .insert(actionInserts.slice(i * 100, (i + 1) * 100))
      .select();
    if (actionInsertResp.error) {
      res.status(500).send(actionInsertResp);
      return;
    }
    actionIds = actionIds.concat(actionInsertResp.data.map((a) => a.id));
  }
  // Generate filtering descriptions for <40 of the actions
  void fetch(req.headers.origin + "/api/write-action-descriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SERVICE_LEVEL_KEY_SUPABASE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      org_id: orgId,
      action_ids: actionIds,
    }),
  });

  res.status(200).send({ success: true });
}

export function operationIdToFunctionName(
  operationId: string | undefined,
): string | undefined {
  if (!operationId) return undefined;
  return (
    operationId
      // Camel case to snake case
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      // Replace all non alphanumeric with underscores
      .replaceAll(/\W/g, "_")
      .toLowerCase()
  );
}

export function requestToFunctionName(
  method: string,
  methodObj: OpenAPIV3_1.OperationObject,
  path: string,
): string {
  const reqBody = methodObj?.requestBody as
    | OpenAPIV3_1.RequestBodyObject
    | undefined;
  const anyParams = !!(methodObj?.parameters || reqBody?.content);
  const pathParts = path.split("/");
  if (method.toLowerCase() === "get" && !anyParams) {
    return `list_${pathParts[pathParts.length - 1]}`;
  }
  let parts = path.split("/");
  // lcm == lower case method
  const lcm = method.toLowerCase();
  let functionName =
    lcm === "get"
      ? "get"
      : lcm === "post"
      ? "create"
      : lcm === "put"
      ? "update"
      : lcm;

  let functionNameParts = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") continue;
    if (
      ["api", "0", "1", "2", "3", "v0", "v1", "v2", "v3"].includes(
        parts[i].toLowerCase(),
      )
    ) {
      continue;
    }

    if (parts[i].startsWith("{") && parts[i].endsWith("}")) {
      // Now, instead of just appending '_by_id', we append '_by_' and the name of the variable in the braces
      let parameterName = parts[i].slice(1, -1);
      functionNameParts.push("_by_" + parameterName);
      console.log("parameterName", parameterName);
      continue;
    }

    let part = parts[i];
    part = part.replace("-", "_");

    if (part.endsWith("s")) {
      part = part.slice(0, -1);
    }

    functionNameParts.push(part);
  }
  functionName += "_" + functionNameParts.slice(-2).join("_");
  functionName = functionName.replaceAll("__", "_").toLowerCase();

  return functionName;
}

export function replaceMarkdownLinks(
  inputString: string | undefined,
): string | undefined {
  if (!inputString) return undefined;
  const markdownLinkRegEx = /\[([^\]]+)\]\(([^)]+)\)/g;
  return inputString.replaceAll(
    markdownLinkRegEx,
    (match, linkText) => linkText,
  );
}

export function getAuthInfoFromSpec(
  securitySchemes:
    | { [key: string]: OpenAPIV3_1.SecuritySchemeObject }
    | undefined,
):
  | {
      auth_header: string;
      auth_scheme: string | null;
    }
  | undefined {
  if (!securitySchemes) return;
  for (const securityScheme of Object.values(securitySchemes)) {
    if (securityScheme.type === "http" && securityScheme.scheme === "bearer") {
      return { auth_header: "Authorization", auth_scheme: "Bearer" };
    }
  }
  for (const securityScheme of Object.values(securitySchemes)) {
    if (securityScheme.type === "http") {
      return {
        auth_header: "Authorization",
        auth_scheme: securityScheme.scheme,
      };
    }
  }
  for (const securityScheme of Object.values(securitySchemes)) {
    if (securityScheme.type === "apiKey") {
      return { auth_header: securityScheme.name, auth_scheme: null };
    }
  }
}
