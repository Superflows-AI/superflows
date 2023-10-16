import { z } from "zod";
import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { Browser, Page } from "playwright";
import TurndownService from "turndown";
import RemoveMarkdown from "remove-markdown";
import { getTokenCount, isDate, isEmail, isPhoneNumber, isUrl } from "../utils";
import { DocChunkInsert } from "../types";
import { queryEmbedding } from "../queryLLM";

const EmbedDocsZod = z.object({
  docsUrl: z.string(),
  orgId: z.string(),
});
type EmbedDocsType = z.infer<typeof EmbedDocsZod>;

const turndownService = new TurndownService({
  codeBlockStyle: "fenced",
  headingStyle: "atx",
});

export async function embedDocs(
  docsUrls: string[],
  orgId: number,
  isDocusaurus: boolean,
): Promise<DocChunkInsert[]> {
  const docUrlChunks = [];
  for (let i = 0; i < docsUrls.length; i += 10) {
    docUrlChunks.push(docsUrls.slice(i, i + 10));
  }
  // Iterate over the collected links
  const out: DocChunkInsert[][][] = [];
  for (const docUrlChunk of docUrlChunks) {
    out.push(
      await Promise.all(
        docUrlChunk.map(async (url) => {
          console.log("Loading documents from " + url);
          // Initialize an APIReferenceLoader with the option to scrape visible content
          let loader = getDocsLoader(url, isDocusaurus);
          // Load the raw text from the web page
          const raw_documents = await loader.load();
          const title = (/<title>(.*)<\/title>/.exec(
            raw_documents[0].pageContent,
          ) ?? [])[1];
          console.log(`Title: ${title}`);

          // Convert the HTML to Markdown
          const md = turndownService.turndown(
            // pageContent always starts with added <title> tag, so this must be removed
            //  (there shouldn't be other <title> tags in there since it's the page body that's returned)
            raw_documents[0].pageContent.replace(/<title>(.*)<\/title>/, ""),
          );
          console.log("md", md);

          // Extract headings and subheadings from the Markdown
          const headerToSection = splitTextByHeaders(md);

          // For each heading, split the text into chunks by newline, filter out useless chunks, and split into 3s
          const doc_chunks = Object.entries(headerToSection)
            .map(([header, section]) => {
              if (!section.replaceAll(title, "").trim()) return [];
              // If the chunk is a small number of tokens, just embed it as-is
              if (
                getTokenCount(
                  RemoveMarkdown(section.replaceAll(/ {4}/g, "\t")),
                ) < 80
              ) {
                return [
                  {
                    page_url: url,
                    page_title: title,
                    section_title: header || null,
                    text_chunks: [section],
                    org_id: orgId,
                  },
                ];
              }

              // Split the documents into chunks
              const lines = section
                .split("\n")
                .filter((chunk) => isTextWithSubstance(chunk))
                // Don't just restate the title
                .filter(
                  (chunk) =>
                    ![
                      title,
                      "Saltar a contenido principal;)",
                      "Fecha de la última publicación",
                    ].includes(RemoveMarkdown(chunk)),
                )
                // Tabs are more token-efficient than 4 spaces
                .map((chunk) => chunk.replaceAll(/ {4}/g, "\t"))
                // TODO: (V2) Split sentences up
                .flat();

              const chunkGroups = lines
                // Remove null values (at end of array) e.g. ["text", null, null] -> ["text"]
                .map((line, idx) =>
                  [line, lines[idx + 1], lines[idx + 2]].filter(
                    (item) => item !== null,
                  ),
                )
                // Slice to remove the last 2 chunk groups which are shorter than the rest
                // Max to ensure we still embed very short doc pages
                .slice(0, Math.max(lines.length - 2, 1));

              return chunkGroups.map((chunks) => ({
                page_url: url,
                page_title: title,
                section_title: header || null,
                text_chunks: chunks,
                org_id: orgId,
              }));
            })
            .flat();

          // Convert Markdown text to plain text to get rid of images, urls etc
          const textToEmbed = doc_chunks.map(
            // (ch) => RemoveMarkdown(ch.text_chunks.join("\n")),
            (ch) =>
              `Page: ${ch.page_title}${
                ch.section_title ? "\nSection: " + ch.section_title : ""
              }\n${RemoveMarkdown(ch.text_chunks.join("\n"))}`,
          );
          console.log(textToEmbed);

          const embeddings = await queryEmbedding(textToEmbed);
          console.log("Embedded successfully!");
          return doc_chunks.map((chunk, idx) => ({
            ...chunk,
            embedding: embeddings[idx],
            chunk_idx: idx,
          }));
        }),
      ),
    );
  }

  return out.flat().flat();
}

