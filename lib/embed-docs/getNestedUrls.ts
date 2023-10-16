import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { isUrlRelative, makeUrlAbsolute } from "../utils";
import { PlaywrightWebBaseLoader } from "langchain/document_loaders/web/playwright";
import { Browser, Page } from "playwright";
import { Link } from "./utils";

export async function getNestedUrls(
  url_docs: string,
  recursive_depth: number = 1,
  current_depth: number = 1,
  base_url: string = "",
): Promise<Link[]> {
  /**
    Get all links from a web page up to a specified recursion depth.

    url_docs: the URL of the web page
    recursive_depth: the maximum recursion depth
    current_depth: the current recursion depth
    **/
  // TODO: Deal with # links to specific elements on a page

  // Check if we have reached the maximum recursion depth
  if (current_depth > recursive_depth && recursive_depth !== 0) return [];
  else if (recursive_depth == 0) return [{ name: "", href: url_docs }];
  const links: Link[] = [];
  base_url = base_url || url_docs;
  try {
    console.log("Getting links from " + url_docs);

    const loader = new CheerioWebBaseLoader(url_docs);
    const page = await loader.scrape();
    page("a").each((index, element) => {
      const link = page(element);
      if (link.attr("href")) {
        links.push({
          name: link.text(),
          href: makeUrlAbsolute(url_docs, link.attr("href")!),
        });
      } else {
      }
    });
  } catch (e) {
    console.log(e);
  }

  // Try using Playwright if Cheerio doesn't come up with the goods
  if (links.length < 5) {
    console.log("Trying playwright");
    const loader = new PlaywrightWebBaseLoader(url_docs, {
      launchOptions: {
        headless: true,
      },
      gotoOptions: { waitUntil: "domcontentloaded" },
      async evaluate(page: Page, browser: Browser) {
        await page.waitForLoadState("domcontentloaded");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return await page.evaluate(() => {
          const out = [];
          const links = document.getElementsByTagName("a");
          for (const link of links) {
            out.push({
              name: link.text,
              href: link.href,
            });
          }
          return JSON.stringify(out);
        });
      },
    });
    const docs = await loader.load();
    docs.forEach((doc) => {
      const contents = JSON.parse(doc.pageContent);
      contents.forEach((link: Link) => {
        if (link.href) {
          links.push({
            name: link.name,
            href: link.href,
          });
        }
      });
    });
  }

  // Conversion to Set removes duplicates
  const uniqueLinks = [...new Set(links.map((item: any) => item.href))]
    // Filter out links that are not relative or to subpages of the original site
    .filter((ref) => isUrlRelative(ref) || ref.startsWith(base_url))
    // Cut out links to the original site
    .filter((ref) => ref !== url_docs)
    // Below is a hack to remove links that are not links
    .filter((link) => !link.href.includes("javascript:void(0)"))
    // Convert to Link objects
    .map((href: string) => links.find((item) => item.href === href)!);

  let outputLinks = [...uniqueLinks];

  // Iterate over all the links in the web page
  const childLinks = await Promise.all(
    uniqueLinks.map(async (link: Link) => {
      // Create an absolute URL by joining the base URL and the href attribute
      const ref_link = makeUrlAbsolute(url_docs, link.href);
      // Recursively collect links if maximum depth is not yet reached
      if (current_depth < recursive_depth) {
        return await getNestedUrls(
          ref_link,
          recursive_depth,
          current_depth + 1,
          url_docs,
        );
      }
      return [];
    }),
  );
  for (const links of childLinks) {
    outputLinks = outputLinks.concat(links);
  }

  // Conversion to Set removes duplicates
  return (
    [...new Set(outputLinks.map((item: any) => item.href))]
      // Filter out links that are not relative or to subpages of the original site
      .filter((ref) => isUrlRelative(ref) || ref.startsWith(base_url))
      // Cut out links to the original site
      .filter((ref) => ref !== url_docs)
      // Below is a hack to remove links that are not links
      .filter((link) => !link.href.includes("javascript:void(0)"))
      // Convert to Link objects
      .map((href: string) => outputLinks.find((item) => item.href === href)!)
  );
}
