import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { queryEmbedding } from "../../lib/queryLLM";
import {
  exponentialRetryWrapper,
  getTokenCount,
  isValidBody,
} from "../../lib/utils";
import { Database } from "../../lib/database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
);

const SwaggerEndpointZod = z.object({
  org_id: z.number(),
  tokenCount: z.number(),
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

  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: embedding[0],
    similarity_threshold: 0.4,
    match_count: 100,
    _org_id: req.body.org_id,
  });
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    res.status(200).json({ message: "No relevant documentation found" });
    return;
  }

  const remaining = 8192 - req.body.tokenCount;

  const maxTokens =
    remaining > 700 ? 500 : remaining > 200 ? remaining - 200 : remaining;

  const dataKeep = [];
  let runningTokenCount = 0;
  for (const chunk of data) {
    runningTokenCount += getTokenCount([
      { role: "assistant", content: chunk.text_chunk },
    ]);

    if (runningTokenCount > maxTokens) break;

    if (chunk.similarity > 0.8) {
      dataKeep.push(chunk);
      continue;
    }
    // If we've got over 300 tokens of > 0.8 similarity text, we're done
    if (chunk.similarity < 0.8 && runningTokenCount > 300) break;

    // Otherwise go up to the max token limit
    dataKeep.push(chunk);
  }

  console.log(
    `Selected relevant doc chunks for user query "${
      req.body.query
    }":\n${dataKeep
      .map(
        (chunk, idx) =>
          `Chunk${idx + 1}. Similarity ${
            Math.round(chunk.similarity * 100) / 100
          }\n${chunk.text_chunk.trim()}`,
      )
      .join("\n\n")}"}"`,
  );

  res.status(200).json(
    dataKeep.map((chunk, idx) => ({
      rank: idx + 1,
      doc_chunk: chunk.text_chunk,
    })),
  );
}
