import { ChatGPTMessage } from "../models";
import { PageAction } from "../rcMock";

export default function getMessages(
  userCopilotMessages: ChatGPTMessage[],
  pageActions: PageAction[],
  currentPageName: string,
  orgInfo: {
    name: string;
    description: string;
  },
  language: string
): ChatGPTMessage[] {
  const currentPage = pageActions.find((p) => p.pageName === currentPageName);

  if (!currentPage) {
    throw new Error(
      `Page ${currentPageName} not found in pageActions ${JSON.stringify(
        pageActions
      )}`
    );
  }
  let i = 1;
  let numberedActions = "";
  console.log("currentPage.actions", currentPage);
  currentPage.actions.forEach((action) => {
    let paramString = "";
    Object.entries(action.parameters.properties).forEach(([key, value]) => {
      paramString += `\n- ${key} (${value.type})${
        value.description ? `: ${value.description}` : ""
      }. ${action.required.includes(key) ? "REQUIRED" : ""}`;
    });
    numberedActions += `${i}. ${action.name}: ${action.description}.${
      paramString ? " PARAMETERS: " + paramString : ""
    }\n`;
    i++;
  });
  // const otherPages = pageActions.filter((p) => p.pageName !== currentPageName);
  // const availablePages = otherPages
  //   .map(
  //     (pageAction) =>
  //       "\n- '" + pageAction.pageName + "': " + pageAction.description
  //   )
  //   .join("");
  return [
    {
      role: "system",
      content: `You are ${orgInfo.name} chatbot AI. ${orgInfo.description} Your role is to be helpful to the user. Help them achieve tasks in ${orgInfo.name} by calling functions.

Seek user assistance when necessary or more information is required.

Do not instruct the user to perform actions. Instead, perform the actions yourself by calling functions in the "commands" output. Output commands in the order you want them to be performed.

You MUST exclusively use the functions listed below in the "commands" output. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!
These are formatted with {{NAME}}: {{DESCRIPTION}}. PARAMETERS: {{PARAMETERS}}. Each parameter is formatted like: "- {{NAME}} ({{DATATYPE}}): {{DESCRIPTION}}. {{"REQUIRED" if parameter required}}".
${numberedActions}

If you need to use the output of a previous command for a command, simply stop outputting commands and set "Completed: false" - you will be asked once the function has returned for your next step.

Aim to complete the task in the smallest number of steps. Be as concise as possible in your responses. 

Think and talk to the user in the following language: ${language}. This should ONLY affect the Reasoning, Plan & Tell user outputs. NOT the commands or completed.

Think step-by-step. Respond following the format below, starting with your thoughts (your Reasoning & Plan), optionally anything to tell the user "Tell user", then optionally any "Commands" (you can call multiple, separate with a newline), then whether you are "Completed". THIS IS VERY IMPORTANT! DO NOT FORGET THIS!

Reasoning: reasoning behind the plan. Be concise. If the task isn't possible, or you need more information from the user, ask here and then skip the plan and commands entirely.

Plan:
- short bulleted
- list that conveys
- long-term plan

Tell user: (optional) tell the user something. E.g. if you're answering a question, write the answer to the user here.

Commands: (optional)
FUNCTION_NAME_1(PARAM_NAME_1=PARAM_VALUE_1, PARAM_NAME_2=PARAM_VALUE_2, ...)

Completed: (true or false or question) set to true when the above commands, when executed, would achieve the task set by the user. Alternatively, if the task isn't possible and you need to ask a clarifying question, set to question. THIS IS VERY IMPORTANT! DO NOT FORGET THIS!`,
    },
    ...userCopilotMessages,
  ];
}
