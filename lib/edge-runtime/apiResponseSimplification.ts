import { Json } from "../database.types";
import { isID, isUrl, swapKeysValues } from "../utils";
import { ChatGPTMessage } from "../models";

export type StringMapping = { [key: string]: string };

export function removeIDs(
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

export function removeURLs(
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

export function sanitizeMessages(messages: ChatGPTMessage[]): {
  cleanedMessages: ChatGPTMessage[];
  valueVariableMap: StringMapping;
} {
  /** Removes ids and urls from messages, replaces them with variables like ID1, URL4
   * and returns the cleaned messages and a lookup table of {value: variable} */
  let idStore: StringMapping = {},
    urlStore: StringMapping = {};
  const cleanedMessages = messages.map((message) => {
    if (message.role === "function") {
      try {
        let cleanedObject = JSON.parse(message.content);
        ({ cleanedObject, urlStore } = removeURLs(cleanedObject, urlStore));
        ({ cleanedObject, idStore } = removeIDs(cleanedObject, idStore));
        message.content = JSON.stringify(cleanedObject);
      } catch {}
    }
    return message;
  });

  return { cleanedMessages, valueVariableMap: { ...idStore, ...urlStore } };
}

export function repopulateVariables(
  obj: Json | Json[],
  valueVariableMap: StringMapping,
): Json | Json[] {
  /**
   * Takes an object containing variables in the form ID1, ID2, URL1 (as generated by removeXs),
   * and a valueVariableMap, the combination of {value: variable} mappings returned by removeXs.
   * Returns the object with the original values readded to it
   */

  // Deepcopy to prevent mutating the original object
  const objWithIDs = JSON.parse(JSON.stringify(obj));
  // Need a lookup table for the original IDs, which is the reverse of uuidStore
  valueVariableMap = swapKeysValues(valueVariableMap);

  function findAndReplaceID(json: any) {
    // Creates the same iterator for both arrays and objects
    const entries = Array.isArray(json) ? json.entries() : Object.entries(json);

    for (const [key, value] of entries) {
      if (typeof value === "string") {
        if (value.includes("/")) {
          // If string is a path, operate on individual segments - this is for IDs in paths
          const segments = value.split("/");
          for (let i = 0; i < segments.length; i++) {
            if (valueVariableMap[segments[i]]) {
              segments[i] = valueVariableMap[segments[i]];
            }
          }
          json[key] = segments.join("/");
        } else if (valueVariableMap[value]) {
          json[key] = valueVariableMap[value];
        }
      } else if (value && typeof value === "object") {
        findAndReplaceID(value);
      }
    }
  }

  findAndReplaceID(objWithIDs);
  return objWithIDs;
}