import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { z } from "zod";
import { isValidBody } from "../../lib/utils";
import { generateApiKey } from "../../lib/apiKey";
import { v4 as uuidv4 } from "uuid";

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

const JoinOrgZod = z.object({ join_id: z.string(), user_id: z.string() });
type JoinOrgType = z.infer<typeof JoinOrgZod>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({
      error: "Only POST requests allowed",
    });
    return;
  }
  if (!isValidBody<JoinOrgType>(req.body, JoinOrgZod)) {
    res.status(400).send({ message: "Invalid request body" });
    return;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("join_link_id", req.body.join_id);
  if (error) throw new Error(error.message);
  if (data === null) {
    throw new Error("No data returned from organizations insert");
  }
  console.log("join-org.ts: data", data);

  const profileResp = await supabase
    .from("profiles")
    .update({ org_id: data[0].id })
    .eq("id", req.body.user_id)
    .select();
  if (profileResp.error) throw profileResp.error;
  if (profileResp.data === null)
    throw new Error("No data returned from profiles update");

  res.status(200).send({ success: true });
}
