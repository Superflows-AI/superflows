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
    description: `Performs a semantic search over the ${org.name} documentation. Use this when asked how-to questions or any question about ${org.name}. DO NOT make up answers about ${org.name}`,
    filtering_description: `Searches ${org.name} documentation. Use this when asked how-to questions, how ${org.name} works or the meaning of terminology. YOU MUST consider if the user's request could be answered with documentation!`,
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

export function dataAnalysisAction(org: { id: number }): ActionPlusApiInfo {
  return {
    action_type: "function",
    active: true,
    description:
      "This passes responses to API calls you are making to another AI who " +
      "writes code to perform data analysis (visualize data or make calculations) for the user. " +
      "You may only call this ONCE in a list of Commands. Call it in the same list of Commands " +
      "as the API calls you want it to perform data analysis on. THIS IS VERY IMPORTANT. DO NOT FORGET THIS",
    name: dataAnalysisActionName,
    org_id: org.id,
    parameters: [
      {
        in: "query",
        name: "instruction",
        description:
          "The instruction to give to the Data Analysis AI. E.g. 'Plot a bar chart of the conversion rate for each channel over the past 2 weeks'. Be as detailed as possible.",
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
