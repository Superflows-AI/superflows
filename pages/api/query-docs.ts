import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { queryEmbedding } from "../../lib/queryLLM";
import { exponentialRetryWrapper, isValidBody } from "../../lib/utils";
import { Database } from "../../lib/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
);

const SwaggerEndpointZod = z.object({
  org_id: z.number(),
  query: z.string(),
});
type SwaggerEndpointType = z.infer<typeof SwaggerEndpointZod>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("/api/v1/answers called!");
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(undefined, { status: 200 });
  }
  // Handle non-POST requests
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST requests allowed" });
    return;
  }

  if (!isValidBody<SwaggerEndpointType>(req.body, SwaggerEndpointZod)) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const embedding = await exponentialRetryWrapper(
    queryEmbedding,
    [req.body.query],
    3,
  );

  // TODO: For now just returning the top 3 matches. Need to think about length
  // and the actual similarity threshold to use.
  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: embedding[0],
    // Magic number - cosine distance threshold used in matching embeddings
    // this was determined empirically.
    similarity_threshold: 0,
    // Max number of matches to output
    match_count: 3,
    _org_id: 1,
  });

  if (error) throw new Error(error.message);

  const output: { rank: number; doc_chunk: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    output.push({ rank: i, doc_chunk: data[i].text_chunk });
  }

  res.status(200).json(output);
}
