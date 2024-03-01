import { parseRoutingOutput } from "../../../../lib/v2/prompts/routing";

describe("parseRoutingOutput", () => {
  it("should return null if the output does not match the expected format", () => {
    expect(parseRoutingOutput("", true)).toBeNull();
  });
  it("should return the thoughts and choice if the output matches the expected format", () => {
    expect(
      parseRoutingOutput(
        "Thoughts:\n1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice\n\nChoice: DIRECT\n",
        true,
      ),
    ).toEqual({
      thoughts:
        "1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice",
      choice: "DIRECT",
    });
  });
  it("not finished streaming", () => {
    expect(
      parseRoutingOutput(
        "Thoughts:\n1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice\n\nChoice: DIREC",
        true,
      ),
    ).toBeNull();
  });
  it("not valid answer, but we move", () => {
    expect(
      parseRoutingOutput(
        "Thoughts:\n1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice\n\nChoice: this ",
        true,
      ),
    ).toEqual({
      thoughts:
        "1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice",
      choice: "this",
    });
  });
  it("streaming ended", () => {
    expect(
      parseRoutingOutput(
        "Thoughts:\n1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice\n\nChoice: CODE",
        false,
      ),
    ).toEqual({
      thoughts:
        "1. Think step-by-step how to answer the user's request\n2. break down the user's request into steps\n3. specifically name EVERY SINGLE function and variable you will use\n4. consider if the user's request requires searching by name - use DIRECT if so\n5. compare the user's request with CRITERIA\n6. state your choice",
      choice: "CODE",
    });
  });
});
