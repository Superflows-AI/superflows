import { describe, expect, it } from "@jest/globals";
import { joinArraysNoDuplicates } from "../../lib/utils";

describe("Tests for joinArrayWithoutDuplication function", () => {
  it("Checks if function returns joined arrays without duplications", () => {
    const firstArray = [
      { id: 1, name: "John" },
      { id: 2, name: "Paul" },
    ];
    const secondArray = [
      { id: 3, name: "George" },
      { id: 4, name: "Ringo" },
    ];
    const expected = [
      { id: 1, name: "John" },
      { id: 2, name: "Paul" },
      { id: 3, name: "George" },
      { id: 4, name: "Ringo" },
    ];

    expect(joinArraysNoDuplicates(firstArray, secondArray, "id")).toEqual(
      expected,
    );
  });
  it("Checks if function returns joined arrays with duplications", () => {
    const firstArray = [
      { id: 1, name: "John" },
      { id: 2, name: "Paul" },
      { id: 3, name: "George" },
    ];
    const secondArray = [
      { id: 2, name: "Paul" },
      { id: 3, name: "George" },
      { id: 4, name: "Ringo" },
    ];
    const expected = [
      { id: 1, name: "John" },
      { id: 2, name: "Paul" },
      { id: 3, name: "George" },
      { id: 4, name: "Ringo" },
    ];

    expect(joinArraysNoDuplicates(firstArray, secondArray, "id")).toEqual(
      expected,
    );
  });
});
