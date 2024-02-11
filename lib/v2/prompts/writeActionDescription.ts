import { ChatGPTMessage } from "../../models";
import { Action } from "../../types";
import { getActionTSSignature } from "../../prompts/tsConversion";

export function writeActionDescription(args: {
  action: Action;
  org: { name: string; description: string };
}): ChatGPTMessage[] {
  return [
    {
      content: `You are ${
        args.org.name
      } chatbot AI. Your task is write very short, concise descriptions for the functions. The descriptions you write will be used to select functions which are relevant to answer a user's request
${args.org.description ? "\n\n" + args.org.description : ""}

Here's an example taken from a CRM of a good description for a function called search_companies:
\`\`\`
Search companies by name and can apply filters such as company id, industry, employees (> or <) and annual_revenue (> or <). Returns list of companies: each has an id, name, employee count and annual revenue
\`\`\`

Here's the function to describe:
\`\`\`
${getActionTSSignature(args.action)}
\`\`\`

RULES:
1. Make it extremely concise. Write in shorthand
2. Group optional parameters together at the end of the list of parameters, as in the example
3. DO NOT specify whether return parameters are optional, THIS IS NOT IMPORTANT
4. If there are a large number of returned parameters, summarise them
5. ONLY include the return type if the main purpose of the function is to retrieve data. DO NOT FORGET THIS`,
      role: "system",
    },
  ];
}
