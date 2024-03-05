import { ChatGPTMessage } from "../../models";
import { Action } from "../../types";
import { getActionTSSignature } from "../../prompts/tsConversion";

export const writeActionDescriptionLLMParams = {
  temperature: 0,
  max_tokens: 300,
  stop: ["\n\n", "```", '"""'],
};

function getWriteActionDescriptionExamples(isGet: boolean): string {
  let out = isGet
    ? 'Here\'s an example of a good description for a function (not FUNCTION) called search_companies from a CRM:\n"""\n'
    : 'Here are 2 examples of good descriptions for functions (not FUNCTION) in a CRM:\n\nFor searchCompanies:\n"""\n';
  out += `Filter companies using such as company id, industry, employees (> or <) and annual_revenue (> or <). Can also search by name. Returns list of companies: each has an id, name, employee count and annual revenue\n\"\"\"`;
  if (!isGet) {
    out +=
      '\n\nFor createCompany:\n"""\nCreate a contact at a company. Requires contact name, email and company_id. Phone number is optional\n"""';
  }
  return out;
}

export function writeActionDescriptionPrompt(args: {
  action: Action;
  org: { name: string; description: string };
}): ChatGPTMessage[] {
  return [
    {
      content: `You are ${
        args.org.name
      } AI. Your task is write a very concise description of FUNCTION. This will be used in the future to decide whether FUNCTION is relevant to a user's request
${args.org.description ? `\n${args.org.description}\n` : ""}
${getWriteActionDescriptionExamples(args.action.request_method === "get")}

FUNCTION:
\`\`\`
${getActionTSSignature(args.action, true)}
\`\`\`

RULES:
1. Be extremely concise. Write in shorthand
2. Specify what parameters with general names (e.g. "id" or "name") refer to (Example: "company id") 
3. Mention if input parameters are optional, but DO NOT specify whether values in the return type are optional, THIS IS NOT IMPORTANT
4. If there are many (>15) returned parameters, summarise them by grouping them
5. ONLY include the return type if the main purpose of the function is to retrieve data. DO NOT FORGET THIS
6. DO NOT include any metadata returned, such as status codes, error messages or page counts`,
      role: "system",
    },
  ];
}

export function parseActionDescription(text: string): string {
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }
  return text;
}
