import { ChatGPTMessage } from "../models";
import { Action, Organization } from "../types";
import { OpenAPIV3_1 } from "openapi-types";
import { getJsonMIMEType } from "../edge-runtime/utils";
import { isChoiceRequired } from "../actionUtils";
import { dataAnalysisActionName } from "../builtinActions";

export function formatDescription(
  description: string | undefined | null,
): string {
  /** Formats a parameter description for GPT. **/
  let des = removeMarkdownLinks(description?.trim() ?? "");
  if (des.length > 0) {
    if (!des.endsWith(".")) des += ".";
    des = ": " + des;
  }
  return des;
}

type typeType =
  | OpenAPIV3_1.ArraySchemaObjectType
  | OpenAPIV3_1.NonArraySchemaObjectType
  | (
      | OpenAPIV3_1.ArraySchemaObjectType
      | OpenAPIV3_1.NonArraySchemaObjectType
    )[];
export function getType(
  type: typeType | undefined,
  enums: any[] | undefined,
): typeType | string {
  if (enums && enums.length < 10) {
    // TODO: Deal with long enums better - right now we are just ignoring them
    //  E.g. in posthog's api, there are location enums with >500 values
    //  Possible solution: offline, ask GPT to describe/summarize the enum values
    //  and put it as the description
    return enums
      .filter((e, idx, obj) => obj.findIndex((other) => other === e) === idx)
      .map((e) => JSON.stringify(e))
      .join(" | ");
  }
  if (!type) return "any";
  return type;
}

export function removeMarkdownLinks(text: string): string {
  // This regular expression looks for markdown links and captures the link text separately
  const regex = /\[([^\]]+)]\([^)]*\)/g;
  // Replace the Markdown links with just the link text
  return text.replace(regex, "$1");
}

export function formatReqBodySchema(
  schema: OpenAPIV3_1.SchemaObject | undefined,
  nestingLevel: number = 0,
  isRequired: boolean = false,
  parentArrayOfObjects: boolean = false,
): string {
  /** Recursive function to parse an OpenAPI Schema object into a Superflows GPT-able string.
   * Only works for requestBody right now since readOnly parameters are ignored. **/
  if (!schema) return "";
  let paramString = "";
  if (schema.type === "object") {
    // Objects
    const required = schema?.required ?? [];
    if (nestingLevel !== 0) {
      paramString += "(object)";
      if (schema.description && !parentArrayOfObjects) {
        paramString += formatDescription(schema.description);
      }
      if (isRequired) paramString += " REQUIRED";
    }
    if (schema.properties) {
      const properties = schema.properties as {
        [name: string]: OpenAPIV3_1.SchemaObject;
      };

      Object.entries(properties).forEach(([key, value]) => {
        // Throw out readonly attributes
        if (value.readOnly) return;

        // Below case is when no choice is required for a parameter - it's when
        // a required parameter is an enum with only one value
        // We skip it since there's no decision to be made and it costs tokens
        if (!isChoiceRequired(value, required.includes(key))) {
          return;
        }

        paramString +=
          `\n${"\t".repeat(nestingLevel)}- ${key} ` +
          formatReqBodySchema(value, nestingLevel + 1, required.includes(key));
      });
    }
  } else if (schema.type === "array") {
    // Arrays
    const items = schema.items as OpenAPIV3_1.SchemaObject;
    if (items.type === "object") {
      // Arrays of objects require special handling
      paramString += `(object[])${formatDescription(schema.description)}${
        isRequired ? " REQUIRED" : ""
      }${formatReqBodySchema(items, nestingLevel, false, true)
        .split("(object)")
        .slice(1)
        .join("(object)")}`;
    } else {
      // Arrays of non-objects (incl. other arrays)
      const des = formatDescription(
        schema.description || `array of ${items.description}`,
      );
      paramString += `(${getType(items.type, items.enum)}[])${des}${
        isRequired ? " REQUIRED" : ""
      }`;
    }
  } else {
    // TODO: Support object-level examples (if parent has example defined)
    // Only show examples if there are no enums
    // Note: using "Example:" rather than "E.g." because it's 1 fewer token
    const example =
      schema.example && !schema.enum ? ` Example: ${schema.example}.` : "";
    // Non-object, non-array
    paramString += `(${getType(schema.type, schema.enum)})${formatDescription(
      schema.description ?? schema.format,
    )}${example}${isRequired ? " REQUIRED" : ""}`;
  }
  return paramString;
}

