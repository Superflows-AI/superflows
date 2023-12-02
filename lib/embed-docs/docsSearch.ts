import { exponentialRetryWrapper } from "../utils";
import { queryEmbedding } from "../queryLLM";
import { SupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../database.types";
import { combineChunks, deduplicateChunks } from "../edge-runtime/utils";

export async function getRelevantDocChunks(
  userQuery: string,
  org_id: number,
  nChunksInclude: number,
  supabase: SupabaseClient<Database>,
): Promise<{ text: string; urls: { name: string; url: string }[] }> {
  const embedding = await exponentialRetryWrapper(
    queryEmbedding,
    [userQuery],
    3,
  );

  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: embedding[0],
    similarity_threshold: 0.8,
    match_count: 10,
    _org_id: org_id,
  });
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    console.warn("Found no relevant documentation for query: ", userQuery);
    return { text: "No relevant documentation found", urls: [] };
  }

  console.log(
    "All relevant doc chunks:",
    data.map(
      (d) =>
        `Page: ${d.page_title}\nSection: ${d.section_title}\nSimilarity: ${
          Math.round(d.similarity * 1000) / 1000
        }\n`,
    ),
  );

  return combineChunks(
    deduplicateChunks(data, nChunksInclude * data[0].text_chunks.length),
  );
}
