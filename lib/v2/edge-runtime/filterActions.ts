import {
  ActionFilteringOutput,
  actionFilteringPrompt,
  parseActionFilteringOutput,
} from "../prompts/actionFiltering";
import { ActionPlusApiInfo } from "../../types";
import { exponentialRetryWrapper, snakeToCamel } from "../../utils";
import { getLLMResponse } from "../../queryLLM";
import { ChatGPTMessage } from "../../models";

const defaultFilterParams = {
  temperature: 0.9,
  max_tokens: 250,
  stop: ["```"], // Sometimes it tries to write code. We don't want this
};

export async function filterActions(
  actions: ActionPlusApiInfo[],
  nonSystemMessages: ChatGPTMessage[],
  orgName: string,
  model: string,
): Promise<{ thoughts: string; actions: ActionPlusApiInfo[] }> {
  const actionFilterPrompt = actionFilteringPrompt({
    actionDescriptions: actions.map(
      (a) => `${snakeToCamel(a.name)}: ${a.filtering_description}`,
    ),
    nonSystemMessages,
    orgName,
  });
  console.log(actionFilterPrompt[0].content);
  // Run the filtering prompt in an ensemble of 3
  const ensembleSelectedFns = (
    await Promise.all(
      [1, 2, 3].map(async () => {
        const out = await exponentialRetryWrapper(
          getLLMResponse,
          [actionFilterPrompt, defaultFilterParams, model],
          3,
        );
        if (out === "") return null;
        return parseActionFilteringOutput(
          out,
          actions.map((a) => snakeToCamel(a.name)),
        );
      }),
    )
  )
    // Nulls are returned if there's a LLM-based error
    .filter(Boolean) as ActionFilteringOutput[];

  return combineSelectedFunctions(ensembleSelectedFns, actions);
}

export function combineSelectedFunctions(
  ensembleSelectedFns: ActionFilteringOutput[],
  actions: ActionPlusApiInfo[],
): { thoughts: string; actions: ActionPlusApiInfo[] } {
  // We aggregate the results of the 3 runs into a single array of selected functions
  let chosenOut: string[] = [];
  // If more than 2 of the 3 output something, or 1 of 2 (if 1 failed)
  if (
    ensembleSelectedFns.reduce(
      (a, b) => a + Number(b.selectedFunctions.length > 0),
      0,
    ) >
    ensembleSelectedFns.length - 2
  ) {
    // Combine & keep unique
    chosenOut = Array.from(
      new Set(ensembleSelectedFns.flatMap((a) => a.selectedFunctions)),
    );
  }
  console.log(
    "Thoughts:\n",
    ensembleSelectedFns.map((e) => e.thoughts).join("\n\n"),
  );
  console.log("Chosen functions:", chosenOut);

  let thoughts = "";
  // Use the thoughts string from the thoughts associated with the most functions selected
  thoughts = ensembleSelectedFns.reduce((a, b) =>
    a.selectedFunctions.length > b.selectedFunctions.length ? a : b,
  ).thoughts;

  // Return the action objects
  return {
    thoughts: thoughts,
    actions: chosenOut.map(
      (name) => actions.find((a) => snakeToCamel(a.name) === name)!,
    ),
  };
}
