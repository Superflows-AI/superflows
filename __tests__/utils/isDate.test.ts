import { isDate } from "../../lib/utils";

describe("isDate", () => {
  it("date ISO with Z format", () => {
    expect(isDate("2023-04-13T21:21:00Z")).toBeTruthy();
  });
  it("date ISO with Z format and milliseconds", () => {
    expect(isDate("2023-04-13T21:21:00.475Z")).toBeTruthy();
  });
  it("date ISO with milliseconds", () => {
    expect(isDate("2023-04-13T21:21:00.475")).toBeTruthy();
  });
});
