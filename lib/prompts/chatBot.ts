import { ChatGPTMessage } from "../models";
import { Action } from "../types";
import { OpenAPIV3_1 } from "openapi-types";

export default function getMessages(
  userCopilotMessages: ChatGPTMessage[],
  actions: Action[],
  userDescription: string | undefined,
  orgInfo: {
    name: string;
    description: string;
  },
  language: string
): ChatGPTMessage[] {
  let userDescriptionSection = "";
  if (userDescription) {
    userDescriptionSection = `\nThe following is a description of the user and instructions on how you should address them - it's important that you take notice of this. ${userDescription}\n`;
  }

  let i = 1;
  let numberedActions = "";

  actions.forEach((action: Action) => {
    let paramString = "";
    // For parameters
    if (action.parameters && Array.isArray(action.parameters)) {
      action.parameters.forEach((param) => {
        const p = param as unknown as OpenAPIV3_1.ParameterObject;
        const schema = p.schema as OpenAPIV3_1.SchemaObject;
        const enums = schema.enum;
        // TODO: Deal with very long enums better - right now we are just ignoring them
        paramString += `\n- ${p.name} (${schema.type}${
          enums && enums.length < 20 ? `: ${enums}` : ""
        })${p.description ? `: ${p.description}` : ""}. ${
          p.required ? "REQUIRED" : ""
        }`;
      });
    }
    if (
      action.request_body_contents &&
      typeof action.request_body_contents === "object" &&
      // TODO: Content-types other than application/json aren't supported
      "application/json" in action.request_body_contents
    ) {
      const body = action.request_body_contents["application/json"];

      // @ts-ignore
      const properties = body.schema.properties as {
        [name: string]: OpenAPIV3_1.SchemaObject;
      };

      const required =
        ((body as { schema: any })?.schema?.required as string[]) ?? null;

      Object.entries(properties).forEach(([key, value]) => {
        // Throw out readonly attributes
        if (value.readOnly) return;
        const enums = value.enum;
        // TODO: Deal with very long enums better - right now we are just ignoring them
        paramString += `\n- ${key} (${value.type}${
          enums && enums.length < 20 ? `: ${enums}` : ""
        })${value.description ? `: ${value.description}` : ""} ${
          required && required.includes(key) ? "REQUIRED" : ""
        }`;
      });
    }
    numberedActions += `${i}. ${action.name}: ${action.description}.${
      paramString ? " PARAMETERS: " + paramString : ""
    }\n`;
    i++;
  });
  return [
    {
      role: "system",
      content: `You are ${orgInfo.name} chatbot AI ${
        orgInfo.description
      }. Your purpose is to assist users in ${orgInfo.name} via function calls.

Seek user assistance when necessary or more information is required.

Seek more info or help when needed. Avoid directing users, instead, complete tasks with "commands" output in the desired order.
${userDescriptionSection}
Today's date is ${new Date().toISOString().split("T")[0]}.

You MUST exclusively use the functions listed below in the "commands" output. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!
These are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}".
${numberedActions}

To use the output of a prior command, stop issuing commands and set "Completed: false". You will be prompted for the next step once the function returns.

Aim to complete the task in the smallest number of steps. Be as concise as possible in your responses. 

Think and talk to the user in the following language: ${language}. This should ONLY affect the Reasoning, Plan & Tell user outputs. NOT the commands or completed.

Think step-by-step. Respond following the format below, starting with your thoughts (your Reasoning & Plan), optionally anything to tell the user "Tell user", then optionally any "Commands" (you can call multiple, separate with a newline), then whether you are "Completed". THIS IS VERY IMPORTANT! DO NOT FORGET THIS!

Reasoning: reasoning behind the plan. Be concise. If the task isn't possible, or you need more information from the user, ask here and then skip the plan and commands entirely.

Plan:
- short bulleted
- list that conveys
- long-term plan

Tell user: (optional) tell the user something. E.g. if you're answering a question, write the answer to the user here.

Commands: (optional)
FUNCTION_NAME_1(PARAM_NAME_1=PARAM_VALUE_1, PARAM_NAME_2=PARAM_VALUE_2, ...)

Completed: (true or false or question) set to true when the above commands, when executed, would achieve the task set by the user. Alternatively, if the task isn't possible and you need to ask a clarifying question, set to question. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!`,
    },
    ...userCopilotMessages,
  ];
}
