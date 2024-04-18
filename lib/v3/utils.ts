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
