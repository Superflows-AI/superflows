import tokenizer from "gpt-tokenizer";
import { DateTime } from "luxon";
import { ChatMessage } from "gpt-tokenizer/src/GptEncoding";
import { validate } from "uuid";
import { z } from "zod";
import { ChatGPTMessage, Chunk, Properties } from "./models";

export function classNames(
  ...classes: (string | undefined | null | boolean)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export function getNumRows(text: string, textWidth: number): number {
  return text
    .split("\n")
    .map((t) => Math.ceil((t.length + 1) / textWidth))
    .reduce((a, b) => a + b);
}

export function removeEmptyCharacters(text: string): string {
  return text.replace("\u0000", "");
}

export async function exponentialRetryWrapper<Args extends Array<any>, Output>(
  func: (...args: Args) => Promise<Output>,
  args: Args,
  retries: number,
): Promise<Output> {
  const t1 = Date.now();
  console.log("Starting exponentialRetryWrapper for function " + func.name);
  try {
    const res = await func(...args);
    console.log(
      `Exponential retry wrapper completed in ${Date.now() - t1} ms for func "${
        func.name
      }". There were ${retries - 1} retries remaining.`,
    );
    return res;
  } catch (error) {
    console.log(
      `Error in exponentialRetryWrapper for function ${func.name}. The error is: ${error}}`,
    );
    if (retries > 0) {
      console.log(`Retrying ${func.name} in ${2 ** (10 - retries)}ms`);
      await new Promise((r) => setTimeout(r, 2 ** (10 - retries)));
      return await exponentialRetryWrapper(func, args, retries - 1);
    } else {
      throw error;
    }
  }
}

export function unpackAndCall(
  func: ((...args: any[]) => any) | undefined,
  obj: {
    [p: string]: any;
  },
): any {
  if (!func) return "";
  // Get the names of the function parameters
  // @ts-ignore
  const paramNames = func
    .toString()
    .match(/function\s.*?\(([^)]*)\)/)[1]
    .split(",")
    .map((param) => param.trim());

  // Sort the object properties according to the function parameters
  // @ts-ignore
  const args = paramNames.map((paramName) => obj[paramName]);

  // Call the function with the unpacked arguments
  // @ts-ignore
  return func(...args);
}

export function isValidBody<T extends Record<string, unknown>>(
  body: any,
  bodySchema: z.ZodType<any>,
): body is T {
  const { success } = bodySchema.safeParse(body);
  return success;
}

export function stripTrailingAndCurly(str: string) {
  // Remove trailing slashes
  str = str.replace(/\/$/, "");

  // Remove anything inside curly brackets
  str = str.replace(/\/\{[^}]*}/, "");

  return str;
}

export function isAlphaNumericUnderscore(str: string): boolean {
  let pattern = /^[a-z0-9_]+$/i;
  return pattern.test(str);
}

