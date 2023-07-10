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

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined!");
}

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? ""
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
    });
  } catch (err) {
    res.status(400).json({ message: "Not a valid OpenAPI spec", error: err });
    return;
  }
  if (!dereferencedSwagger.paths) throw Error("No paths");

  for (const [path, pathObj] of Object.entries(dereferencedSwagger.paths)) {
    if (pathObj === undefined) {
      continue;
    }
    let actionInserts: Database["public"]["Tables"]["actions"]["Insert"][] = [];

    for (const [method, methodObj] of Object.entries(pathObj)) {
      if (typeof methodObj === "string") {
        console.log("Skipping methodObj because it's a string");
        continue;
      }
      if (Array.isArray(methodObj)) {
        console.log("Skipping methodObj because it's an array");
        continue;
      }
      let description =
        replaceMarkdownLinks(methodObj.description ?? methodObj.summary) ??
        method.toUpperCase() + " " + path;
      actionInserts.push({
        name:
          methodObj.operationId?.toLowerCase().replaceAll(" ", "_") ??
          requestToFunctionName(method, methodObj, path),
        description: description,
        active: ["get"].includes(method),
        org_id: orgId,
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
    const actionInsertResp = await supabase
      .from("actions")
      .insert(actionInserts);
    if (actionInsertResp.error) {
      throw actionInsertResp.error;
    }
  }

  res.status(200).send({ success: true });
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
