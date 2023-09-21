import { removeHiddenElements } from "../../pages/api/parse-html";
import * as cheerio from "cheerio";

describe("removeHiddenElements", () => {
  const allversions = [
    'style="display:none"',
    'style="display: none"',
    'style="display:none;"',
    'style="display: none;"',
    "style='display:none'",
    "style='display: none'",
    "style='display:none;'",
    "style='display: none;'",
  ];
  it("should remove hidden elements", () => {
    allversions.forEach((style) => {
      const cheerioInput = cheerio
        .load(
          `<body><div ${style}></div><div>Something that's visible</div></body>`,
        )
        .root()
        .find("body");
      const out = removeHiddenElements(cheerioInput);
      expect(out.html()).toEqual("<div>Something that's visible</div>");
    });
  });
});
