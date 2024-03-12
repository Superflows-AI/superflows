import { ChatGPTMessage } from "../../models";
import { Action, Organization } from "../../types";
import { getIntroText } from "../../prompts/chatBot";
import { getActionTSSignature } from "../../prompts/tsConversion";
import { snakeToCamel } from "../../utils";
import {
  parsePhindDataAnalysis,
  stripBasicTypescriptTypes,
} from "./dataAnalysisPhind";

export const GPTDataAnalysisLLMParams = {
  max_tokens: 800,
  stop: [],
};

export function getGPTDataAnalysisPrompt(args: {
  question: string;
  selectedActions: Action[];
  orgInfo: Pick<Organization, "name" | "description" | "chatbot_instructions">;
  userDescription: string;
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
${args.userDescription ? `\nUser description: ${args.userDescription}\n` : ""}${
        args.orgInfo.description ? "\n" + args.orgInfo.description + "\n" : ""
      }${
        args.orgInfo.chatbot_instructions
          ? "\n" + args.orgInfo.chatbot_instructions + "\n"
          : ""
      }
FUNCTIONS
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
1. ONLY use the standard JS library and FUNCTIONS. DO NOT use other libraries or frameworks. THIS IS VERY IMPORTANT!
2. NEVER write TODO comments, placeholder code or ... in place of code
3. The following cause runtime errors: fetch() (or calling another server), eval(), new Function(), WebAssembly, try-catch, TS types and function definitions
4. DO NOT use return to send data to the user. Use plot() to visualize data or console.log() to output text
5. Use await NOT .then()
6. DO NOT call FUNCTIONS in a loop, UNLESS wrapped by Promise.all() or the loop is 5 or less. THIS IS VERY IMPORTANT!
7. When calculating cumulative values, ORDER THE DATA first!
8. Respond with your plan, followed by code enclosed by \`\`\` like below:
"""
Plan:
1. Think
2. step-by-step

\`\`\`
// Write code here
\`\`\`
"""`,
    },
    { role: "user", content: args.question },
  ];
}

export function parseGPTDataAnalysis(
  llmOutput: string,
  actions: Pick<Action, "name">[],
): { code: string } | { error: string } | null {
  /** Code output means the code is valid
   * Error output is an error message to be shown to the AI
   * null output means that you need to retry **/
  let code =
    llmOutput.match(
      /```(?:javascript|typescript|js|ts)?\n([\s\S]+?)\n```/,
    )?.[1] ?? "";
  if (!code) {
    console.error("ERROR: No code found in output");
    return null;
  }
  return parsePhindDataAnalysis(code, actions);
}

export function shouldEndGPTDataAnalysisStreaming(
  streamedText: string,
): boolean {
  /** It's common for GPT to write text after the code to explain it. I think it's been
   * fine-tuned to do this. A way to deal with this is to stream the response and stop
   * when it outputs a 2nd ``` which signifies the end of the code **/
  return streamedText.split(/^```/m).length >= 3;
}
