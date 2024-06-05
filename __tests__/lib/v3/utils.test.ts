import {
  convertIsoToHumanReadable,
  fillVariables,
} from "../../../lib/v3/utils";

describe("convertIsoToHumanReadable", () => {
  it("basic", () => {
    expect(convertIsoToHumanReadable("2024-01-01")).toEqual("1st January 2024");
    expect(convertIsoToHumanReadable("2024-05-30")).toEqual("30th May 2024");
  });
});

describe("fillVariables", () => {
  const noVariableObjs = [
    {
      text: "This is some text without variables",
      embedded_text: "This is some text without variables",
      variable_values: {},
      primary_question: true,
    },
  ];
  it("no variables", () => {
    expect(fillVariables(noVariableObjs, {}, {})).toEqual(noVariableObjs);
  });
  const variableObj = [
    {
      text: "This is some text with a variable: {variable1}",
      embedded_text: "This is some text with a variable: {variable1}",
      variable_values: {},
      primary_question: true,
    },
  ];
  it("text with 1 variable", () => {
    expect(fillVariables(variableObj, { variable1: "value1" }, {})).toEqual([
      {
        text: "This is some text with a variable: {variable1}",
        embedded_text: "This is some text with a variable: value1",
        variable_values: { variable1: "value1" },
        primary_question: true,
      },
    ]);
  });
  it("text with 1 variable: embed all", () => {
    expect(
      fillVariables(variableObj, {}, { variable1: ["value1", "value2"] }),
    ).toEqual([
      {
        text: "This is some text with a variable: {variable1}",
        embedded_text: "This is some text with a variable: value1",
        variable_values: { variable1: "value1" },
        primary_question: true,
      },
      {
        text: "This is some text with a variable: {variable1}",
        embedded_text: "This is some text with a variable: value2",
        variable_values: { variable1: "value2" },
        primary_question: true,
      },
    ]);
  });
});
