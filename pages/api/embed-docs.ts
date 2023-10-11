import { NextApiRequest, NextApiResponse } from "next";
import { queryEmbedding } from "../../lib/queryLLM";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  // Splits on paragraph break
  const docChunks = req.body.doc.split(/\n\s*\n/);

  // Can be done in parallel
  for (const chunk of docChunks) {
    const embedding = await queryEmbedding(chunk);
    const { error } = await supabase
      .from("docs")
      .insert({ text_chunk: chunk, org_id: 1, embedding: embedding[0] })
      .select();
    if (error) throw new Error(error.message);
  }

  res
    .status(200)
    .json({ message: `Successfully embedded ${docChunks.length} chunks` });
}
