import { z } from "zod";
import { Database } from "./database.types";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

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

export async function httpRequestFromAction(
  action: Database["public"]["Tables"]["actions"]["Row"],
  parameters: Record<string, unknown>,
  userApiKey?: string
): Promise<Record<string, any> | any[]> {
  if (!action.path) {
    throw new Error("Path is not provided");
  }
  if (!action.request_method) {
    throw new Error("Request method is not provided");
  }

  const headers = new Headers();
  // TODO: Only application/json supported for now(!!)
  headers.set("Content-Type", "application/json");
  if (userApiKey) {
    headers.set("Authorization", `Bearer ${userApiKey}`);
  }

  const requestOptions: RequestInit = {
    method: action.request_method,
    headers: headers,
  };

  // Request body
  if (action.request_method !== "GET" && action.request_body_contents) {
    const reqBodyContents =
      action.request_body_contents as unknown as OpenAPIV3.RequestBodyObject;
    if (!("application/json" in reqBodyContents)) {
      throw new Error(
        "Only application/json request body contents are supported for now"
      );
    }
    const applicationJson = reqBodyContents[
      "application/json"
    ] as OpenAPIV3.MediaTypeObject;
    const schema = applicationJson.schema as OpenAPIV3.SchemaObject;
    const properties = schema.properties as OpenAPIV3_1.MediaTypeObject;
    const bodyArray = Object.entries(properties).map(([name, property]) => {
      // Throw out readonly attributes
      if (property.readOnly) return undefined;
      if (parameters[name]) {
        return { [name]: parameters[name] };
      }
    });
    const body = Object.assign({}, ...bodyArray);

    // Check all required params are present
    const required = schema.required ?? [];
    required.forEach((key: string) => {
      if (!body[key]) {
        throw new Error(`Required parameter "${key}" is not provided`);
      }
    });

    requestOptions.body = JSON.stringify(body);
  }

  let url = action.path;

  // TODO: accept array for JSON? Is this even possible? (not needed right now)
  // Set parameters
  if (
    action.parameters &&
    typeof action.parameters === "object" &&
    Array.isArray(action.parameters)
  ) {
    const queryParams = new URLSearchParams();
    const actionParameters =
      action.parameters as unknown as OpenAPIV3_1.ParameterObject[];
    for (const param of actionParameters) {
      if (param.required && !parameters[param.name]) {
        throw new Error(
          `Parameter "${param.name}" in ${param.in} is not provided by LLM`
        );
      }
      if (param.in === "path") {
        url = url.replace(`{${param.name}}`, String(parameters[param.name]));
      } else if (parameters.in === "query") {
        queryParams.set(param.name, String(parameters[param.name]));
      } else if (parameters.in === "header") {
        headers.set(param.name, String(parameters[param.name]));
      } else if (parameters.in === "cookie") {
        headers.set("Cookie", `${param}=${String(parameters[param.name])}`);
      } else {
        throw new Error(
          `Parameter "${param.name}" has invalid location: ${param.in}`
        );
      }
    }
    url += `?${queryParams.toString()}`;
  }

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }
  return await response.json();
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
          output += `${camelToCapitalizedWords(key)}: ${value}<br/>`;
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
      output += `${camelToCapitalizedWords(key)}: ${value}<br/>`;
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
