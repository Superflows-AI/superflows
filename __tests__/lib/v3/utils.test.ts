import { ISOMonthsToReadable } from "../../../lib/v3/utils";

describe("ISOMonthsToReadable", () => {
  it("basic", () => {
    expect(ISOMonthsToReadable(["2024-01", "2024-02"])).toEqual(
      "January and February 2024",
    );
    expect(
      ISOMonthsToReadable([
        "2024-01",
        "2024-02",
        "2024-03",
        "2024-04",
        "2024-05",
      ]),
    ).toEqual("January, February, March, April and May 2024");
    expect(ISOMonthsToReadable(["2025-01", "2024-12"])).toEqual(
      "December 2024 and January 2025",
    );
    expect(ISOMonthsToReadable(["2024-01", "2025-02", "2025-03"])).toEqual(
      "January 2024, February and March 2025",
    );
  });
});
