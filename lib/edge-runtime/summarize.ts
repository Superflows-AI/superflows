import { Organization } from "../types";
import {
  getSummarizeTextPrompt,
  summariseEmailGPTParams,
} from "../prompts/summarizeText";
import { getLLMResponse, getSecondaryModel } from "../queryLLM";
import { chunkString } from "../utils";

export default async function summarizeText(
  text: string,
  organization: Organization
): Promise<string> {
  // Split into chunks of 2000 tokens with an overlap of 50
  const chunks = chunkString(text, 2000, 50);

  // Call OpenAI in parallel
  const summaries = await Promise.all(
    chunks.map(async (chunk) => {
      const prompt = getSummarizeTextPrompt(chunk, organization);
      return getLLMResponse(
        prompt,
        summariseEmailGPTParams,
        getSecondaryModel(organization.model)
      );
    })
  );
  return summaries.join("\n");
}
