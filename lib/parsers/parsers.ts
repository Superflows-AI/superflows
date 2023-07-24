import { FunctionCall, ParsedOutput } from "../models";

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

  let reasoning = "";
  if (reasoningIn && (planIn || tellUserIn || commandsIn)) {
    reasoning = getSectionText(
      gptString,
      "Reasoning",
      planIn ? "Plan" : tellUserIn ? "Tell user" : "Commands"
    );
  } else if (reasoningIn) {
    // Response streaming in, reasoning present, but no other sections yet
    reasoning = gptString.split("Reasoning:")[1].trim();
  } // Either streaming in, reasoning word incomplete, or no reasoning

  let plan: string = "";
  if (planIn) {
    if (tellUserIn) {
      plan = getSectionText(gptString, "Plan", "Tell user");
    } else if (commandsIn) {
      plan = getSectionText(gptString, "Plan", "Commands");
    } else {
      plan = gptString.split("Plan:")[1].trim();
    }
  }

  let tellUser: string = "";
  if (tellUserIn) {
    if (commandsIn) {
      tellUser = getSectionText(gptString, "Tell user", "Commands");
    } else {
      tellUser = gptString.split("Tell user:")[1].trim();
    }
  }

  let commands: FunctionCall[] = [];
  if (commandsIn) {
    const commandsText = gptString.split("Commands:")[1].trim();
    commandsText
      .split("\n")
      // Filter out comments & empty lines
      .filter(
        (line: string) => !line.startsWith("# ") && line.trim().length > 0
      )
      .forEach((line: string) => {
        try {
          commands.push(parseFunctionCall(line));
        } catch (e) {}
      });
  }
  // Note: this gives true while streaming in. This is of course, incorrect!
  const completed =
    (commandsIn || tellUserIn || planIn) && commands.length === 0;

  return { reasoning, plan, tellUser, commands, completed };
}

export function getLastSectionName(gptString: string): string {
  if (gptString.toLowerCase().includes("commands:")) {
    return "commands";
  } else if (gptString.toLowerCase().includes("tell user:")) {
    return "tell user";
  } else if (gptString.toLowerCase().includes("plan:")) {
    return "plan";
  } else {
    return "reasoning";
  }
}

export function parseFunctionCall(text: string) {
  const functionCallRegex = /(\w+)\(([^)]*)\)/;
  const argumentRegex = /([\w-]+)=({.*?}|'.*?'|\[.*?\]|[^,]*)/g;
  const dictionaryRegex = /{(.*?)}/g;
  const arrayRegex = /\[(.*?)\]/g;

  const functionCallMatch = text.match(functionCallRegex);
  if (!functionCallMatch) {
    throw new Error("Invalid function call format: " + text);
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
    } else if (
      dictionaryRegex.test(argMatch[2]) ||
      arrayRegex.test(argMatch[2])
    ) {
      try {
        value = JSON.parse(argMatch[2].replace(/'/g, '"'));
      } catch (e) {
        value = argMatch[2];
      }
    } else {
      value = argMatch[2];
    }
    // @ts-ignore
    args[key] = value;
  }

  return { name, args };
}

export function parseGPTStreamedData(
  gptOutString: string
): string[] | undefined {
  try {
    return gptOutString
      .split("data: ")
      .filter((l: string) => l.trim())
      .map((line: string) => {
        if (line.includes("[DONE]")) return "[DONE]";
        return JSON.parse(line.trim()).choices[0].delta.content;
      })
      .filter((l: string) => l);
  } catch (e) {
    console.error(
      `Error parsing GPT output string: ${gptOutString}. Error: ${e}`
    );
    return undefined;
  }
}
