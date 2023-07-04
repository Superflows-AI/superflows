import tokenizer from "gpt-tokenizer";
import { z } from "zod";
import { ChatGPTMessage, ChatMessage } from "./models";

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

export function parseKeyValues(
  keyValueText: string
): { key: string; value: string }[] {
  return keyValueText.split("<br/>").map((line) => {
    const [key, ...value] = line.split(":");
    return { key: key.trim(), value: value.join(":").trim() };
  });
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

export function camelToCapitalizedWords(camelCaseStr: string): string {
  return camelCaseStr
    .replace(/([A-Z])/g, " $1") // Add a space before each uppercase letter
    .replace(/^./, (match) => match.toUpperCase()); // Capitalize the first letter
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
  functionOutput: Record<string, any> | any[]
): string {
  let output = "";
  if (Array.isArray(functionOutput)) {
    if (
      typeof functionOutput[0] === "object" &&
      !Array.isArray(functionOutput[0])
    ) {
      // Format: [{a,b}, {a,b}]
      functionOutput.forEach((item) => {
        output += "<table>";
        Object.entries(item).forEach(([key, value]) => {
          output += `${camelToCapitalizedWords(key)}: ${
            typeof value === "object" ? JSON.stringify(value) : value
          }<br/>`;
        });
        output += "</table>";
      });
    } else {
      // Format: [x, y, z]
      output += "<table>";
      functionOutput.forEach((val) => {
        output += `Value: ${camelToCapitalizedWords(val)}<br/>`;
      });
      output += "</table>";
    }
  } else {
    // Format: {data: {a, b}}
    if ("data" in functionOutput) {
      functionOutput = functionOutput.data;
    }
    // Format: {a, b}
    output += "<table>";
    Object.entries(functionOutput).forEach(([key, value]) => {
      output += `${camelToCapitalizedWords(key)}: ${
        typeof value === "object" ? JSON.stringify(value) : value
      }<br/>`;
    });
    output += "</table>";
  }
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
