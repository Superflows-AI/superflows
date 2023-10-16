import { ActionPlusApiInfo, SimilaritySearchResult } from "../types";
import { exponentialRetryWrapper } from "../utils";
import { queryEmbedding } from "../queryLLM";
import { SupabaseClient } from "@supabase/auth-helpers-react";
import { Database, Json } from "../database.types";
import { chunksToString, deduplicateChunks } from "../edge-runtime/utils";

export async function getRelevantDocChunks(
  userQuery: string,
  org_id: number,
  nChunksInclude: number,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  const embedding = await exponentialRetryWrapper(
    queryEmbedding,
    [userQuery],
    3,
  );

  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: embedding[0],
    similarity_threshold: 0.4,
    match_count: 20,
    _org_id: org_id,
  });
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    console.warn("Found no relevant documentation for query: ", userQuery);
    return "No relevant documentation found";
  }

  console.log("All relevant doc chunks:", data);

  return chunksToString(deduplicateChunks(data.slice(0, nChunksInclude)));
}

export function getSearchDocsAction(
  org: { id: number; api_key: string },
  currentHost: string,
): ActionPlusApiInfo {
  return {
    action_type: "http",
    active: true,
    description: "Performs a semantic search over the documentation",
    name: "search_docs",
    org_id: org.id,
    parameters: [
      {
        in: "query",
        name: "query",
        description: "The search query",
        required: true,
        schema: {
          type: "string",
        },
      },
    ] as Json,
    path: "/search-docs",
    requires_confirmation: false,
    request_method: "get",
    api: {
      api_host: currentHost + "/api",
      // This stops Authorization header below being overwritten
      auth_header: `x-api-key`,
      auth_query_param_name: "",
      auth_scheme: null,
      org_id: org.id,
    },
    headers: [
      {
        name: "Authorization",
        value: `Bearer ${org.api_key}`,
      },
    ],
  } as ActionPlusApiInfo;
}
