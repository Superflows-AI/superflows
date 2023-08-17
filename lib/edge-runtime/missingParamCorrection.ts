import { OpenAPIV3_1 } from "openapi-types";
import { FunctionCall } from "@superflows/chat-ui-react";
import { Action } from "../types";
import requestCorrectionPrompt from "../prompts/requestCorrection";
import { bodyPropertiesFromRequestBodyContents } from "./requests";

import { getOpenAIResponse } from "../queryOpenAI";

export async function missingRequiredToCommand(
  action: Action,
  command: FunctionCall
): Promise<FunctionCall> {
  // TODO: name this function better

  let bodyRequired: string[] = [];

  if (action.request_body_contents) {
    const { schema } = bodyPropertiesFromRequestBodyContents(
      action.request_body_contents
    );
    bodyRequired = schema?.required || [];
  }

  const queryRequired = getRequiredQueryParams(action);
  const allRequiredParams = bodyRequired.concat(queryRequired);

  const missingParams = allRequiredParams.filter(
    (param) => !command.args[param]
  );

  for (const param of missingParams) {
    const fix = await getMissingParam(param, action);
    command.args[param] = fix;
  }
  return command;
}

async function getMissingParam(
  missingParam: string,
  action: Action
): Promise<string | undefined> {
  console.log(`Parameter ${missingParam} is missing attempt to get it`);
  const prompt = requestCorrectionPrompt(missingParam, action);
  console.log("Request correction prompt:\n", prompt);
  if (!prompt) return undefined;
  let response = await getOpenAIResponse(prompt, undefined, "3");
  console.log("Response from gpt:\n", response);
  try {
    response = JSON.parse(response);
  } catch {}
  return response;
}

function getRequiredQueryParams(action: Action) {
  if (!action.parameters) return [];
  const actionParameters =
    action.parameters as unknown as OpenAPIV3_1.ParameterObject[];
  return actionParameters
    .filter((param) => param.required)
    .map((param) => param.name);
}
