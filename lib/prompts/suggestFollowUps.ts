import { ChatGPTMessage, GPTMessageInclSummary } from "../models";
import { parseOutput } from "@superflows/chat-ui-react";

export function getFollowUpSuggestionPrompt(
  userDescription: string | undefined,
  orgInfo: {
    name: string;
    description: string;
  },
  language: string | null,
  prevMessages: ChatGPTMessage[],
): { role: "system"; content: string }[] {
  const userDescriptionSection = userDescription
    ? `\nThe following describes the user: ${userDescription}\n`
    : "";
  prevMessages = filterConversationForFollowUps(prevMessages).slice(-8);
  return [
    {
      role: "system",
      content: `You are talking to an expert in ${orgInfo.name}${
        orgInfo.description ? ". " + orgInfo.description : ""
      }

Your task is to write 3 distinct follow-up messages to continue the conversation. These will usually be questions, except if you are asked a question by the USER, then give suggested responses to that.
${userDescriptionSection}
DO NOT just write 1 reply to the USER. Generate 3 suggestions. THIS IS VERY IMPORTANT. DO NOT FORGET THIS.

DO NOT repeat questions that have already asked by the ASSISTANT.

Keep the suggestions extremely short and concise. THIS IS VERY IMPORTANT. You cannot fathom how disappointed I will be if you give long suggestions

Present the 3 suggestions in a hyphenated list like the examples.

Example 1: if you previously asked an expert in Gmail "How can I add a signature to my emails by default?", you might suggest the following follow-up messages:
"""
- How can I include images in my signature? 
- Can I include signatures on new emails but not replies?
- How do I set up an auto-reply?
"""

Example 2: if you previously asked an expert in a FinTech product to delete Henry's account and they replied with "Sure, I can do that for you. Is it henrypalmer@acme.com or henrylove@acme.com you'd like to delete?", you might suggest the following follow-up messages:
"""
- Henry Palmer please!
- I meant henrylove@acme.com
- Please delete both
"""

Write in ${language ?? "the same language the user writes in"}

The conversation you have to write 3 follow-up messages for is below:
${prevMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}`,
    },
  ];
}

export function filterConversationForFollowUps(
  conversation: GPTMessageInclSummary[],
): ChatGPTMessage[] {
  // JSON string and unstring to deepcopy
  return (JSON.parse(JSON.stringify(conversation)) as GPTMessageInclSummary[])
    .filter((m, idx) => {
      return (
        // Ensure user message isn't a confirmation
        (m.role === "user" && m.content !== "") ||
        // Assistant that are the last in a sequence of assistant & function messages
        (conversation[idx + 1]?.role === "user" &&
          // Following user message isn't a confirmation
          conversation[idx + 1]?.content !== "") ||
        // Most recent assistant message
        idx === conversation.length - 1
      );
    })
    .map((m) => {
      if (m.role === "assistant") {
        const parsedOutput = parseOutput(m.content);
        if (parsedOutput.tellUser) {
          console.log("Replacing", m.content, "with", parsedOutput.tellUser);
          return { ...m, content: parsedOutput.tellUser, role: "user" };
        }
      }
      // Flip roles
      return { ...m, role: m.role === "assistant" ? "user" : "assistant" };
    });
}
