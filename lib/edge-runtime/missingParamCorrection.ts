import { OpenAPIV3_1 } from "openapi-types";
import { FunctionCall } from "@superflows/chat-ui-react";
import { Action } from "../types";
import requestCorrectionPrompt from "../prompts/requestCorrection";
import { bodyPropertiesFromRequestBodyContents } from "./requests";

import { getOpenAIResponse } from "../queryOpenAI";
import { ChatGPTMessage } from "../models";
import { removeOldestFunctionCalls } from "./utils";

export async function getMissingArgCorrections(
  action: Action,
  command: FunctionCall,
  previousConversation: ChatGPTMessage[]
): Promise<{
  corrections: { [param: string]: "ask user" | any };
  newSystemMessages: ChatGPTMessage[] | null;
}> {
  let bodyRequired: string[] = [];

  if (action.request_body_contents) {
    const { schema } = bodyPropertiesFromRequestBodyContents(
      action.request_body_contents
    );
    bodyRequired = schema?.required || [];
  }

  const queryRequired = getRequiredParams(action);
  const allRequiredParams = bodyRequired.concat(queryRequired);

  const missingParams = allRequiredParams.filter(
    (param) => !(param in command.args)
  );

  let correctionPrompt: ChatGPTMessage[] | null = null;
  const corrections: { [param: string]: "ask user" | string } = {};
  // TODO parallelize
  for (const param of missingParams) {
    const missingParamRes = await getMissingParam(
      param,
      action,
      previousConversation
    );
    if (missingParamRes.response) corrections[param] = missingParamRes.response;
    correctionPrompt = missingParamRes.correctionPrompt;
  }
  return { corrections, newSystemMessages: correctionPrompt };
}

async function getMissingParam(
  missingParam: string,
  action: Action,
  previousConversation: ChatGPTMessage[]
): Promise<{
  response: string | null;
  correctionPrompt: ChatGPTMessage[] | null;
}> {
  console.log(`Parameter ${missingParam} is missing. Attempt to get it`);
  const correctionPrompt = requestCorrectionPrompt(missingParam, action);
  if (!correctionPrompt) return { response: null, correctionPrompt: null };
  const prompt = removeOldestFunctionCalls(
    [...previousConversation].concat(correctionPrompt),
    "3",
    100
  );
  console.log("Request correction prompt:\n", prompt);
  let response = await getOpenAIResponse(
    prompt,
    {
      frequency_penalty: 0,
      max_tokens: 100,
    },
    "3"
  );
  response = response.trim().replace(/\n/g, "");
  console.log("Response from gpt:\n", response);
  try {
    // Type casts to the most appropriate type, errors and returns a string if no casting possible
    response = JSON.parse(response);
  } catch {}
  return { response, correctionPrompt };
}

function getRequiredParams(action: Action): string[] {
  if (!action.parameters) return [];
  const actionParameters =
    action.parameters as unknown as OpenAPIV3_1.ParameterObject[];
  return actionParameters
    .filter((param) => param.required)
    .map((param) => param.name);
}
