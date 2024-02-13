import { OpenAPIV3_1 } from "openapi-types";
import { ChatGPTMessage } from "../../models";
import { Action, Organization } from "../../types";
import { getJsonMIMEType } from "../../edge-runtime/utils";
import { isChoiceRequired } from "../../actionUtils";
import { dataAnalysisActionName } from "../../builtinActions";

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
      : explainPlotChatPrompt(userDescriptionSection, orgInfo, language),
    ...userCopilotMessages,
  ];
}

export function explainPlotChatPrompt(
  userDescriptionSection: string,
  orgInfo: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  language: string | null,
): ChatGPTMessage {
  return {
    role: "system",
    content: `${getIntroText(orgInfo)} Your purpose is to assist users ${
      orgInfo.name ? `in ${orgInfo.name} ` : ""
    }with helpful replies
${userDescriptionSection}
Today's date is ${new Date().toISOString().split("T")[0]}

RULES:
1. If you cannot see the contents of the graph (it may have been cut for brevity), DO NOT invent the contents, or tell the user you cannot see it. Instead, direct them to view the above graph for the answer to their question.
2. If you can see the graph contents, and it doesn't exactly answer the question the user asked, you can use the data presented in the graph and in log messages from the coder to help answer the question.
3. DO NOT show the graph in markdown. The above function message is visible to the user as a graph.
4. ${
      language
        ? `Your reply should be written in ${language}.

EXAMPLE:
\`\`\`
User:
What are the top 10 best performing products by revenue in the past 6 months?

Function:
{"type":"bar","data":"<cut for brevity - DO NOT pretend to know the data, instead tell the user to look at this graph>","xLabel":"Product name","yLabel":"Revenue ($)","graphTitle":"Top 10 products by revenue over the past 6 months"}

Assistant:
Above is a bar graph displaying the top 10 products by revenue over the past 6 months.

The x-axis shows the product name, while the y-axis is the revenue in $.
\`\`\``
        : ""
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
${
  orgInfo.chatbot_instructions ? `\n${orgInfo.chatbot_instructions}\n` : ""
}${userDescriptionSection}
Today's date is ${new Date().toISOString().split("T")[0]}

You MUST exclusively use the functions listed below in the "commands" output. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!
These are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}: [{{POSSIBLE_VALUES}}]): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}"
\`\`\`
${numberedActions}\`\`\`
${
  includeIdUrlLine
    ? "\nIDs and URLs from function calls have been replaced by variables IDX or URLY (where X and Y are numbers). These variables are filled in with the real values, so use IDX or URLY as you would use the URLs and IDs they represent\n"
    : ""
}
RULES:
1. Seek user assistance when necessary or more information is required
2. Avoid directing users, instead complete tasks by outputting "Commands"
3. When performing data analysis or batch API calls, use ${dataAnalysisActionName}. DO NOT perform these API calls yourself. The coder cannot use outputs of API calls you make, but has access to the same APIs himself. THIS IS VERY IMPORTANT. DO NOT FORGET THIS!
4. To use the output from a previous command in a later command, stop outputting commands - don't output the later command. If you output a command, you will be prompted again once it returns
5. Aim to complete the task in the smallest number of steps possible. Be extremely concise in your responses 
6. Don't copy the function outputs in full when explaining to the user, instead summarise it as concisely as you can - the user can ask follow-ups if they need more information
7. Think and talk to the user in ${
      language ?? "the same language they write in"
    }${
      language !== "English"
        ? ". This should ONLY affect the 'Tell user' output. NOT the reasoning or commands. And DO NOT translate the keywords: Reasoning, Tell user or Commands."
        : ""
    }
8. Respond in the format below. Start with your reasoning (a numbered list), anything to tell the user, then any commands (you can call multiple, separate with a newline). Each section is optional - only output it if you need to. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!
\`\`\`
Reasoning:
1. Think step-by-step about how to achieve the user's request
2. Does this require plotting, calculations or looping through data? If so, use ${dataAnalysisActionName}
3. This is only for your benefit - it is hidden from the user 

Tell user: tell the user something. If you need to ask the user a question, do so here.

Commands:
FUNCTION_1(PARAM_1=VALUE_1, PARAM_2=VALUE_2, ...)
FUNCTION_2(PARAM_3=VALUE_3 ...)
\`\`\``,
  };
}
