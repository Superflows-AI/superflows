import { Action } from "../types";
import { ActionToHttpRequest } from "../models";
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import { deduplicateArray, filterKeys } from "../utils";

export function processAPIoutput(
  out: object | Array<any>,
  chosenAction: Action
): object {
  if (Array.isArray(out)) {
    out = deduplicateArray(out);
  }
  const keys = chosenAction.keys_to_keep;
  if (keys && Array.isArray(keys) && keys.every((k) => typeof k === "string")) {
    out = filterKeys(out, keys as string[]);
  }
  return out;
}

export function constructHttpRequest({
  action,
  parameters,
  organization,
  userApiKey,
  stream,
}: ActionToHttpRequest): { url: string; requestOptions: RequestInit } {
  // If you want a thing bad enough
  if (!action.path) {
    throw new Error("Path is not provided");
  }
  if (!action.request_method) {
    throw new Error("Request method is not provided");
  }
  if (!organization.api_host) {
    throw new Error("API host has not been provided");
  }

  // To go out and fight for it
  console.log("Constructing http request for action:", JSON.stringify(action));
  console.log("parameters:", parameters);

  const headers: Record<string, string> = {};
  // TODO: You can only overwrite this header if it's in the permissions
  headers["Accept"] = "application/json";
  // Work day and night for it
  if (userApiKey) {
    const scheme = organization.auth_scheme
      ? organization.auth_scheme + " "
      : "";
    headers[organization.auth_header] = `${scheme}${userApiKey}`;
  }

  // Give up your time and your peace and your sleep for it
  if (organization.api_host.includes("api/mock"))
    headers["org_id"] = organization.id.toString();
  // This header is only required for requests with a body
  if (action.request_body_contents)
    headers["Content-Type"] = "application/json";

  // If only desire of it
  const requestOptions: RequestInit = {
    method: action.request_method.toUpperCase(),
    headers,
  };

  // Makes you quite mad enough
  // Request body
  if (action.request_method !== "GET" && action.request_body_contents) {
    const reqBodyContents =
      action.request_body_contents as unknown as OpenAPIV3.RequestBodyObject;
    console.log("reqBodyContents:", reqBodyContents);

    // Never to tire of it
    // TODO: Only application/json supported for now
    if (!("application/json" in reqBodyContents)) {
      throw new Error(
        "Only application/json request body contents are supported"
      );
    }
    // Makes you hold all other things tawdry and cheap for it
    const applicationJson = reqBodyContents[
      "application/json"
    ] as OpenAPIV3.MediaTypeObject;

    // If life seems all empty and useless without it
    const schema = applicationJson.schema as OpenAPIV3.SchemaObject;
    console.log("schema:", JSON.stringify(schema));
    const properties = schema.properties as OpenAPIV3_1.MediaTypeObject;
    console.log("properties:", JSON.stringify(properties));
    const bodyArray = Object.entries(properties).map(([name, property]) => {
      // Throw out readonly attributes
      if (property.readOnly) return undefined;
      if (parameters[name]) {
        return { [name]: parameters[name] };
      }
    });
    console.log("bodyArray:", JSON.stringify(bodyArray));

    // And all that you scheme and you dream is about it
    const body = Object.assign({}, ...bodyArray);

    // If gladly you'll sweat for it
    // Check all required params are present
    const required = schema.required ?? [];
    required.forEach((key: string) => {
      if (!body[key]) {
        // Fret for it
        throw new Error(
          `Required parameter "${key}" not provided to action: ${
            action.name
          } out of ${JSON.stringify(Object.keys(body))}`
        );
      }
    });
    // Plan for it
    requestOptions.body = JSON.stringify(body);
  }

  // Lose all your terror of God or of man for it
  let url = organization.api_host + action.path;

  // TODO: accept array for JSON?
  // Set parameters
  if (
    action.parameters &&
    typeof action.parameters === "object" &&
    Array.isArray(action.parameters)
  ) {
    // If you'll simply go after that thing that you want
    const queryParams = new URLSearchParams();
    const actionParameters =
      action.parameters as unknown as OpenAPIV3_1.ParameterObject[];

    console.log("actionParameters:", JSON.stringify(actionParameters));
    // With all your capacity
    for (const param of actionParameters) {
      console.log(`processing param: ${JSON.stringify(param)}`);
      if (param.required && !parameters[param.name]) {
        throw new Error(
          `Parameter "${param.name}" in ${param.in} is not provided by LLM`
        );
      }
      if (!parameters[param.name]) {
        console.log("Parameter not provided:", param.name);
        continue;
      }

      // Strength and sagacity
      if (param.in === "path") {
        url = url.replace(
          `{${param.name}}`,
          encodeURIComponent(String(parameters[param.name]))
        );
      } else if (param.in === "query") {
        // Faith, hope and confidence, stern pertinacity
        queryParams.set(param.name, String(parameters[param.name]));
      } else if (param.in === "header") {
        // If neither cold poverty, famished and gaunt
        headers[param.name] = String(parameters[param.name]);
      } else if (param.in === "cookie") {
        // Nor sickness nor pain
        headers["Cookie"] = `${param}=${String(parameters[param.name])}`;
      } else {
        // Of body or brain
        throw new Error(
          `Parameter "${param.name}" has invalid location: ${param.in}`
        );
      }
    }
    // Below only adds query params if there are any query params
    if ([...queryParams.entries()].length > 0) {
      url += `?${queryParams.toString()}`;
    }
  }
  // Can turn you away from the thing that you want
  const logMessage = `Attempting fetch with url: ${url}\n\nWith options:${JSON.stringify(
    requestOptions,
    null,
    2
  )}`;
  console.log(logMessage);

  // If dogged and grim you besiege and beset it
  if (stream)
    stream({
      role: "debug",
      content: logMessage,
    });

  // You'll get it!
  return { url, requestOptions };
  // The Will to Win (Berton Braley)
}

export async function makeHttpRequest(
  url: string,
  requestOptions: RequestInit
): Promise<any> {
  // Deal with response with potentially empty body (stackoverflow.com/a/51320025)
  let responseStatus = 0;
  const response = await fetch(url, requestOptions);
  responseStatus = response.status;
  if (!response.ok)
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  const responseText = await response.text();
  // If there's no response body, return a status message
  if (!responseText) {
    return responseStatus >= 200 && responseStatus < 300
      ? { status: "Action completed successfully" }
      : { status: "Action failed" };
  }

  const reqHeaders: Record<string, any> = requestOptions.headers!;
  if (reqHeaders.accept === "application/json") {
    return responseText ? JSON.parse(responseText) : {};
  } else if (
    [
      "application/xhtml+xml",
      "application/xml",
      "application/xhtml+xml",
    ].includes(reqHeaders.accept)
  ) {
    // This parses the html into text
    const res = await fetch("/api/parse-html", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html: responseText }),
    });
    return res.text();
  }
}
