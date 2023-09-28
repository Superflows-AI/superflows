import { actionFilteringPrompt } from "../prompts/actionFiltering";
import { getLLMResponse } from "../queryLLM";
import { ActionPlusApiInfo } from "../types";
import { exponentialRetryWrapper, joinArraysNoDuplicates } from "../utils";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export async function filterActions(
  actions: ActionPlusApiInfo[],
  conversationId: number,
  userQuery: string,
  model: string,
): Promise<ActionPlusApiInfo[]> {
  /**
   * Only include actions that have either:
   * Been used previously in the conversation
   * or
   * Are relevant to the user's query
   */

  // TODO: add previously used actions

  const actionsUsedRedisKey = conversationId.toString() + "-actions-used";
  const actionsUsedStr = redis
    ? ((await redis.get(actionsUsedRedisKey)) as string) ?? ""
    : "";

  const actionsUsed = actions.filter((action) =>
    actionsUsedStr.includes(action.name),
  );

  const relevantActions = await getRelevantActions(actions, userQuery, model);

  console.log(
    "The following actions were selected as relevant: ",
    relevantActions.map((a) => a.name),
  );

  actions = joinArraysNoDuplicates(relevantActions, actionsUsed, "name");

  redis?.set(
    actionsUsedRedisKey,
    actions.map((action) => action.name).join(", "),
  );

  redis?.expire(actionsUsedRedisKey, 60 * 15);

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
