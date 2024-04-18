import { ApprovalVariable } from "../../types";

export function convertToOpus(prompt: string): string {
  return prompt
    .split("\n\n")
    .map((text) => {
      const numberedList = text.match(/^(\w+):\n((\d\.\s*.+)+)/g);
      if (!numberedList) return text;
      return `<${numberedList[1].toLowerCase()}>
${numberedList[2]}
</${numberedList[1].toLowerCase()}>`;
    })
    .join("\n\n");
}

export function variableToTypeDef(variable: ApprovalVariable): string {
  return `type ${variable.typeName} = ${variable.type}${
    variable.description ? ` // ${variable.description}` : ""
  }`;
}
