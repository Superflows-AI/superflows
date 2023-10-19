import { getIntroText } from "./chatBot";

export function hallucinateDocsSystemPrompt(
  userDescription: string | undefined,
  orgInfo: {
    name: string;
    description: string;
  },
): { role: "system"; content: string } {
  const userDescriptionSection = userDescription
    ? `\nThe following is a description of the user - it's important that you take notice of this. ${userDescription}\n`
    : "";
  return {
    role: "system",
    content: `${getIntroText(orgInfo)}
${userDescriptionSection}
You are tasked with generating fake${
      orgInfo.name ? " " + orgInfo.name : ""
    } documentation that answers the user's question.

For example, when asked: "How do I use gmail?"

You would output something like:

Once you've signed onto Gmail, you are able to see your inbox and read emails from here. If you click the 'compose email' button, you are able to write and send an email to anyone.

You can configure more complex settings if you click the cog icon in the top right corner.

---

Keep this very short and concise. THIS IS VERY IMPORTANT`,
  };
}
