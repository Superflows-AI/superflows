import { parseMatchingOutput } from "../../../../lib/v3/prompts_parsers/matching";

describe("parseMatchingOutput", () => {
  it("Basic", () => {
    const out = parseMatchingOutput(`<functionCall>listProducts(`, []);
    expect(out).toEqual({
      functionName: "listProducts",
      variables: {},
      tellUser: "",
    });
  });
  it("Using variable", () => {
    const out = parseMatchingOutput(
      `<functionCall>listProductsByCategory({categoryList: allCategories}`,
      [
        {
          id: "1",
          name: "categoryList",
          type: "string",
          typeName: "string",
          default: '["A", "B", "C"]',
          consts: [
            'const allCategories: CategoryList = ["A","B","C","D","E"];',
          ],
          description: "List of categories",
          org_id: 1,
        },
      ],
    );
    expect(out).toEqual({
      functionName: "listProductsByCategory",
      variables: {
        categoryList: ["A", "B", "C", "D", "E"],
      },
      tellUser: "",
    });
  });
  it("Real world", () => {
    const text = `<thinking>
1. The user is requesting to list all products across categories A, B, C, D, and E.
2. This is a single request.
3. The function listProductsByCategory can achieve this by passing in all categories.
4. The parameter categoryList should be set to the allCategories constant, which contains all category names.
</thinking>

<functionCall>listProductsByCategory({categoryList: allCategories}`;
    const variables = [
      {
        id: "1",
        name: "categoryList",
        type: "string",
        typeName: "string",
        default: '["A", "B", "C"]',
        consts: ['const allCategories: CategoryList = ["A","B","C","D","E"];'],
        description: "List of categories",
        org_id: 1,
      },
    ];
    const out = parseMatchingOutput(text, variables);
    expect(out).toEqual({
      functionName: "listProductsByCategory",
      variables: {
        categoryList: ["A", "B", "C", "D", "E"],
      },
      tellUser: "",
    });
  });
  it("Real world, no type in const defn", () => {
    const text = `<thinking>
1. The user is requesting to list all products across categories A, B, C, D, and E.
2. This is a single request.
3. The function listProductsByCategory can achieve this by passing in all categories.
4. The parameter categoryList should be set to the allCategories constant, which contains all category names.
</thinking>

<functionCall>listProductsByCategory({categoryList: allCategories}`;
    const variables = [
      {
        id: "1",
        name: "categoryList",
        type: "string",
        typeName: "string",
        default: '["A", "B", "C"]',
        consts: ['const allCategories = ["A","B","C","D","E"];'],
        description: "List of categories",
        org_id: 1,
      },
    ];
    const out = parseMatchingOutput(text, variables);
    expect(out).toEqual({
      functionName: "listProductsByCategory",
      variables: {
        categoryList: ["A", "B", "C", "D", "E"],
      },
      tellUser: "",
    });
  });
  it("Real world, tell user", () => {
    const textOut = `<thinking>
1. The user is requesting a poem about EazyStock
2. The user has only made one request
3. None of the provided functions can generate a poem about EazyStock. The functions are for analyzing inventory data and generating charts/tables, not for creative writing tasks.
</thinking>

<functionCall>None</functionCall>

<tellUser>I apologize, but I am not able to write a poem about EazyStock. My capabilities are focused on analyzing inventory data and generating visualizations to provide insights. Creative writing tasks like poetry are outside of my current skill set. Please let me know if there are any inventory-related questions I can assist with though!`;
    const out = parseMatchingOutput(textOut, []);
    expect(out).toEqual({
      functionName: "",
      variables: null,
      tellUser:
        "I apologize, but I am not able to write a poem about EazyStock. My capabilities are focused on analyzing inventory data and generating visualizations to provide insights. Creative writing tasks like poetry are outside of my current skill set. Please let me know if there are any inventory-related questions I can assist with though!",
    });
  });
  it("Real world, function using today", () => {
    const textOut = `Reasoning:
1. The user is requesting information on why the system predicts that SKU 382 will have no sales.
2. The user has only made one request.
3. The function summarizeProductsWithoutSalesBetweenDates could provide relevant information on products with no projected sales in a given date range. It plots their expected sales and summarizes key stats.
4. To use this function, I need to specify a fromDate and toDate. I can use the today constant for fromDate and set toDate to 1 month later to get a forward-looking view.
5. No other functions directly answer why a specific SKU has no projected sales. summarizeProductsWithoutSalesBetweenDates is the most relevant.
</thinking>

<functionCall>
summarizeProductsWithoutSalesBetweenDates({
  fromDate: today,
  toDate: "2024-06-29"
}`;
    const todaysDate = new Date().toISOString().split("T")[0];
    const out = parseMatchingOutput(textOut, [
      {
        consts: [`const today: ISODate = "${todaysDate}";`],
        default: "",
        description: "From date",
        embed_all: false,
        id: "",
        name: "fromDate",
        org_id: 1,
        type: "string",
        typeName: "ISODate",
      },
    ]);
    expect(out).toEqual({
      functionName: "summarizeProductsWithoutSalesBetweenDates",
      variables: { fromDate: todaysDate, toDate: "2024-06-29" },
      tellUser: "",
    });
  });
});
