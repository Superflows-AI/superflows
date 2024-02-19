import { ChatGPTMessage } from "../../models";
import { Action } from "../../types";
import { getActionTSSignature } from "../../prompts/tsConversion";

const exampleDescriptionText = {
  get: "Here's an example taken from a CRM of a good description for a function called search_companies:\n```\nSearch companies by name and can apply filters such as company id, industry, employees (> or <) and annual_revenue (> or <). Returns list of companies: each has an id, name, employee count and annual revenue\n```",
  post: "Here's an example of a good description for a function called create_contact from a CRM:\n```\nCreate a contact at a company. Requires contact name, email and company_id. Phone number is optional\n```",
};

export function writeActionDescriptionPrompt(args: {
  action: Action;
  org: { name: string; description: string };
}): ChatGPTMessage[] {
  return [
    {
      content: `You are ${
        args.org.name
      } chatbot AI. Your task is write very short, concise descriptions for the functions. The descriptions you write will be used to select functions which are relevant to answer a user's request
${args.org.description ? "\n\n" + args.org.description : ""}

${
  args.action.request_method === "get"
    ? exampleDescriptionText.get
    : exampleDescriptionText.post
}

Here's the function to describe:
\`\`\`
${getActionTSSignature(args.action, true)}
\`\`\`

RULES:
1. Make it extremely concise. Write in shorthand
2. With parameters with general names (e.g. "id" or "name") specify what they refer to (Example: "company id")
3. Mention if input parameters are optional, but DO NOT specify whether values in the return type are optional, THIS IS NOT IMPORTANT
4. If there are many (>20) returned parameters, group them into categories and mention the categories
5. ONLY include the return type if the main purpose of the function is to retrieve data. DO NOT FORGET THIS`,
      role: "system",
    },
  ];
}
