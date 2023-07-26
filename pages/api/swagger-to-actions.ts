import SwaggerParser from "@apidevtools/swagger-parser";
import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { z } from "zod";
import { isValidBody, stripTrailingAndCurly } from "../../lib/utils";
import { OpenAPIV3_1 } from "openapi-types";

if (process.env.SERVICE_LEVEL_KEY_SUPABASE === undefined) {
  throw new Error("SERVICE_LEVEL_KEY_SUPABASE is not defined!");
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!");
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_LEVEL_KEY_SUPABASE!
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb", // Allows parsing of larger swagger files
    },
  },
};

const SwaggerEndpointZod = z.object({
  org_id: z.number(),
  swagger: z.union([z.record(z.any()), z.array(z.any())]),
});
type SwaggerEndpointType = z.infer<typeof SwaggerEndpointZod>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    // @ts-ignore
    dereferencedSwagger = await SwaggerParser.validate(swagger, {
      dereference: { circular: "ignore" },
      // validate: { schema: false },
    });
  } catch (err) {
    console.error("Error validating swagger", err);
    res.status(400).json({ message: "Not a valid OpenAPI spec", error: err });
    return;
  }
  if (!dereferencedSwagger.paths) throw Error("No paths");

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
        if (existingActionTagResp.error) throw existingActionTagResp.error;
        if (
          existingActionTagResp.data === null ||
          existingActionTagResp.data.length === 0
        ) {
          // Add to action_tags table
          const actionTagResponse = await supabase
            .from("action_tags")
            .insert({ name: tagName, org_id: orgId })
            .select();
          if (actionTagResponse.error) throw actionTagResponse.error;
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
      });
    }
  }
  // Don't insert if already in database (previously uploaded this swagger file)
  const actionResp = await supabase
    .from("actions")
    .select("*")
    .eq("org_id", orgId)
    .in(
      "name",
      actionInserts.map((action) => action.name)
    );
  if (actionResp.error) throw actionResp.error;
  const existingActionNames = actionResp.data.map((action) => action.name);
  actionInserts = actionInserts.filter(
    (action) => !existingActionNames.includes(action.name!)
  );
  const actionInsertResp = await supabase.from("actions").insert(actionInserts);
  if (actionInsertResp.error) {
    throw actionInsertResp.error;
  }

  res.status(200).send({ success: true });
}

export function operationIdToFunctionName(
  operationId: string | undefined
): string | undefined {
  if (!operationId) return undefined;
  operationId = operationId
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
  operationId = operationId.replaceAll(" ", "_");
  return operationId.replaceAll("-", "_");
}

export function requestToFunctionName(
  method: string,
  methodObj: OpenAPIV3_1.OperationObject,
  path: string
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
        parts[i].toLowerCase()
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
  inputString: string | undefined
): string | undefined {
  if (!inputString) return undefined;
  const markdownLinkRegEx = /\[([^\]]+)\]\(([^)]+)\)/g;
  return inputString.replaceAll(
    markdownLinkRegEx,
    (match, linkText) => linkText
  );
}
