import {
  MediaTypeObject,
  SchemaObject,
  ParameterObject,
} from "https://deno.land/x/openapi@0.1.0/mod.ts";
import { fillNoChoiceRequiredParams } from "./actionUtils.ts";
import {
  deduplicateArray,
  exponentialRetryWrapper,
  filterKeys,
  getJsonMIMEType,
  getParam,
  parseErrorHtml,
} from "./utils.ts";
import { Action, ActionPlusApiInfo, Header, Json } from "./types.ts";

export function processAPIoutput(
  out: Json | Json[],
  chosenAction: Action,
): Json | Json[] {
  const keys = chosenAction.keys_to_keep;
  if (keys && Array.isArray(keys) && keys.every((k) => typeof k === "string")) {
    if (Array.isArray(out)) {
      console.info("De-duplicating array");
      out = deduplicateArray(out) as Json[];
    }
    console.info("Filtering to keep keys:", keys);
    out = filterKeys(out, keys as string[]);
  }

  return out;
}

function forgeLogMessage(url: string, requestOptions: RequestInit) {
  return `Attempting fetch with url: ${url}\n\nWith options:${JSON.stringify(
    requestOptions,
    null,
    2,
  )}`;
}

export function constructHttpRequest({
  action,
  parameters,
  organization,
  userApiKey,
}: {
  action: ActionPlusApiInfo;
  parameters: Record<string, unknown>;
  organization: {
    id: number;
  };
  userApiKey?: string;
}): { url: string; requestOptions: RequestInit } {
  /** Constructs an HTTP request from an action and parameters
   *
   * @param action - The action to construct the request from
   * @param parameters - The parameters output by the AI to use in the API call
   * @param organization - The organization info to use for the API call
   * @param userApiKey - The user's API key to use for the API call
   * @param stream - The stream function to use for logging
   * **/
  if (!action.path) {
    throw new Error("Path is not provided");
  }
  if (!action.request_method) {
    throw new Error("Request method is not provided");
  }
  if (!action.api.api_host) {
    throw new Error("API host has not been provided");
  }

  console.info("Constructing http request for action:" + action.name);
  console.info("parameters:" + JSON.stringify(parameters));

  const headers: Record<string, string> = {};
  // TODO: You can only overwrite this header if it's in the parameters
  headers["Accept"] = "application/json";

  if (action.api.api_host.includes("api/mock"))
    headers["org_id"] = organization.id.toString();
  // This header is only required for requests with a body
  if (action.request_body_contents) {
    headers["Content-Type"] = "application/json";
  }
  action.headers
    // Filter out headers without names
    .filter((header: Header) => header.name)
    .forEach((header: Header) => {
      headers[header.name] = header.value;
    });

  const requestOptions: RequestInit = {
    method: action.request_method.toUpperCase(),
  };

  // Request body
  if (action.request_method !== "GET" && action.request_body_contents) {
    const schema = bodyPropertiesFromRequestBodyContents(
      action.request_body_contents,
    );
    const allParams = fillNoChoiceRequiredParams(parameters, schema);
    const body = buildBody(schema, allParams);
    requestOptions.body = JSON.stringify(body);
  }

  // Below URL(...).href deals with "/" between the path and host
  let url = endpointUrlFromAction({
    api_host: action.api.api_host,
    path: action.path,
  } as { api_host: string; path: string });

  // TODO: accept array for JSON?
  // Set parameters
  const queryParams = new URLSearchParams();
  if (action.parameters && Array.isArray(action.parameters)) {
    const actionParameters = action.parameters as unknown as ParameterObject[];

    for (const param of actionParameters) {
      console.info(`processing param: ${JSON.stringify(param)}`);
      // Check for case of required parameter that has enum with 1 value
      const schema = param.schema as SchemaObject;
      if (param.required && schema.enum && schema.enum.length === 1) {
        // Fill in the required parameter with the enum value
        parameters[param.name] = schema.enum[0];
      }

      if (!parameters[param.name]) {
        console.info("Parameter not provided:" + param.name);
        continue;
      }

      if (param.in === "path") {
        url = url.replace(
          `{${param.name}}`,
          encodeURIComponent(String(getParam(parameters, param.name))),
        );
      } else if (param.in === "query") {
        queryParams.set(
          param.name,
          String(getParam(parameters, param.name, true)),
        );
      } else if (param.in === "header") {
        headers[param.name] = String(getParam(parameters, param.name, true));
      } else if (param.in === "cookie") {
        headers["Cookie"] = `${param}=${String(
          getParam(parameters, param.name, true),
        )}`;
      } else {
        throw new Error(
          `Parameter "${param.name}" has invalid location: ${param.in}`,
        );
      }
    }
  }
  // If the auth header is a query parameter, add it here
  if (action.api.auth_header === "Query parameter") {
    queryParams.set(action.api.auth_query_param_name, userApiKey ?? "");
  }
  // Below only adds query params if there are any query params
  if ([...queryParams.entries()].length > 0) {
    url += `?${queryParams.toString()}`;
  }

  requestOptions.headers = headers;
  let logMessage = forgeLogMessage(url, requestOptions);
  console.info("action.api", action.api);
  if (userApiKey && action.api.auth_header !== "Query parameter") {
    const includeScheme = [
      "Authorization",
      "Proxy-Authorization",
      "x-api-key",
      "apiKey",
    ].includes(action.api.auth_header);
    const scheme =
      includeScheme && action.api.auth_scheme
        ? action.api.auth_scheme + " "
        : "";
    // Remove auth header from log message
    requestOptions.headers[action.api.auth_header] = `${scheme}<REDACTED>`;
    logMessage = forgeLogMessage(url, requestOptions);
    // Add it in before it's output
    requestOptions.headers[action.api.auth_header] = `${scheme}${userApiKey}`;
  }
  console.info(logMessage);

  return { url, requestOptions };
}

