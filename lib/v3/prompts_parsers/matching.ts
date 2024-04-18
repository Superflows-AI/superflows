import { ChatGPTMessage } from "../../models";
import { ApprovalVariable, Organization } from "../../types";
import { variableToTypeDef } from "./utils";

export function getMatchingPromptv3(args: {
  userRequest: string;
  matches: { text: string; fnName: string; description: string }[];
  org: Pick<Organization, "name" | "description" | "chatbot_instructions">;
  userDescription: string;
  variables: ApprovalVariable[];
}): ChatGPTMessage[] {
  // inventoryHealth: "healthy"|"frozen"|"excess";
  const variableNamesToInclude: string[] = [];
  args.matches.forEach((m) => {
    const matchVariables = m.text.match(/\{(\w+)}/g);
    if (matchVariables) {
      matchVariables.forEach((v) => {
        let variableName = v.slice(1, -1);
        if (!isNaN(Number(variableName[variableName.length - 1]))) {
          variableName = variableName.slice(0, -1);
        }
        if (!variableNamesToInclude.includes(variableName)) {
          variableNamesToInclude.push(variableName);
        }
      });
    }
  });
  console.log("variableNamesToInclude", variableNamesToInclude);
  const noVariables = variableNamesToInclude.length === 0;
  let facts = [
    args.org.description,
    ...args.org.chatbot_instructions.split("\n"),
    // "The system recommends actions for products: discount, monitor, advertise, check, or display. When asked for such recommendations, use these actions",
    // "The AI that answers requests can generate plots or tables. As a result, direct requests for a 'list' or 'table' should be regarded as equivalent, and direct requests for a plot should match general questions about the data (since a plot will likely be generated)",
    // "A user asks a 'how many' question, it matches a 'list' question in the <request></request>, but not the other way around (user asks for a list, <request></request> asks for a count)",
  ];
  if (!noVariables) {
    facts.push(
      "<variables></variables> define the variables used in <functions></functions> using TypeScript",
    );
  }
  if (args.userDescription) {
    facts = facts.concat(args.userDescription.split("\n").filter(Boolean));
  }
  const constsToInclude = Array.from(
    new Set(
      variableNamesToInclude
        .map((v) => args.variables.find((t) => t.name === v)!.consts)
        .flat(),
    ),
  );
  console.log("Consts to include", constsToInclude);
  // const examples = [
  //   ...(noVariables ? examplesNoVariables : examplesWithVariables),
  // ];
  // if (variableNamesToInclude.includes("months")) examples.push(monthsExample);

  console.log("Matches", args.matches);
  return [
    {
      role: "system",
      content: `You are a helpful assistant in ${
        args.org.name || "an ERP software package"
      }. Your task is to call the relevant <functions></functions> to answer the user's question or inform the user that their request is not within your capabilities. Follow the <rules></rules> and take note of the <facts></facts>

<facts>
${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}
</facts>

<rules>
1. You MUST either call 1 function or tell the user their request isn't within your capabilities
2. In <functionCall></functionCall>, ONLY call functions in <function></function> - DO NOT write other JavaScript
3. DO NOT write arbitrary JS code in <functionCall></functionCall>. Only use JS format
4. DO NOT call a function if you aren't CERTAIN it will answer the user's request
5. If the user has multiple requests - answer the FIRST one that you can answer
6. Respond in the format given in <format></format> tags
7. If a function is called, an AI will summarize the response and provide the user with the answer${
        constsToInclude.length > 0
          ? `\n8. You may use <consts></consts> as parameters when calling a function`
          : ""
      }
</rules>

<format>
<thinking>
1. Think step-by-step: what is the user requesting
2. Has the user made multiple requests? Answer the first one you can answer
3. Do any of the <functions></functions> achieve this?
4. Consider parameter values
</thinking>
<functionCall>None|function1({param1: "value1", param2: "value2", ...})</functionCall>
<tellUser>If functionCall is None, tell the user their request isn't within your capabilities</tellUser>
</format>
${
  noVariables
    ? ""
    : `
<variables>
${Array.from(
  new Set(
    variableNamesToInclude.map((v) =>
      variableToTypeDef(args.variables.find((td) => td.name === v)!),
    ),
  ),
).join("\n")}
</variables>${
        constsToInclude.length > 0
          ? `

<consts>
${constsToInclude.join("\n")}
</consts>`
          : ""
      }`
}

<functions>
${args.matches.map((m) => toTSDescription(m, args.variables)).join("\n\n")}
</functions>`,
    },
    {
      role: "user",
      content: args.userRequest,
    },
    {
      role: "assistant",
      content: "<thinking>\n1. The user is requesting",
    },
  ];
}

