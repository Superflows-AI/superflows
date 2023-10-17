import {
  isTextWithSubstance,
  splitTextByHeaders,
} from "../../../lib/embed-docs/embedDocs";

describe("markdownToObject", () => {
  it("Simple", () => {
    let markdownText = `
# Heading 1
This is some text below heading 1.
## Heading 2
This is some text below heading 2.
This is more text below heading 2.
## Heading 2.1
This is some text below heading 2.1.
# Heading 3
This is some text below heading 3.
`;
    const out = splitTextByHeaders(markdownText);
    expect(out).toEqual({
      "Heading 1": "This is some text below heading 1.",
      "Heading 2":
        "This is some text below heading 2.\nThis is more text below heading 2.",
      "Heading 2.1": "This is some text below heading 2.1.",
      "Heading 3": "This is some text below heading 3.",
    });
  });
  it("No text below top heading", () => {
    let markdownText = `
# Heading 1

## Heading 2
This is some text below heading 2.
This is more text below heading 2.
## Heading 2.1
This is some text below heading 2.1.
# Heading 3
This is some text below heading 3.
`;
    const out = splitTextByHeaders(markdownText);
    expect(out).toEqual({
      "Heading 1": "",
      "Heading 2":
        "This is some text below heading 2.\nThis is more text below heading 2.",
      "Heading 2.1": "This is some text below heading 2.1.",
      "Heading 3": "This is some text below heading 3.",
    });
  });
  it("Not starting with a heading", () => {
    let markdownText = `
This is some text at the top.
## Heading 2
This is some text below heading 2.
This is more text below heading 2.
## Heading 2.1
This is some text below heading 2.1.
# Heading 3
This is some text below heading 3.
`;
    const out = splitTextByHeaders(markdownText);
    expect(out).toEqual({
      "": "This is some text at the top.",
      "Heading 2":
        "This is some text below heading 2.\nThis is more text below heading 2.",
      "Heading 2.1": "This is some text below heading 2.1.",
      "Heading 3": "This is some text below heading 3.",
    });
  });
});

describe("isTextWithSubstance", () => {
  it("Simple", () => {
    expect(isTextWithSubstance("")).toEqual(false);
  });
  it("", () => {
    const text =
      "*   Invítanos con el correo [integrations@woffu.com](mailto:integrations@woffu.com) a tu cuenta de a3innuva Nómina para vincularla con tu cuenta de Woffu.";
    expect(isTextWithSubstance(text)).toEqual(true);
  });
});
