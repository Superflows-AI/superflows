import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { Browser, Page } from "playwright";
import TurndownService from "turndown";
import RemoveMarkdown from "remove-markdown";
import { exponentialRetryWrapper } from "../utils";
import { DocChunkInsert } from "../types";
import { queryEmbedding } from "../queryLLM";
import {
  removeMDLinksImgs,
  splitIntoTextChunks,
  splitTextByHeaders,
} from "./utils";

const turndownService = new TurndownService({
  codeBlockStyle: "fenced",
  headingStyle: "atx",
});

export async function embedDocsFromUrl(
  docsUrls: string[],
  orgId: number,
  isDocusaurus: boolean,
  ignoreLines: string[],
): Promise<DocChunkInsert[]> {
  // Split the links into chunks of 10 to avoid overloading the API
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
              // If a line is just the title, skip it
              if (!section.replaceAll(title, "").trim()) return [];
              // Split the documents into text chunks
              const lines = splitIntoTextChunks(section, [
                title,
                ...ignoreLines,
              ]);

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
            (ch) =>
              `Page: ${ch.page_title}${
                ch.section_title && ch.section_title !== ch.page_title
                  ? "\nSection: " + ch.section_title
                  : ""
              }\n${RemoveMarkdown(removeMDLinksImgs(ch.text_chunks.join("")), {
                useImgAltText: false,
              })
                .trim()
                .replaceAll(/\n\n+/g, "\n")}`,
          );
          console.log(textToEmbed);

          const embeddings = await exponentialRetryWrapper(
            queryEmbedding,
            [textToEmbed],
            3,
          );
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
          await new Promise((resolve) => setTimeout(resolve, 10000));
          let out = "";
          while (!out) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Attempting to get HTML");
            out = await page.evaluate(() => {
              function removeFromHtml(node: HTMLBodyElement, tags: string[]) {
                for (const tag of tags) {
                  let elements = node.getElementsByTagName(tag);
                  while (elements.length) {
                    if (!elements[0]) break;
                    elements[0].parentNode?.removeChild(elements[0]);
                    elements = node.getElementsByTagName(tag);
                  }
                }
                return node;
              }

              let clone = document.body.cloneNode(true) as HTMLBodyElement;
              if (!clone) return "";
              const mains = clone.getElementsByTagName("main");
              const main = mains[mains.length - 1];
              // @ts-ignore
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
          await new Promise((resolve) => setTimeout(resolve, 10000));
          let out = "";
          while (!out) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Attempting to get HTML");
            out = await page.evaluate(() => {
              function removeFromHtml(node: HTMLBodyElement, tags: string[]) {
                for (const tag of tags) {
                  let elements = node.getElementsByTagName(tag);
                  while (elements.length) {
                    if (!elements[0]) break;
                    elements[0].parentNode?.removeChild(elements[0]);
                    elements = node.getElementsByTagName(tag);
                  }
                }
                return node;
              }

              let clone = document.body.cloneNode(true) as HTMLBodyElement;
              if (!clone) return "";
              const mains = clone.getElementsByTagName("main");
              const main = mains[mains.length - 1];
              // @ts-ignore
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
