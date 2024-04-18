import { ApprovalVariable } from "../../types";

export function variableToTypeDef(variable: ApprovalVariable): string {
  return `type ${variable.typeName} = ${variable.type}${
    variable.description ? ` // ${variable.description}` : ""
  }`;
}
