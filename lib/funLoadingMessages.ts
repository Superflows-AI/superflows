import { StreamingStepInput } from "@superflows/chat-ui-react/dist/src/lib/types";

const funLoadingMessages = [
  "Forming figures fairly fast",
  "Chiseling out charts",
  "Assembling amazing analytics",
  "Concocting clever calculations",
  "Mustering magnificent metrics",
  "Summoning scintillating stats",
  "Brewing bar graphs",
  "Unleashing data hounds",
  "Brewing you a fresh cup of insights",
  "Fishing for fancy figures",
  "Fetching fantastic facts",
  "Diving deep into the data",
];

export async function sendFunLoadingMessages<PromiseResponse>(
  promise: Promise<PromiseResponse>,
  streamInfo: (message: StreamingStepInput) => void,
): Promise<PromiseResponse> {
  /** Sends fun loading messages while waiting for the promise to resolve */
  let continueMessages = true;
  const output: PromiseResponse | "FAILED" = await Promise.race([
    promise,
    (async (): Promise<"FAILED"> => {
      const startTime = Date.now();
      // Until 120s have passed, or the promise has resolved
      while (continueMessages && Date.now() - startTime < 120000) {
        streamInfo({
          role: "loading",
          content:
            funLoadingMessages[
              Math.floor(Math.random() * funLoadingMessages.length)
            ],
        });
        await new Promise((resolve) =>
          // 3 seconds +- 1 seconds of random delay
          setTimeout(resolve, 3000 + (Math.random() - 0.5) * 2000),
        );
      }
      return "FAILED";
    })(),
  ]);
  if (output === "FAILED") {
    throw new Error("sendFunLoadingMessages promise hung for 2 mins");
  }
  continueMessages = false;
  return output;
}
