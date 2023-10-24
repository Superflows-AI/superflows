import {
  removeMDLinksImgs,
  removeRepetition,
  splitOutCodeChunks,
} from "../../../lib/embed-docs/utils";

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

describe("splitOutCodeChunks", () => {
  it("No code chunks", () => {
    const out = splitOutCodeChunks("Hello\n\nWorld");
    expect(out).toEqual(["Hello\n\nWorld"]);
  });
  it("One code chunk", () => {
    const out = splitOutCodeChunks("Hello\n\n```\nconst a = 1;\n```");
    expect(out).toEqual(["Hello\n\n", "```\nconst a = 1;\n```"]);
  });
  it("One code chunk with language name", () => {
    const out = splitOutCodeChunks("Hello\n\n```js\nconst a = 1;\n```");
    expect(out).toEqual(["Hello\n\n", "```js\nconst a = 1;\n```"]);
  });
  it("One code chunk with prettified JSON", () => {
    const out = splitOutCodeChunks('Hello\n\n```\n{\n\t"key": "value"\n}\n```');
    expect(out).toEqual(["Hello\n\n", '```\n{"key":"value"}\n```']);
  });
  it("One code chunk with prettified JSON & language name", () => {
    const out = splitOutCodeChunks(
      'Hello\n\n```js\n{\n\t"key": "value"\n}\n```',
    );
    expect(out).toEqual(["Hello\n\n", '```js\n{"key":"value"}\n```']);
  });
  it("Trailing text", () => {
    const out = splitOutCodeChunks(
      "Hello\n\n```\nconst a = 1;\n```\nThis is some trailing text",
    );
    expect(out).toEqual([
      "Hello\n\n",
      "```\nconst a = 1;\n```",
      "This is some trailing text",
    ]);
  });
  it("Pure code chunk", () => {
    const out = splitOutCodeChunks("```\nlet a = 5;\n```");
    expect(out).toEqual(["```\nlet a = 5;\n```"]);
  });
  it("Normal text sandwich", () => {
    const out = splitOutCodeChunks(
      "\
```\n\
let a = 5;\n\
```\n\
Normal text here\n\
```\n\
let b = 10;\n\
```\n",
    );
    expect(out).toEqual([
      "```\nlet a = 5;\n```",
      "\nNormal text here\n",
      "```\nlet b = 10;\n```",
    ]);
  });
  it("String in code block contains `", () => {
    const out = splitOutCodeChunks(
      "\
```\n\
let a = `5`;\n\
```\n\
Normal text here\n\
```\n\
let b = 10;\n\
```\n",
    );
    expect(out).toEqual([
      "```\nlet a = `5`;\n```",
      "\nNormal text here\n",
      "```\nlet b = 10;\n```",
    ]);
  });
  it("One code chunk with prettified JSON & unformatted title", () => {
    const out = splitOutCodeChunks(
      'Hello\n\n```\nThis is a title\n{\n\t"key": "value"\n}\n```',
    );
    expect(out).toEqual([
      "Hello\n\n",
      '```\nThis is a title\n{"key":"value"}\n```',
    ]);
  });
  it("One code chunk with prettified JSON incl. comments & unformatted title", () => {
    const out = splitOutCodeChunks(
      `Hello

\`\`\`
This is a title
{
\t"key": "value"
\t// This is a comment
}
\`\`\``,
    );
    expect(out).toEqual([
      "Hello\n\n",
      '```\nThis is a title\n{"key":"value"/* This is a comment*/}\n```',
    ]);
  });
  it("JSON without outer brackets", () => {
    const out = splitOutCodeChunks(
      `\`\`\`
"release": {
\t"key": "value"
\t// This is a comment
}
\`\`\``,
    );
    expect(out).toEqual([
      '```\n"release": {"key":"value"/* This is a comment*/}\n```',
    ]);
  });
  it("JSON array without outer brackets", () => {
    const out = splitOutCodeChunks(
      `\`\`\`
{
\t"key": "value"
\t// This is a comment
},
{
\t"second_key": "second_value"
}
\`\`\``,
    );
    expect(out).toEqual([
      '```\n{"key":"value"/* This is a comment*/},{"second_key":"second_value"}\n```',
    ]);
  });
});

describe("removeMDLinksImgs", () => {
  it("No links to remove", () => {
    const out = removeMDLinksImgs("Hello world");
    expect(out).toEqual("Hello world");
  });
  it("No partial link to remove, but MarkDown link", () => {
    const out = removeMDLinksImgs("Hello [world](https://www.google.com)");
    expect(out).toEqual("Hello world");
  });
  it("Remove link split over multiple lines", () => {
    const out = removeMDLinksImgs("Hello [\nworld\n](/world)");
    expect(out).toEqual("Hello \nworld\n");
  });
  it("Remove image", () => {
    const out = removeMDLinksImgs("Hello \n![world\n](/world)");
    expect(out).toEqual("Hello \nworld\n");
  });
  it("Real example", () => {
    const out = removeMDLinksImgs(`[

Sage

](/resources/knowledge-base/feature-faqs)

[

KNOWLEDGE BASE

](/resources/knowledge-base)

[

WATCH A DEMO

](#)[

FEATURES

](/software/tools-and-features)`);
    expect(out).toEqual(
      "\n\nSage\n\n\n\n\n\nKNOWLEDGE BASE\n\n\n\n\n\nWATCH A DEMO\n\n\n\nFEATURES\n\n",
    );
  });
});
