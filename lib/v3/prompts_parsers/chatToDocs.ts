import { Organization } from "../../types";
import { Claude3Message } from "../../models";

export function chatToDocsPromptv3(
  userRequest: string,
  docsSearchOutput: string,
  userDescription: string | undefined,
  org: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  language: string | null,
): Claude3Message[] {
  const facts = [
    org.description,
    userDescription ? `User description: ${userDescription}` : "",
    ...org.chatbot_instructions.split("\n"),
  ].filter(Boolean);
  return [
    {
      role: "system",
      content: `You are ${
        org.name ?? "chatbot"
      } AI. Your purpose is to assist users ${
        org.name ? `in ${org.name} ` : ""
      }using information from the documentation. Follow the <rules></rules>

<facts>
${facts.map((fact, i) => `${i + 1}. ${fact}`).join("\n")}
</facts>

<rules>
1. ONLY answer if the <docsSearchOutput></docsSearchOutput> clearly answers the question. DO NOT invent things.
2. DO NOT tell the user to find the answer in the documentation.
3. If the docs do not cover a topic, tell the user this 
4. Write <tellUser></tellUser> in ${
        language ?? "the same language as the user"
      }. You may have to translate the documentation to do this 
5. Be concise & direct. DO NOT start with 'According to the documentation' or equivalent
6. Output your answer in the format described in <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: What language should I write <tellUser></tellUser> in?
2. Do the docs answer the question?
3. What should I tell the user?
</thinking>
<tellUser>
Answer the user's question or inform them that the docs do not cover the topic.
</tellUser>
</format>`,
    },
    {
      role: "user",
      content: `${userRequest}\n\n<docsSearchOutput>\n${docsSearchOutput}\n</docsSearchOutput>`,
    },
    {
      role: "assistant",
      content: `<thinking>
1. What language should I write <tellUser></tellUser> in?
  - ${
    language ? `I must write in ${language}` : "The same language as the user"
  }
2. Do the docs answer the question?
  -`,
    },
  ];
}
