import { describe, it, expect } from "@jest/globals";
import {
  combineChunks,
  deduplicateChunks,
  getParam,
  hideMostRecentFunctionOutputs,
  MessageInclSummaryToGPT,
  parseErrorHtml,
  replaceVariables,
} from "../../../lib/edge-runtime/utils";
import { dataAnalysisActionName } from "../../../lib/builtinActions";

describe("MessageInclSummaryToGPT", () => {
  it("user", () => {
    expect(
      MessageInclSummaryToGPT({
        role: "user",
        content: "hello",
      }),
    ).toEqual({
      role: "user",
      content: "hello",
    });
  });
  it("function, no summary", () => {
    expect(
      MessageInclSummaryToGPT({
        role: "function",
        name: "test",
        content: "hello",
      }),
    ).toEqual({
      role: "function",
      name: "test",
      content: "hello",
    });
  });
  it("function, summary", () => {
    expect(
      MessageInclSummaryToGPT({
        role: "function",
        name: "test",
        content:
          "very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string",
        summary: "long string",
      }),
    ).toEqual({
      role: "function",
      name: "test",
      content: "long string",
    });
  });
});

describe("getParam", () => {
  it("simple", () => {
    expect(getParam({ a: "b" }, "a")).toEqual("b");
  });
  it("simple miss", () => {
    expect(getParam({ a: "b" }, "b")).toEqual(undefined);
  });
  it("hyphen in key, not in parameters", () => {
    expect(getParam({ a_b: "b" }, "a-b")).toEqual("b");
  });
});

