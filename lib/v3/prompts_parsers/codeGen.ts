import { ChatGPTMessage } from "../../models";
import { Action, ApprovalVariable } from "../../types";
import { getActionTSSignature } from "../../prompts/tsConversion";
import { stripBasicTypescriptTypes } from "../../v2/prompts/dataAnalysis";

export const codeGenLLMParams = {
  temperature: 0.6,
  max_tokens: 1500,
  stop: ["</code"],
};

export function getCodeGenPromptv3(args: {
  question: string;
  filteredActions: Action[];
  org: { name: string; description: string; chatbot_instructions: string };
  variables: ApprovalVariable[];
}): ChatGPTMessage[] {
  const actionTS = args.filteredActions
    .map((action) => {
      return getActionTSSignature(action, true, null, true);
    })
    .join("\n\n");

  const argsMatch = (args.question.match(/\{(\w+)}/g) ?? ([] as string[])).map(
    (m) => m.slice(1, -1),
  );
  const durationInvolved = ["fromDate", "toDate"].some((v) =>
    argsMatch.includes(v),
  );
  const types = argsMatch.map((m) => {
    const typeDef = args.variables.find((t) => t.name === m);
    if (!typeDef) {
      throw new Error(`Type definition not found for parameter: ${m}`);
    }
    return {
      ...typeDef,
      typeDef: `type ${typeDef.typeName} = ${typeDef.type}${
        typeDef.description ? ` // ${typeDef.description}` : ""
      }`,
    };
  });

  return [
    {
      role: "system",
      content: `You are ${
        args.org.name || "a"
      } AI. Your task is to help the user by writing a Javascript function called helpAnswer to call ${
        args.org.name + "'s" || "the"
      } API. This code is run and plots or tables generated are shown to the user and another AI will explain these along with any log messages. Plot data to give a complete picture when possible.${
        args.org.description ? "\n\n" + args.org.description : ""
      }

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
Users can toggle line or bar charts to view data in a table.
DO NOT call plot() more than twice
BE CAREFUL: you cannot plot multiple lines on one chart - only 1 line per line chart
**/
function plot(title: string,
type: "line"|"bar"|"table",
data: {x:number|string,y:number,[key:string]:any;}[], // Max length: 25 (100 if a line chart). The wildcard is to add extra information shown in the table and when hovering the data point
labels: {x:string,y:string} // Include axis units in brackets. Example: "Conversion rate (%)"
)
</functions>${
        argsMatch.length > 0
          ? `

<types>
${Array.from(new Set(types.map((t) => t.typeDef))).join("\n")}
</types>`
          : ""
      }

<rules>
1. ONLY use the standard JS library and FUNCTIONS. DO NOT use other libraries or frameworks
2. NEVER write TODO comments, placeholder code or ... in place of code
3. DO NOT use the following (they cause runtime errors): fetch() (or equivalent), eval(), new Function(), WebAssembly and TS types
4. Use plot() to visualize data or console.log() to output text. Do not use console.table() - use plot() instead
5. Use await NOT .then()
6. DO NOT call async functions in a loop, UNLESS wrapped by Promise.all() or the loop is short (5 or fewer)
7. ONLY if the user's request is impossible, throw new Error("<write message>")
8. Use console.log() for individual numbers (e.g. total summed over the plot)
9. DO NOT console.log() to plot data or lots of text
${
  args.org.chatbot_instructions
    ? [
        ...args.org.chatbot_instructions.split("\n").filter(Boolean),
        `Respond in the format given by <format></format>`,
      ]
        .map((l, i) => `${i + 11}. ${l}`)
        .join("\n")
    : ""
}
</rules>

<format>
<plan>
1. Think step-by-step: consider what the most helpful possible answer would include
2. break down the function
3. consider which <functions></functions> you will use
4. think carefully about setting parameters in calls to <functions></functions>
5. consider whether you'll need to filter or postprocess data once you've retrieved it
5. consider handling edge cases e.g. array of length 0 vs 1 vs many (console.log and return when no data)
6. consider what to console.log() - explain the high-level approach taken and how figures were calculated. DO NOT repeat plot data
</plan>
<code>
async function helpAnswer(${types.map((m) => `${m.name}`).join(", ")}) {
// Write code here...

// Explain code, example:
// console.log("The average X by month was calculated by filtering out all Y values, grouping X's by month and calculating the average for each month")
}
</code>
</format>`,
    },
    {
      role: "user",
      content: args.question.replace(
        /\{(\w+)}/g,
        (_: string, match: string) => {
          const typeMatch = types.find((t) => t.name === match);
          if (!typeMatch) {
            throw new Error(
              `Type definition not found for parameter: ${match}`,
            );
          }
          return `{${match}: ${typeMatch.typeName}}`;
        },
      ),
    },
    {
      role: "assistant",
      content: "<plan>\n1. The most helpful answer would include:\n  -",
    },
  ];
}

export function parseCodeGenv3(output: string): { plan: string; code: string } {
  /** Code output means the code is valid
   * Error output is an error message to be shown to the AI
   * null output means that you need to retry **/
  const planMatch = output.match(/<plan>([\s\S]+)<\/plan>/);
  const plan = planMatch ? planMatch[1].trim() : "";
  const codeMatch = output.match(/<code>([\s\S]+)<\/code>/);
  let code = codeMatch ? codeMatch[1].trim() : "";

  return { plan, code };
}

export function convertWrittenCodeToExecutable(
  code: string,
  variableData: ApprovalVariable[],
): string | { error: string } {
  console.log("Code output:\n", code);
  // Check if it's just an error
  const errorMatch = /^\n?throw new Error\((.*)\);?$/.exec(code);
  if (errorMatch) {
    // slice(1, -1) removes the quotes from the error message
    return { error: errorMatch[1].slice(1, -1) };
  }

  // Remove comments (stops false positives from comments containing illegal stuff) & convert from TS to JS
  code = stripBasicTypescriptTypes(
    code
      .replace(/(\/\/.*|\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)/g, "")
      .trim(),
    [
      ...variableData.map((t) => t.typeName),
      ...variableData.map((t) => t.type),
    ],
  );

  // Check that fetch(), eval(), new Function() and WebAssembly aren't used
  const illegalRegexes = [
    /fetch\([\w\W]*\)/g,
    /eval\([\w\W]*\)/g,
    /new Function\([\w\W]*\)/g,
    /WebAssembly\./g,
  ];
  for (const regex of illegalRegexes) {
    if (regex.test(code)) {
      console.error(
        `Illegal code found by ${String(regex)}:\n---\n${code}\n---`,
      );
      return { error: "Illegal code found by " + String(regex) };
    }
  }

  // We also want to grab any variables which are declared at the top level
  const topLevelVariables = code.match(
    // const|let|var - variable declaration
    // \s+\w+\s*=\s* - variable name
    // gm - global, multiline
    /^(?:const|let|var)\s+\w+\s*=\s*(.+);?/gm,
  );

  // Add back the top level variables that aren't in the code
  if (topLevelVariables) {
    code =
      topLevelVariables
        .filter((variable) => !code.includes(variable))
        .join("\n") +
      "\n\n" +
      code;
  }

  let namedFnContents = code.match(
    // await is optional as is variable setting
    /async function (\w+)\((.*)\)\s*/,
  );
  if (!namedFnContents) {
    throw new Error("No named function found in code");
  }

  const fnName = namedFnContents[1];
  const argNames = namedFnContents[2];
  const argMatches = argNames
    ? argNames.split(",").map((arg) => arg.trim())
    : [];
  console.log("Argmatches", argMatches);
  return `${code.trim()}\n\nawait ${fnName}(${argMatches
    .map((arg) => {
      const argMatch = variableData.find((v) => v.name === arg);
      if (!argMatch) {
        throw new Error(`Argument ${arg} not found in variable data`);
      }
      return JSON.stringify(argMatch.default);
    })
    .join(", ")});`;
}
