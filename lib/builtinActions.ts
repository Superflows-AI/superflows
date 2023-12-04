import { ActionPlusApiInfo } from "./types";
import { Json } from "./database.types";

export const searchDocsActionName = "search_docs";

export function getSearchDocsAction(
  org: { id: number; name: string; api_key: string },
  currentHost: string,
): ActionPlusApiInfo {
  return {
    action_type: "http",
    active: true,
    description: `Performs a semantic search over the ${org.name} documentation`,
    name: searchDocsActionName,
    org_id: org.id,
    parameters: [
      {
        in: "query",
        name: "query",
        description: "The search query",
        required: true,
        schema: {
          type: "string",
        },
      },
    ] as Json,
    path: "/search-docs",
    requires_confirmation: false,
    request_method: "get",
    api: {
      api_host: currentHost + "/api",
      // This stops Authorization header below being overwritten
      auth_header: `x-api-key`,
      auth_query_param_name: "",
      auth_scheme: null,
      org_id: org.id,
    },
    headers: [
      {
        name: "Authorization",
        value: `Bearer ${org.api_key}`,
      },
    ],
  } as ActionPlusApiInfo;
}

export const dataAnalysisActionName = "perform_data_analysis";

export function enableDataAnalysisAction(org: {
  id: number;
}): ActionPlusApiInfo {
  return {
    // This doesn't do anything yet
    action_type: "function",
    active: true,
    description:
      "This passes responses to API calls you are making to another AI who " +
      "writes code to perform data analysis (visualize data or make calculations) for the user. Call this in the SAME list of Commands " +
      " as the API calls you want it to do data analysis on. THIS IS VERY IMPORTANT. DO NOT FORGET THIS",
    name: dataAnalysisActionName,
    org_id: org.id,
    parameters: [
      {
        in: "query",
        name: "instruction",
        description:
          "The instruction to give to the Data Analysis AI. E.g. 'Plot a bar chart of the conversion rate for each channel over the past 2 weeks'",
        required: true,
        schema: {
          type: "string",
        },
      },
    ] as Json,
    path: "",
    requires_confirmation: false,
    request_method: "get",
    api: {
      auth_header: `x-api-key`,
      auth_query_param_name: "",
      auth_scheme: null,
      org_id: org.id,
    },
    headers: [{}],
  } as ActionPlusApiInfo;
}
