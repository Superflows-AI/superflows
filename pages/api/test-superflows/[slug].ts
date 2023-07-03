import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { Database } from "../../../lib/database.types";
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const queryParams = req.query;
  const org_id = req.headers["org_id"];
  const { slug } = queryParams;

  const { data: actions, error } = await supabase
    .from("actions")
    .select("*")
    .eq("org_id", org_id);
  if (error) throw error;
  if (actions) {
    const match = actions.filter((action) => action.name === slug);
    // probably don't wana throw on these
    if (match.length === 0) throw new Error("No action found!");
    if (match.length > 1) throw new Error("More than one action found!");
  }

  const expectedResponse = actions[0].responses;

  const prompt = `
    your an endpoint mate, you gotta give a response init that's mocked init
  `;

  const response = exponentialRetryWrapper;

  // Access Body
  if (req.method !== "POST") {
    res.status(405).json({
      error: "Only POST requests allowed",
    });
    return;
  }

  console.log("queryParams", queryParams);
  console.log("body params", JSON.stringify(req.body));
  console.log("SLUG", slug);
  res.status(200).send({ success: true });
}
