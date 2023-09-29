import { actionFilteringPrompt } from "../prompts/actionFiltering";
import { getLLMResponse } from "../queryLLM";
import { ActionPlusApiInfo } from "../types";
import { exponentialRetryWrapper, joinArraysNoDuplicates } from "../utils";
import { GPTMessageInclSummary } from "../models";
import { parseOutput } from "@superflows/chat-ui-react";

export async function filterActions(
  actions: ActionPlusApiInfo[],
  nonSystemMessages: GPTMessageInclSummary[],
  model: string,
): Promise<ActionPlusApiInfo[]> {
  /**
   * Only include actions that have either:
   * Been used previously in the conversation
   * or
   * Are relevant to the user's query
   */
  const actionsUsedNames = nonSystemMessages
    .filter((message) => message.role === "assistant")
    .map((message) => parseOutput(message.content).commands.map((c) => c.name))
    .flat();

  const actionsUsed = actions.filter((action) =>
    actionsUsedNames.includes(action.name),
  );

  const relevantActions = await getRelevantActions(
    actions.filter((action) => !actionsUsedNames.includes(action.name)),
    nonSystemMessages[nonSystemMessages.length - 1].content,
    model,
  );

  console.log(
    "The following actions were selected as relevant: ",
    relevantActions.map((a) => a.name),
  );

  actions = joinArraysNoDuplicates(relevantActions, actionsUsed, "name");

  return actions;
}

export async function getRelevantActions(
  actions: ActionPlusApiInfo[],
  userQuery: string,
  model: string,
): Promise<ActionPlusApiInfo[]> {
  /**
   * Filter actions based on the score assigned by the actionFilteringPrompt.
   * If the score cannot be found in the response, keep the action
   */

  const prompt = actionFilteringPrompt(actions, userQuery);

  console.log("System prompt for filtering:\n", prompt[0].content);

  const response = await exponentialRetryWrapper(
    getLLMResponse,
    [prompt, { temperature: 0.7 }, model],
    3,
  );

  console.log("Response from filtering prompt:\n", response);

  return actions.filter((action) => {
    const startOfName = response.indexOf(action.name);
    if (startOfName === -1) return true;
    const endOfName = response.indexOf(":", startOfName);

    return (
      response
        .substring(endOfName + 1)
        .trim()
        .substring(0, 10)
        .toLowerCase() !== "irrelevant"
    );
  });
}