export function endpointUrlFromAction(action: {
  api_host: string;
  path: string;
}): string {
  // Ensure the base URL has a trailing slash
  const base = action.api_host.endsWith("/")
    ? action.api_host
    : `${action.api_host}/`;
  // Ensure the action path does not have a leading slash
  const path = action.path.startsWith("/") ? action.path.slice(1) : action.path;
  return base + path;
}

export function bodyPropertiesFromRequestBodyContents(
  requestBodyContents: Json,
): SchemaObject {
  const reqBodyContents = requestBodyContents as unknown as {
    [media: string]: MediaTypeObject;
  };

  console.info("reqBodyContents:" + JSON.stringify(reqBodyContents, null, 2));

  // TODO: Only application/json supported for now
  const applicationJson = getJsonMIMEType(reqBodyContents);
  if (!applicationJson) {
    throw new Error(
      "Only application/json request body contents are supported",
    );
  }

  return applicationJson.schema as SchemaObject;
}

function buildBody(
  schema: SchemaObject,
  parameters: Record<string, unknown>,
): { [x: string]: any } {
  const properties = schema.properties as {
    [name: string]: SchemaObject;
  };
  console.info("properties:" + JSON.stringify(properties));

  const bodyArray = Object.entries(properties).map(([name, property]) => {
    // Throw out readonly attributes
    if (property.readOnly) return undefined;
    const paramValue = getParam(parameters, name);
    if (paramValue) {
      return { [name]: paramValue };
    }
  });
  return Object.assign({}, ...bodyArray);
}

