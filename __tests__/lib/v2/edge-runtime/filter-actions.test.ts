import { combineSelectedFunctions } from "../../../../lib/v2/edge-runtime/filterActions";

describe("combineSelectedFunctions", () => {
  it("Picks the thoughts from the most selected functions", () => {
    expect(
      combineSelectedFunctions(
        [
          { selectedFunctions: ["a", "b"], thoughts: "" },
          { selectedFunctions: ["b", "c"], thoughts: "" },
          {
            selectedFunctions: ["a", "b", "c"],
            thoughts: "This is the one to select",
          },
        ],
        // @ts-ignore
        [{ name: "a" }, { name: "b" }, { name: "c" }],
      ),
    ).toStrictEqual({
      thoughts: ["This is the one to select", "", ""],
      actions: [{ name: "a" }, { name: "b" }, { name: "c" }],
    });
  });
});
