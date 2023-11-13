import { OpenAPIV3_1 } from "openapi-types";
import { FunctionCall } from "@superflows/chat-ui-react";
import { Action } from "../types";
import requestCorrectionPrompt from "../prompts/requestCorrection";
import { bodyPropertiesFromRequestBodyContents } from "./requests";
import { getLLMResponse } from "../queryLLM";
import { ChatGPTMessage } from "../models";
import { removeOldestFunctionCalls } from "./utils";

export async function getMissingArgCorrections(
  action: Action,
  command: FunctionCall,
  previousConversation: ChatGPTMessage[],
  model: string,
): Promise<{ [param: string]: "ask user" | any }> {
  // Deepcopy to ensure no changes are made to the original
  previousConversation = JSON.parse(JSON.stringify(previousConversation));
  let bodyRequired: string[] = [];

  if (action.request_body_contents) {
    const schema = bodyPropertiesFromRequestBodyContents(
      action.request_body_contents,
    );
    bodyRequired = schema?.required || [];
  }

  const queryRequired = getRequiredParams(action);
  const allRequiredParams = bodyRequired.concat(queryRequired);

  const missingParams = allRequiredParams.filter(
    (param) =>
      !Object.keys(command.args)
        // Sometimes (rarely) the AI replaces hyphens with underscores. This is a hacky fix
        .map((a) => a.replaceAll("-", "_"))
        .includes(param.replaceAll("-", "_")),
  );

  const correctionsList: { [param: string]: "ask user" | string }[] =
    await Promise.all(
      missingParams.map(async (param) => {
        return {
          [param]:
            (await getMissingParam(param, action, previousConversation)) ?? "",
        };
      }),
    );
  if (correctionsList.length === 0) return {};
  return Object.assign(correctionsList[0], ...correctionsList.slice(1));
}

async function getMissingParam(
  missingParam: string,
  action: Action,
  previousConversation: ChatGPTMessage[],
): Promise<string | null> {
  console.log(`Parameter ${missingParam} is missing. Attempt to get it`);
  const correctionPrompt = requestCorrectionPrompt(missingParam, action);
  if (!correctionPrompt) return null;
  const prompt = removeOldestFunctionCalls(
    [...previousConversation].concat(correctionPrompt),
    "4",
    200,
  );
  console.log("Request correction prompt:\n", prompt);
  let response = await getLLMResponse(
    prompt,
    {
      frequency_penalty: 0,
      max_tokens: 200,
    },
    "gpt-4-0613",
  );
  response = response.trim().replace(/\n/g, "");
  console.log("Response from gpt:\n", response);
  try {
    // Type casts to the most appropriate type, errors and returns a string if no casting possible
    response = JSON.parse(response);
  } catch {}
  return response;
}

function getRequiredParams(action: Action): string[] {
  if (!action.parameters) return [];
  const actionParameters =
    action.parameters as unknown as OpenAPIV3_1.ParameterObject[];
  return actionParameters
    .filter((param) => param.required)
    .map((param) => param.name);
}
