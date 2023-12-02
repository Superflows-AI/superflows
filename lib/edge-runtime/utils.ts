import { getTokenCount } from "../utils";
import {
  ChatGPTMessage,
  FunctionMessageInclSummary,
  GPTMessageInclSummary,
} from "../models";
import { Action, DBChatMessage, SimilaritySearchResult } from "../types";
import { MAX_TOKENS_OUT, USAGE_LIMIT } from "../consts";
import { SupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../database.types";
import { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import RemoveMarkdown from "remove-markdown";
import { z } from "zod/lib";
import { FunctionCall } from "@superflows/chat-ui-react";

export function isValidBody<T extends Record<string, unknown>>(
  body: any,
  bodySchema: z.ZodType<any>,
): body is T {
  const safeParseOut = bodySchema.safeParse(body);
  if ("error" in safeParseOut) {
    console.error(
      "Error parsing request body: " + safeParseOut.error.toString(),
    );
  }
  return safeParseOut.success;
}

export function DBChatMessageToGPT(
  message: DBChatMessage,
): GPTMessageInclSummary {
  if (message.role === "function") {
    let content: string;
    try {
      // Below conversion to JSON and back to string remove all newlines, indentation etc
      // which are empty tokens. This can cut tokens by ~half
      content = JSON.stringify(JSON.parse(message.content));
    } catch (e) {
      // If invalid JSON
      content = message.content;
    }

    return {
      role: message.role,
      content: content,
      name: message.name!,
      summary: message.summary ?? undefined,
    };
  }
  return {
    role: message.role as "user" | "assistant",
    content: message.content,
  };
}

export function MessageInclSummaryToGPT(
  message: GPTMessageInclSummary,
): ChatGPTMessage {
  const out = {
    ...message,
    content:
      "summary" in message
        ? message?.summary ?? message.content
        : message.content,
  };
  if ("summary" in out) delete out.summary;
  return out;
}

export function removeOldestFunctionCalls(
  chatGptPrompt: ChatGPTMessage[],
  model?: "3" | "3-16k" | "4",
  maxTokens?: number,
  maxTokensOut: number = MAX_TOKENS_OUT,
): ChatGPTMessage[] {
  /** Remove old function calls if over the context limit **/
  let tokenCount = getTokenCount(chatGptPrompt);
  maxTokens =
    maxTokens ?? (model === "3" ? 4096 : model === "3-16k" ? 16384 : 8192);
  const originalTokenCount = tokenCount;
  let numberRemoved = 0;
  // Keep removing until under the context limit
  while (tokenCount >= maxTokens - maxTokensOut) {
    // Removes the oldest function call
    const oldestFunctionCallIndex = chatGptPrompt.findIndex(
      // 204 since 4 tokens are added to the prompt for each message
      (m) => m.role === "function" && getTokenCount([m]) >= 204,
    );
    if (oldestFunctionCallIndex === -1) {
      // No function calls left to remove
      break;
    }
    chatGptPrompt[oldestFunctionCallIndex].content = "Cut due to context limit";
    tokenCount = getTokenCount(chatGptPrompt);
    numberRemoved += 1;
  }
  console.info(
    "Removed " +
      numberRemoved +
      " function calls due to context limit. Original token count: " +
      originalTokenCount +
      ", new token count: " +
      tokenCount,
  );
  return chatGptPrompt;
}

export function getJsonMIMEType<inObj>(
  inputDict: Record<string, inObj> | undefined | null,
): inObj | undefined {
  if (!inputDict) return undefined;
  if ("application/json" in inputDict) {
    return inputDict["application/json"];
  } else if ("*/*" in inputDict) {
    return inputDict["*/*"];
  } else if ("*/json" in inputDict) {
    return inputDict["*/*"];
  } else {
    return undefined;
  }
}

export function getHeader(
  headers: { [key: string]: string } | Headers | null,
  name: string,
): string | null {
  if (headers === null) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  // @ts-ignore
  return headers[name] || headers[name.toLowerCase()] || null;
}

export async function getFreeTierUsage(
  supabase: SupabaseClient<Database>,
  orgId: number,
): Promise<{ overLimit: boolean; numQueriesMade: number }> {
  // The number of first messages sent by the organization's users
  // This count is just for free tier users. All messages should count to avoid spam.
  // For paying customers, we only count full AI responses against their usage (see below).
  const usageRes = await supabase
    .from("chat_messages")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .eq("role", "user");
  if (usageRes.error) throw new Error(usageRes.error.message);
  let numQueriesMade = usageRes.count ?? 0;
  return { overLimit: numQueriesMade >= USAGE_LIMIT, numQueriesMade };
}

export function getHost(req: NextRequest) {
  // fallback is safe according to nextjs
  // (github.com/vercel/next.js/issues/2469#issuecomment-313194091)
  const protocol = req.headers.get("x-forwarded-proto") ?? "http";
  return protocol + "://" + req.headers.get("host");
}

export function getParam(parameters: Record<string, any>, key: string): any {
  if (key in parameters) return parameters[key];
  // Sometimes (rarely) the AI replaces hyphens with underscores. This is a hacky fix
  const found = Object.keys(parameters).find(
    (k) => k.replaceAll("-", "_") === key.replaceAll("-", "_"),
  );
  if (found) return parameters[found];
}

export function deduplicateChunks(
  chunks: SimilaritySearchResult[],
  nTextChunksInclude: number,
): SimilaritySearchResult[] {
  /** Deduplicate chunks by combining chunks with the same page_url, page_title and
   * section_title.
   *
   * Each doc_chunk in the DB has multiple text chunks. If the doc_chunks with the
   * most similar embeddings are from the same document, we don't want to add the
   * same text twice.
   *
   * E.g. If one doc_chunk contains [a,b,c], the other [b,c,d], then we have a chunk
   * with [a,b,c,d] (no duplication of b and c). **/
  chunks = JSON.parse(JSON.stringify(chunks));
  const deduped: SimilaritySearchResult[] = [chunks[0]];

  // Don't need to dedupe the first chunk
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    // Check if there's another chunk with the same page_url, page_title and section_title
    const matchedChunk = deduped.find(
      (seenCh) =>
        seenCh.page_url === chunk.page_url &&
        seenCh.page_title === chunk.page_title &&
        seenCh.section_title === chunk.section_title,
    );
    if (matchedChunk) {
      if (
        chunk.chunk_idx > matchedChunk.chunk_idx &&
        // Below check stops gaps in the text chunks
        chunk.chunk_idx - matchedChunk.chunk_idx <=
          matchedChunk.text_chunks.length
      ) {
        chunk.text_chunks.forEach((textChunk) => {
          if (!matchedChunk.text_chunks.includes(textChunk)) {
            // push() adds to the end of the array
            matchedChunk.text_chunks.push(textChunk);
          }
        });
      } else if (
        chunk.chunk_idx < matchedChunk.chunk_idx &&
        matchedChunk.chunk_idx - chunk.chunk_idx <= chunk.text_chunks.length
      ) {
        // Equality of chunk indices is impossible - the chunks should all have different indices
        chunk.text_chunks.forEach((textChunk) => {
          if (!matchedChunk.text_chunks.includes(textChunk)) {
            // unshift() adds to the start of the array
            matchedChunk.text_chunks.unshift(textChunk);
          }
        });
      } else {
        // This happens if there are 2 doc_chunks in 1 page which are relevant with a big gap between them
        deduped.push(chunk);
      }
    } else {
      deduped.push(chunk);
    }
    if (
      deduped.map((ch) => ch.text_chunks.length).reduce((a, b) => a + b, 0) >=
      nTextChunksInclude
    ) {
      break;
    }
  }
  return deduped;
}

export function combineChunks(chunks: SimilaritySearchResult[]): {
  text: string;
  urls: { name: string; url: string }[];
} {
  const chunkCombArr = chunks.map((chunk) => {
    const includeSectionTitle =
      chunk.section_title && chunk.section_title !== chunk.page_title;
    return {
      text: `Page: ${chunk.page_title}${
        includeSectionTitle ? "\nSection: " + chunk.section_title : ""
      }\n\n${chunk.text_chunks.join("").trim()}`,
      url: chunk.page_url
        ? {
            name: `${chunk.page_title}${
              includeSectionTitle ? ` - ${chunk.section_title}` : ""
            }`,
            url:
              chunk.page_url +
              // This usually doesn't work. Sometimes it might. Working would mean that it redirects you to the
              // part of the text where the query was found.
              "#:~:" +
              new URLSearchParams({
                text: RemoveMarkdown(
                  // Below if-else is because of trailing null values in text_chunks
                  chunk.text_chunks[chunk.text_chunks.length - 1]
                    ? chunk.text_chunks[0].split(" ").slice(0, 10).join(" ") +
                        "," +
                        chunk.text_chunks[chunk.text_chunks.length - 1]
                          .split(" ")
                          .slice(-10)
                          .join(" ")
                    : chunk.text_chunks[0],
                ),
              }),
          }
        : undefined,
    };
  });
  return {
    text: chunkCombArr.map((ch) => ch.text).join("\n\n---\n"),
    urls: chunkCombArr.map((ch) => ch.url).filter(Boolean) as {
      name: string;
      url: string;
    }[],
  };
}

export function parseErrorHtml(str: string): string {
  const DOM = cheerio.load(str).root();
  const elements = [
    DOM.find("title").text().trim().replace(/\s+/g, " "),
    DOM.find("h1").text().trim().replace(/\s+/g, " "),
    DOM.find("h2").text().trim().replace(/\s+/g, " "),
    DOM.find("h3").text().trim().replace(/\s+/g, " "),
  ];
  const result = elements.filter((element) => element !== "").join("\n");
  return result.length > 0 ? result : str;
}

export function replaceVariables(
  input: string,
  variables: { [key: string]: any },
): string {
  return input.replace(/\{(\w+)}/g, function (_match, variable) {
    return variables.hasOwnProperty(variable)
      ? variables[variable]
      : `${variable}`;
  });
}

export function preStreamProcessOutMessage(
  outMessage: FunctionMessageInclSummary,
  command: FunctionCall,
  chosenAction: Action,
): FunctionMessageInclSummary {
  // We can have issues in the frontend if the content is too long
  if (outMessage.summary && outMessage.content.length > 2000) {
    outMessage = { ...outMessage };
    outMessage.content =
      outMessage.content.slice(0, 2000) + "...(concatenated)";
  }
  if (chosenAction.link_url) {
    outMessage = { ...outMessage };
    outMessage.urls = [
      {
        name: replaceVariables(chosenAction.link_name, command.args),
        url: replaceVariables(chosenAction.link_url, command.args),
      },
    ];
    console.log("Link URLs added:", outMessage.urls);
  }
  return outMessage;
}

export function sortObjectToArray<ValueType>(
  obj: Record<string, ValueType>,
): ValueType[] {
  return Object.keys(obj)
    .sort()
    .map(function (key) {
      return obj[key];
    });
}

export function hideMostRecentFunctionOutputs(
  chatHistory: GPTMessageInclSummary[],
): GPTMessageInclSummary[] {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const message = chatHistory[i];
    if (message.role === "function") {
      message.summary = "Output used by analytics mode";
    }
    if (message.role !== "function") {
      return chatHistory;
    }
  }
  return chatHistory;
}
