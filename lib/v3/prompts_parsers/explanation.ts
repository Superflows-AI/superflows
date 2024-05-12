import { Organization } from "../../types";
import { ChatGPTMessage } from "../../models";
import { findLastIndex } from "lodash";

export const EXPLANATION_MODEL = "anthropic/claude-3-haiku-20240307";

export const explanationParams = {
  temperature: 0,
  max_tokens: 800,
  stop: ["</tell"],
};

export function explainPlotChatPrompt(
  chatHistory: { role: string; content: string; name?: string }[],
  userDescriptionSection: string,
  org: Pick<Organization, "name" | "description" | "chatbot_instructions">,
  language: string | null,
  graphCut: boolean,
  isTable: boolean,
): ChatGPTMessage[] {
  const lt = "<";

  const graphOrTable = isTable ? "table" : "graph";
  chatHistory = chatHistory.slice(
    Math.max(
      0,
      findLastIndex(chatHistory.slice(0, -3), (m) => m.role === "user"),
    ),
  );

  const instructions = org.chatbot_instructions.split("\n").filter(Boolean);
  return [
    {
      role: "system",
      content: `You are ${
        org.name
      } AI. You help answer user questions. Your task is to write text to complement the ${graphOrTable} to help the user understand the data better. Follow all the RULES.

<facts>
1. ${org.description}
2. Today's date is ${new Date().toISOString().split("T")[0]}${
        userDescriptionSection ? `\n3. ${userDescriptionSection}` : ""
      }
</facts>
${
  graphCut
    ? `\n<example>
### FUNCTION:
Logs from code execution and API calls for instruct_coder:
getTop10Products()
The top product is DEMO_152 with projected revenue of $97,254 in the next 12 months

### FUNCTION:
{"type":"${
        isTable ? "table" : "bar"
      }","data":"${lt}cut for brevity - DO NOT pretend to know the data, instead tell the user to look at this ${graphOrTable}>","xLabel":"Product name","yLabel":"Revenue ($)","graphTitle":"Top 10 products by revenue over the past 6 months"}

### Assistant:
<thinking>
1. The data has been cut for brevity
2. As a result, I should inform the user that they should look at the ${graphOrTable} above
</thinking>
<tellUser>
${
  language && language === "Spanish"
    ? `Arriba se muestra un ${
        graphOrTable === "graph" ? "el gráfico" : "la tabla"
      } que muestra los 10 productos principales por ingresos durante los últimos 6 meses.${
        graphOrTable === "graph"
          ? "\n\nEl eje x muestra el nombre del producto, mientras que el eje y es el ingreso en $."
          : ""
      }

El producto principal es DEMO_152 con ingresos proyectados de $97.254 en los próximos 12 meses.`
    : `Above is a ${graphOrTable} displaying the top 10 products by revenue over the past 6 months.${
        graphOrTable === "graph"
          ? "\n\nThe x axis shows the product name, while the y axis is the revenue in $."
          : ""
      }

The top product is DEMO_152 with projected revenue of $97,254 in the next 12 months.`
}
</tellUser>
</example>\n`
    : ""
}
<rules>
1. ${
        graphCut
          ? `DO NOT invent the contents of the ${graphOrTable} data cut for brevity. DO NOT tell the user that you cannot see the ${graphOrTable} or that you cannot tell them about the data. Instead, tell them to "View the ${graphOrTable} above".`
          : `Answer the user's question. What you write accompanies the ${graphOrTable}`
      }
2. DO NOT repeat the ${graphOrTable} contents in a list or in text. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.
3. BE CONCISE
4. Write the contents of <tellUser></tellUser> in ${
        language ?? "the same language as the user"
      }${instructions.map((instr, i) => `\n${i + 5}. ${instr}`).join("")}
${instructions.length + 5}. Your reply must follow the <format></format>
</rules>

<format>
<thinking>
1. Think step-by-step: which rules apply? 
2. what has the user asked?
3. ${
        graphCut
          ? `how is it best to explain the ${graphOrTable} since the data has been cut?`
          : `what does the ${graphOrTable} show?`
      }
4. which key information should be given to the user as a summary (not entire ${graphOrTable})?
</thinking>
<tellUser>
${
  language && language === "Spanish"
    ? `Responda la solicitud del usuario sin repetir ${
        graphOrTable === "graph" ? "el gráfico" : "la tabla"
      } en su totalidad

Explique cómo se generó ${
        graphOrTable === "graph" ? "el gráfico" : "la tabla"
      } (no mencione las funciones por su nombre) y cómo se calcularon los números basándose en los registros`
    : `Answer the user's request without repeating the ${graphOrTable} in full${
        language && language !== "English" ? ` (in ${language})` : ""
      }

Explain how the ${graphOrTable} was generated (don't mention functions by name) and how numbers were calculated based on the logs${
        language && language !== "English" ? ` (in ${language})` : ""
      }`
}
</tellUser>
</format>`,
    },
    // Combine function messages with the messages that precede them for Claude
    ...(chatHistory
      .map((m, idx) => {
        if (m.role === "function") return null;
        const out = [m];
        if (m.role === "assistant") {
          out.push({ role: "user", content: "" });
        }
        let localIdx = idx + 1;
        while (
          localIdx < chatHistory.length &&
          chatHistory[localIdx].role === "function"
        ) {
          out[
            out.length - 1
          ].content += `\n\n### FUNCTION:\n${chatHistory[localIdx].content}`;
          localIdx++;
        }
        return out;
      })
      .flat()
      .filter(Boolean) as ChatGPTMessage[]),
    {
      role: "assistant",
      content: `<thinking>\n1. Which rules apply? I must not list the table's contents. ${
        !language || language === "English"
          ? ""
          : `And also I must write the <tellUser></tellUser> section in ${language}`
      }\n2. What has the user asked? The user has asked`,
    },
  ];
}
