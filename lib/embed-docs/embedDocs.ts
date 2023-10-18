import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { Browser, Page } from "playwright";
import TurndownService from "turndown";
import RemoveMarkdown from "remove-markdown";
import { getTokenCount, isDate, isEmail, isPhoneNumber, isUrl } from "../utils";
import { DocChunkInsert } from "../types";
import { queryEmbedding } from "../queryLLM";

const turndownService = new TurndownService({
  codeBlockStyle: "fenced",
  headingStyle: "atx",
});

export async function embedDocs(
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
              }\n${RemoveMarkdown(ch.text_chunks.join(""), {
                useImgAltText: false,
              })
                .trim()
                .replaceAll(/\n\n+/g, "\n")}`,
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

export function isTextWithSubstance(text: string): boolean {
  return (
    // If very short number of characters, likely it's not a useful chunk
    text.length > 3 &&
    !isEmail(text) &&
    !isPhoneNumber(text) &&
    !isUrl(text) &&
    !isDate(text)
  );
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
              const main = clone.getElementsByTagName("main")[0];
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
              const main = clone.getElementsByTagName("main")[0];
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

export function splitTextByHeaders(
  markdownText: string,
): Record<string, string> {
  const regex = /(#{1,3}) (.*?)\n([\s\S]*?)(?=\n#{1,3} |$)/g;
  let match;
  let results: Record<string, string> = {};
  let isFirstChunk = true;
  let prevHeading = "";

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

    let heading = RemoveMarkdown(match[2]) || prevHeading;
    let text = match[3].trim();
    // If the heading already exists, append the text to it
    if (results.hasOwnProperty(heading)) {
      results[heading] += `\n${text}`;
    } else {
      results[heading] = text;
    }
    prevHeading = heading;
  }

  return results;
}

export function splitIntoTextChunks(
  sectionText: string,
  ignoreLines: string[],
): string[] {
  return joinShortChunks(
    sectionText
      .split("\n")
      .filter((chunk) => !ignoreLines.includes(RemoveMarkdown(chunk.trim())))
      // Below aims to remove not-useful lines. E.g. link to privacy policy, today's date etc
      .filter((chunk) => isTextWithSubstance(chunk.trim()))
      // Tabs are more token-efficient than 4 spaces
      .map((chunk) => chunk.replaceAll(/ {4}/g, "\t") + "\n")
      .map((chunk) => {
        // Break up large paragraphs into sentences
        const chunkTokenCount = getTokenCount(chunk);
        if (chunkTokenCount <= 80) return chunk;
        return splitMarkdownIntoSentences(chunk);
      })
      .flat(),
    25,
  );
}

export function splitMarkdownIntoSentences(markdown: string): string[] {
  /** Does what it says on the tin.
   *
   * Splits a paragraph of markdown (since we previously split by newline) into
   * sentences. *Does not* split by newline. **/
  let tmpMarkedItems: string[] = [];
  let tmpString = markdown;

  const markdownUrlRegex = /(!\[[\w\s\W]+]\([\w.\-\/]+\))/g;
  let result;
  while ((result = markdownUrlRegex.exec(markdown))) {
    tmpMarkedItems.push(result[0]);
    tmpString = tmpString.replace(result[0], `{${tmpMarkedItems.length - 1}}`);
  }

  let sentences = tmpString
    .split(/(?<=[.!?])\s/g)
    .map((e) => e.trim())
    .filter(Boolean);

  sentences = sentences.map((sentence) => {
    const placeholderRegex = /\{(\d+)}/g;
    let result;
    while ((result = placeholderRegex.exec(sentence))) {
      sentence = sentence.replace(result[0], tmpMarkedItems[Number(result[1])]);
    }
    return sentence + " ";
  });

  // Remove the space at the end of the last sentence
  sentences[sentences.length - 1] = sentences[sentences.length - 1].slice(
    0,
    -1,
  );
  return sentences;
}

export function joinShortChunks(arr: string[], tokenLimit: number): string[] {
  const result = [];
  let tempStr = "";
  for (let i = 0; i < arr.length; i++) {
    if (
      getTokenCount(RemoveMarkdown(tempStr + arr[i]).trim()) <=
      tokenLimit + 7 // +7 corrects for chat formatting
    ) {
      tempStr += arr[i];
    } else {
      // Do this in case the final string is too short
      if (tempStr) result.push(tempStr);
      tempStr = arr[i];
    }
    //add the last short string sequence if it exists
    if (i === arr.length - 1 && tempStr) result.push(tempStr);
  }

  return result;
}