function isTextWithSubstance(text: string): boolean {
  return (
    text.length > 10 &&
    text.trim().split(" ").length > 3 &&
    !isEmail(text) &&
    !isPhoneNumber(text) &&
    !isUrl(text) &&
    !isDate(text)
  );
}

function ensureEndsInFullStop(text: string): string {
  return text.endsWith(".") ? text : text + ".";
}

export function getDocsLoader(
  url: string,
  isDocusaurus: boolean,
): PlaywrightWebBaseLoader {
  return new PlaywrightWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded" },
    evaluate: isDocusaurus
      ? async function (page: Page, browser: Browser) {
          await page.waitForLoadState("domcontentloaded");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          let out = "";
          while (!out) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Attempting to get HTML");
            out = await page.evaluate(() => {
              function removeFromHtml(node: Node, tags: string[]) {
                for (const tag of tags) {
                  let elements = node.getElementsByTagName(tag);
                  while (elements.length) {
                    if (!elements[0]) break;
                    elements[0].parentNode.removeChild(elements[0]);
                    elements = node.getElementsByTagName(tag);
                  }
                }
                return node;
              }

              let clone = document.body.cloneNode(true);
              if (!clone) return "";
              const main = clone.getElementsByTagName("main")[0];
              if (main) clone = main;
              // In Docusaurus, the title is <page name> | <site name>
              const title = document.title.split("|")[0];

              clone = removeFromHtml(clone, [
                "script",
                "aside",
                "button",
                "header",
                "nav",
                "footer",
                "style",
                "noscript",
              ]);
              // In Docusaurus, the table of contents can be picked up if we don't smite it
              clone.getElementsByClassName("table-of-contents")[0]?.remove();

              return `<title>${title}</title>${clone.innerHTML}`;
            });
          }
          return out;
        }
      : async function (page: Page, browser: Browser) {
          await page.waitForLoadState("domcontentloaded");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          let out = "";
          while (!out) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Attempting to get HTML");
            out = await page.evaluate(() => {
              function removeFromHtml(node: Node, tags: string[]) {
                for (const tag of tags) {
                  let elements = node.getElementsByTagName(tag);
                  while (elements.length) {
                    if (!elements[0]) break;
                    elements[0].parentNode.removeChild(elements[0]);
                    elements = node.getElementsByTagName(tag);
                  }
                }
                return node;
              }

              let clone = document.body.cloneNode(true);
              if (!clone) return "";
              const main = clone.getElementsByTagName("main")[0];
              if (main) clone = main;
              const title = document.title;

              clone = removeFromHtml(clone, [
                "script",
                "aside",
                "button",
                "header",
                "nav",
                "footer",
                "style",
                "noscript",
              ]);

              return `<title>${title}</title>${clone.innerHTML}`;
            });
          }
          return out;
        },
  });
}

export function splitTextByHeaders(
  markdownText: string,
): Record<string, string> {
  const regex = /(#{1,3}) (.+?)\n([\s\S]*?)(?=\n#{1,3} |$)/g;
  let match;
  let results: Record<string, string> = {};
  let isFirstChunk = true;

  while ((match = regex.exec(markdownText)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    // If there is text above the top heading, add it to the results
    if (
      isFirstChunk &&
      markdownText.split(`${match[1]} ${match[2]}`)[0].trim()
    ) {
      results[""] = markdownText.split(`${match[1]} ${match[2]}`)[0].trim();
    }
    isFirstChunk = false;

    let heading = RemoveMarkdown(match[2]);
    let text = match[3].trim();
    // If the heading already exists, append the text to it
    if (results.hasOwnProperty(heading)) {
      results[heading] += `\n${text}`;
    } else {
      results[heading] = text;
    }
  }

  return results;
}
