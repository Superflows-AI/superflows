import { ChatGPTMessage } from "../models";
import { Action } from "../types";
import { getActionDescriptions } from "./chatBot";

export function actionFilteringPrompt(
  actions: Action[],
  userQuery: string,
): ChatGPTMessage[] {
  const numberedActions = getActionDescriptions(actions, true);

  return [
    {
      role: "system",
      content: `You are an AI with the ability to call functions. 

You have access to a number of functions that could be used to answer the query.

The functions are formatted with {{NAME}}: {{DESCRIPTION}}. 

FUNCTIONS START

${numberedActions}

FUNCTIONS END 

Your task is to decide if each function is relevant to the user's request.

Do this by assigning one of three options to each function: 

1. Relevant
2. Not Sure
3. Irrelevant

Write your answer in the format:

${actions.map((action) => `${action.name}: YOUR-OPTION`).join("\n")}
`,
    },
    { role: "user", content: userQuery },
  ];
}

// This kinda worked maybe
` You are an AI with the ability to call functions. 

You have access to a number of functions that could be used to answer the query.

The functions are formatted with {{NAME}}: {{DESCRIPTION}}. 

FUNCTIONS START

1. search_companies: Search all the companies. PARAMETERS:
- id (integer): Company id.
- name (string): Company name.
- industry (string): Industry the company works in.
- employees (string): Filter by > or < the number of employees. Example >1000.
- annual_revenue (string): Filter by > or < the annual revenue of the company. Example >1000000.
2. new_action PARAMETERS: None.
3. search_contacts: Search all the contacts. PARAMETERS:
- name (string): Contact name.
- rep (integer): Sales rep who knows this contact best.
- id (integer): Contact id.
- company_id (integer): Company id.
4. update_contact: Update a contact. PARAMETERS:
- id (integer): Id of the contact to update. REQUIRED
- name (string)
- email (string): email.
- rep (string): The sales rep who knows this contact best.
- company_id (string): Associated company id.
5. create_contact: Create a new contact. PARAMETERS:
- name (string) REQUIRED
- email (string): email. REQUIRED
- phone (string): phone.
- rep (string): The sales rep who knows this contact best.
- company_id (string): Associated company id.
6. search_deals: Search all the sales deals. PARAMETERS:
- company_id (integer): Company id that you're searching for.
- contact_id (integer): Contact id.
- status ("Open" | "Won" | "Lost"): Status of the deal.
- rep (string): Sales rep who is leading the deal.
- value (string): Filter by > or < value of the deal in $. Example >1000000.
- probability (string): Filter by > or < CRM-calculated probability of closing. Example >0.8.
- closeDate (string): Filter by > or < ISO format date when the deal closed, or is expected to close. Example >2023-09-14.
7. update_deal: Update a deal. PARAMETERS:
- id (integer): Id of the deal to update. REQUIRED
- title (string)
- contact_id (string)
- company_id (string)
- rep (string): The sales rep who is leading the deal from our side.
- value (number): Value of the deal in USD.
- status ("Open" | "Won" | "Lost"): Current status of the deal.
- closeDate (string): If it has already closed, date when it deal closed.
8. create_deal: Create a new sales deal. PARAMETERS:
- title (string) REQUIRED
- contact_id (string)
- company_id (string)
- rep (string): The sales rep who is leading the deal from our side.
- value (number): Value of the deal in USD.
- status ("Open" | "Won" | "Lost"): Current status of the deal.
- closeDate (string): If it has already closed, date when it deal closed.
9. search_engagements: Search all the engagement events (calls, emails, meetings or notes). PARAMETERS:
- id (integer): Company id.
- type ("Call" | "Email" | "Meeting"): Type of engagement event.
- contact_id (integer): Contact id.
- rep (string): Sales rep who is attending the engagement/sent the email.
- dateTime (string): Filter ISO format dateTime by > or <. Example >2023-09-14.
10. update_engagement: Update an engagement event. PARAMETERS:
- id (integer): Id of the engagement event to update. REQUIRED
- dateTime (string): Date and time of engagement start.
- type ("Call" | "Email" | "Meeting")
- rep (string): The sales rep who is attending the engagement from our side.
- contact_id (number): Id of contact involved.
11. create_engagement: Add a new engagement event. PARAMETERS:
- dateTime (string): Date and time of engagement start. REQUIRED
- type ("Call" | "Email" | "Meeting") REQUIRED
- content (string)
- rep (string): The sales rep who is attending the engagement from our side.
- contact_id (number): Id of contact involved.
12. search_tasks: Search all tasks. PARAMETERS:
- status ("Open" | "Closed"): Status of the task.
- rep (string): Sales rep assigned the task.
- dueDate (string): Filter by > or < dueDate. E.g. >2023-09-14.
13. create_task: Create a new task. PARAMETERS:
- title (string): Title of the task. REQUIRED
- description (string)
- dueDate (string): date-time.
- status ("Open" | "Closed")
- rep (string)


FUNCTIONS END 

Your task is to decide if each function is relevant to the user's request.

Do this by assigning one of three options to each function: 

1. Relevant
2. Not Sure
3. Irrelevant

Write your answer in the format:

search_companies:
new_action:
search_contacts:
update_contact:
create_contact:
search_deals:
update_deal:
create_deal:
search_engagements:
update_engagement:
create_engagement:
search_tasks:
create_task:

You must output 13 lines. One line for each function.
`;
