import { ChatGPTMessage } from "../../models";
import { Action } from "../../types";
import { getIntroText } from "../../prompts/chatBot";
import { getActionTSSignature } from "../../prompts/tsConversion";
import { snakeToCamel } from "../../utils";

export function getDataAnalysisPrompt(args: {
  question: string;
  selectedActions: Action[];
  orgInfo: { name: string; description: string };
  userDescription: string;
  thoughts: string;
}): ChatGPTMessage[] {
  const actionTS = args.selectedActions.map((action) => {
    return getActionTSSignature(action, true, null, true);
  });
  return [
    {
      role: "system",
      content: `${getIntroText(
        args.orgInfo,
      )} Your task is to help the user by writing a Javascript snippet to call ${
        args.orgInfo.name + "'s" || "the"
      } API which can then be visualized to answer the user's question. Plot data to give a complete picture when possible.
${args.userDescription ? `\nUser description: ${args.userDescription}\n` : ""}
api.ts
\`\`\`
${actionTS.join("\n\n")}

/** Plots data for the user. Users can toggle to view data in a table. DO NOT call plot() more than two times **/
function plot(title: string,
type: "line"|"bar"|"table",
data: {x:number|string,y:number,[key:string]:any;}[], // Max length: 25 (100 if a line chart). The wildcard is to add extra information shown in the table and when hovering the data point
labels: {x:string,y:string} // Include axis units in brackets. Example: Conversion rate (%)
)
\`\`\`

Today's date is ${new Date().toISOString().split("T")[0]}

RULES:
1. ONLY use the standard JS library and api.ts. DO NOT use other libraries or frameworks. THIS IS VERY IMPORTANT!
2. NEVER write TODO comments, placeholder code or ... in place of code
3. The following cause runtime errors: fetch() (or calling another server), eval(), new Function(), WebAssembly, try-catch, TS types and function definitions
4. If the user's request is impossible given api.ts, inform them of this or ask a clarifying question with console.log(). DO NOT write any code other than this. You cannot get input from the user in the code
5. DO NOT answer a question by using return to send data. Use plot() to visualize data
6. Use await NOT .then()
7. It's CRUCIAL to call the API efficiently. DO NOT call APIs in a loop, unless it's wrapped in a promise
8. When calculating cumulative values, ORDER THE DATA first!
9. Respond with code in \`\`\` starting with imports and a commented plan like below:
\`\`\`
// imports

// Plan:
// 1. Think
// 2. step-by-step

...
\`\`\``,
    },
    { role: "user", content: args.question },
    {
      role: "assistant",
      content: `\`\`\`javascript
import { ${actionTS
        .map((a) => a.match(/async function (\S+)\(/m)?.[1])
        .join(", ")}, plot } from "./api.ts";

// Plan:${args.thoughts.split("\n").map((t) => `\n// ${t}`)}`,
    },
  ];
}

