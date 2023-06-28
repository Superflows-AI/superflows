//
// export function parseIncompleteJson(jsonString: string): object {
// // function parseIncompleteJson(jsonString) {
//   if (jsonString.length < 5) return {};
//   let stack = [];
//   let inCurlyBrackets = false;
//   let needsColon = false;
//
//   for (let i = 0; i < jsonString.length; i++) {
//     const char = jsonString[i];
//     const prev = stack[stack.length - 1];
//
//     if (char === '{' || char === '[') {
//       inCurlyBrackets = char === '{';
//       needsColon = inCurlyBrackets;
//       if (prev === ':') {
//           stack.pop();
//       }
//       stack.push(char);
//     }
//     else if (char === '}' && prev === '{') {
//       stack.pop();
//     }
//     else if (char === ']' && prev === '[') {
//       stack.pop();
//     }
//     else if (char === ':') {
//       stack.push(char);
//       needsColon = false;
//     }
//     else if (char === ',') {
//       if (prev === ',') {
//           stack.pop();
//       }
//       if (prev !== '"') {
//         stack.push(char);
//         if (inCurlyBrackets) {
//           needsColon = true;
//         }
//       }
//     }
//     else if (char === '"' && jsonString[i - 1] !== '\\') {
//       if (prev === '"') {
//         stack.pop();
//       } else if (prev === ':' || prev === ',') {
//         stack.pop();
//         stack.push(char);
//       } else {
//         stack.push(char);
//       }
//     }
//   }
//   // console.log("stack", stack)
//   while (stack.length > 0) {
//     const lastChar = stack.pop();
//
//     if (lastChar === '{') {
//       needsColon = needsColon && jsonString.trim()[jsonString.trim().length - 1] !== '{';
//       if (needsColon) {
//         jsonString += ':null';
//         needsColon = false;
//       }
//       jsonString += '}';
//     } else if (lastChar === '[') {
//       jsonString += ']';
//     } else if (lastChar === '"') {
//       if (jsonString[jsonString.length - 1] === '\\') {
//         jsonString += '\\';
//       }
//       jsonString += '"';
//       if (needsColon && inCurlyBrackets) {
//         jsonString += ':null';
//         needsColon = false;
//       }
//     } else if (lastChar === ':') {
//       jsonString += '""';
//     } else if (lastChar === ',') {
//       if (needsColon && inCurlyBrackets) {
//         jsonString += '"":';
//         needsColon = false;
//       }
//       jsonString += 'null';
//     }
//   }
//   // console.log("jsonString", jsonString)
//   return JSON.parse(jsonString);
// }
//
// // const testString = `{ "thoughts": { "text": "The user wants to search for C-suites at European CRM companies with more than 500 employees. This requires the creation of a new segment with specific filters.", "reasoning": "The user's request involves creating a segment with filters that target a specific group of users. We need to create a new segment, navigate to the Segment page, and then add the necessary filters.", "plan": "- Create a new user-level segment.\\n- Navigate to the 'Segment' page.\\n- Add filters for 'Position' (C-suite), 'Region' (Europe), 'Industry' (CRM), and 'Company Size' (>500).", "speak": "I'm going to create a new segment for you with these specific search parameters." }, "commands": [ { "name": "createSegment", "properties": { "name": "C-suites at European CRM companies >500 employees", "segmentType": "user" } }, { "name":"navigateTo", "properties":{ "pageName":"Segment" } } ] }`
// // const testString = `{ "thoughts": { "text": "The user is asking to find C-suites at European CRM companies with more than 500 employees. I need to create a segment with these specific filters to get the required information.", "reasoning": "To get the desired users, we need to create a new user-level segment and add the appropriate filters. These would include users with C-suite titles, located in Europe, who belong to companies categorized as CRM with more than 500 employees.", "plan": "- Create a new user-level segment.\\n- Add filters for job title, location, company category and company size.", "speak": "Sure, let's create a new segment for these criteria." }, "commands": [ { "name":"createSegment", "properties":{ "name":"C-suites at European CRM companies >500", "segmentType":"user" } } ] }`
// //
// // for (let i = 1; i < testString.length; i++) {
// //     console.log("i", i)
// //     console.log("testString", testString.slice(0, i))
// //     console.log("parseIncompleteJson", parseIncompleteJson(testString.slice(0, i)))
// // }
//

import { Simulate } from "react-dom/test-utils";
import input = Simulate.input;

export interface FunctionCall {
  name: string;
  args: { [key: string]: any };
}

export interface ParsedOutput {
  reasoning: string;
  plan: string;
  tellUser: string;
  commands: FunctionCall[];
  completed: boolean | null;
}

