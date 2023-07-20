interface DetectLanguageResponse {
  data: {
    detections: {
      language: string;
      isReliable: boolean;
      confidence: number;
    }[];
  };
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export async function getLanguage(text: string): Promise<string | null> {
  // TODO: This tool isn't open source. We should use one that is open source
  //  According to SO, the best is FB's @smodin/fast-text-language-detection, but requires 128MB
  //  & python. Tried langdetect, cld, franc & languagedetect and all got low accuracy on
  //  simple tests made up on the spot.
  const res = await fetch("https://ws.detectlanguage.com/0.2/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_DETECT_LANGUAGE_KEY}`,
    },
    body: JSON.stringify({
      q: text,
    }),
  });
  if (!res.ok) {
    console.error("Failed to detect language");
    return null;
  }
  const json: DetectLanguageResponse = await res.json();
  const bestGuess = json.data.detections[0];
  if (bestGuess.isReliable) {
    console.log(
      "Language from detectlanguage.com:" + JSON.stringify(json, undefined, 2)
    );
    // This converts from "en" to "English" etc
    return languageNames.of(bestGuess.language) ?? null;
  }
  return null;
}
