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

export async function httpRequestFromAction({
  action,
  parameters,
  organization,
  userApiKey,
  stream,
}: ActionToHttpRequest): Promise<Record<string, any> | any[]> {
  if (!action.path) {
    throw new Error("Path is not provided");
  }
  if (!action.request_method) {
    throw new Error("Request method is not provided");
  }
  if (!organization.api_host) {
    throw new Error("API host has not been provided");
  }

  console.log("Constructing http request for action:", JSON.stringify(action));
  console.log("parameters:", parameters);

  const headers: Record<string, string> = {};
  // TODO: Only application/json supported for now(!!)
  headers["Content-Type"] = "application/json";
  headers["Accept"] = "application/json";
  if (userApiKey) {
    const scheme = organization.auth_scheme
      ? organization.auth_scheme + " "
      : "";
    headers[organization.auth_header] = `${scheme}${userApiKey}`;
  }

  if (organization.api_host.includes("api/mock"))
    headers["org_id"] = organization.id.toString();

  const requestOptions: RequestInit = {
    method: action.request_method.toUpperCase(),
    headers: headers,
  };

  // Request body
  if (action.request_method !== "GET" && action.request_body_contents) {
    const reqBodyContents =
      action.request_body_contents as unknown as OpenAPIV3.RequestBodyObject;

    console.log("reqBodyContents:", reqBodyContents);

    if (!("application/json" in reqBodyContents)) {
      throw new Error(
        "Only application/json request body contents are supported for now"
      );
    }
    const applicationJson = reqBodyContents[
      "application/json"
    ] as OpenAPIV3.MediaTypeObject;

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

    const body = Object.assign({}, ...bodyArray);

    // Check all required params are present
    const required = schema.required ?? [];
    required.forEach((key: string) => {
      if (!body[key]) {
        throw new Error(
          `Required parameter "${key}" not provided to action: ${
            action.name
          } out of ${JSON.stringify(Object.keys(body))}`
        );
      }
    });
    requestOptions.body = JSON.stringify(body);
  }

  let url = organization.api_host + action.path;

  // TODO: accept array for JSON?
  // Set parameters
  if (
    action.parameters &&
    typeof action.parameters === "object" &&
    Array.isArray(action.parameters)
  ) {
    const queryParams = new URLSearchParams();
    const actionParameters =
      action.parameters as unknown as OpenAPIV3_1.ParameterObject[];

    console.log("actionParameters:", JSON.stringify(actionParameters));
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

      if (param.in === "path") {
        url = url.replace(
          `{${param.name}}`,
          encodeURIComponent(String(parameters[param.name]))
        );
      } else if (param.in === "query") {
        queryParams.set(param.name, String(parameters[param.name]));
      } else if (param.in === "header") {
        headers[param.name] = String(parameters[param.name]);
      } else if (param.in === "cookie") {
        headers["Cookie"] = `${param}=${String(parameters[param.name])}`;
      } else {
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
  const logMessage = `Attempting fetch with url: ${url}\n\nWith options:${JSON.stringify(
    requestOptions,
    null,
    2
  )}`;
  console.log(logMessage);

  if (stream)
    stream({
      role: "debug",
      content: logMessage,
    });

  // Deal with response with potentially empty body (stackoverflow.com/a/51320025)
  let responseStatus = 0;
  return fetch(url, requestOptions)
    .then((response) => {
      responseStatus = response.status;
      if (!response.ok)
        throw new Error(
          `HTTP Error: ${response.status} ${response.statusText}`
        );
      return response.text();
    })
    .then((data) => {
      return Promise.resolve(
        data
          ? JSON.parse(data)
          : responseStatus >= 200 && responseStatus < 300
          ? { status: "Action completed successfully" }
          : { status: "Action failed" }
      );
    })
    .catch((error) => {
      return Promise.reject(error);
    });
}