export async function makeHttpRequest(
  url: string,
  requestOptions: RequestInit,
  localHostname: string,
): Promise<{ output: Json; isError: boolean }> {
  // TODO: Don't handle redirects manually
  // Why handle 3XX's manually? Because Companies House likes 302 redirects,
  //  but it throws an error if you have the headers from the first request set
  //  (specifically the Authorization header)
  let response = await exponentialRetryWrapper(
    fetch,
    [url, { ...requestOptions, redirect: "manual" }],
    3,
  );
  if (response.status >= 300 && response.status < 400) {
    // Try requesting from here without auth headers
    console.info("Attempting manual redirect");

    if (!response.headers.has("location")) {
      return {
        output: {
          status: "Redirect failed as original request did not return location",
        },
        isError: true,
      };
    }
    const requestOptionsCopy = {
      ...requestOptions,
      headers: { ...requestOptions.headers },
    };
    const headers = requestOptionsCopy.headers;
    if (headers) {
      if ("Authorization" in headers) delete headers["Authorization"];
      if ("authorization" in headers) delete headers["authorization"];
    }
    requestOptions.headers = headers;
    const { origin } = new URL(url);

    const redirectUrl = response.headers.get("location")!.includes(origin)
      ? response.headers.get("location")!
      : new URL(response.headers.get("location")!, origin).href;

    console.info("Attempting fetch with redirected url: " + redirectUrl);
    requestOptionsCopy.headers = headers;
    response = await fetch(redirectUrl, { ...requestOptionsCopy });
  }

  // Deal with response with potentially empty body (stackoverflow.com/a/51320025)
  const responseStatus = response.status ?? 0;
  console.info("Response status:" + responseStatus);
  const responseText = await response.text();
  // If there's no response body, return a status message
  if (!responseText) {
    return responseStatus >= 200 && responseStatus < 300
      ? {
          output: {
            status: responseStatus,
            message: "Action completed successfully",
          },
          isError: false,
        }
      : {
          output: { status: responseStatus, message: "Action failed" },
          isError: true,
        };
  }

  if (responseStatus >= 300)
    // the responseText may be html in which case extract useful info
    return {
      output: {
        status: responseStatus,
        message: parseErrorHtml(responseText),
      },
      isError: true,
    };

  const reqHeaders: Record<string, any> | null =
    requestOptions?.headers ?? null;

  if (!reqHeaders) {
    console.info("No request headers - returning response text");
    return { output: responseText, isError: false };
  }

  const responseType =
    response.headers.get("Content-Type") ||
    response.headers.get("Content-type") ||
    response.headers.get("content-type") ||
    reqHeaders.accept ||
    reqHeaders.Accept ||
    (typeof reqHeaders.get === "function" && reqHeaders.get("accept")) ||
    (typeof reqHeaders.get === "function" && reqHeaders.get("Accept")) ||
    "application/json";

  if (responseType.includes("application/json")) {
    try {
      return { output: JSON.parse(responseText), isError: false };
    } catch {
      return { output: responseText, isError: false };
    }
  } else if (responseType === "application/pdf") {
    if (!process.env.PDF_TO_TEXT_URL) {
      console.info(
        "PDF to text service is not configured - set PDF_TO_TEXT_URL environment variable to enable",
      );
      return { output: "PDF to text service is not configured", isError: true };
    }
    console.info("Response type is pdf - calling /parse-pdf");
    // This gets the pdf and then parses it into text. We aren't
    // calling this function here because it requires nodejs runtime
    const res = await fetch(`${process.env.PDF_TO_TEXT_URL}/parse-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, requestOptions }),
    });
    if (res.status === 200) {
      return { output: await res.text(), isError: true };
    } else return { output: res.statusText, isError: false };
  } else if (
    [
      "application/html",
      "application/html+xml",
      "application/xml",
      "application/xhtml",
      "application/xhtml+xml",
    ].includes(responseType)
  ) {
    // This parses the html into text
    const res = await fetch(`${localHostname}/api/parse-html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html: responseText }),
    });
    return { output: await res.text(), isError: false };
  }
  return { output: responseText, isError: false };
}

export function getDocsChatRequest(
  chosenAction: ActionPlusApiInfo,
  user_input: string,
): { url: string; requestOptions: RequestInit } {
  return {
    url: endpointUrlFromAction({
      api_host: chosenAction.api.api_host,
      path: chosenAction.path!,
    }),
    requestOptions: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: user_input,
      }),
    },
  };
}