function getSectionText(
  inputStr: string,
  sectionName: string,
  nextSectionName: string
): string {
  const sectionIndex = inputStr.indexOf(sectionName + ":");
  const nextSectionIdx = inputStr.indexOf(nextSectionName + ":");

  if (sectionIndex === -1 || sectionIndex > nextSectionIdx) {
    return "Invalid input string: " + inputStr;
  }

  if (nextSectionIdx === -1) {
    return inputStr.slice(sectionIndex + sectionName.length + 1).trim();
  }

  return inputStr
    .slice(sectionIndex + sectionName.length + 1, nextSectionIdx)
    .trim();
}

export function parseOutput(gptString: string): ParsedOutput {
  const reasoningIn = gptString.toLowerCase().includes("reasoning:");
  const planIn = gptString.toLowerCase().includes("plan:");
  const tellUserIn = gptString.toLowerCase().includes("tell user:");
  const commandsIn = gptString.toLowerCase().includes("commands:");
  const completedIn = gptString.toLowerCase().includes("completed:");

  let commands: FunctionCall[] = [];
  if (commandsIn && completedIn) {
    const commandsText = getSectionText(gptString, "Commands", "Completed");
    commandsText
      .split("\n")
      // Filter out comments & empty lines
      .filter(
        (line: string) => !line.startsWith("# ") && line.trim().length > 0
      )
      .forEach((line: string) => {
        commands.push(parseFunctionCall(line));
      });
  }

  let completed: boolean | null = false;
  if (gptString.split("Completed: ").length > 1) {
    const completedString = gptString
      .toLowerCase()
      .split("completed: ")[1]
      .trim();
    completed =
      completedString.startsWith("true") ||
      (completedString.startsWith("question") ? null : false);
  }

  let reasoningText = "";
  if (planIn || tellUserIn || commandsIn) {
    reasoningText = getSectionText(
      gptString,
      "Reasoning",
      planIn ? "Plan" : tellUserIn ? "Tell user" : "Commands"
    );
  } else if (reasoningIn) {
    // Response streaming in, reasoning present, but no other sections yet
    reasoningText = gptString.split("Reasoning:")[1].trim();
  } else {
    // Streaming in, reasoning word incomplete
    reasoningText = "";
  }

  return {
    reasoning: reasoningText,
    plan: planIn
      ? getSectionText(gptString, "Plan", tellUserIn ? "Tell user" : "Commands")
      : "",
    tellUser: tellUserIn
      ? getSectionText(
          gptString,
          "Tell user",
          commandsIn ? "Commands" : "Completed"
        )
      : "",
    commands,
    completed,
  };
}

export function getLastSectionName(gptString: string): string {
  if (gptString.toLowerCase().includes("completed:")) {
    return "completed";
  } else if (gptString.toLowerCase().includes("commands:")) {
    return "commands";
  } else if (gptString.toLowerCase().includes("tell user:")) {
    return "tell user";
  } else if (gptString.toLowerCase().includes("plan:")) {
    return "plan";
  } else {
    return "reasoning";
  }
}

function parseFunctionCall(text: string) {
  const functionCallRegex = /(\w+)\(([^)]+)\)/;
  const argumentRegex = /(\w+)=({.*}?|[^,]+)/g;
  const dictionaryRegex = /{(.*?)}/g;

  const functionCallMatch = text.match(functionCallRegex);
  if (!functionCallMatch) {
    throw new Error("Invalid function call format" + text);
  }

  const name = functionCallMatch[1];
  const argsText = functionCallMatch[2];
  let argMatch;
  const args = {};

  while ((argMatch = argumentRegex.exec(argsText)) !== null) {
    const key = argMatch[1];
    let value;

    if (/^\d+(\.\d+)?$/.test(argMatch[2])) {
      value = parseFloat(argMatch[2]);
    } else if (/^["'](.*)["']$/.test(argMatch[2])) {
      value = argMatch[2].slice(1, -1);
    } else if (/^(true|false)$/.test(argMatch[2])) {
      value = argMatch[2] === "true";
    } else if (dictionaryRegex.test(argMatch[2])) {
      value = argMatch[2];
    } else {
      value = argMatch[2];
    }
    // @ts-ignore
    args[key] = value;
  }

  return { name, args };
}

export function parseGPTStreamedData(gptOutString: string): string {
  if (gptOutString.startsWith("data: [DONE]")) {
    return "[DONE]";
  }
  return gptOutString
    .split("data: ")
    .filter((l: string) => l.trim())
    .map((line: string) => {
      return JSON.parse(line.trim()).choices[0].delta.content;
    })
    .filter((l: string) => l)
    .join("");
}