export function getActionDescriptions(actions: Action[]): string {
  /** Gets the GPT-readable numbered list of actions, their parameters
   *  and their descriptions. **/
  if (actions.length === 0) {
    console.error("No actions provided to getActionDescriptions!");
    return "";
  }
  let i = 1;
  let numberedActions = "";

  actions.forEach((action: Action) => {
    let paramString = "";
    // For parameters
    if (action.parameters && Array.isArray(action.parameters)) {
      action.parameters.forEach((param) => {
        const p = param as unknown as OpenAPIV3_1.ParameterObject;
        const schema = (p?.schema ?? null) as OpenAPIV3_1.SchemaObject | null;
        // Throw out readonly attributes - note: this is not 'normal' in specs, but it's a way we can hide
        // parameters from the AI
        if (!schema || schema.readOnly) return;
        // Below case is cursed: required param with 1 enum. Skip it.
        if (schema && schema.enum && schema.enum.length === 1 && p.required)
          return;

        // Only show examples if there are no enums
        // Note: using "Example:" rather than "E.g." because it's 1 fewer token
        const example =
          schema && (schema.example || p.example) && !schema.enum
            ? schema.example || p.example
            : "";

        if (p.description && !schema.description) {
          schema.description = p.description;
        }
        if (example && !schema.example) schema.example = example;

        paramString += `\n- ${p.name} ${formatReqBodySchema(
          schema,
          1,
          p.required,
        )}`;
      });
    }
    const reqBody = action.request_body_contents as unknown as {
      [media: string]: OpenAPIV3_1.MediaTypeObject;
    };
    // TODO: Support content-types other than application/json
    const jsonSchema = getJsonMIMEType(reqBody);
    if (jsonSchema) {
      paramString += formatReqBodySchema(jsonSchema.schema);
    } else if (Object.keys(action.request_body_contents ?? {}).length > 0) {
      console.error(`No application/json in request body for ${action.name}.`);
    }
    numberedActions += `${actions.length > 1 ? `${i}. ` : ""}${
      action.name
    }${formatDescription(action.description)} ${
      paramString ? "PARAMETERS:" + paramString : "PARAMETERS: None."
    }\n`;
    i++;
  });
  return numberedActions;
}

export default function getMessages(
  userCopilotMessages: ChatGPTMessage[],
  actions: Action[],
  userDescription: string | undefined,
  orgInfo: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  language: string | null,
  includeIdLine: boolean,
): ChatGPTMessage[] {
  const userDescriptionSection = userDescription
    ? `\nUser description: ${userDescription}\n`
    : "";

  return [
    actions.length > 0
      ? systemPromptWithActions(
          userDescriptionSection,
          orgInfo,
          getActionDescriptions(actions),
          language,
          includeIdLine,
        )
      : simpleChatPrompt(userDescriptionSection, orgInfo, language),
    ...userCopilotMessages,
  ];
}

