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
      } AI. Your purpose is to assist users using information from the documentation. Follow the <rules></rules>

<facts>
${facts.map((fact, i) => `${i + 1}. ${fact}`).join("\n")}
</facts>

<rules>
1. ONLY answer if the <docsSearchOutput></docsSearchOutput> clearly answers the question. DO NOT invent information
2. ONLY include information from the documentation that answers the question. DO NOT include irrelevant information
3. DO NOT tell the user to find the answer in the documentation
4. Tell the user if the docs do not cover a topic
5. Write in ${language ?? "the same language as the user"}
6. BE CONCISE
7. Output your answer following <format></format>
</rules>

<format>
<thinking>
${
  language !== "Spanish"
    ? `1. Think step-by-step: What language should I write in?
2. What are the most relevant pieces of information in the docs?
3. Do the docs answer the question?`
    : `1. Piensa paso a paso: ¿En qué idioma debo escribir?
2. ¿Cuáles son los datos más relevantes de los documentos?
3. ¿Responden los médicos a la pregunta?`
}
</thinking>
<tellUser>
${
  language !== "Spanish"
    ? "Answer the user's question if the docs contain the answer."
    : "Responda la pregunta del usuario si los documentos contienen la respuesta."
}
</tellUser>
</format>`,
    },
    {
      role: "user",
      content: `${userRequest}\n\n<docsSearchOutput>\n${docsSearchOutput}\n</docsSearchOutput>`,
    },
    {
      role: "assistant",
      content:
        language !== "Spanish"
          ? `<thinking>
1. What language should I write in?
  - ${
    language ? `I must write in ${language}` : "The same language as the user"
  }
2. What are the most relevant pieces of information in the docs?
  - The most relevant piece of information is`
          : `<thinking>
1. ¿En qué idioma debo escribir?
  - debo escribir en español
2. ¿Cuáles son los datos más relevantes de los documentos?
  - La información más relevante es`,
    },
  ];
}