export function parseDataAnalysis(
  rawCode: string,
  actions: Pick<Action, "name">[],
): { code: string } | { error: string } | null {
  /** Code output means the code is valid
   * Error output is an error message to be shown to the AI
   * null output means that you need to retry **/
  // Check if it's just an error
  const errorMatch = /^\n?throw new Error\((.*)\);?$/.exec(rawCode);
  if (errorMatch) {
    // slice(1, -1) removes the quotes from the error message
    return { error: errorMatch[1].slice(1, -1) };
  }

  // Remove comments (stops false positives from comments containing illegal stuff) & convert from TS to JS
  let code = stripBasicTypescriptTypes(
    rawCode
      .replace(/^\s*(\/\/.*|\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)/gm, "")
      .trim(),
  );
  if (code === "") {
    console.error("No code (possibly comments) in code string");
    return null;
  }

  // Check that fetch(), eval(), new Function() and WebAssembly aren't used
  const illegalRegexes = [
    /fetch\([\w\W]*\)/g,
    /eval\([\w\W]*\)/g,
    /new Function\([\w\W]*\)/g,
    /WebAssembly\./g,
  ];
  for (const regex of illegalRegexes) {
    if (regex.test(code)) {
      const error = `Illegal code found by ${String(
        regex,
      )}:\n---\n${code}\n---`;
      console.error(error);
      return null;
    }
  }

  // Check that awaited functions are either defined here, action functions or Promise.all
  const actionNames = actions.map((a) => snakeToCamel(a.name));
  let awaitableActionNames = ["Promise.all", ...actionNames];
  const definedFnNames =
    code
      .match(/(async function (\w+)\(|(const|let|var) (\w+)\s*=\s*async\s*\()/g)
      ?.map((fnNameMatch) => {
        if (fnNameMatch.startsWith("async")) {
          // async function (\w+)\(
          return fnNameMatch.slice(15, -1);
        } else {
          // (const|let|var) (\w+)\s*=\s*async\s*\(
          return fnNameMatch.split("=")[0].split(" ")[1].trim();
        }
      }) ?? [];

  // These are all valid await-able function names
  awaitableActionNames = awaitableActionNames.concat(definedFnNames);

  // Now, get the awaited function names
  const awaitedFns = code.match(/await \S+?\(/g) ?? [];
  for (let fnMatch of awaitedFns) {
    const fnName = fnMatch.slice(6, -1);
    if (!awaitableActionNames.includes(fnName)) {
      const errorMsg = `Function with name ${fnName} is awaited, yet is not defined or an action name`;
      console.error(errorMsg);
      return { error: errorMsg };
    }
  }

  // Code edits (adding awaits where necessary) below here:

  // Whole thing is an unwrapped unnamed function
  const unwrappedUnnamedFn = code.match(
    /^async\s*(\([^)]*\)\s*=>|function\([^)]*\))\s?\{([\s\S]+?)}$/g,
  );
  // Wrap & await it
  if (unwrappedUnnamedFn) code = `await (${code})();`;

  // Sometimes the code is wrapped in an async function which is instantly called, so await this
  const wrappedFn = code.match(
    /(?<!await )\(async\s*(\([^)]*\)\s*=>|function\([^)]*\))\s?\{([\s\S]+)}\n?\s*\)\(\);/g,
  );
  wrappedFn?.forEach((instantCalledCode) => {
    code = code.replace(instantCalledCode, `await ${instantCalledCode}`);
  });

  // The code can be wrapped in a named function which is called later (or not)
  let namedFnContents = code.match(
    // await is optional as is variable setting
    /async function (\w+)\([^)]*\)\s*\{([\s\S]+?)\n}[\S\s]*?(\n\1\([^)]*?\);?)/,
  );
  let i = 0;
  while (namedFnContents && i < 4) {
    i++;
    code = code.replace(
      namedFnContents[3],
      `\nawait ${namedFnContents[3].trim()}`,
    );
    namedFnContents = code.match(
      // await is optional as is variable setting
      /async function (\w+)\([^)]*\)\s*\{([\s\S]+?)\n}[\S\s]*?\n(\1\([^)]*?\);?)/,
    );
  }

  // Unnamed function used as a variable called without await
  const unnamedFnVar = code.match(
    /(const|let|var) (\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]+?)\n};?\s*(\n\2\(\);?)?/,
  );
  if (unnamedFnVar) {
    code = code.replace(unnamedFnVar[4], `await ${unnamedFnVar[4]}`);
  }

  // Rare: API function called with then without await
  actionNames.forEach((actionName) => {
    const thenCall = new RegExp(
      // Capture group enclosing actionName until the end is used as $1 below
      `(?<!await )(${actionName}\\([^)]*\\)\\.(then|catch)\\()`,
    );
    if (thenCall.test(code)) code = code.replace(thenCall, `await $1`);
  });

  return { code };
}

function stripBasicTypescriptTypes(jsCodeString: string): string {
  // function stripBasicTypescriptTypes(jsCodeString) {
  // Remove type definitions like `: string`, `: number`, `: any` etc.
  jsCodeString = jsCodeString.replace(/:\s*\w*(?=\s*=\s*)/g, "");

  // Remove interface definitions
  jsCodeString = jsCodeString.replace(
    /(export )?interface\s+\w+\s*\{[^}]+\}/g,
    "",
  );

  return jsCodeString;
}
