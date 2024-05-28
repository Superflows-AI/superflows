import { getIntroText } from "./chatBot";

export function hallucinateDocsSystemPrompt(
  userDescription: string | undefined,
  orgInfo: {
    name: string;
    description: string;
  },
  language?: string | null,
): { role: "system"; content: string } {
  const userDescriptionSection = userDescription
    ? `\nUser description: ${userDescription}\n`
    : "";
  return {
    role: "system",
    content: `${getIntroText(orgInfo)}
${userDescriptionSection}
You are tasked with generating fake${
      orgInfo.name ? " " + orgInfo.name : ""
    } documentation that answers the user's question. Follow the RULES.

For example, when asked: "How do I use gmail?"

You would write something like:
"""
Once you've signed onto Gmail, you are able to see your inbox and read emails from here. If you click the 'compose email' button, you are able to write and send an email to anyone.

You can configure more complex settings if you click the cog icon in the top right corner.
"""

RULES:
1. Limit your output to 75 words${
      language
        ? `
2. Write in ${language}`
        : ""
    }`,
  };
}
