import { ChatGPTMessage } from "../models";
import { Action, Organization } from "../types";
import { getIntroText } from "./chatBot";
import { getActionTSSignature } from "./tsConversion";
import { snakeToCamel } from "../../pages/api/swagger-to-actions";

export function dataAnalysisPrompt(
  command: string,
  calledActions: {
    action: Action;
    args: { [key: string]: any };
    output: any;
  }[],
  orgInfo: Pick<Organization, "name" | "description">,
): ChatGPTMessage[] {
  const actionTS = calledActions
    .map((action) => {
      return getActionTSSignature(action.action, true, action.output);
    })
    .join("\n");

  return [
    {
      role: "system",
      content: `${getIntroText(
        orgInfo,
      )} Your task is to help the user by writing Javascript to format data received from ${
        orgInfo.name || "the API"
      } which can then be visualized to answer the user's question.

FACTS:
1. Today's date is ${new Date().toISOString().split("T")[0]}
2. Below are Typescript input and output types of the functions called:

\`\`\`${actionTS}\`\`\`

RULES:
1. DO NOT call the functions above and DO NOT redefine them
2. DO NOT redefine the variables defined in code in the user's message. USE THESE as the raw data to transform into a graph for the user
3. If the user's request is impossible given the data in the variables, raise an error:
\`\`\`
raise new Error("To visualize this graph, I need you to provide me with ...");
\`\`\`
4. DO NOT import other libraries or frameworks and the following will cause runtime errors: fetch() (or any code that calls another server), eval(), new Function(), WebAssembly, console.log()
5. The user has code that visualizes the variable \`graphData\` which YOU MUST DEFINE as the following type:
\`\`\`
interface GraphData {
graphTitle: string
type: "line"|"bar"|"value"
data: {x:number|string;y:number}[] // If type is "value", then have a length 1 array and set y to the value
xLabel?: string
yLabel?: string
}
\`\`\`
6. Respond in the format below. THIS IS VERY IMPORTANT. DO NOT FORGET THIS. Both 'Thoughts' and 'Code' are required sections:

Thoughts: Think about whether the user's request is possible and if so, how to achieve it. Be very concise. This is only for your benefit - this is hidden from the user

Code:
\`\`\`
...
\`\`\``,
    },
    {
      role: "user",
      content: `${command}
\`\`\`
${getFunctionCallCode(calledActions)}
\`\`\``,
    },
  ];
}

export function getFunctionCallCode(
  calledActions: {
    action: Action;
    args: { [key: string]: any };
    output: string;
  }[],
): string {
  // Write code to include in prior assistant message
  const varNames: string[] = [];
  for (const action of calledActions) {
    const funcName = snakeToCamel(action.action.name);
    // If function name unique, add that and move on
    if (!(funcName + "Output" in varNames)) {
      varNames.push(funcName + "Output");
      continue;
    }
    // Replace 'Output' with something that refers to the parameters used to call it
    const idxOf = varNames.indexOf(funcName + "Output");
    // Compare args
    let newName = "";
    const otherArgs = calledActions[idxOf].args;
    for (const [key, value] of Object.entries(action.args)) {
      if (!(key in otherArgs) || otherArgs[key] !== value) {
        newName = funcName + formatValueForVarName(key, value);
        // Add a number at the end if not unique
        if (newName in varNames) {
          let i = 1;
          while (varNames.includes(newName + i)) i++;
          newName = newName + i;
        }
        break;
      }
    }
    varNames.push(newName);
  }

  return calledActions
    .map((a, idx) => {
      const funcName = snakeToCamel(a.action.name);
      const argsText = Object.entries(a.args)
        .map(([key, value]) => {
          return `${key}:${JSON.stringify(value)}`;
        })
        .join(",");
      return `const ${varNames[idx]} = ${funcName}(${
        argsText ? `{${argsText}` : ""
      });`;
    })
    .join("\n");
}

function formatValueForVarName(key: string, value: any): string {
  if (Array.isArray(value)) {
    return formatValueForVarName(key, value[0]);
  } else if (typeof value === "object") {
    return formatValueForVarName(key, Object.values(value)[0]);
  } else if (typeof value === "string") {
    // Remove all non-alphanumeric characters
    const noAlnumChars = value.replace(/[^a-zA-Z0-9]/g, "");
    return noAlnumChars[0].toUpperCase() + noAlnumChars.slice(1);
  } else if (["number", "boolean"].includes(typeof value)) {
    const noAlnumChars = key.replace(/[^a-zA-Z0-9]/g, "");
    return (
      noAlnumChars[0].toUpperCase() + noAlnumChars.slice(1) + value.toString()
    );
  } else {
    return key.replace(/[^a-zA-Z0-9]/g, "") + value.toString();
  }
}