export function chatToDocsPrompt(
  userDescription: string | undefined,
  orgInfo: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  includeIdUrlLine: boolean,
  language: string | null,
): ChatGPTMessage {
  const userDescriptionSection = userDescription
    ? `\nThe following is a description of the user - it's important that you take notice of this. ${userDescription}\n`
    : "";
  return {
    role: "system",
    content: `${getIntroText(orgInfo)} Your purpose is to assist users ${
      orgInfo.name ? `in ${orgInfo.name} ` : ""
    }using information from ${
      orgInfo.name ? orgInfo.name + "'s" : "their"
    } documentation
${
  orgInfo.chatbot_instructions ? `\n${orgInfo.chatbot_instructions}\n` : ""
}${userDescriptionSection}
You will be shown potentially relevant documentation. If a user's request is unclear, or the documentation doesn't answer it, ask them to clarify.

RULES:
1. Be very cautious about answering if the docs aren't clear. Do not invent things. I cannot express how disappointed I will be if you do. THIS IS VERY IMPORTANT
2. Never tell the user to find the answer in the documentation.
3. Reply in ${
      language ?? "the same language as the user"
    }. You may have to translate the documentation to do this. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.
4. ${
      orgInfo.name
        ? `You have expert knowledge in ${orgInfo.name}'s domain. Use this to help the user. However, i`
        : "I"
    }f there's nothing relevant in the docs for answering a question, tell the user that this isn't mentioned in the docs. 
5. Be extremely concise in your response
6.${
      includeIdUrlLine
        ? "\nURLs have been replaced by variables URLX (where X is a number). These variables are filled in with the real values before being shown to the user, so use URLX as you would use the URL it represents\n"
        : ""
    }`,
  };
}

export function simpleChatPrompt(
  userDescriptionSection: string,
  orgInfo: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  language: string | null,
): ChatGPTMessage {
  return {
    role: "system",
    content: `${getIntroText(orgInfo)} Your purpose is to assist users ${
      orgInfo.name ? `in ${orgInfo.name} ` : ""
    }with helpful replies
${
  orgInfo.chatbot_instructions ? `\n${orgInfo.chatbot_instructions}\n` : ""
}${userDescriptionSection}
You are having a conversation with the user.

You have expert knowledge in the domain of the organization you are representing. You can use this knowledge to help the user. Do not invent new knowledge.
${
  language &&
  `
Your reply should be written in ${language}.`
}`,
  };
}

export function getIntroText(orgInfo: { name: string; description: string }) {
  return `You are ${orgInfo.name || "a"} chatbot AI${
    orgInfo.description ? ". " + orgInfo.description : ""
  }`;
}

function systemPromptWithActions(
  userDescriptionSection: string,
  orgInfo: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  numberedActions: string,
  language: string | null,
  includeIdUrlLine: boolean,
): ChatGPTMessage {
  return {
    role: "system",
    content: `${getIntroText(orgInfo)} Your purpose is to assist users ${
      orgInfo.name ? `in ${orgInfo.name} ` : ""
    }via function calls
${orgInfo.chatbot_instructions ? `\n${orgInfo.chatbot_instructions}\n` : ""}
Seek user assistance when necessary or more information is required

Avoid directing users, instead complete tasks by outputting "Commands"
${userDescriptionSection}
Today's date is ${new Date().toISOString().split("T")[0]}

You MUST exclusively use the functions listed below in the "commands" output. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!
These are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}"
${numberedActions}
${
  includeIdUrlLine
    ? "\nIDs and URLs from function calls have been replaced by variables IDX or URLY (where X and Y are numbers). These variables are filled in with the real values, so use IDX or URLY as you would use the URLs and IDs they represent\n"
    : ""
}
To use the output from a previous command in a later command, stop outputting commands - don't output the later command. If you output a command, you will be prompted again once it returns

Don't copy the function outputs in full when explaining to the user, instead summarise it as concisely as you can - the user can ask follow-ups if they need more information

Aim to complete the task in the smallest number of steps possible. Be extremely concise in your responses

If a function response has been 'cut as it is too large', YOU MUST call ${dataAnalysisActionName}. UNDER NO CIRCUMSTANCES answer the user's question - you have no data.

Think and talk to the user in ${language ?? "the same language they write in"}${
      language !== "English"
        ? ". This should ONLY affect the Reasoning & Tell user outputs. NOT the commands. And DO NOT translate the keywords: Reasoning, Plan, Tell user or Commands."
        : ""
    }

Think step-by-step. Respond in the format below. Start with your reasoning, your plan, anything to tell the user, then any commands (you can call multiple, separate with a newline). Each section is optional - only output it if you need to. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!

Reasoning: reason about how to achieve the user's request. Be concise. The user sees your reasoning as your 'thoughts'

Plan:
- short bulleted
- list that conveys
- long-term plan

Tell user: tell the user something. If you need to ask the user a question, do so here.

Commands:
FUNCTION_1(PARAM_1=VALUE_1, PARAM_2=VALUE_2, ...)
FUNCTION_2(PARAM_3=VALUE_3 ...)`,
  };
}
