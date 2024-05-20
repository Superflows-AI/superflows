import { ChatGPTMessage } from "../../models";
import { Organization } from "../../types";

export function generateMoreRequestsPrompt(
  userRequest: string,
  variables: { name: string; variableStr: string }[],
  org: Pick<Organization, "name" | "description">,
): ChatGPTMessage[] {
  const rules = [
    "The meaning of the generated requests MUST MATCH the user's request",
    "Match the language (e.g. English/Spanish) of the user's request",
    "DO NOT repeat the user's request",
    "Output the list of requests as a numbered list",
  ];

  // TODO: This should probably be a function!
  let variableSection = "";
  const matchVariables = userRequest.match(/\{(\w+)}/g);
  if (matchVariables) {
    const variableNamesToInclude = matchVariables.map((v) => {
      let variableName = v.slice(1, -1);
      if (!isNaN(Number(variableName[variableName.length - 1]))) {
        variableName = variableName.slice(0, -1);
      }
      return variableName;
    });
    variableSection = `\n\n<variables>\n${variables
      .filter((v) => variableNamesToInclude.includes(v.name))
      .map((v) => v.variableStr)
      .join("\n")}\n</variables>`;
    rules.push(
      "DO NOT fill in the <variables></variables> with values, ensure the variables remain enclosed by curly brackets in the requests",
    );
  }

  return [
    {
      role: "system",
      content: `You are Request Generator AI. Your task is to generate 5 meaningfully identical requests to the user's request.

<facts>
1. You are embedded in ${org.name}${
        org.description ? `\n2. ${org.description}` : ""
      }
</facts>

<rules>
${rules.map((rule, i) => `${i + 1}. ${rule}`).join("\n")}
</rules>${variableSection}`,
    },
    {
      role: "user",
      content: userRequest,
    },
    {
      role: "assistant",
      content: "1.",
    },
  ];
}

export function parseGenerateAlternativeQuestionsOutput(
  text: string,
): string[] {
  return text
    .split("\n")
    .map((t) => {
      const match = t.match(/\d+\.\s*((?:.+(?:\b|$)){3,})/);
      if (!match) return "";
      return match[1].trim();
    })
    .filter(Boolean);
}
