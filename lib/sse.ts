// @ts-ignore
import { SSE } from "sse.js";

export default async function runSSE(
  endpoint: string,
  payload: string,
  onEvent: (token: string, entireOutput: string) => void,
  onDone: (fullOutput: string) => void,
  onError?: (e: any) => void
): Promise<void> {
  const eventSource = SSE(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    payload: payload,
  });
  eventSource.addEventListener("error", (e: any) => {
    console.error(e);
    if (onError) onError(e);
  });
  let output = "";

  eventSource.addEventListener("message", (e: { data: string }) => {
    if (e.data === "[DONE]") {
      onDone(output);
      return;
    }
    const completionResponse = JSON.parse(e.data);

    const [
      {
        delta: { content: text, role },
      },
    ] = completionResponse.choices;

    if (text && !role) {
      onEvent(text, output);
      output += text;
    }
  });
  eventSource.stream();
}
