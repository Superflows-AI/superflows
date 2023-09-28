import "jest";
import { getLLMResponse } from "../../../lib/queryLLM";
import { getRelevantActions } from "../../../lib/edge-runtime/filterActions";
import { actionFilteringPrompt } from "../../../lib/prompts/actionFiltering";

jest.mock("../../../lib/queryLLM");
jest.mock("../../../lib/prompts/actionFiltering");

(actionFilteringPrompt as jest.Mock).mockReturnValue([
  { role: "system", content: "" },
]);

// This resets the number of times called counts between tests
afterEach(() => {
  jest.clearAllMocks();
});

describe("getMockedProperties", () => {
  it("standard string formatting", async () => {
    const openAiResponse = `
    search_companies: Irrelevant
search_contacts: Irrelevant
update_contact: Irrelevant
create_contact: Irrelevant
search_deals: Irrelevant
update_deal: Irrelevant
create_deal: Irrelevant
search_engagements: Irrelevant
update_engagement: Irrelevant
create_engagement: Irrelevant
search_tasks: Relevant
create_task: Not sure
  `;

    (getLLMResponse as jest.Mock).mockReturnValue(openAiResponse);

    const actions = [
      { name: "search_companies" },
      { name: "search_contacts" },
      { name: "update_contact" },
      { name: "create_contact" },
      { name: "search_deals" },
      { name: "update_deal" },
      { name: "create_deal" },
      { name: "search_engagements" },
      { name: "update_engagement" },
      { name: "create_engagement" },
      { name: "search_tasks" },
      { name: "create_task" },
    ];

    // @ts-ignore
    const filteredActions = await getRelevantActions(actions, "", "");

    expect(filteredActions).toEqual([
      { name: "search_tasks" },
      { name: "create_task" },
    ]);
  });

  it("bad newlines", async () => {
    const openAiResponse = `
    search_companies: Irrelevant search_contacts: Irrelevant update_contact: Irrelevant.
search_tasks: Relevant create_task: Not sure.


update_deals: i have no idea hun

  `;

    (getLLMResponse as jest.Mock).mockReturnValue(openAiResponse);

    const actions = [
      { name: "search_companies" },
      { name: "search_contacts" },
      { name: "update_contact" },
      { name: "create_contact" },
      { name: "search_deals" },
      { name: "update_deal" },
      { name: "create_deal" },
      { name: "search_engagements" },
      { name: "update_engagement" },
      { name: "create_engagement" },
      { name: "search_tasks" },
      { name: "create_task" },
    ];

    // @ts-ignore
    const filteredActions = await getRelevantActions(actions, "", "");

    expect(filteredActions).toEqual([
      { name: "create_contact" },
      { name: "search_deals" },
      { name: "update_deal" },
      { name: "create_deal" },
      { name: "search_engagements" },
      { name: "update_engagement" },
      { name: "create_engagement" },
      { name: "search_tasks" },
      { name: "create_task" },
    ]);
  });
  it("random string", async () => {
    const openAiResponse = `I am the son and the heir of a shyness that is criminally vulgar`;

    (getLLMResponse as jest.Mock).mockReturnValue(openAiResponse);

    const actions = [
      { name: "search_companies" },
      { name: "search_contacts" },
      { name: "update_contact" },
      { name: "create_contact" },
      { name: "search_deals" },
      { name: "update_deal" },
      { name: "create_deal" },
      { name: "search_engagements" },
      { name: "update_engagement" },
      { name: "create_engagement" },
      { name: "search_tasks" },
      { name: "create_task" },
    ];

    // @ts-ignore
    const filteredActions = await getRelevantActions(actions, "", "");

    expect(filteredActions).toEqual(actions);
  });
});