export function isJsonString(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function openAiCost(
  messages: ChatGPTMessage[],
  put: "in" | "out",
  model: string,
): number {
  let costPerThousand;

  switch (put) {
    case "in":
      costPerThousand = model.startsWith("ft:gpt-3.5-turbo-0613")
        ? 0.012
        : model === "gpt-3.5-turbo-16k"
        ? 0.003
        : model.includes("gpt-3.5")
        ? 0.0015
        : 0.03;
    case "out": {
      costPerThousand = model.startsWith("ft:gpt-3.5-turbo-0613")
        ? 0.016
        : model === "gpt-3.5-turbo-16k"
        ? 0.004
        : model.includes("gpt-3.5")
        ? 0.002
        : 0.06;
    }
  }

  const nTokens = getTokenCount(messages);
  // For the 8k context model
  return nTokens * (costPerThousand / 1000);
}

export function getTokenCount(prompt: ChatGPTMessage[] | string): number {
  let chatGptMessages: ChatMessage[];
  if (typeof prompt === "string") {
    chatGptMessages = [{ role: "user", content: prompt }];
  } else {
    chatGptMessages = prompt as ChatMessage[];
  }
  // Per the docs, the tokenizer should be the same for 3.5-turbo and 4.
  const encoded = tokenizer.encodeChat(chatGptMessages, "gpt-4");
  return encoded.length;
}

export function chunkString(
  text: string,
  chunkSize: number,
  overlap: number,
): string[] {
  /** Splits a long string into chunks of length `chunkSize`, with overlap `overlap`
   * Useful for splitting up long strings for GPT. **/
  const encoding = tokenizer.encode(text);
  console.log("Chunking string. Number of tokens = " + encoding.length);

  const chunks = [];
  let i = 0;
  let start,
    end = 0;
  while (end < encoding.length) {
    start = i * (chunkSize - overlap);
    end = start + chunkSize;

    chunks.push(tokenizer.decode(encoding.slice(start, end)));
    i++;
  }
  console.log("Outputting " + chunks.length + " chunks of length " + chunkSize);
  return chunks;
}

export function objectNotEmpty(obj: Object): boolean {
  return Object.keys(obj).length > 0;
}

function deleteUndefined<InputType extends Record<string, any | undefined>>(
  obj: InputType,
): Partial<InputType> {
  for (let key in obj) {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
}

export function deduplicateArray<ArrType extends any[]>(
  arr: ArrType,
): Partial<ArrType | { items: Partial<ArrType>[] }> {
  if (arr.length === 0) return {};
  // Check for null, undefined, string, number, boolean or array
  if (
    arr.some((ele) => !ele || typeof ele !== "object" || Array.isArray(ele))
  ) {
    return arr;
  }
  const firstEle = arr[0];
  let output: Record<string, any> = { items: [] };

  Object.keys(firstEle).forEach((key) => {
    const allValues = arr.map((ele) => ele[key]);
    if (allValues.every((val) => val === allValues[0])) {
      output[key] = allValues[0];
    } else if (output.items.length === 0) {
      output.items = arr.map((ele) => ({ [key]: ele[key] }));
    } else {
      output.items.forEach((item: any, i: number) => {
        item[key] = arr[i][key];
      });
    }
  });
  if (output.items.length === 0) {
    delete output.items;
  } else {
    output.items = output.items.map((item: any) => {
      return deleteUndefined(item);
    });
  }

  return output;
}

export function filterKeys<InputObject extends any>(
  obj: InputObject,
  keysToKeep: string[],
): any {
  if (!obj || typeof obj !== "object") return obj;
  else if (Array.isArray(obj)) {
    return obj.map((ele) => filterKeys(ele, keysToKeep));
  } else {
    const output: Record<string, any> = {};
    Object.entries(obj).forEach(([key, value]) => {
      // Not array or object
      if (!value || typeof value !== "object") {
        if (keysToKeep.includes(key)) {
          output[key] = value;
        }
        return;
      }
      // Array
      if (Array.isArray(value)) {
        // If the array is empty, don't add it
        const val = value.map((ele) => filterKeys(ele, keysToKeep));
        if (val.length > 0) {
          output[key] = val;
        }
      }
      // Object
      const val = filterKeys(value, keysToKeep);
      // If the object is empty, don't add it
      if (Object.keys(val).length > 0) {
        output[key] = val;
      }
    });

    return output;
  }
}

export function splitPath(path: string): string[] {
  return path.split("/").filter((ele) => ele !== "");
}

export function jsonSplitter(
  json: any,
  path: (string | number)[] = [],
): Chunk[] {
  /**
  Breaks down JSON into individual chunks of data. Each "Chunk" is defined by its path
  (i.e. where it is positioned in the json). And the data itself.
  E.g. The chunk for the field 'b' in the json {a: {b: 1}} => [{path: ["a", "b"], data: 1}
  **/

  if (Array.isArray(json)) {
    let chunks: Chunk[] = [];
    if (json.length === 0) chunks.push({ path, data: [] });
    for (let i = 0; i < json.length; i++) {
      chunks.push(...jsonSplitter(json[i], [...path, i]));
    }
    return chunks.map((chunk) => ({ ...chunk, dataType: "Array" }));
  } else if (typeof json === "object" && json !== null) {
    let chunks: Chunk[] = [];
    if (Object.keys(json).length === 0) chunks.push({ path, data: {} });
    for (let key in json) {
      chunks.push(...jsonSplitter(json[key], [...path, key]));
    }
    return chunks;
  } else {
    return [{ path, data: json }];
  }
}

export function jsonReconstruct(chunks: Chunk[]): Record<string, any> {
  /**
  Takes Chunks outputted by jsonSplitter and reconstructs the original JSON.
  So jsonReconstruct(jsonSplitter(anyJson)) === anyJson
  **/

  // Sort by path length (depth) ascending
  chunks.sort((a, b) => a.path.length - b.path.length);

  let root: Record<string, any> = {};

  for (let chunk of chunks) {
    let layer = root;
    for (let i = 0; i < chunk.path.length; i++) {
      let key = chunk.path[i];
      if (i === chunk.path.length - 1) {
        layer[key] = chunk.data;
      } else if (layer[key] === undefined) {
        layer[key] = isNaN(Number(chunk.path[i + 1])) ? {} : [];
      }
      layer = layer[key];
    }
  }
  return root;
}

export function chunksToProperties(chunks: Chunk[]): Properties {
  /**
  Once a 'properties' field has been deconstructed into chunks, it looks like this:

  { path: [ 'id', 'type' ], data: 'integer' },
  { path: [ 'id', 'description' ], data: 'Customer id' },
  { path: [ 'id', 'format' ], data: 'int64' },

  We need to give this information to GPT in the form: 
  variableName (<type>): <description>

  So we transform it into a key value pair where the key is the name of the variable and 
  the value is an object containing the type and description (and the path for later use)

  e.g. for the above example:
  { id: { type: 'integer', description: 'Customer id', path: [ 'id' ] } }
  **/

  const properties: Properties = {};
  for (const chunk of chunks) {
    const fieldName = chunk.path.slice(0, -1).join(".");
    const chunkType = chunk.path[chunk.path.length - 1];

    const existingProperty = properties[fieldName] ?? {
      path: chunk.path.slice(0, -1),
    };

    if (["type", "description"].includes(chunkType?.toString() ?? "")) {
      // If statement below is true when the chunk is an array of primitives. Without this check,
      // we ask gpt for a value for the key "item" which is part of the schema
      // structure, not data we want returned.
      // TODO: this doesn't treat the array as an array currently
      if (fieldName === "items" && !["object", "array"].includes(chunk.data)) {
        properties[chunk.path[chunk.path.length - 3]] = {
          path: chunk.path,
          [chunkType]: chunk.data,
        };
      } else {
        properties[fieldName] = {
          ...existingProperty,
          [chunkType]: chunk.data,
        };
      }
    }
  }
  return properties;
}

export function chunkToString(chunk: Chunk): string {
  if (chunk.path.length === 0) return "";
  return `${chunk.path.join(".")}: ${chunk.data}`;
}

export function addGPTdataToProperties(
  properties: Properties,
  gptOutput: string,
  arrayIdx: number | null = null,
): Properties {
  /**
  Add the data outputted by gpt to the properties object. 

  If working with an array type (and gpt has output a comma separated list of values)
  pass arrayIdx to select which value in an semi-colon separate list to use.

  TODO: currently always treats data as a string.
  **/

  gptOutput.split("\n").forEach((line) => {
    let [key, value] = [
      line.slice(0, line.indexOf(":")).trim(),
      line.slice(line.indexOf(":") + 1).trim(),
    ];

    if (key in properties) {
      if (arrayIdx !== null) {
        value = value
          .replace("[", "")
          .replaceAll("]", "")
          .split(",")
          [arrayIdx].trim(); // TODO: Add fallback for if the commaIdx is out of range
      }

      if (!value) return;

      // Remove leading or trailing single or double quotes
      value = value.replace(/^["'](.+(?=["']$))["']$/, "$1");
      try {
        value = JSON.parse(value);
      } catch {}
      properties[key].data = value;
    }
  });

  return properties;
}

export function propertiesToChunks(properties: Properties): Chunk[] {
  /**
  The reverse transformation to that done by transformProperties 
  **/
  return Object.values(properties).map((prop) => ({
    path: prop.path,
    data: prop.data,
  }));
}

export function swapKeysValues(json: { [key: string]: string }) {
  const keyValCount = Object.keys(json).length;
  const ret: { [key: string]: string } = {};
  for (const key in json) {
    ret[json[key]] = key;
  }
  if (Object.keys(ret).length !== keyValCount) {
    console.warn(
      `swapKeysValues() failed sanity check: started with ${keyValCount} key-val pairs, ended with ${Object.keys(
        ret.length,
      )}`,
    );
  }
  return ret;
}

const absoluteChecker = new RegExp("^(?:[a-z+]+:)?//", "i");
export function isUrlRelative(url: string): boolean {
  return !absoluteChecker.test(url);
}

export function makeUrlAbsolute(url: string, href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  // Capture the protocol and host from the href (until the first '/')
  const baseRegex = /^(https?:\/\/[^\/]*)/;
  let match = url.match(baseRegex);
  if (match) url = match[0];
  // Ensure there isn't double slashes when concatenating
  if (url.endsWith("/") && href.startsWith("/")) {
    return url.slice(0, -1) + href;
  } else if (!url.endsWith("/") && !href.startsWith("/")) {
    return `${url}/${href}`;
  } else {
    return url + href;
  }
}

export function isUUID(str: string): boolean {
  return validate(str);
}

export function isEmail(string: string): boolean {
  // Check if string is an email address
  return /^[\w.-]+@[\w.-]+\.\w{2,}$/g.test(string);
}

export function isPhoneNumber(string: string): boolean {
  // Below regex checks for the format of a phone number. It's a little loose since it
  // has to allow country codes and different formatting of spaces, hyphens and brackets.
  // We have further sanity checks below (no letters, right number of numbers)
  const phoneNumRegex =
    /^(\+?\d{1,3}[-.\s]?)?\(?\d{1,3}\)?[-.\s]?(\d{1,2})?[-.\s]?(\d{3,4})?[-.\s]?(\d{3,9})$/;

  const broadlyRightFormat = phoneNumRegex.test(string);
  if (!broadlyRightFormat) return false;

  // Check if right number of numbers
  const numberCount = string.replace(/\D/g, "").length;
  // Reason for 10-13 range is phone numbers have 11 numbers, but there's an optional 0
  // at the front and country code can add 3 (e.g. +44) which replaces the 0
  // (strictly speaking, a country code can add >3, but these countries are rare)
  const numberCountCorrect = 10 <= numberCount && numberCount <= 13;
  if (!numberCountCorrect) return false;
  // Check if there are any letters
  return !/[a-z]/i.test(string);
}

export function isName(string: string): boolean {
  // Check for strings with no numbers, optionally capitalised first letters
  // which have 1-3 words plus optional hyphenation, commas and full stops.
  // Allow ,.- because you can have double-barrelled names (Smith-Jones),
  // shortenings (Google Inc.) and commas (Smith, Jones and Co.), albeit rarely
  return /([A-Z]?[a-z-.,]{1,9}\s){1,2}[A-Z]?[a-z-.,]{1,9}/.test(string);
}

function isMoneyValue(str: string): boolean {
  return /^[$£€]?\d{1,3},(\d\d\d,){0,2}\d{3}(.\d\d)?$/g.test(str);
}

export function isID(str: string): boolean {
  if (str.length < 10) return false;
  if (isUUID(str)) return true;
  if (isDate(str)) return false;
  if (isEmail(str)) return false;
  if (isMoneyValue(str)) return false;
  if (isPhoneNumber(str)) return false;
  if (isName(str)) return false;
  const nTokens = tokenizer.encode(str).length;
  const x = str.length / nTokens;
  // Is an ID if there's less than 2.2 characters per token (threshold determined empirically)
  return x <= 2.2;
}

export function isUrl(str: string): boolean {
  if (/ID[1-9]+/.test(str)) return false;
  return /^((https?|ftp):\/\/)?([\w\-]+\.)+([a-zA-Z]){2,5}((\/[\w\-_.]+)*\/?)?(\?\S*)?(#[\w\-]+)?$/.test(
    str,
  );
}

const dateFormats = [
  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  "yyyy-MM-dd'T'HH:mm:ss.SSS",
  "yyyy-MM-dd'T'HH:mm:ss'Z'",
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm",
  "yyyy-MM-dd'T'HH",
  "yyyy-MM-dd",
  "yyyy/MM/dd'T'HH:mm:ss.SSS'Z'",
  "yyyy/MM/dd'T'HH:mm:ss.SSS",
  "yyyy/MM/dd'T'HH:mm:ss",
  "yyyy/MM/dd'T'HH:mm",
  "yyyy/MM/dd'T'HH",
  "yyyy/MM/dd",
  "yyyy.MM.dd'T'HH:mm:ss.SSS'Z'",
  "yyyy.MM.dd'T'HH:mm:ss.SSS",
  "yyyy.MM.dd'T'HH:mm:ss",
  "yyyy.MM.dd'T'HH:mm",
  "yyyy.MM.dd'T'HH",
  "yyyy.MM.dd",
  "yyyyMMdd'T'HHmmss.SSS'Z'",
  "yyyyMMdd'T'HHmmss.SSS",
  "yyyyMMdd'T'HHmmss",
  "yyyyMMdd'T'HHmm",
  "yyyyMMdd'T'HH",
  "yyyyMMdd",
  "HH:mm:ss.SSS",
  "HH:mm:ss",
  "HH:mm",
  "MM-dd-yyyy",
  "dd.MM.yyyy",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "h:mm a",
  "dd/MM/yyyy HH:mm",
  "d/MM/yyyy HH:mm",
  "d/MM/yy HH:mm",
  "d/MM/yy H:mm",
  "dd/MM/yyyy HH:mm:ss",
];

export function isDate(str: string): boolean {
  for (const format of dateFormats) {
    const dt = DateTime.fromFormat(str, format);
    if (dt.isValid) {
      return true;
    }
  }
  return false;
}

export function joinArraysNoDuplicates<T extends Record<string, any>>(
  arr1: T[],
  arr2: T[],
  uniqueKey: keyof T,
): T[] {
  // Joins two arrays of objects, removing duplicates based on the uniqueKey
  if (arr1.length === 0) return arr2;
  if (arr2.length === 0) return arr1;
  const ids = new Set(arr1.map((d) => d[uniqueKey]));
  return [...arr1, ...arr2.filter((d) => !ids.has(d[uniqueKey]))];
}
