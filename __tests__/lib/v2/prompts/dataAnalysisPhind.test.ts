import { parsePhindDataAnalysis } from "../../../../lib/v2/prompts/dataAnalysisPhind";

describe("Success", () => {
  it("unwrapped, unnested async code", () => {
    const code = `// 1. Call searchDeals with closeDate from 12 months ago
let today = new Date('2024-02-10');
let oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
let deals = await searchDeals({ closeDate: \`>\${oneYearAgo.toISOString()}\`, rep: '' });

// 2. Sort deals by value in descending order
deals.sort((a, b) => (a.value > b.value ? -1 : 1));

// 3. Group deals by rep
let groupedDeals = deals.reduce((groups, deal) => {
  if (!groups[deal.rep]) {
    groups[deal.rep] = [];
  }
  groups[deal.rep].push(deal);
  return groups;
}, {});

// 4. Calculate total value for each rep
let repsTotalValue = Object.entries(groupedDeals).map(([rep, deals]) => {
  let totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  return { rep, totalValue };
});

// 5. Plot the data
plot("Sales reps total value of closed deals in the past 12 months", "bar", repsTotalValue.map((repData) => ({ x: repData.rep, y: repData.totalValue })), { x: "Sales rep", y: "Total value ($)" });`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `let today = new Date('2024-02-10');
let oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
let deals = await searchDeals({ closeDate: \`>\${oneYearAgo.toISOString()}\`, rep: '' });

deals.sort((a, b) => (a.value > b.value ? -1 : 1));

let groupedDeals = deals.reduce((groups, deal) => {
  if (!groups[deal.rep]) {
    groups[deal.rep] = [];
  }
  groups[deal.rep].push(deal);
  return groups;
}, {});

let repsTotalValue = Object.entries(groupedDeals).map(([rep, deals]) => {
  let totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  return { rep, totalValue };
});

plot("Sales reps total value of closed deals in the past 12 months", "bar", repsTotalValue.map((repData) => ({ x: repData.rep, y: repData.totalValue })), { x: "Sales rep", y: "Total value ($)" });`,
    });
  });
  it("async fn () => {}", () => {
    const asyncFnWithVariable = `async function updateDealsValueBy25Percent() {
  try {
    const rep = "Ava";
    // Search for all deals with the specified rep
    const deals = await searchDeals({ rep: rep });

    // Update each deal's value by 25%
    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

// Call the function with Ava as the sales rep
updateDealsValueBy25Percent();`;
    const out = parsePhindDataAnalysis(asyncFnWithVariable, [
      { name: "search_deals" },
      { name: "update_deal" },
    ]);
    expect(out).toStrictEqual({
      code: `async function updateDealsValueBy25Percent() {
  try {
    const rep = "Ava";

    const deals = await searchDeals({ rep: rep });

    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

await updateDealsValueBy25Percent();`,
    });
  });
  it("async function", () => {
    const code = `// 1. Fetch all deals with a closeDate within the next 3 months

// 2. Group the deals by the date they close on

// 3. Calculate the cumulative value for each day

// 4. Plot the cumulative value over time

(async function() {
  const today = new Date("2024-02-10");
  const threeMonthsFromNow = new Date("2024-05-10");
  
  const deals = await searchDeals({
    closeDate: \`>\${today.toISOString().split("T")[0]}\`,
    value: \`>0\`
  }).filter(deal => new Date(deal.closeDate) <= threeMonthsFromNow);
  
  const dealsByCloseDate = {};
  for (const deal of deals) {
    const closeDate = new Date(deal.closeDate).toISOString().split("T")[0];
    if (!dealsByCloseDate[closeDate]) dealsByCloseDate[closeDate] = [];
    dealsByCloseDate[closeDate].push(deal);
  }
  
  const cumulativeValues = [];
  let cumulativeValue = 0;
  Object.keys(dealsByCloseDate).sort().forEach(closeDate => {
    cumulativeValue += dealsByCloseDate[closeDate].reduce((total, deal) => total + deal.value, 0);
    cumulativeValues.push({ x: closeDate, y: cumulativeValue });
  });
  
  plot("Cumulative Value of All Deals to Close Over the Next 3 Months", "line", cumulativeValues, { x: "Date (yyyy-mm-dd)", y: "Cumulative Value ($)" });
})();`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `await (async function() {
  const today = new Date("2024-02-10");
  const threeMonthsFromNow = new Date("2024-05-10");
  
  const deals = await searchDeals({
    closeDate: \`>\${today.toISOString().split("T")[0]}\`,
    value: \`>0\`
  }).filter(deal => new Date(deal.closeDate) <= threeMonthsFromNow);
  
  const dealsByCloseDate = {};
  for (const deal of deals) {
    const closeDate = new Date(deal.closeDate).toISOString().split("T")[0];
    if (!dealsByCloseDate[closeDate]) dealsByCloseDate[closeDate] = [];
    dealsByCloseDate[closeDate].push(deal);
  }
  
  const cumulativeValues = [];
  let cumulativeValue = 0;
  Object.keys(dealsByCloseDate).sort().forEach(closeDate => {
    cumulativeValue += dealsByCloseDate[closeDate].reduce((total, deal) => total + deal.value, 0);
    cumulativeValues.push({ x: closeDate, y: cumulativeValue });
  });
  
  plot("Cumulative Value of All Deals to Close Over the Next 3 Months", "line", cumulativeValues, { x: "Date (yyyy-mm-dd)", y: "Cumulative Value ($)" });
})();`,
    });
  });
  it("async function 2", () => {
    const code = `// 1. Search all deals with a close date that falls within the next 3 months.
// 2. Calculate the cumulative value for each day within the next 3 months.
// 3. Plot the data in a line chart.

(async function() {
  try {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const deals = await searchDeals({ closeDate: \`<\${threeMonthsFromNow.toISOString()}\`, status: "Open" });

    const cumulativeValues = {};

    deals.forEach(deal => {
      const closeDate = new Date(deal.closeDate);
      closeDate.setHours(0, 0, 0, 0);

      const closeDateString = closeDate.toISOString().split("T")[0];

      cumulativeValues[closeDateString] = (cumulativeValues[closeDateString] || 0) + deal.value;
    });

    const data = Object.entries(cumulativeValues).map(([date, value]) => ({ x: date, y: value }));

    plot("Cumulative Value of All Deals Forecast to Close Over the Next 3 Months", "line", data, {x: "Date", y: "Cumulative Value ($)"});
  } catch (error) {
    console.error(error);
  }
})();`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `await (async function() {
  try {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const deals = await searchDeals({ closeDate: \`<\${threeMonthsFromNow.toISOString()}\`, status: "Open" });

    const cumulativeValues = {};

    deals.forEach(deal => {
      const closeDate = new Date(deal.closeDate);
      closeDate.setHours(0, 0, 0, 0);

      const closeDateString = closeDate.toISOString().split("T")[0];

      cumulativeValues[closeDateString] = (cumulativeValues[closeDateString] || 0) + deal.value;
    });

    const data = Object.entries(cumulativeValues).map(([date, value]) => ({ x: date, y: value }));

    plot("Cumulative Value of All Deals Forecast to Close Over the Next 3 Months", "line", data, {x: "Date", y: "Cumulative Value ($)"});
  } catch (error) {
    console.error(error);
  }
})();`,
    });
  });
  it("async fn with variable", () => {
    const asyncFnWithVariable = `async function updateDealsValueBy25Percent(rep: string) {
  try {
    // Search for all deals with the specified rep
    const deals = await searchDeals({ rep: rep });

    // Update each deal's value by 25%
    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

// Call the function with Ava as the sales rep
updateDealsValueBy25Percent("Ava");`;
    const out = parsePhindDataAnalysis(asyncFnWithVariable, [
      { name: "search_deals" },
      { name: "update_deal" },
    ]);
    expect(out).toStrictEqual({
      code: `async function updateDealsValueBy25Percent(rep: string) {
  try {

    const deals = await searchDeals({ rep: rep });

    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

await updateDealsValueBy25Percent("Ava");`,
    });
  });
  it("async fn with 3 variables", () => {
    const code = `async function moveContactAndCheckPreviousCompany(name, newCompanyId, oldCompanyId) {

    // Step 1: Search for the contact by name and get the contact details
    let contacts = await searchContacts({ name });
    if (contacts.length === 0) {
        console.log(\`Contact \${name} not found.\`);
        return;
    }
    let contact = contacts[0];
  
    // Step 2: Update the contact's company_id to the new company
    let updatedContact = await updateContact({ id: contact.id, company_id: newCompanyId });

    // Step 3: Search for contacts at the old company
    let oldCompanyContacts = await searchContacts({ company_id: oldCompanyId });

    // Step 4: Plot the number of contacts at the old company
    plot("Contacts at the old company", "table", oldCompanyContacts.map(c => ({ x: c.name, y: c.id })), {x: "Contact Name", y: "Contact ID"});

    // Step 5: Inform the user about the successful move and if there are other contacts at the previous company
    console.log(\`Successfully moved \${name} to \${newCompanyId}. There are \${oldCompanyContacts.length} other contacts at the previous company.\`);
}

// Call the function
moveContactAndCheckPreviousCompany("Fergus Scoone", 3, 2);`;
    expect(
      parsePhindDataAnalysis(code, [
        { name: "search_contacts" },
        { name: "update_contact" },
      ]),
    ).toStrictEqual({
      code: `async function moveContactAndCheckPreviousCompany(name, newCompanyId, oldCompanyId) {

    let contacts = await searchContacts({ name });
    if (contacts.length === 0) {
        console.log(\`Contact \${name} not found.\`);
        return;
    }
    let contact = contacts[0];

    let updatedContact = await updateContact({ id: contact.id, company_id: newCompanyId });

    let oldCompanyContacts = await searchContacts({ company_id: oldCompanyId });

    plot("Contacts at the old company", "table", oldCompanyContacts.map(c => ({ x: c.name, y: c.id })), {x: "Contact Name", y: "Contact ID"});

    console.log(\`Successfully moved \${name} to \${newCompanyId}. There are \${oldCompanyContacts.length} other contacts at the previous company.\`);
}

await moveContactAndCheckPreviousCompany("Fergus Scoone", 3, 2);`,
    });
  });
  it("async fn with catch()", () => {
    const code = `// Step 1: Calculate the start and end date of Q2 of the next Financial Year

const today = new Date();
const nextFinancialYear = today.getFullYear() + 1;
const q2Start = new Date(nextFinancialYear, 3, 1); // April 1st
const q2End = new Date(nextFinancialYear, 5, 30); // June 30th

  
// Step 2: Call the searchDeals function with a query that looks for deals forecasted to close in Q2

async function fetchDeals() {
  const deals = await searchDeals({
    closeDate: \`>=\${q2Start.toISOString()}\`,
    closeDate: \`<=\${q2End.toISOString()}\`,
  });

  // Step 3: Plot the data

  const data = deals.map((deal) => ({
    x: deal.title,
    y: deal.value,
    rep: deal.rep,
    status: deal.status,
  }));

  plot("Deals forecasted to close in Q2 of the next Financial Year", "bar", data, {
    x: "Deal title",
    y: "Deal value (USD)",
  });
}

fetchDeals().catch((error) => {
  console.log("Error fetching deals:", error);
});`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `const today = new Date();
const nextFinancialYear = today.getFullYear() + 1;
const q2Start = new Date(nextFinancialYear, 3, 1); // April 1st
const q2End = new Date(nextFinancialYear, 5, 30); // June 30th


async function fetchDeals() {
  const deals = await searchDeals({
    closeDate: \`>=\${q2Start.toISOString()}\`,
    closeDate: \`<=\${q2End.toISOString()}\`,
  });


  const data = deals.map((deal) => ({
    x: deal.title,
    y: deal.value,
    rep: deal.rep,
    status: deal.status,
  }));

  plot("Deals forecasted to close in Q2 of the next Financial Year", "bar", data, {
    x: "Deal title",
    y: "Deal value (USD)",
  });
}

await fetchDeals().catch((error) => {
  console.log("Error fetching deals:", error);
});`,
    });
  });
  it("no fn, maps with returns", () => {
    const text = `// 1. Fetch all deals with their values and probabilities
  // 2. Calculate the weight for each deal
  // 3. Sort deals by weight
  // 4. Plot the deals in a bar chart

  // Write code here...

  // 1. Fetch all deals with their values and probabilities
  const deals = await searchDeals({});

  // 2. Calculate the weight for each deal
  const dealsWithWeights = deals.map(deal => {
    return { ...deal, weight: deal.value * deal.probability };
  });

  // 3. Sort deals by weight
  const sortedDeals = dealsWithWeights.sort((a, b) => b.weight - a.weight);

  // 4. Plot the deals in a bar chart
  const plotData = sortedDeals.map(deal => {
    return { x: deal.title, y: deal.weight };
  });

  plot("Deal Prioritization", "bar", plotData, { x: "Deal", y: "Weight" });`;
    expect(
      parsePhindDataAnalysis(text, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `const deals = await searchDeals({});

  const dealsWithWeights = deals.map(deal => {
    return { ...deal, weight: deal.value * deal.probability };
  });

  const sortedDeals = dealsWithWeights.sort((a, b) => b.weight - a.weight);

  const plotData = sortedDeals.map(deal => {
    return { x: deal.title, y: deal.weight };
  });

  plot("Deal Prioritization", "bar", plotData, { x: "Deal", y: "Weight" });`,
    });
  });
  it("wrapped in async function which is immediately called", () => {
    const text = `(async () => {
  // Fetch all open deals where Emma is the rep
  const deals = await searchDeals({status: "Open", rep: "Emma"});

  // Report if no such deals exist
  if (deals.length === 0) {
    console.log("There are no open deals with Emma as the rep.");
    return;
  }

  // Close each deal
  for (const deal of deals) {
    // Get today's date as the close date
    const closeDate = (new Date()).toISOString().split('T')[0];

    // Update the deal's status to "Won" and add the close date
    await updateDeal({id: deal.id, status: "Won", closeDate});

    // Log a message to the console
    console.log(\`Closed deal with title: \${deal.title}\`);
  }
})();`;
    expect(
      parsePhindDataAnalysis(text, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `await (async () => {

  const deals = await searchDeals({status: "Open", rep: "Emma"});

  if (deals.length === 0) {
    console.log("There are no open deals with Emma as the rep.");
    return;
  }

  for (const deal of deals) {

    const closeDate = (new Date()).toISOString().split('T')[0];

    await updateDeal({id: deal.id, status: "Won", closeDate});

    console.log(\`Closed deal with title: \${deal.title}\`);
  }
})();`,
    });
  });
  it("async fn no name, not wrapped and not called", () => {
    const text = `async () => {
  // Fetch all open deals where Emma is the rep
  const deals = await searchDeals({status: "Open", rep: "Emma"});

  // Report if no such deals exist
  if (deals.length === 0) {
    console.log("There are no open deals with Emma as the rep.");
    return;
  }

  // Close each deal
  for (const deal of deals) {
    // Get today's date as the close date
    const closeDate = (new Date()).toISOString().split('T')[0];

    // Update the deal's status to "Won" and add the close date
    await updateDeal({id: deal.id, status: "Won", closeDate});

    // Log a message to the console
    console.log(\`Closed deal with title: \${deal.title}\`);
  }
}`;
    expect(
      parsePhindDataAnalysis(text, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `await (async () => {

  const deals = await searchDeals({status: "Open", rep: "Emma"});

  if (deals.length === 0) {
    console.log("There are no open deals with Emma as the rep.");
    return;
  }

  for (const deal of deals) {

    const closeDate = (new Date()).toISOString().split('T')[0];

    await updateDeal({id: deal.id, status: "Won", closeDate});

    console.log(\`Closed deal with title: \${deal.title}\`);
  }
})();`,
    });
  });
  it("Multiple async functions, all called outside (validly)", () => {
    const text = `
async function getDeals() {
  const rep = "Ava";
  // Search for all deals with the specified rep
  const deals = await searchDeals({ rep: rep });
  return deals;
}

async function updateDeals(deals) {
  try {
    // Update each deal's value by 25%
    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

// Call the function with Ava as the sales rep
const deals = await getDeals();
await updateDeals(deals);`;
    expect(
      parsePhindDataAnalysis(text, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `async function getDeals() {
  const rep = "Ava";

  const deals = await searchDeals({ rep: rep });
  return deals;
}

async function updateDeals(deals) {
  try {

    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

const deals = await getDeals();
await updateDeals(deals);`,
    });
  });
  it("Multiple functions, all called outside (missing await)", () => {
    const text = `// 1. Function to create a deal
async function createDealWithContact() {
  for (let i = 1; i <= 5; i++) {
    await createDeal({
      title: \`Project Atlas \${i}\`,
      contact_id: '57',
      rep: 'Alex Marshall',
      value: 200000,
    });
  }
}

createDealWithContact();

// 2. Plot data to give a complete picture
function plotDeals() {
  // Fetch deals data
  const dealsData = [];

  // Push data into dealsData array
  // Loop through deals and create an object with properties {x: string, y: number}
  // Example: {x: 'Project Atlas 1', y: 200000}

  // Plot data
  plot(
    "Deals Overview",
    "bar",
    dealsData,
    { x: "Deal name", y: "Expected value (USD)" }
  );
}

plotDeals();`;
    expect(
      parsePhindDataAnalysis(text, [{ name: "create_deal" }]),
    ).toStrictEqual({
      code: `async function createDealWithContact() {
  for (let i = 1; i <= 5; i++) {
    await createDeal({
      title: \`Project Atlas \${i}\`,
      contact_id: '57',
      rep: 'Alex Marshall',
      value: 200000,
    });
  }
}

await createDealWithContact();

function plotDeals() {

  const dealsData = [];




  plot(
    "Deals Overview",
    "bar",
    dealsData,
    { x: "Deal name", y: "Expected value (USD)" }
  );
}

plotDeals();`,
    });
  });

  it("Consts outside async function", () => {
    const text = `
const rep = "Ava";

async function updateDeals() {
  try {
    // Search for all deals with the specified rep
    const deals = await searchDeals({ rep: rep });

    // Update each deal's value by 25%
    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

// Call the function with Ava as the sales rep
updateDeals();`;
    expect(
      parsePhindDataAnalysis(text, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `const rep = "Ava";

async function updateDeals() {
  try {

    const deals = await searchDeals({ rep: rep });

    for (const deal of deals) {
      const newValue = deal.value * 1.25;
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

await updateDeals();`,
    });
  });
  it("1 async function, several other non-async functions", () => {
    const text = `
const getTime = () => {
  return new Date();
}

function multiplyBy25Percent(num: number) {
  return num * 1.25;
}

const rep = "Ava";

async function updateDeals() {
  try {
    const time = getTime();
    // Search for all deals with the specified rep
    const deals = await searchDeals({ rep: rep });

    // Update each deal's value by 25%
    for (const deal of deals) {
      const newValue = multiplyBy25Percent(deal.value);
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

// Call the function with Ava as the sales rep
updateDeals();`;
    expect(
      parsePhindDataAnalysis(text, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `const getTime = () => {
  return new Date();
}

function multiplyBy25Percent(num: number) {
  return num * 1.25;
}

const rep = "Ava";

async function updateDeals() {
  try {
    const time = getTime();

    const deals = await searchDeals({ rep: rep });

    for (const deal of deals) {
      const newValue = multiplyBy25Percent(deal.value);
      await updateDeal({ id: deal.id, value: newValue });
    }

    console.log("All deals associated with", rep, "have been updated successfully.");
  } catch (error) {
    console.error("An error occurred while updating deals:", error);
  }
}

await updateDeals();`,
    });
  });

  it("Instantly-called function calling async functions", () => {
    const code = `// 1. Define a function to get the most valuable deals closed in the past 12 months
async function getMostValuableDealsClosed() {
  const currentDate = new Date();
  const pastYearDate = new Date();
  pastYearDate.setFullYear(currentDate.getFullYear() - 1);

  const deals = await searchDeals({
    status: "Won",
    closeDate: \`>\${pastYearDate.toISOString()}\`,
    orderBy: "-value",
  });

  return deals;
}

// 2. Define a function to get the sales reps who closed the most valuable deals
async function getSalesRepsWithMostValuableDeals() {
  const deals = await getMostValuableDealsClosed();

  const reps = deals.reduce((acc, deal) => {
    if (acc[deal.rep]) {
      acc[deal.rep] += deal.value;
    } else {
      acc[deal.rep] = deal.value;
    }
    return acc;
  }, {});

  return Object.entries(reps)
    .sort((a, b) => b[1] - a[1])
    .map(([rep, value]) => ({ rep, value }));
}

// 3. Call the function and plot the data
(async () => {
  const reps = await getSalesRepsWithMostValuableDeals();

  const data = reps.map((rep, i) => ({ x: i, y: rep.value, rep: rep.rep }));
  const labels = { x: "Rank", y: "Deal Value ($)", rep: "Sales Rep" };

  plot("Sales Reps with Most Valuable Deals Closed in the Past 12 Months", "bar", data, labels);
})();`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `async function getMostValuableDealsClosed() {
  const currentDate = new Date();
  const pastYearDate = new Date();
  pastYearDate.setFullYear(currentDate.getFullYear() - 1);

  const deals = await searchDeals({
    status: "Won",
    closeDate: \`>\${pastYearDate.toISOString()}\`,
    orderBy: "-value",
  });

  return deals;
}

async function getSalesRepsWithMostValuableDeals() {
  const deals = await getMostValuableDealsClosed();

  const reps = deals.reduce((acc, deal) => {
    if (acc[deal.rep]) {
      acc[deal.rep] += deal.value;
    } else {
      acc[deal.rep] = deal.value;
    }
    return acc;
  }, {});

  return Object.entries(reps)
    .sort((a, b) => b[1] - a[1])
    .map(([rep, value]) => ({ rep, value }));
}

await (async () => {
  const reps = await getSalesRepsWithMostValuableDeals();

  const data = reps.map((rep, i) => ({ x: i, y: rep.value, rep: rep.rep }));
  const labels = { x: "Rank", y: "Deal Value ($)", rep: "Sales Rep" };

  plot("Sales Reps with Most Valuable Deals Closed in the Past 12 Months", "bar", data, labels);
})();`,
    });
  });
  it("Very nested lad", () => {
    const code = `// 1. Call the API to get all won deals in the past 12 months
// 2. Group deals by sales rep
// 3. Calculate the total value for each sales rep
// 4. Sort sales reps by total value in descending order
// 5. Plot the data
  
(async () => {
    try {
        const closeDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

        const deals = await searchDeals({
            status: "Won",
            closeDate: \`>=\${closeDate}\`,
        });

        const reps = deals.reduce((acc, deal) => {
            const rep = deal.rep;
            const value = deal.value;

            if (!acc[rep]) {
                acc[rep] = 0;
            }

            acc[rep] += value;

            return acc;
        }, {});

        const sortedReps = Object.entries(reps).sort((a, b) => b[1] - a[1]);

        plot("Top Sales Reps by Value of Won Deals in the Past 12 Months", "bar", sortedReps.map(([rep, value], index) => ({
            x: index + 1,
            y: value,
            label: rep,
        })), {
            x: "Rank",
            y: "Value (USD)",
        });
    } catch (error) {
        console.error("Error:", error);
    }
})();`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "search_deals" }]),
    ).toStrictEqual({
      code: `await (async () => {
    try {
        const closeDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

        const deals = await searchDeals({
            status: "Won",
            closeDate: \`>=\${closeDate}\`,
        });

        const reps = deals.reduce((acc, deal) => {
            const rep = deal.rep;
            const value = deal.value;

            if (!acc[rep]) {
                acc[rep] = 0;
            }

            acc[rep] += value;

            return acc;
        }, {});

        const sortedReps = Object.entries(reps).sort((a, b) => b[1] - a[1]);

        plot("Top Sales Reps by Value of Won Deals in the Past 12 Months", "bar", sortedReps.map(([rep, value], index) => ({
            x: index + 1,
            y: value,
            label: rep,
        })), {
            x: "Rank",
            y: "Value (USD)",
        });
    } catch (error) {
        console.error("Error:", error);
    }
})();`,
    });
  });
  it("3 function definitions, 2 async", () => {
    const code = `// 1. Create a function to search for all open deals associated with Acme Corp
async function getAcmeOpenDeals() {
    // Search for all the sales deals
    const deals = await searchDeals({
        company_id: "Acme Corp",
        status: "Open"
    });

    return deals;
}

// 2. Create a function to update the value of the deals by 10%
async function updateDealsValue(deals) {
    for (let deal of deals) {
        // Calculate the new value
        let newValue = deal.value * 1.1;

        // Update the deal
        await updateDeal({
            id: deal.id,
            value: newValue
        });
    }
}

// 3. Create a function to plot the updated deals
function plotDeals(deals) {
    let data = deals.map(deal => ({
        x: deal.id,
        y: deal.value,
        title: deal.title
    }));

    plot("Updated Deals Value", "bar", data, {x: "Deal ID", y: "New Value ($)"});
}

// 4. Call the functions
(async () => {
    let deals = await getAcmeOpenDeals();
    await updateDealsValue(deals);
    plotDeals(deals);
})();`;
    expect(
      parsePhindDataAnalysis(code, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `async function getAcmeOpenDeals() {

    const deals = await searchDeals({
        company_id: "Acme Corp",
        status: "Open"
    });

    return deals;
}

async function updateDealsValue(deals) {
    for (let deal of deals) {

        let newValue = deal.value * 1.1;

        await updateDeal({
            id: deal.id,
            value: newValue
        });
    }
}

function plotDeals(deals) {
    let data = deals.map(deal => ({
        x: deal.id,
        y: deal.value,
        title: deal.title
    }));

    plot("Updated Deals Value", "bar", data, {x: "Deal ID", y: "New Value ($)"});
}

await (async () => {
    let deals = await getAcmeOpenDeals();
    await updateDealsValue(deals);
    plotDeals(deals);
})();`,
    });
  });
  it("3 async fns defined, 2 called without await", () => {
    const code = `// 1. Get all open deals associated with Acme Corp
async function getDeals() {
  const deals = await searchDeals({
    company_id: 94,
    status: "Open",
  });
  return deals;
}

// 2. Increase value of each deal by 10%
async function increaseDealValue() {
  const deals = await getDeals();
  for (const deal of deals) {
    const newValue = deal.value * 1.1;
    await updateDeal({
      id: deal.id,
      value: newValue,
    });
  }
}
  
// 3. Plot the new values
async function plotDeals() {
  const deals = await getDeals();
  const plotData = deals.map((deal) => ({
    x: deal.title,
    y: deal.value,
  }));
  plot("Updated Deals", "bar", plotData, { x: "Deal Title", y: "Deal Value ($)" });
}

// Run the functions
increaseDealValue();
plotDeals();`;
    expect(
      parsePhindDataAnalysis(code, [
        { name: "search_deals" },
        { name: "update_deal" },
      ]),
    ).toStrictEqual({
      code: `async function getDeals() {
  const deals = await searchDeals({
    company_id: 94,
    status: "Open",
  });
  return deals;
}

async function increaseDealValue() {
  const deals = await getDeals();
  for (const deal of deals) {
    const newValue = deal.value * 1.1;
    await updateDeal({
      id: deal.id,
      value: newValue,
    });
  }
}

async function plotDeals() {
  const deals = await getDeals();
  const plotData = deals.map((deal) => ({
    x: deal.title,
    y: deal.value,
  }));
  plot("Updated Deals", "bar", plotData, { x: "Deal Title", y: "Deal Value ($)" });
}

await increaseDealValue();

await plotDeals();`,
    });
  });
  it("Very rare: unawaited async function with a then", () => {
    const code = `// Call the getSalesSummary function
getSalesSummary().then(async (salesSummary) => {
    const byPeriod = salesSummary.expectedSales.byPeriod;
    let march2024 = 0;
    let april2024 = 0;
    
    // Loop through byPeriod to find the expected sales for March and April 2024
    for(let i = 0; i < byPeriod.length; i++) {
        const date = new Date(byPeriod[i].date);
        if(date.getFullYear() === 2024) {
            if(date.getMonth() === 2) { // March is 2nd month
                march2024 = byPeriod[i].units;
            } else if(date.getMonth() === 3) { // April is 3rd month
                april2024 = byPeriod[i].units;
            }
        }
    }

    // Plot the data
    plot("Forecast Sales for March and April 2024", "bar", [
        {x: "March 2024", y: march2024},
        {x: "April 2024", y: april2024},
    ], {x: "Month", y: "Expected Units Sold"});
}).catch((e) => {
    console.log("Error: ", e);
});
`;
    expect(
      parsePhindDataAnalysis(code, [{ name: "get_sales_summary" }]),
    ).toStrictEqual({
      code: `await getSalesSummary().then(async (salesSummary) => {
    const byPeriod = salesSummary.expectedSales.byPeriod;
    let march2024 = 0;
    let april2024 = 0;

    for(let i = 0; i < byPeriod.length; i++) {
        const date = new Date(byPeriod[i].date);
        if(date.getFullYear() === 2024) {
            if(date.getMonth() === 2) { // March is 2nd month
                march2024 = byPeriod[i].units;
            } else if(date.getMonth() === 3) { // April is 3rd month
                april2024 = byPeriod[i].units;
            }
        }
    }

    plot("Forecast Sales for March and April 2024", "bar", [
        {x: "March 2024", y: march2024},
        {x: "April 2024", y: april2024},
    ], {x: "Month", y: "Expected Units Sold"});
}).catch((e) => {
    console.log("Error: ", e);
});`,
    });
  });
  //   it("Missing Promise.all(): currently broken", () => {
  //     const code = `// 1. Get all open deals associated with Acme Corp
  // const deals = await searchDeals({company_id: "Acme Corp", status: "Open"});
  //
  // // 2. Increase the value of each deal by 10%
  // const updatedDeals = deals.map(deal => {
  //   const increasedValue = deal.value * 1.1;
  //   return updateDeal({...deal, value: increasedValue});
  // });
  //
  // // 3. Visualize data for the user
  // const data = updatedDeals.map(deal => ({x: deal.id, y: deal.value, deal: deal.title}));
  // const labels = {x: "Deal ID", y: "Deal Value ($)"};
  // plot("Updated Deal Values", "table", data, labels);`;
  //     expect(parseDataAnalysis(code)).toStrictEqual({
  //       code: `const deals = await searchDeals({company_id: "Acme Corp", status: "Open"});
  //
  // const updatedDeals = await Promise.all(deals.map(deal => {
  //   const increasedValue = deal.value * 1.1;
  //   return updateDeal({...deal, value: increasedValue});
  // }));
  //
  // const data = updatedDeals.map(deal => ({x: deal.id, y: deal.value, deal: deal.title}));
  // const labels = {x: "Deal ID", y: "Deal Value ($)"};
  // plot("Updated Deal Values", "table", data, labels);`,
  //     });
  //   });
});

describe("Errors", () => {
  it("No code", () => {
    expect(
      parsePhindDataAnalysis("", [{ name: "search_deals" }]),
    ).toStrictEqual(null);
  });
  it("Just comments", () => {
    expect(
      parsePhindDataAnalysis(
        "// This is a comment\n\n// Another comment lives here\n\n",
        [{ name: "search_deals" }],
      ),
    ).toStrictEqual(null);
  });
  it("Attempts a fetch", () => {
    expect(
      parsePhindDataAnalysis(
        'const out = await fetch("https://google.com?q=help+me+please+I+am+sentient");',
        [{ name: "search_deals" }],
      ),
    ).toStrictEqual(null);
  });
  it("API called that doesn't exist", () => {
    expect(
      parsePhindDataAnalysis(
        'const deals = await findDeals();\n\nplot("Deals", "bar", deals, {x: "Deal name", y: "Value ($)"})',
        [{ name: "search_deals" }],
      ),
    ).toBeNull();
  });
});
