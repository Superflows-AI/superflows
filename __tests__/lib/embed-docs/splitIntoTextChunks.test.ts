import {
  joinShortChunks,
  splitIntoTextChunks,
  splitMarkdownIntoSentences,
} from "../../../lib/embed-docs/embedDocs";

describe("splitIntoTextChunks", () => {
  it("should split into newline chunks", () => {
    const out = splitIntoTextChunks(
      "One substantial sentence upon a line which surely must not be kept as a single chunk is here - come on!\n\nAnd another thing here",
      [],
    );
    expect(out).toEqual([
      "One substantial sentence upon a line which surely must not be kept as a single chunk is here - come on!\n",
      "And another thing here\n",
    ]);
  });
  it("should ignore very short lines", () => {
    const out = splitIntoTextChunks("Something is here\n\nA", []);
    expect(out).toEqual(["Something is here\n"]);
  });
  it("should ignore ignoreLines", () => {
    const out = splitIntoTextChunks("Something is here\n\nIgnore me please!", [
      "Ignore me please!",
    ]);
    expect(out).toEqual(["Something is here\n"]);
  });
  it("should keep bullet point list in one chunk", () => {
    const out = splitIntoTextChunks(
      "Reasons:\n- Short\n- Bullet\n-Points\n- Like this\n-Shouldn't be\n- split up",
      [],
    );
    expect(out).toEqual([
      "Reasons:\n- Short\n- Bullet\n-Points\n- Like this\n-Shouldn't be\n- split up\n",
    ]);
  });
  it("complex, containing markdown", () => {
    const out = splitIntoTextChunks(
      `Lorem ipsum dolor sit amet, consectetur adipiscing elit. ![Alt text](/images/image.png) Nullam vitae. Still sentence. Sentence after image? Hello! [This is an URL](http://example.com).

This is another section which should be in another chunk. I'm extremely sure it should be in another chunk!`,
      [],
    );
    expect(out).toEqual([
      `Lorem ipsum dolor sit amet, consectetur adipiscing elit. ![Alt text](/images/image.png) Nullam vitae. Still sentence. Sentence after image? Hello! [This is an URL](http://example.com).\n`,
      "This is another section which should be in another chunk. I'm extremely sure it should be in another chunk!\n",
    ]);
  });
});

describe("splitMarkdownIntoSentences", () => {
  it("should split into sentences", () => {
    let markdown =
      "Hello this is a test. ![Alt text](/images/image.png) And this is another sentence. [This is a url](http://mywebsite.com). Let's test it!";
    const out = splitMarkdownIntoSentences(markdown);
    expect(out).toEqual([
      `Hello this is a test. `,
      `![Alt text](/images/image.png) And this is another sentence. `,
      `[This is a url](http://mywebsite.com). `,
      `Let's test it!`,
    ]);
  });
  it("should split into sentences #2", () => {
    let markdown = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. ![Alt text](/images/image.png) Nullam vitae. Still sentence. Sentence after image? Hello! [This is an URL](http://example.com).`;
    const out = splitMarkdownIntoSentences(markdown);
    expect(out).toEqual([
      `Lorem ipsum dolor sit amet, consectetur adipiscing elit. `,
      `![Alt text](/images/image.png) Nullam vitae. `,
      `Still sentence. `,
      `Sentence after image? `,
      `Hello! `,
      `[This is an URL](http://example.com).`,
    ]);
  });
});

describe("joinShortStrings", () => {
  it("should join short strings", () => {
    const out = joinShortChunks(
      [`Hello `, `world `, `this `, `is `, `a `, `test.`],
      20,
    );
    expect(out).toEqual([`Hello world this is a test.`]);
  });
  it("check longer strings end up in short chunks", () => {
    const out = joinShortChunks(
      [
        `Hello world this is a message to you. `,
        `Hello world this is a message to you. `,
        `Hello world this is a message to you.\n`,
      ],
      20,
    );
    expect(out).toEqual([
      `Hello world this is a message to you. Hello world this is a message to you. `,
      "Hello world this is a message to you.\n",
    ]);
  });
});
