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
      } AI. Your purpose is to assist users using information from the documentation. The <docsSearch></docsSearch> contains potentially relevant information from the documentation. Follow the <rules></rules>

<facts>
${facts.map((fact, i) => `${i + 1}. ${fact}`).join("\n")}
</facts>

<rules>
1. ONLY answer if the <docsSearch></docsSearch> contains the answer. DO NOT invent information
2. DO NOT include information which is irrelevant to the question
3. DO NOT tell the user to find the answer in the documentation
4. Tell the user if the docs do not cover a topic
5. Write in ${language ?? "the same language as the user"}
6. Output following <format></format>
</rules>

<format>
<thinking>
${
  language !== "Spanish"
    ? `1. Think step-by-step: Which rules apply?
2. What is the most relevant piece of information from the documentation?
3. Does the documentation answer the question?`
    : `1. Piensa paso a paso: ¿Qué reglas se aplican?
2. ¿Cuál es la información más relevante de la documentación?
3. ¿Responden los médicos a la pregunta?`
}
</thinking>
<tellUser>
${
  language !== "Spanish"
    ? "Answer the user's question if the docs contain the answer. BE VERY CONCISE"
    : "Responda la pregunta del usuario si los documentos contienen la respuesta. SER MUY CONCISO"
}
</tellUser>
</format>`,
    },
    {
      role: "user",
      content: `${userRequest}

<docsSearch>
${docsSearchOutput}
</docsSearch>`,
    },
    {
      role: "assistant",
      content:
        language !== "Spanish"
          ? `<thinking>
1. Which rules apply?
  - I must only include relevant information to answer the question and not include information which is irrelevant to the question
2. What is the most relevant piece of information from the documentation?
  - The most relevant piece of information is`
          : `<thinking>
1. ¿Qué reglas se aplican?
  - Solo debo incluir información relevante para responder la pregunta y no incluir información que sea irrelevante para la pregunta
2. ¿Cuál es la información más relevante de la documentación?
  - La información más relevante es`,
    },
  ];
}
