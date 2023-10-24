import RemoveMarkdown from "remove-markdown";
import { exponentialRetryWrapper } from "../utils";
import { queryEmbedding } from "../queryLLM";
import { splitIntoTextChunks } from "./utils";
import { DocChunkInsert } from "../types";

export async function embedText(
  text: string,
  title: string,
): Promise<Omit<DocChunkInsert, "org_id">[]> {
  const lines = splitIntoTextChunks(text, [title]);

  const chunkGroups = lines
    // Remove null values (at end of array) e.g. ["text", null, null] -> ["text"]
    .map((line, idx) => [line, lines[idx + 1], lines[idx + 2]].filter(Boolean))
    // Slice to remove the last 2 chunk groups which are shorter than the rest
    // Max to ensure we still embed very short doc pages
    .slice(0, Math.max(lines.length - 2, 1));

  const textToEmbed = chunkGroups.map(
    (ch) =>
      `${title ? `Page: ${title}\n` : ""}${RemoveMarkdown(ch.join(""), {
        useImgAltText: false,
      })
        .trim()
        .replaceAll(/\n\n+/g, "\n")}`,
  );

  const embeddings = await exponentialRetryWrapper(
    queryEmbedding,
    [textToEmbed],
    3,
  );

  return chunkGroups.map((chunkGroup, idx) => ({
    page_url: "",
    page_title: title,
    section_title: "",
    text_chunks: chunkGroup,
    embedding: embeddings[idx],
    chunk_idx: idx,
  }));
}
