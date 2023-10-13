import { NextApiRequest, NextApiResponse } from "next";
import { queryEmbedding } from "../../lib/queryLLM";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../../lib/database.types";
import { doc } from "./local/pythonDataModels";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SERVICE_LEVEL_KEY_SUPABASE ?? "",
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  //////////
  // FILE WILL NOT BE USED IN PRODUCTION
  //////////

  // Not great splitting on period, but reasonable approximation of sentence split.

  const sentenceChunks: string[] = doc.split(". ");
  console.log(
    `n chunks = ${sentenceChunks.length}. First chunk = ${sentenceChunks[0]}, second chunk = ${sentenceChunks[1]}, third chunk = ${sentenceChunks[2]}`,
  );
  const windowLength = 3;

  const docChunks = sentenceChunks.map((sentence, idx) => {
    return [sentence, sentenceChunks[idx + 1], sentenceChunks[idx + 2]];
  });

  await supabase.from("docs").delete().eq("org_id", 1);
  let i = 0;
  for (const chunk of docChunks) {
    const embedding = await queryEmbedding(chunk.join(". "));

    const { error } = await supabase
      .from("docs")
      .insert({
        embedding: embedding[0],
        org_id: 1,
        page_url: "python/docs",
        chunk_idx: i,
        page_title: "Python models",
        section_title: "Python models section",
        text_chunks: chunk,
        window_length: windowLength,
      })
      .select();
    i += 1;
    if (error) throw new Error(error.message);
  }

  res
    .status(200)
    .json({ message: `Successfully embedded ${docChunks.length} chunks` });
}
