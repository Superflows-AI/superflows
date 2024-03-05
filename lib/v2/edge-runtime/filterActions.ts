import {
  ActionFilteringOutput,
  actionFilteringPrompt,
  parseActionFilteringOutput,
} from "../prompts/actionFiltering";
import { ActionPlusApiInfo } from "../../types";
import { exponentialRetryWrapper, snakeToCamel } from "../../utils";
import { getLLMResponse } from "../../queryLLM";

const defaultFilterParams = {
  temperature: 0.9,
  max_tokens: 250,
  stop: ["```"], // Sometimes it tries to write code. We don't want this
};

export async function filterActions(
  userRequest: string,
  actions: ActionPlusApiInfo[],
  orgName: string,
  model: string,
): Promise<{ thoughts: string[]; actions: ActionPlusApiInfo[] }> {
  const actionFilterPrompt = actionFilteringPrompt({
    userRequest,
    actionDescriptions: actions.map(
      // Fallback to using description if no filtering_description
      (a) =>
        `${snakeToCamel(a.name)}: ${a.filtering_description || a.description}`,
    ),
    orgName,
  });
  console.log(actionFilterPrompt[0].content);
  // Run the filtering prompt in an ensemble of 3
  const ensembleSelectedFns = (
    await Promise.all(
      [1, 2, 3].map(async (i) => {
        console.log(`Running LLM ${i}`);
        let out = await exponentialRetryWrapper(
          getLLMResponse,
          [actionFilterPrompt, defaultFilterParams, model],
          3,
        );
        console.log(`LLM ${i} output:`, out);
        // If no output, retry
        if (out === "") {
          console.log("Retrying filtering prompt");
          out = await exponentialRetryWrapper(
            getLLMResponse,
            [actionFilterPrompt, defaultFilterParams, model],
            3,
          );
          console.log(`LLM ${i} output #2:`, out);
        }
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
): { thoughts: string[]; actions: ActionPlusApiInfo[] } {
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

  let thoughts = ensembleSelectedFns
    // Convert to thoughts strings
    .map((e) => e.thoughts)
    .filter((t, idx) =>
      // If there are no functions chosen, only keep the thoughts for the runs that didn't choose any functions
      chosenOut.length === 0
        ? ensembleSelectedFns[idx].selectedFunctions.length === 0
        : // If there are functions chosen, keep thoughts corresponding to runs that chose functions
          ensembleSelectedFns[idx].selectedFunctions.length > 0,
    )
    .sort((a, b) => {
      const thoughtsOrder = ensembleSelectedFns.map((e) => e.thoughts);
      const aIdx = thoughtsOrder.indexOf(a);
      const bIdx = thoughtsOrder.indexOf(b);
      const aChosen = ensembleSelectedFns[aIdx].selectedFunctions;
      const bChosen = ensembleSelectedFns[bIdx].selectedFunctions;
      // Sort by number of chosen functions
      return bChosen.length - aChosen.length;
    });

  // Return the action objects
  return {
    thoughts,
    actions: chosenOut.map(
      (name) => actions.find((a) => snakeToCamel(a.name) === name)!,
    ),
  };
}