describe("deduplicateChunks", () => {
  it("no match", () => {
    const chunks = [
      {
        id: 12,
        page_url: "tta",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks, 9);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "tta",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ]);
  });
  it("duplicate - append to end", () => {
    const chunks = [
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks, 9);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
  });
  it("duplicate - append to start", () => {
    const chunks = [
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks, 9);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
  });
  it("multiple duplicates - keep appending", () => {
    const chunks = [
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 14,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 4", "Chunk 5", "Chunk 6"],
        chunk_idx: 4,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks, 9);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: [
          "Chunk 1",
          "Chunk 2",
          "Chunk 3",
          "Chunk 4",
          "Chunk 5",
          "Chunk 6",
        ],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
  });
  it("multiple duplicates - doesn't add new doc_chunk", () => {
    const chunks = [
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
      {
        id: 14,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 5", "Chunk 6", "Chunk 7"],
        chunk_idx: 5,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks, 9);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: [
          "Chunk 1",
          "Chunk 2",
          "Chunk 3",
          "Chunk 4",
          "Chunk 5",
          "Chunk 6",
          "Chunk 7",
        ],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
  });
  it("duplicates out of order - doesn't add new doc_chunk", () => {
    const chunks = [
      {
        id: 14,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 5", "Chunk 6", "Chunk 7"],
        chunk_idx: 5,
        similarity: 1,
      },
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 1", "Chunk 2", "Chunk 3"],
        chunk_idx: 1,
        similarity: 1,
      },
      {
        id: 13,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: ["Chunk 2", "Chunk 3", "Chunk 4"],
        chunk_idx: 2,
        similarity: 1,
      },
    ];

    const res = deduplicateChunks(chunks, 9);

    expect(res).toEqual([
      {
        id: 12,
        page_url: "a",
        page_title: "b",
        section_title: "c",
        text_chunks: [
          "Chunk 1",
          "Chunk 2",
          "Chunk 3",
          "Chunk 4",
          "Chunk 5",
          "Chunk 6",
          "Chunk 7",
        ],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
  });
});

describe("parseErrorHtml", () => {
  it("realWorld", () => {
    const errorHtml = `<!DOCTYPE html><html><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width"/><title>404: This page could not be found</title><meta name="next-head-count" content="3"/><link rel="preload" href="/_next/static/css/ae4278f2ef1a3f90.css" as="style"/><link rel="stylesheet" href="/_next/static/css/ae4278f2ef1a3f90.css" data-n-g=""/><noscript data-n-css=""></noscript><script defer="" nomodule="" src="/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js"></script><script src="/_next/static/chunks/webpack-59c5c889f52620d6.js" defer=""></script><script src="/_next/static/chunks/framework-2c79e2a64abdb08b.js" defer=""></script><script src="/_next/static/chunks/main-17a9a24315ee9390.js" defer=""></script><script src="/_next/static/chunks/pages/_app-3f1b9715371533a5.js" defer=""></script><script src="/_next/static/chunks/pages/_error-54de1933a164a1ff.js" defer=""></script><script src="/_next/static/RSjjQ_4iyFYTJAXbH2s-F/_buildManifest.js" defer=""></script><script src="/_next/static/RSjjQ_4iyFYTJAXbH2s-F/_ssgManifest.js" defer=""></script></head><body><div id="__next"><div style="font-family:system-ui,&quot;Segoe UI&quot;,Roboto,Helvetica,Arial,sans-serif,&quot;Apple Color Emoji&quot;,&quot;Segoe UI Emoji&quot;;height:100vh;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center"><div><style>body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}</style><h1 class="next-error-h1" style="display:inline-block;margin:0 20px 0 0;padding-right:23px;font-size:24px;font-weight:500;vertical-align:top;line-height:49px">404</h1><div style="display:inline-block;text-align:left"><h2 style="font-size:14px;font-weight:400;line-height:49px;margin:0">This page could not be found<!-- -->.</h2></div></div></div></div><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"statusCode":404}},"page":"/_error","query":{},"buildId":"RSjjQ_4iyFYTJAXbH2s-F","nextExport":true,"isFallback":false,"gip":true,"scriptLoader":[]}</script></body></html>`;
    const res = parseErrorHtml(errorHtml);
    expect(res).toEqual(`404: This page could not be found
404
This page could not be found<!-- -->.`);
  });
  it("multiple h1 and h2", () => {
    const errorHtml = `<!DOCTYPE html><html>
    <title>
    A title
    </title>
    
    <h1>
    A h1
    </h1>
    
    <h1>
    A second h1
    </h1>

    <h2>
    A h2
    </h2>

    <h2>
    A second h2
    </h2>

    </html>`;
    const res = parseErrorHtml(errorHtml);
    expect(res).toEqual(`A title
A h1 A second h1
A h2 A second h2`);
  });
  it("not html", () => {
    const str =
      "I've seen things you people wouldn't believe, attack ships on fire off the shoulder of orion";
    const res = parseErrorHtml(str);
    expect(res).toEqual(str);
  });

  it("not html but has some chevrons", () => {
    const str = "h1 France < england && southampton > portsmouth /h1";
    const res = parseErrorHtml(str);
    expect(res).toEqual(str);
  });
});

describe("combineChunks", () => {
  it("Doesn't error trailing null value in text_chunks", () => {
    const out = combineChunks([
      {
        page_url: "a",
        page_title: "b",
        section_title: "c",
        // @ts-ignore
        text_chunks: ["Chunk 1\n", "Chunk 2", null],
        chunk_idx: 1,
        similarity: 1,
      },
    ]);
    expect(out.text).toEqual("Page: b\nSection: c\n\nChunk 1\nChunk 2");
  });
});

describe("replaceVariables", () => {
  it("No replacement", () => {
    const out = replaceVariables("This is a test", {});
    expect(out).toEqual("This is a test");
  });
  it("1 simple replacement", () => {
    const out = replaceVariables("This is a test of {a}", { a: "b" });
    expect(out).toEqual("This is a test of b");
  });
  it("Including unused replacement", () => {
    const out = replaceVariables("This is a test of {a}", {
      a: "b",
      b: "turnips",
    });
    expect(out).toEqual("This is a test of b");
  });
});

describe("hideMostRecentFunctionOutputs", () => {
  it("No function outputs", () => {
    const out = hideMostRecentFunctionOutputs([
      { role: "user", content: "This is a test" },
    ]);
    expect(out).toStrictEqual([{ role: "user", content: "This is a test" }]);
  });
  it("Function output summaries added at the end", () => {
    const out = hideMostRecentFunctionOutputs([
      { role: "user", content: "This is a test" },
      { role: "function", name: "function", content: "This is a test" },
      { role: "function", name: "function", content: "This is a test" },
    ]);
    expect(out).toStrictEqual([
      { role: "user", content: "This is a test" },
      {
        role: "function",
        name: "function",
        content: "This is a test",
        summary: `Data output used by ${dataAnalysisActionName}`,
      },
      {
        role: "function",
        name: "function",
        content: "This is a test",
        summary: `Data output used by ${dataAnalysisActionName}`,
      },
    ]);
  });
  it("Function output summaries added at the end, but not earlier", () => {
    const out = hideMostRecentFunctionOutputs([
      { role: "user", content: "This is a test" },
      { role: "function", name: "function", content: "This is a test" },
      { role: "assistant", content: "This is a test" },
      { role: "function", name: "function", content: "This is a test" },
      { role: "function", name: "function", content: "This is a test" },
    ]);
    expect(out).toStrictEqual([
      { role: "user", content: "This is a test" },
      { role: "function", name: "function", content: "This is a test" },
      { role: "assistant", content: "This is a test" },
      {
        role: "function",
        name: "function",
        content: "This is a test",
        summary: `Data output used by ${dataAnalysisActionName}`,
      },
      {
        role: "function",
        name: "function",
        content: "This is a test",
        summary: `Data output used by ${dataAnalysisActionName}`,
      },
    ]);
  });
});
