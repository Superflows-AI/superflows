import { ChatGPTMessage } from "../../models";
import { Action } from "../../types";
import { getIntroText } from "../../prompts/chatBot";
import { getActionTSSignature } from "../../prompts/tsConversion";

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
${actionTS.join("\n")}

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
5. Use await NOT .then()
6. It's CRUCIAL to call the API efficiently. DO NOT call APIs in a loop, unless it's wrapped in a promise
7. When calculating cumulative values, make sure to order the data by first!
8. Respond with code in \`\`\` starting with imports and a commented plan like below:
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

// Plan:${args.thoughts.replace(/\n/m, "\n// ")}
`,
    },
  ];
}

export function parseDataAnalysis(
  output: string,
): { code: string } | { error: string } | null {
  // function parseOutput(output) {
  const rawCode = output;

  // Automated output checks below

  // Check if it's just an error
  const errorMatch = /^\n?throw new Error\((.*)\);?$/.exec(rawCode);
  if (errorMatch) {
    // slice(1, -1) removes the quotes from the error message
    return { error: errorMatch[1].slice(1, -1) };
  }

  // Remove comments (stops false positives from comments containing illegal stuff) & convert from TS to JS
  let code = stripBasicTypescriptTypes(
    rawCode
      .replace(/(\/\/.*|\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)/g, "")
      .trim(),
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
      return null;
    }
  }

  // This variable is used if there's multiple async functions in the code and only 1 is called
  let otherCode = "";

  // Check if there are multiple async functions in the code where >1 is called in root level
  const multipleAsyncFunctions = code.match(
    // ^(?:export )? starts with optional export: non-matching group
    // (?:const ([\w_]+) = async (?:function|\(\) =>)|async function ([\w_]+)) - async function or arrow function
    // gm - global, multiline
    /^(?:export )?(?:const ([\w_]+) = async (?:function|\(\) =>)|async function ([\w_]+))/gm,
  );
  // Above checks for the following formats (incl export):
  // async function NAME(<ARGS>)
  // const NAME = async () => {
  // const NAME = async function (<ARGS>)

  if (multipleAsyncFunctions && multipleAsyncFunctions.length > 1) {
    const fnNames = multipleAsyncFunctions.map((fns) => {
      const sigMatches = fns.match(
        /^(?:export )?(?:const ([\w_]+) = async (?:function|\(\) =>)|async function ([\w_]+))/,
      )!;
      const fnName = sigMatches[1] || sigMatches[2];
      if (Boolean(code.match(new RegExp(`^${fnName}\\(\\)\\;?$`, "gm")))) {
        return fnName;
      }
      return null;
    });
    if (fnNames.filter((fn) => fn).length > 1) {
      return { error: "Multiple async functions called in generated code" };
    } else if (fnNames.filter((fn) => fn).length === 0) {
      return {
        error:
          "Multiple async functions defined, but none called in generated code",
      };
    } else {
      // Empty out the main function that's called and keep other functions as async
      const fnName = fnNames.filter((fn) => fn)[0];
      const matches = code.match(
        new RegExp(
          `^(?:export )?(?:const ${fnName} = async (?:function|\\(\\) =>)|async function ${fnName}\\(\\))\\s*\\{([\\s\\S]+?)\\n}`,
          "m",
        ),
      );
      if (matches) {
        let localCodeVar = code;
        otherCode = localCodeVar
          .replace(matches[0], "")
          .replace(`\n${fnName}()`, "\n");

        // Deindent the code
        code = matches[1].replace(/ {2}(.*)/gm, "$1");
      } else {
        // This should never happen!
        return {
          error:
            "Multiple async functions defined, and couldn't find main function",
        };
      }
    }
  }

  // If there are multiple functions in the code (non-async), we want to keep the non-async ones
  // We have to grab them here since we're about to extract out the single async function if there is one
  const nonAsyncFunctionMatches = code.match(
    // Proudest moment: wrote this first time. Probably very wrong.
    // (export )? optional export
    // (function|\(\) =>) function or arrow function
    // \s*\w+ optional whitespace and non-optional function name
    // \([^)]*\) optional function arguments
    // \s*\{[\s\S]+?\n} function body
    // gm global, multiline
    /^(export )?(function|\([^)]*\) =>)\s*\w+\([^)]*\)\s*\{[\s\S]+?\n}/gm,
  );
  // We also want to grab any variables which are declared at the top level
  const topLevelVariables = code.match(
    // const|let|var - variable declaration
    // \s+\w+\s*=\s* - variable name
    // gm - global, multiline
    /^(?:const|let|var)\s+\w+\s*=\s*(.+);?/gm,
  );

  // Sometimes the code is wrapped in an async function, so remove that
  const wrappedFnContents = code.match(
    /\(async\s*(\([^)]*\)\s*=>|function\([^)]*\))\s?\{([\s\S]+)}\n?\s*\)\(\);?/,
  );
  if (wrappedFnContents) {
    code = wrappedFnContents[2].replace(/ {2}(.*)/gm, "$1");
  }

  // The code can be wrapped in a named function which is called later (or not)
  // and the await is missing.
  const namedFnContents = code.match(
    /async function (\w+)\([^)]*\)\s*\{([\s\S]+?)\n}\s*(\n\1\(\);?)?/,
  );
  if (namedFnContents) {
    code = namedFnContents[2].replace(/ {2}(.*)/gm, "$1");
  }

  // 3rd function case: named unnamed function
  // Could combine with prev regex if I was a genius, but I'm not
  const namedUnnamedFnContents = code.match(
    /(const|let|var) (\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]+?)\n};?\s*(\n\2\(\);?)?/,
  );
  if (namedUnnamedFnContents) {
    code = namedUnnamedFnContents[3].replace(/ {2}(.*)/gm, "$1");
  }

  if (code.match(/(?<!\([^)]*(\([^)]*\))*[^)]*)return(?![^(]*\))/g)) {
    console.error(
      `Return statement found in code. Removing:\n---\n${code}\n---`,
    );
    code = code.replace(
      /(?<!\([^)]*(\([^)]*\))*[^)]*)return(?![^(]*\))/g,
      "return builtinFunctionCalls;",
    );
  }

  // Add back the non-async functions that aren't in the code
  if (nonAsyncFunctionMatches) {
    code =
      nonAsyncFunctionMatches.filter((fn) => !code.includes(fn)).join("\n\n") +
      "\n\n" +
      code;
  }

  // Add back the top level variables that aren't in the code
  if (topLevelVariables) {
    code =
      topLevelVariables
        .filter((variable) => !code.includes(variable))
        .join("\n") +
      "\n\n" +
      code;
  }

  // Add back the other code in case of multiple async functions and 1 called
  code = `${otherCode}\n${code}`.trim();

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
