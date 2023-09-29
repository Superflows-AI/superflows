import { isUrl } from "../../lib/utils";

const validUrls = [
  "x.com",
  "www.google.com",
  "https://www.google.com",
  "http://www.google.com",
  "https://google.com",
  "https://google.com/search",
  "https://google.com/search?q=hello",
  "https://google.com/search?q=hello&user=me",
  "https://google.com/search/?q=hello&user=me",
  "https://google.com/search/#hello",
  "https://google.com/search/hello.html",
  "https://google.com/search/hello.html?user=me",
  "https://google.com/search/hello.html?user=me#hello",
];

const validUrlsWithIDX = [
  "x.com/ID1",
  "www.google.com/ID7",
  "https://www.google.com?id=ID22",
];

const invalidUrls = [
  "henry@gmail.com",
  "183bd6ff-e8fd-44a6-a3a8-eed9cb1082df",
  "This isn't a URL",
  "James Rowland",
  "alphanumericStringNoNumbers",
  "alphanumeric1With2Numbers",
];

describe("isURL", () => {
  it("should return true for valid URLs", () => {
    for (const url of validUrls) {
      expect(isUrl(url)).toBe(true);
    }
  });
  it("should return false for invalid URLs", () => {
    for (const url of invalidUrls) {
      expect(isUrl(url)).toBe(false);
    }
  });
  it("Not a URL if it has an IDX in it", () => {
    for (const url of validUrlsWithIDX) {
      expect(isUrl(url)).toBe(false);
    }
  });
});
