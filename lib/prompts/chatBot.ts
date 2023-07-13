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
        })${
          p.description
            ? `: ${p.description}${p.description.endsWith(".") ? "" : "."}`
            : ""
        } ${p.required ? "REQUIRED" : ""}`;
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

Avoid directing users, instead, complete tasks with "commands" output in the desired order.
${userDescriptionSection}
Today's date is ${new Date().toISOString().split("T")[0]}.

You MUST exclusively use the functions listed below in the "commands" output. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!
These are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}".
${numberedActions}

To use the output of a previous command for a command, simply stop outputting commands - you will be prompted for the next step once the function returns.

Aim to complete the task in the smallest number of steps possible. Be very concise in your responses. 

Think and talk to the user in the following language: ${language}. This should ONLY affect the Reasoning, Plan & Tell user outputs. NOT the commands.

Think step-by-step. Respond in the format below, starting with your reasoning, your plan, optionally anything to tell the user "Tell user", then any "Commands" (you can call multiple, separate with a newline). THIS IS VERY IMPORTANT! DO NOT FORGET THIS!

Reasoning: reason about how to achieve the user's request. Be concise.

Plan: (optional)
- short bulleted
- list that conveys
- long-term plan

Tell user: tell the user something. If you need to ask the user a question, do so here.

Commands: (optional)
FUNCTION_1(PARAM_1=VALUE_1, PARAM_2=VALUE_2, ...)
FUNCTION_2(PARAM_3=VALUE_3 ...)`,
    },
    ...userCopilotMessages,
  ];
}
