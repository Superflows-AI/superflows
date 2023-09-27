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
      console.log(url);
      expect(isUrl(url)).toBe(true);
    }
  });
  it("should return false for invalid URLs", () => {
    for (const url of invalidUrls) {
      // console.log(url);
      expect(isUrl(url)).toBe(false);
    }
  });
});
