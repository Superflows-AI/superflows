import RemoveMarkdown from "remove-markdown";
import { getTokenCount, isDate, isEmail, isPhoneNumber, isUrl } from "../utils";

export function isTextWithSubstance(text: string): boolean {
  return (
    // Hack to include multi-line images or links
    ["[", "!["].includes(text) ||
    // If very short number of characters, likely it's not a useful chunk
    (text.length > 3 &&
      !isEmail(text) &&
      !isPhoneNumber(text) &&
      !isUrl(text) &&
      !isDate(text))
  );
}

export function splitTextByHeaders(
  markdownText: string,
): Record<string, string> {
  // Regex below captures a section as defined as starting with a heading (h1-h5)
  // and ending with the next heading of the same or higher level, or the end of the string
  const regex = /(#{1,5}) (.*?)\n([\s\S]*?)(?=\n#{1,5} |$)/g;
  // (#{1,5}) captures the heading level (e.g. ###)
  // (.*?) captures the heading text
  // ([\s\S]*?) captures the text until the next heading or end of string
  // (?=\n#{1,5} |$) is a a non-capturing group that looks ahead to ensure the
  //   next heading is captured in the next match or the end of the string is reached
  let match;
  let results: Record<string, string> = {};
  let isFirstChunk = true;
  // This is to deal with empty headings (so we can use the value of the previous non-empty heading)
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

    let heading = removeRepetition(RemoveMarkdown(match[2])) || "";
    let text = match[3].trim();
    if (!heading) {
      ({ text, heading } = findHeading(text));
      if (!heading) heading = prevHeading;
    }
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
  const codeAndNonCodeChunks = splitOutCodeChunks(sectionText);
  return codeAndNonCodeChunks
    .map((codeNonCodeChunk): string[] => {
      if (codeNonCodeChunk.startsWith("```")) {
        return [codeNonCodeChunk];
      }
      return joinShortChunks(
        codeNonCodeChunk
          .split("\n")
          .filter(
            (chunk) => !ignoreLines.includes(RemoveMarkdown(chunk.trim())),
          )
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
    })
    .flat();
}

export function splitOutCodeChunks(sectionText: string): string[] {
  const chunks: string[] = [];
  const codeBlockPattern = /```(\w*)\n([\s\S]+?)```/g;
  // (\w*) to capture the language abbreviation
  // [\s\S]+? to capture the code content (non-greedy)
  // [\s\S] includes newlines
  let match;

  // Find initial index for cutting the string
  let currentIndex = 0;

  while ((match = codeBlockPattern.exec(sectionText))) {
    const nonCodeChunk = sectionText.slice(currentIndex, match.index);

    // If there is any non-code text between two code blocks
    if (nonCodeChunk.trim().length !== 0) {
      chunks.push(nonCodeChunk);
    }

    const languageAbbrev = match[1] ?? "";
    // Extract code content from a code block, trim additional redundant spaces
    let codeChunk = match[2].trim();
    if (isJson(codeChunk)) {
      const jsonChunk = getPossibleJsonChunk(codeChunk);
      // If the code chunk is JSON, reduce tokens by removing unnecessary prettification
      const prePost = codeChunk.split(jsonChunk);

      // Nothing to do if first line or not found (-1)
      codeChunk = prePost[0] + unprettifyJsonString(jsonChunk) + prePost[1];
    }

    // Re-add the code block markdown formatting, so it's obvious it's a code block
    chunks.push(`\`\`\`${languageAbbrev}\n${codeChunk}\n\`\`\``);

    // Move to the end of the current match
    currentIndex = codeBlockPattern.lastIndex;
  }

  // If there is a non-code section after the last code block
  if (currentIndex < sectionText.length - 1) {
    const finalChunk = sectionText.slice(currentIndex).trim();
    if (finalChunk.length !== 0) {
      chunks.push(finalChunk);
    }
  }

  return chunks;
}

export function getPossibleJsonChunk(text: string): string {
  // Regex to check if text contains [] or {}
  const match = /(\[[\s\S]+]|{[\s\S]+})/g.exec(text);
  return !match ? "" : match[0];
}

export function isJson(text: string): boolean {
  const possibleJsonChunk = getPossibleJsonChunk(text);
  if (!possibleJsonChunk) {
    console.log(`No possible JSON chunk found in:\n${text}`);
    return false;
  }

  const commentLessJson = possibleJsonChunk.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (m, g) => (g ? "" : m),
  );

  try {
    JSON.parse(commentLessJson);
    return true;
  } catch {
    try {
      // Try to see if outer brackets are missing
      JSON.parse(`[${commentLessJson}]`);
      return true;
    } catch {
      return false;
    }
  }
}

export function unprettifyJsonString(jsonString: string): string {
  // Convert all comments to /* */ style
  let noWhiteSpace = jsonString.replace(/\/\/(.*)/g, "/*$1*/");
  noWhiteSpace = noWhiteSpace.replace(/\/\*((.|\n|\r)*)\*\//g, "/*$1*/");

  // Unprettify JSON by removal of line breaks, tabs, and excessive spaces
  noWhiteSpace = noWhiteSpace.trim().replace(/[\r\n\t ]*\n[\r\n\t ]*/g, "");
  noWhiteSpace = noWhiteSpace.replace(/[\r\n\t ]+/g, " ");
  noWhiteSpace = noWhiteSpace.replace(/, /g, ",");
  noWhiteSpace = noWhiteSpace.replace(/": "/g, '":"');
  return noWhiteSpace;
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

export function removeRepetition(str: string): string {
  const regex = /^(.*?)(?:\s)?\1$/;
  return str.replace(regex, "$1");
}

export function findHeading(text: string): { text: string; heading: string } {
  const lines = text.split("\n");
  const firstLineIdx = lines.findIndex(Boolean);
  if (firstLineIdx === -1) return { text: "", heading: "" };
  const firstLineClean = RemoveMarkdown(lines[firstLineIdx]);
  const isHeading = firstLineClean.length < 100;

  return {
    // The <100 is to remove paragraphs after genuine empty headings
    text: (isHeading ? lines.slice(firstLineIdx + 1) : lines).join("\n"),
    heading: isHeading ? firstLineClean : "",
  };
}

export function removeMDLinksImgs(text: string): string {
  /** Remove Markdown doesn't remove links which are spread over multiple lines **/
  return text.replace(/!?\[([\s\S.]*?)]\((.*?)\)/g, "$1");
}
