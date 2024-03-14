import { parseOpusOrGPTDataAnalysis } from "../../../../lib/v2/prompts/dataAnalysis";

describe("Success", () => {
  it("Remove text afterwards", () => {
    expect(
      parseOpusOrGPTDataAnalysis(
        "Plan:\n1. Think\n2. step-by-step\n\n```\n// Write code here\nasync function main() {\n\treturn searchDeals();\n}\n\nmain();\n```\n\nText can go here",
        [{ name: "search_deals" }],
      ),
    ).toStrictEqual({
      code: "async function main() {\n\treturn searchDeals();\n}\n\nawait main();",
    });
  });
  it("Remove TS ! & ? from code", () => {
    const code = `Here is the plan to answer your request:

1. Call getCategoryProjections() to get data for category E 
2. Filter the results to only the period 2023-12
3. For each product with excess inventory in that period:
   a) Call listProducts() with the product SKU and includeInventory=true to get detailed data
   b) Calculate the value of the excess inventory by multiplying the excess units by the unit price
4. Sum the excess inventory value across all products
5. Plot the total value of excess category E inventory in December 2023

\`\`\`js
const categoryEData = await getCategoryProjections();
const dec2023Data = categoryEData.find(d => d.projections.some(p => p.date.startsWith('2023-12')))?.projections.find(p => p.date.startsWith('2023-12'));

if (!dec2023Data) {
  console.log("No data found for category E in December 2023");
} else {
  const excessInventory = dec2023Data.inventoryByHealth?.find(i => i.health === 'excess');

  if (!excessInventory) {
    console.log("No excess inventory found for category E in December 2023");  
  } else {
    const excessSkus = await Promise.all(
      excessInventory.numProducts.map(async () => {
        const products = await listProducts({
          inventoryHealth: 'excess', 
          includeInventory: true
        });
        return products.filter(p => 
          p.category === 'E' && 
          p.inventoryInfo?.some(i => i.date.startsWith('2023-12') && i.units > 0)
        );
      })  
    );

    const excessValue = excessSkus.flat().reduce((sum, p) => {
      const excessUnits = p.inventoryInfo!.find(i => i.date.startsWith('2023-12'))!.units;
      return sum + excessUnits * p.averagePrice;
    }, 0);

    plot(
      "Excess Inventory Value for Category E in December 2023",
      "table",
      [{x: "Category E", y: excessValue}],
      {x: "Category", y: "Excess Inventory Value (CLP)"}
    );
  }
}
\`\`\`

This fetches the category E projections, finds the data for December 2023, gets the detailed product data for any products with excess inventory in that period, calculates the total value of the excess inventory, and plots it in a table.

Let me know if you have any other questions!`;
    expect(
      parseOpusOrGPTDataAnalysis(code, [
        { name: "get_category_projections" },
        { name: "list_products" },
      ]),
    ).toStrictEqual({
      code: `const categoryEData = await getCategoryProjections();
const dec2023Data = categoryEData.find(d => d.projections.some(p => p.date.startsWith('2023-12'))).projections.find(p => p.date.startsWith('2023-12'));

if (!dec2023Data) {
  console.log("No data found for category E in December 2023");
} else {
  const excessInventory = dec2023Data.inventoryByHealth.find(i => i.health === 'excess');

  if (!excessInventory) {
    console.log("No excess inventory found for category E in December 2023");  
  } else {
    const excessSkus = await Promise.all(
      excessInventory.numProducts.map(async () => {
        const products = await listProducts({
          inventoryHealth: 'excess', 
          includeInventory: true
        });
        return products.filter(p => 
          p.category === 'E' && 
          p.inventoryInfo.some(i => i.date.startsWith('2023-12') && i.units > 0)
        );
      })  
    );

    const excessValue = excessSkus.flat().reduce((sum, p) => {
      const excessUnits = p.inventoryInfo.find(i => i.date.startsWith('2023-12')).units;
      return sum + excessUnits * p.averagePrice;
    }, 0);

    plot(
      "Excess Inventory Value for Category E in December 2023",
      "table",
      [{x: "Category E", y: excessValue}],
      {x: "Category", y: "Excess Inventory Value (CLP)"}
    );
  }
}`,
    });
  });
  it("Not too gung-ho with removing ! & ? from code", () => {
    const code = `
const l = a ? 1 : 2;
const m = a! + 1;
const n = a?.b !== 7;
!complex?.deeply?.nested?.property;
!!complex[0]?.deeply?.nested?.property;
complex(deeply!)?.nested?.property;
`;
    expect(
      parseOpusOrGPTDataAnalysis(code, [
        { name: "get_category_projections" },
        { name: "list_products" },
      ]),
    ).toStrictEqual({
      code: `const l = a ? 1 : 2;
const m = a + 1;
const n = a.b !== 7;
!complex.deeply.nested.property;
!!complex[0].deeply.nested.property;
complex(deeply).nested.property;`,
    });
  });
});

describe("Errors", () => {
  it("Empty", () => {
    expect(
      parseOpusOrGPTDataAnalysis(
        "Plan:\n1. Think\n2. step-by-step\n\n```// Write code here\n```",
        [],
      ),
    ).toBeNull();
  });
  it("No code block", () => {
    expect(
      parseOpusOrGPTDataAnalysis("Plan:\n1. Think\n2. step-by-step\n", []),
    ).toBeNull();
  });
});
