import { parseCodeGenv3 } from "./codeGen";
import {
  Action,
  ApprovalAnswer,
  ApprovalVariable,
  Organization,
} from "../../types";
import { ChatGPTMessage } from "../../models";
import { getActionTSSignature } from "../../prompts/tsConversion";

export type ParsedResponse = {
  functionName: string;
  description: string;
};

export type SimilarFunction = Pick<ApprovalAnswer, "fnName" | "description">;

export function codeFnNameDescriptionGenerationPrompt(args: {
  userRequest: string;
  code: string;
  filteredActions: Action[];
  org: Pick<Organization, "name" | "description">;
  variables: ApprovalVariable[];
  similarFnNames: SimilarFunction[];
}): ChatGPTMessage[] {
  const parsedCode = parseCodeGenv3(args.code);
  const variables = args.userRequest.match(/{(\w+)}/g) ?? [];
  const varObjs = variables.map((foundVariable) => {
    const varObj = args.variables.find(
      (v) => v.name === foundVariable.slice(1, -1),
    );
    if (!varObj) {
      throw new Error(`Variable ${foundVariable} not found in variables`);
    }
    return varObj;
  });
  const oldFnSignature = `async function helpAnswer(${varObjs
    .map((varObj) => `${varObj.name}: ${varObj.typeName}`)
    .join(", ")}) {`;
  let code = parsedCode.code.replace(
    /(?:async )?function [\w_]+\s*\(.*\)\s*\{/,
    oldFnSignature,
  );

  const durationInvolved = ["fromDate", "toDate"].some((v) =>
    // @ts-ignore
    variables.includes(v),
  );

  const actionTS = args.filteredActions
    .map((action) => {
      return getActionTSSignature(action, false, null, true);
    })
    .join("\n\n");

  let facts = [
    args.org.description,
    "The user's code may call functions defined in <functions></functions>",
  ];
  return [
    {
      role: "system",
      content: `You are a helpful assistant in ${
        args.org.name || "a software package"
      }. Your task is to write a concise function name and description for a TS function written by the user currently called \`helpAnswer\`.

<facts>
${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}
</facts>

<functions>
${actionTS}${
        !durationInvolved
          ? ""
          : `

/** Converts ISODate date string into human-readable format **/
function convertIsoToHumanReadable(dateStr: ISODate): string`
      }

/**
Plots data for the user.
Users can toggle to view data in a table.
DO NOT call plot() more than two times
BE CAREFUL: you cannot plot multiple lines on one chart - only 1 line per line chart 
**/
function plot(title: string,
type: "line"|"bar"|"table",
data: {x:number|string,y:number,[key:string]:any;}[], // Max length: 25 (100 if a line chart). The wildcard is to add extra information shown in the table and when hovering the data point
labels: {x:string,y:string} // Include axis units in brackets. Example: "Conversion rate (%)"
)
</functions>

<rules>
1. Write a unique and highly accurate <functionName></functionName> for the JS function
2. BE CONCISE in the description
3. BE SPECIFIC. In the description, include what is output, how is data visualized and, if there are multiple options, how figures calculated
4. When naming the function, imagine similar functions that calculate related numbers or plot different data. Make sure the name is specific enough to differentiate between them 
5. ${
        args.similarFnNames.length > 0
          ? `AVOID naming the function any name in <namesToAvoid></namesToAvoid>\n6. Use camelCase for the function name
7. Respond in the format given in <format></format> tags`
          : "Use camelCase for the function name\n6. Respond in the format given in <format></format> tags"
      }
</rules>

<format>
<description>Concise function description</description>
<functionName>exampleFunctionName</functionName>
</format>${
        args.similarFnNames.length > 0
          ? `

<namesToAvoid>
${args.similarFnNames.map((n) => `- ${n.fnName}: ${n.description}`).join("\n")}
</namesToAvoid>`
          : ""
      }`,
    },
    {
      role: "user",
      content: `Answering question: ${args.userRequest}

Plan:
${parsedCode.plan}

Code:
\`\`\`
${varObjs.map(
  (v) =>
    `type ${v.typeName} = ${v.type}${
      v.description ? ` // ${v.description}` : ""
    }`,
)}

${code}
\`\`\``,
    },
    {
      role: "assistant",
      content: "<description>",
    },
  ];
}

export function docsFnNameDescriptionGenerationPrompt(args: {
  userRequest: string;
  docsMessage: string;
  org: Pick<Organization, "name" | "description">;
  similarFnNames: SimilarFunction[];
}): ChatGPTMessage[] {
  return [
    {
      role: "system",
      content: `You are a helpful assistant in ${
        args.org.name || "a software package"
      }. Your task is to write a concise function name and description for a function that returns the section of ${
        args.org.name || "software"
      } documentation that is relevant to the question being asked.

<facts>
1. ${args.org.description}
</facts>

<rules>
1. Write a unique and highly accurate <functionName></functionName> for the JS function
2. BE CONCISE in the description
3. NEVER use vague names or descriptions common to all functions that search the docs. Example: getRelevantDocs would be a poor name
4. DO NOT describe and write a function name of what the docs say - rather the function that returns the docs
5. ${
        args.similarFnNames.length > 0
          ? `AVOID naming the function any name in <namesToAvoid></namesToAvoid>\n6. Use camelCase for the function name
7. Respond in the format given in <format></format> tags`
          : "Use camelCase for the function name\n6. Respond in the format given in <format></format> tags"
      }
</rules>

<format>
<description>Concise function description</description>
<functionName>exampleFunctionName</functionName>
</format>${
        args.similarFnNames.length > 0
          ? `

<namesToAvoid>
${args.similarFnNames.map((n) => `- ${n.fnName}: ${n.description}`).join("\n")}
</namesToAvoid>`
          : ""
      }`,
    },
    {
      role: "user",
      content: `Answering question: ${args.userRequest}

Relevant documentation returned by function:
"""
${args.docsMessage}
"""`,
    },
    {
      role: "assistant",
      content: "<description>",
    },
  ];
}

export function parseFnNameDescriptionOut(text: string): ParsedResponse {
  const functionNameMatch = text.match(
    /<functionName>([\s\S]*?)<\/functionName>/,
  );
  const functionName = functionNameMatch ? functionNameMatch[1].trim() : "";

  const descriptionMatch = text.match(/<description>([\s\S]*?)<\/description>/);

  return {
    functionName,
    description: descriptionMatch ? descriptionMatch[1].trim() : "",
  };
}
