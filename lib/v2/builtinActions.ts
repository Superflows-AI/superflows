import { ActionPlusApiInfo } from "../types";
import { Json } from "../database.types";

export const dataAnalysisActionName = "instruct_coder";

export function dataAnalysisAction(org: { id: number }): ActionPlusApiInfo {
  return {
    action_type: "function",
    active: true,
    description:
      "This instructs a coder to write code using the same functions as you. Use this when you need to perform calculations, plot data or " +
      "perform complex batch or multi-step actions. THIS IS VERY IMPORTANT. DO NOT FORGET THIS",
    name: dataAnalysisActionName,
    org_id: org.id,
    parameters: [
      {
        in: "query",
        name: "instruction",
        description:
          "The instruction to give to the coder. Make this as detailed as possible. E.g. 'Plot a bar chart of the conversion rate for each channel aggregated over the past 2 weeks'. Include AS MUCH INFORMATION AS POSSIBLE.",
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
