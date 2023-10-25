import { Json } from "../database.types";
import { isID, isUrl, swapKeysValues } from "../utils";
import { ChatGPTMessage } from "../models";

export type StringMapping = { [key: string]: string };

export function removeIdsFromObjs(
  obj: Json | Json[],
  existingStore?: StringMapping,
): {
  cleanedObject: Json | Json[];
  idStore: StringMapping;
} {
  /**
   * Removes IDs (as defined by utils.isID) from an arbitrary JSON object.
   * Replace IDs with an ID in the form ID1, ID2, etc.
   * Returns the cleaned object and a lookup table (idStore) of the original IDs
   * to the new IDs.
   */
  const store: StringMapping = existingStore ?? {};
  // Deepcopy to prevent mutating the original object
  const removedObj = JSON.parse(JSON.stringify(obj));
  // If already have an idStore, start counting from the last index
  let idIdx = Object.entries(store).length;

  function findAndReplaceID(json: Json | Json[]) {
    if (!json || typeof json !== "object") return;

    // Creates the same iterator for both arrays and objects
    const entries = Array.isArray(json)
      ? json.entries()
      : Object.entries(json as { [key: string]: Json });

    for (const [key, value] of entries) {
      const k = key as string;
      if (typeof value === "object") {
        findAndReplaceID(value);
      } else if (typeof value === "string") {
        if (value.includes("/")) {
          // If string is a path, operate on individual segments
          const urlParts = value
            .split("/")
            .map((part) => (isID(part) ? getOrGenerateID(part) : part));
          (json as any)[k] = urlParts.join("/");
        } else if (isID(value)) {
          (json as any)[k] = getOrGenerateID(value);
        }
      }
    }
  }

  function getOrGenerateID(value: string): string {
    let id = store[value];
    if (!id) {
      id = `ID${++idIdx}`;
      store[value] = id;
    }
    return id;
  }

  findAndReplaceID(removedObj);
  return { cleanedObject: removedObj, idStore: store };
}

export function removeUrlsFromObjs(
  obj: Json | Json[],
  existingStore?: StringMapping,
): {
  cleanedObject: Json | Json[];
  urlStore: StringMapping;
} {
  /**
   * Removes URLs (as defined by utils.isURL) from an arbitrary JSON object.
   * Replace URLs with an URL in the form URL1, URL2, etc.
   * Returns the cleaned object and a lookup table (urlStore) of the original URLs
   * to the new URLs.
   */
  const store: StringMapping = existingStore ?? {};
  // Deepcopy to prevent mutating the original object
  const removedObj = JSON.parse(JSON.stringify(obj));
  // If already have an urlStore, start counting from the last index
  let urlIdx = Object.entries(store).length;

  function findAndReplaceURL(json: Json | Json[]) {
    if (!json || typeof json !== "object") return;

    // Creates the same iterator for both arrays and objects
    const entries = Array.isArray(json)
      ? json.entries()
      : Object.entries(json as { [key: string]: Json });

    for (const [key, value] of entries) {
      const k = key as string;
      if (typeof value === "object") {
        findAndReplaceURL(value);
      } else if (typeof value === "string") {
        if (isUrl(value)) {
          (json as any)[k] = getOrGenerateURL(value);
        }
      }
    }
  }

  function getOrGenerateURL(value: string): string {
    let id = store[value];
    if (!id) {
      id = `URL${++urlIdx}`;
      store[value] = id;
    }
    return id;
  }

  findAndReplaceURL(removedObj);
  return { cleanedObject: removedObj, urlStore: store };
}

