import { convertIsoToHumanReadable } from "../../../lib/v3/utils";

describe("convertIsoToHumanReadable", () => {
  it("basic", () => {
    expect(convertIsoToHumanReadable("2024-01-01")).toEqual("1st January 2024");
    expect(convertIsoToHumanReadable("2024-05-30")).toEqual("30th May 2024");
  });
});
