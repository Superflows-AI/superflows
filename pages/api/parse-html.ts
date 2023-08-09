import { NextApiRequest, NextApiResponse } from "next";
import * as cheerio from "cheerio";
import { z } from "zod";
import { isValidBody } from "../../lib/utils";

const ParseHtmlZod = z.object({ html: z.string() });
type ParseHtmlType = z.infer<typeof ParseHtmlZod>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({
      error: "Only POST requests allowed",
    });
    return;
  }
  if (!isValidBody<ParseHtmlType>(req.body, ParseHtmlZod)) {
    res.status(400).send({ message: "Invalid request body" });
    return;
  }
  const html = req.body.html;

  let body = cheerio
    .load(html, {
      xml: { xmlMode: true, recognizeCDATA: true, recognizeSelfClosing: true },
    })
    .root()
    .find("body");

  removeHiddenElements(body);

  const text = body
    .text()
    .replaceAll(/\t/g, "")
    .replaceAll(/\t\t\n/g, "")
    .replaceAll(/\n{2,}/g, "\n\n")
    .trim();

  res.status(200).send(text);
}

function removeHiddenElements(
  body: cheerio.Cheerio<cheerio.Element>
): cheerio.Cheerio<cheerio.Element> {
  // Absurd, but can't find a better way to remove hidden elements
  const hidden = [
    '*[style="display:none"]',
    '*[style="display: none"]',
    '*[style="display:none;"]',
    '*[style="display: none;"]',
    "*[style='display:none']",
    "*[style='display: none']",
    "*[style='display:none;']",
    "*[style='display: none;']",
    "script",
    "meta",
  ];
  hidden.forEach((selector) => {
    const found = body.find(selector);
    found.remove();
  });
  return body;
}
