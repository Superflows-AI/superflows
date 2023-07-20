import tokenizer from "gpt-tokenizer";
import { z } from "zod";
import { ChatGPTMessage, Chunk, Properties, Property } from "./models";
import { ChatMessage } from "gpt-tokenizer/src/GptEncoding";

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

export function parseTableTags(text: string): { key: string; value: string }[] {
  const captionRegex = /<caption>(.*?)<\/caption>/;
  const caption = {
    key: "caption",
    value: text.match(captionRegex)?.[1] ?? "",
  };
  text = text.replace(captionRegex, "");

  const rows = text.split("<br/>").map((line) => {
    const [key, ...value] = line.split(":");
    return { key: key.trim(), value: value.join(":").trim() };
  });
  return [caption, ...rows];
}

export function removeEmptyCharacters(text: string): string {
  return text.replace("\u0000", "");
}

export async function exponentialRetryWrapper<Args extends Array<any>, Output>(
  func: (...args: Args) => Promise<Output>,
  args: Args,
  retries: number
): Promise<Output> {
  const t1 = Date.now();
  console.log("Starting exponentialRetryWrapper for function " + func.name);
  try {
    const res = await func(...args);
    console.log(
      `Exponential retry wrapper completed in ${Date.now() - t1} ms for func "${
        func.name
      }". There were ${retries - 1} retries remaining.`
    );
    return res;
  } catch (error) {
    console.log(
      `Error in exponentialRetryWrapper for function ${func.name}. The error is: ${error}}`
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

export function unpackAndCall<Args extends object>(
  func: ((...args: any[]) => any) | undefined,
  obj: {
    [p: string]: any;
  }
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
  bodySchema: z.ZodType<any>
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

export function convertToRenderable(
  functionOutput: Record<string, any> | any[],
  caption?: string
): string {
  let output = "<table>";
  if (caption) {
    output += `<caption>${caption}</caption>`;
  }
  if (Array.isArray(functionOutput)) {
    if (
      typeof functionOutput[0] === "object" &&
      !Array.isArray(functionOutput[0])
    ) {
      // Format: [{a,b}, {a,b}]
      functionOutput.forEach((item) => {
        Object.entries(item).forEach(([key, value]) => {
          output += `${functionNameToDisplay(key)}: ${
            typeof value === "object" ? JSON.stringify(value) : value
          }<br/>`;
        });
      });
    } else {
      // Format: [x, y, z]
      functionOutput.forEach((val) => {
        output += `Value: ${functionNameToDisplay(val)}<br/>`;
      });
    }
  } else {
    // Format: {data: {a, b}}
    if ("data" in functionOutput) {
      functionOutput = functionOutput.data;
    }
    // Format: {a, b}
    Object.entries(functionOutput).forEach(([key, value]) => {
      output += `${functionNameToDisplay(key)}: ${
        typeof value === "object" ? JSON.stringify(value) : value
      }<br/>`;
    });
    output = output.slice(0, -5);
  }
  output += "</table>";
  return output;
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
  put: "in" | "out"
): number {
  let costPerToken;
  if (put === "in") {
    costPerToken = 0.03 / 1000;
  } else {
    costPerToken = 0.06 / 1000;
  }

  const encoded = tokenizer.encodeChat(messages as ChatMessage[], "gpt-4");
  const nTokens = encoded.length;
  // For the 8k context model
  return nTokens * costPerToken;
}

export function objectNotEmpty(obj: Object): boolean {
  return Object.keys(obj).length > 0;
}

function deleteUndefined<InputType extends Record<string, any | undefined>>(
  obj: InputType
): Partial<InputType> {
  for (let key in obj) {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
}

export function deduplicateArray<ArrType extends any[]>(
  arr: ArrType
): Partial<ArrType | { items: Partial<ArrType>[] }> {
  if (arr.length === 0) return {};
  const firstEle = arr[0];
  if (typeof firstEle !== "object") return arr;
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
  keysToKeep: string[]
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
        output[key] = value.map((ele) => filterKeys(ele, keysToKeep));
      }
      // Object
      output[key] = filterKeys(value, keysToKeep);
    });

    return output;
  }
}

export function splitPath(path: string): string[] {
  return path.split("/").filter((ele) => ele !== "");
}

export function chunkKeyValuePairs(
  obj: { [key: string]: any },
  chunkSize: number
) {
  const keys = Object.keys(obj);
  let results = [];

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunkKeys = keys.slice(i, i + chunkSize);
    const chunk = chunkKeys.reduce((result, key) => {
      // @ts-ignore
      result[key] = obj[key];
      return result;
    }, {});

    results.push(chunk);
  }

  return results;
}

export function deepMerge(
  obj1: { [k: string]: any },
  obj2: { [k: string]: any }
): { [k: string]: any } {
  for (let key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (
        obj1[key] &&
        typeof obj2[key] === "object" &&
        !Array.isArray(obj2[key])
      ) {
        deepMerge(obj1[key], obj2[key]);
      } else {
        obj1[key] = obj2[key];
      }
    }
  }
  return obj1;
}

export function functionNameToDisplay(name: string): string {
  let result = name
    // Insert a space before all camelCased and PascalCased characters
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Replace underscores with a space
    .replace(/_/g, " ")
    // Convert all text to lower case
    .toLowerCase()
    // Capitalize the first letter of each word
    .replace(/\b[a-z](?=[a-z]{1})/g, (letter) => letter.toUpperCase());

  return result;
}

export function jsonSplitter(
  json: any,
  path: (string | number)[] = []
): Chunk[] {
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

// export function groupByPath(chunks: Chunk[]) {
//   const grouped = Object.values(
//     chunks.reduce((group: { [key: string]: Chunk[] }, chunk) => {
//       const path = JSON.stringify(chunk.path.slice(0, -1)); // the last element is the actual key
//       group[path] = group[path] ?? [];
//       group[path].push(chunk);
//       return group;
//     }, {})
//   );

//   const formatted = grouped.map((group) => {
//     return {
//       fieldName: group[0].path[group[0].path.length - 1],
//       type: group.find((item) => item.path[item.path.length - 2] === "type"),
//       description: group.find(
//         (item) => item.path[item.path.length - 2] === "description"
//       ),
//     };
//   });
//   return formatted;
// }

export function transformProperties(chunks: Chunk[]): Properties {
  // TODO: this loses all information about the path
  const properties: Properties = {};
  for (const chunk of chunks) {
    const fieldName = chunk.path[chunk.path.length - 2];
    const chunkType = chunk.path[chunk.path.length - 1];

    const existingProperty = properties[fieldName] ?? { path: chunk.path };

    if (["type", "description"].includes(chunkType.toString())) {
      properties[fieldName] = { ...existingProperty, [chunkType]: chunk.data };
    }
  }
  return properties;
}

export function chunkToString(chunk: Chunk): string {
  // maybe
  if (chunk.path.length === 0) return "";
  return `${chunk.path.join(".")}: ${chunk.data}`;
}

export function addGPTdataToProperties(
  properties: Properties,
  input: string
): Properties {
  // Split the string into lines, then iterate over each line
  //TODO THIS IS ALWAYS  STRING
  input.split("\n").forEach((line) => {
    const [key, value] = line.split(":").map((s) => s.trim());

    // If the key exists in the properties object, add the "data" field
    if (key in properties) {
      properties[key].data = value;
    }
  });

  return properties;
}

export function propertiesToChunks(properties: Properties): Chunk[] {
  return Object.values(properties).map((prop) => ({
    path: prop.path.slice(0, -1), // Not sure about this
    data: prop.data,
  }));
}
