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
    // @ts-ignore
    dereferencedSwagger = await SwaggerParser.validate(swagger);
  } catch (err) {
    res.status(400).json({ message: "Not a valid OpenAPI spec", error: err });
    return;
  }
  if (!dereferencedSwagger.paths) throw Error("No paths");

  for (const [path, pathObj] of Object.entries(dereferencedSwagger.paths)) {
    if (pathObj === undefined) {
      continue;
    }
    // This is used as the name of the action group - strip trailing slash and curly braces
    const pathName = stripTrailingAndCurly(path);
    const existingActionGroupResp = await supabase
      .from("action_groups")
      .select("*")
      .eq("name", pathName);
    if (existingActionGroupResp.error) throw existingActionGroupResp.error;
    let actionGroupId: number;
    if (
      existingActionGroupResp.data === null ||
      existingActionGroupResp.data.length === 0
    ) {
      const actionGroupResponse = await supabase
        .from("action_groups")
        .insert({ name: pathName, org_id: orgId })
        .select();
      if (actionGroupResponse.error) throw actionGroupResponse.error;
      if (actionGroupResponse.data.length === 0) {
        throw new Error("No action group created");
      }
      actionGroupId = actionGroupResponse.data[0].id;
    } else {
      actionGroupId = existingActionGroupResp.data[0].id;
    }
    let actionInserts: Database["public"]["Tables"]["actions"]["Insert"][] = [];

    Object.entries(pathObj).forEach(([method, methodObj]) => {
      if (typeof methodObj === "string") {
        console.log("Skipping methodObj because it's a string");
        return;
      }
      if (Array.isArray(methodObj)) {
        console.log("Skipping methodObj because it's an array");
        return;
      }
      actionInserts.push({
        name: method.toUpperCase() + " " + path,
        description: methodObj.description ?? "",
        active: true,
        org_id: orgId,
        action_group: actionGroupId,
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
    });
    // Don't insert if already in database
    const actionResp = await supabase
      .from("actions")
      .select("*")
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
