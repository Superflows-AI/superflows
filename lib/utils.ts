import { z } from "zod";
import { Database } from "./database.types";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { StreamingStep } from "../pages/api/v1/answers";

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
  // console.log("Parsing key values from", keyValueText);
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
      }". This time is for retry number: ${retries}`
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
