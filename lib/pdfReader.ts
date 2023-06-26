import { getDocument } from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";

export async function pdfToText(data: ArrayBuffer | Buffer): Promise<string> {
  const loadingTask = getDocument(data);
  const pdf = await loadingTask.promise;

  const total = pdf.numPages;
  let layers: { [key: string]: string } = {};
  console.log("Starting to process PDF");
  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const n = page.pageNumber;
    const textContent = await page.getTextContent();
    if (null != textContent.items) {
      let page_text = "";
      let last_block = null;
      for (let k = 0; k < textContent.items.length; k++) {
        const block = textContent.items[k] as TextItem;
        if (last_block !== null && !last_block.str.endsWith(" ")) {
          // if (block.hasEOL || last_block.transform[4] < block.transform[4]) {
          if (block.hasEOL) {
            page_text += "\r\n";
          } else if (
            // Assumes rtl language!
            last_block.transform[5] != block.transform[5] &&
            last_block.str.match(/^(\s?[a-zA-Z])$|^(.+\s[a-zA-Z])$/) === null
          ) {
            page_text += " ";
          }
        } else if (block.hasEOL) {
          page_text += "\n";
        }

        page_text += block.str;
        last_block = block;
      }

      layers[n.toString()] = page_text + "\n\n";
    }
    console.log(`Page ${i}/${total} of PDF has been processed`);
  }
  let full_text = "";
  const num_pages = Object.keys(layers).length;
  for (let j = 1; j <= num_pages; j++) full_text += layers[j.toString()];
  return full_text;
}
