import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { Database } from "../../lib/database.types";
import { isValidBody, stripTrailingAndCurly } from "../../lib/utils";

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

const EndpointZod = z.object({
  actionId: z.number(),
});

type EndpointType = z.infer<typeof EndpointZod>;

async function sendHttpRequest(
  action: Database["public"]["Tables"]["actions"]["Row"]
): Promise<Response> {
  if (!action.path) {
    throw new Error("Path is not provided");
  }

  if (!action.request_method) {
    throw new Error("Request method is not provided");
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  const requestOptions: RequestInit = {
    method: action.request_method,
    headers: headers,
  };

  if (action.request_method !== "GET" && action.request_body_contents) {
    requestOptions.body = JSON.stringify(action.request_body_contents);
  }

  let url = action.path;

  if (action.parameters) {
    const queryParams = new URLSearchParams();
    for (const key in action.parameters) {
      queryParams.set(key, action.parameters[key]);
    }
    url += `?${queryParams.toString()}`;
  }

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  return response;
}

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
  if (!isValidBody<EndpointType>(req.body, EndpointZod)) {
    console.log(req.body);
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const { actionId } = req.body;
  console.log(actionId);

  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("id", actionId)
    .single();

  if (error) {
    console.log(error);
    res.status(500).send({ error });
    return;
  }

  const response = await sendHttpRequest(data);
  const responseBody = await response.json();

  res.status(200).send(responseBody);
}