function toTSDescription(
  match: { text: string; fnName: string; description: string },
  variables: ApprovalVariable[],
) {
  let signature = `/** ${match.description} **/
function ${match.fnName}(`;
  const args = match.text.match(/\{(\w+)}/g);
  if (!args) return `${signature})`;

  return `${signature}args: {${args
    .map((a) => {
      const aName = a.slice(1, -1);
      let typeDefName = aName;
      if (!isNaN(Number(aName.slice(-1)))) {
        typeDefName = aName.slice(0, -1);
      }
      const match = variables.find((t) => t.name === typeDefName);
      if (!match) throw new Error(`No match found for ${a}`);

      return `${a.slice(1, -1)}: ${match.typeName}`;
    })
    .join(", ")}})`;
}

// TODO: Replace with actual descriptions generated by an LLM
// function camelCaseToSentence(str: string): string {
//   // function camelCaseToSentence(str) {
//   let sentence = str.replace(
//     /([a-z])([A-Z])/g,
//     (_, p1, p2) => `${p1} ${p2.toLowerCase()}`,
//   );
//   sentence = sentence[0].toUpperCase() + sentence.slice(1);
//   // First word is a verb which should have an s on the end
//   const words = sentence.split(" ");
//   if (!words[0].endsWith("s")) {
//     sentence = words[0] + "s " + words.slice(1).join(" ");
//   }
//   return sentence;
// }

type ParsedResponse = {
  functionName: string;
  variables: Record<string, any> | null;
  tellUser: string;
} | null;

// TODO: WRITE TESTS FOR BELOW FUNCTION!
export function parseMatchingOutput(
  text: string,
  variables: ApprovalVariable[],
): ParsedResponse {
  const tellUserMatch = text.match(/<tellUser>([\s\S]*?)<\/tellUser>/);
  const tellUser = tellUserMatch ? tellUserMatch[1] : "";

  const isFunctionCall = Boolean(text.match(/<functionCall>/));
  if (!isFunctionCall) {
    return {
      functionName: "",
      variables: null,
      tellUser,
    };
  }
  const noFunctionCallClose = !Boolean(text.match(/<\/functionCall>/));
  if (isFunctionCall && noFunctionCallClose) {
    console.log("NO close");
    const fnText = text
      .split(/<functionCall>/)[1]
      // Remove any comments
      .replace(/\/\/.+/gm, "")
      .split("\n")
      .join("");
    console.log("Fn text", fnText);
    const fnNameMatch = fnText.match(/(\w+)\(/);
    if (!fnNameMatch) {
      return {
        functionName: "",
        variables: null,
        tellUser,
      };
    }
    const fnName = fnNameMatch[1];
    console.log("Fn name", fnName);
    const argsMatch = fnText.split("(")[1].match(/\{.*}/);
    console.log("Args match", argsMatch);
    // No args
    if (!argsMatch) {
      return {
        functionName: fnName,
        variables: {},
        tellUser,
      };
    }
    const argsString = argsMatch[0]
      // Add "" to keys so it can be JSON.parsed
      .replace(/(\w+\d?):/g, '"$1":')
      // Replace ' with " for JSON parsability
      .replace(/'/g, '"')
      // Replace any consts with their values
      .replace(/"\w+?":\s*([^"]+?)[},]/g, (m, val) => {
        const matchingConsts = variables
          .map((v) =>
            v.consts.map((c) => ({
              name: c.slice(6).split(":")[0],
              value: c.split(";")[0].split("=")[1],
            })),
          )
          .flat()
          .filter((c) => c.name === val);
        console.log("Matching consts", matchingConsts);
        if (matchingConsts.length === 0 || matchingConsts.length > 1) {
          return m;
        }
        const constMatch = new RegExp(
          `${matchingConsts[0].name}\\[(\\d+)\\]`,
        ).exec(val);
        console.log("Const match", constMatch);
        if (constMatch) {
          // @ts-ignore
          const v = JSON.parse(constValues[matchingConsts[0]].split("= ")[1]);
          return m.replace(
            constMatch[0],
            JSON.stringify(v[Number(constMatch[1])]),
          );
        }

        // @ts-ignore
        return m.replace(val, matchingConsts[0].value);
      });
    console.log("Args string", argsString);
    try {
      const args = JSON.parse(argsString);
      return {
        functionName: fnName,
        variables: args,
        tellUser,
      };
    } catch (e) {
      console.error("Error parsing args:", argsString);
      return null;
    }
  }
  return {
    functionName: "",
    variables: null,
    tellUser,
  };
}
