import { removeRepetition } from "../../lib/embed-docs/utils";

describe("removeRepetition", () => {
  it("do nothing", () => {
    const out = removeRepetition("Infrastructure");
    expect(out).toEqual("Infrastructure");
  });
  it("should remove repetition", () => {
    const out = removeRepetition("InfrastructureInfrastructure");
    expect(out).toEqual("Infrastructure");
  });
  it("should remove repetition with space", () => {
    const out = removeRepetition("Infrastructure Infrastructure");
    expect(out).toEqual("Infrastructure");
  });
  it("should remove repetition with space inside it", () => {
    const out = removeRepetition("Payment methods Payment methods");
    expect(out).toEqual("Payment methods");
  });
});
