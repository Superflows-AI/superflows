import RemoveMarkdown from "remove-markdown";
import { getTokenCount, isDate, isEmail, isPhoneNumber, isUrl } from "../utils";

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

export function splitTextByHeaders(
  markdownText: string,
): Record<string, string> {
  const regex = /(#{1,3}) (.*?)\n([\s\S]*?)(?=\n#{1,3} |$)/g;
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