export function removeUrlsFromMarkdown(
  markdown: string,
  existingStore?: StringMapping,
): {
  cleanedMarkdown: string;
  urlStore: StringMapping;
} {
  /**
   * Removes Markdown URLs from a Markdown-formatted string.
   * Replace the url with a placeholder in the form URL1, URL2, etc.
   * Returns the cleaned string and a lookup table of the original URLs
   * to the placeholder URL values.
   */
  const urlStore: StringMapping = existingStore ?? {};
  // If already have an idStore, start counting from the last index
  let idx = Object.entries(urlStore).length;
  // Matches both links and images
  const regex = /\[[\s\S.]*?]\((.*?)\)/g;
  let match;
  let cleanedMarkdown = markdown;

  while ((match = regex.exec(markdown)) !== null) {
    const url = match[1];
    if (url.startsWith("URL")) {
      // If the URL is already a placeholder, skip it
      continue;
    }
    let placeholder = urlStore[url];
    if (!placeholder) {
      placeholder = `URL${++idx}`;
      urlStore[url] = placeholder;
    }
    cleanedMarkdown = cleanedMarkdown.replaceAll(url, placeholder);
    // This is necessary to avoid infinite loops with zero-width matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return { cleanedMarkdown, urlStore };
}

export function sanitizeMessages(
  messages: ChatGPTMessage[],
  sanitizeUrlsFirst: boolean,
): {
  cleanedMessages: ChatGPTMessage[];
  originalToPlaceholderMap: StringMapping;
} {
  /** Removes ids and urls from messages, replaces them with variables like ID1, URL4
   * and returns the cleaned messages and a lookup table of {value: variable} */
  let idStore: StringMapping = {},
    urlStore: StringMapping = {};
  const cleanedMessages = (
    JSON.parse(JSON.stringify(messages)) as ChatGPTMessage[]
  ).map((message) => {
    if (message.role === "function") {
      try {
        let cleanedObject = JSON.parse(message.content);
        if (sanitizeUrlsFirst) {
          ({ cleanedObject, urlStore } = removeUrlsFromObjs(
            cleanedObject,
            urlStore,
          ));
          ({ cleanedObject, idStore } = removeIdsFromObjs(
            cleanedObject,
            idStore,
          ));
        } else {
          ({ cleanedObject, idStore } = removeIdsFromObjs(
            cleanedObject,
            idStore,
          ));
          ({ cleanedObject, urlStore } = removeUrlsFromObjs(
            cleanedObject,
            urlStore,
          ));
        }
        message.content = JSON.stringify(cleanedObject);
      } catch {
        let cleanedMarkdown;
        ({ cleanedMarkdown, urlStore } = removeUrlsFromMarkdown(
          message.content,
          urlStore,
        ));
        message.content = cleanedMarkdown;
      }
    }
    return message;
  });

  return {
    cleanedMessages,
    originalToPlaceholderMap: { ...idStore, ...urlStore },
  };
}

export function repopulateVariables(
  obj: Json | Json[],
  originalToPlaceholderMap: StringMapping,
): Json | Json[] {
  /**
   * Takes an object containing variables in the form ID1, ID2, URL1 (as generated by removeXs),
   * and a originalToPlaceholderMap, the combination of {value: variable} mappings returned by removeXs.
   * Returns the object with the original values readded to it
   */

  // Deepcopy to prevent mutating the original object
  const objWithIDs = JSON.parse(JSON.stringify(obj));
  // Need a lookup table for the original IDs, which is the reverse of uuidStore
  const placeholderToOriginalMap = swapKeysValues(originalToPlaceholderMap);

  function findAndReplaceID(json: any) {
    // Creates the same iterator for both arrays and objects
    const entries = Array.isArray(json) ? json.entries() : Object.entries(json);

    for (const [key, value] of entries) {
      if (typeof value === "string") {
        if (value.includes("/")) {
          // If string is a path, operate on individual segments - this is for IDs in paths
          const segments = value.split("/");
          for (let i = 0; i < segments.length; i++) {
            if (placeholderToOriginalMap[segments[i]]) {
              segments[i] = placeholderToOriginalMap[segments[i]];
            }
          }
          json[key] = segments.join("/");
        } else if (placeholderToOriginalMap[value]) {
          json[key] = placeholderToOriginalMap[value];
        }
      } else if (value && typeof value === "object") {
        findAndReplaceID(value);
      }
    }
  }

  findAndReplaceID(objWithIDs);
  return objWithIDs;
}
