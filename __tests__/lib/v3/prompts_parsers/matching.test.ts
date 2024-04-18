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
});
