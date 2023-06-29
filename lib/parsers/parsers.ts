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

  let completed: boolean | null = null;
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
  const functionCallRegex = /(\w+)\(([^)]*)\)/;
  const argumentRegex = /(\w+)=({.*}?|[^,]+)/g;
  const dictionaryRegex = /{(.*?)}/g;

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

export function parseGPTStreamedData(gptOutString: string): string[] {
  return gptOutString
    .split("data: ")
    .filter((l: string) => l.trim())
    .map((line: string) => {
      if (line.includes("[DONE]")) return "[DONE]";
      return JSON.parse(line.trim()).choices[0].delta.content;
    })
    .filter((l: string) => l);
}
