import { describe, expect, it } from "@jest/globals";
import { processMultipleMatches } from "../pages/api/api-mocker/[...slug]";
describe("processMultipleMatches", () => {
  const Action_Fixture = (path: string) => ({ path });

  it("should not match {id} when no id given", () => {
    const slug = ["api", "v1", "Customers", "location"];
    const actions = [
      Action_Fixture("/api/v1/Customers/location"),
      Action_Fixture("/api/v1/Customers/{id}"),
    ];

    const result = processMultipleMatches(actions, slug);
    expect(result[0].path).toEqual("/api/v1/Customers/location");
  });

  it("should match {id} when id given", () => {
    const slug = ["api", "v2", "Coordinators", "1234"];
    const actions = [
      Action_Fixture("/api/v2/Coordinators/{id}"),
      Action_Fixture("/api/v2/Coordinators/location"),
    ];

    const result = processMultipleMatches(actions, slug);
    console.log(result);
    expect(result[0].path).toEqual("/api/v2/Coordinators/{id}");
  });
});
