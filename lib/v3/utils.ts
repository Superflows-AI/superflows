import { ApprovalVariable } from "../types";
import { replaceVariables } from "../edge-runtime/utils";

export function getUserMessageText(
  questionText: string,
  variables: Record<string, any>,
): string {
  if ("fromDate" in variables)
    variables.fromDate = convertIsoToHumanReadable(variables.fromDate);
  if ("toDate" in variables)
    variables.toDate = convertIsoToHumanReadable(variables.toDate);
  if ("fromDate2" in variables)
    variables.fromDate2 = convertIsoToHumanReadable(variables.fromDate2);
  if ("toDate2" in variables)
    variables.toDate2 = convertIsoToHumanReadable(variables.toDate2);
  return replaceVariables(questionText, variables);
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function convertIsoToHumanReadable(dateStr: string): string {
  let date = new Date(dateStr);

  let day = date.getDate();
  let monthIndex = date.getMonth();
  let year = date.getFullYear();

  let suffix = "th";
  if ([1, 21, 31].includes(day)) {
    suffix = "st";
  } else if ([2, 22].includes(day)) {
    suffix = "nd";
  } else if ([3, 23].includes(day)) {
    suffix = "rd";
  }

  return `${day}${suffix} ${monthNames[monthIndex]} ${year}`;
}

// TODO: Write tests for this function
export function fillVariables(
  requests: {
    text: string;
    embedded_text: string;
    variable_values: Record<string, any>;
    primary_question: boolean;
  }[],
  variables: Record<string, any>,
  embedAll: Record<string, string[]>,
): {
  text: string;
  embedded_text: string;
  variable_values: Record<string, any>;
  primary_question: boolean;
}[] {
  return requests
    .map(({ text, embedded_text, primary_question, variable_values }) => {
      const matched = embedded_text.match(/\{.*?}/) as RegExpMatchArray | null;
      if (!matched)
        return [{ text, embedded_text, primary_question, variable_values }];

      const matchName = matched[0].slice(1, -1);
      if (matchName in embedAll) {
        const possibleValues = embedAll[matchName];
        return possibleValues
          .map((val) => {
            const newText = embedded_text.replace(`{${matchName}}`, val);
            return fillVariables(
              [
                {
                  text,
                  embedded_text: newText,
                  primary_question,
                  variable_values: { ...variable_values, [matchName]: val },
                },
              ],
              variables,
              embedAll,
            );
          })
          .flat();
      } else if (matchName in variables) {
        // @ts-ignore
        const val = variables[matchName];
        return fillVariables(
          [
            {
              text,
              embedded_text: embedded_text.replace(
                `{${matchName}}`,
                Array.isArray(val) ? val.join(", ") : val,
              ),
              primary_question,
              variable_values: { ...variable_values, [matchName]: val },
            },
          ],
          variables,
          embedAll,
        );
      } else {
        throw new Error("Variable not found: " + matchName);
      }
    })
    .flat();
}
