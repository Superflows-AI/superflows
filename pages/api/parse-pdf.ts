import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { pdfToText } from "../../lib/pdfReader";
import { isValidBody } from "../../lib/edge-runtime/utils";

const ParsePdfZod = z.object({
  url: z.string(),
  requestOptions: z.any(),
});
type ParsePdfType = z.infer<typeof ParsePdfZod>;

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
  if (!isValidBody<ParsePdfType>(req.body, ParsePdfZod)) {
    res.status(400).send({ message: "Invalid request body" });
    return;
  }

  const { url, requestOptions } = req.body;

  // It's getting WET in here
  // TODO: Don't handle redirects manually
  // Why handle 3XX's manually? Because Companies House likes 302 redirects,
  //  but it throws an error if you have the headers from the first request set
  //  (specifically the Authorization header)
  let response = await fetch(url, { ...requestOptions, redirect: "manual" });
  if (response.status >= 300 && response.status < 400) {
    // Try requesting from here without auth headers
    const headers = requestOptions.headers;
    if (headers) {
      if ("Authorization" in headers) delete headers["Authorization"];
      if ("authorization" in headers) delete headers["authorization"];
    }
    requestOptions.headers = headers;
    // @ts-ignore
    response = await fetch(response.headers.get("location"), requestOptions);
  }

  const pdfArr = await response.arrayBuffer();
  const text = await pdfToText(pdfArr);

  res.status(200).send(text);
}
