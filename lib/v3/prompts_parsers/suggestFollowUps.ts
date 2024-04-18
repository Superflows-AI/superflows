export {};
// import { ChatGPTMessage, GPTMessageInclSummary } from "../../models";
// import { parseOutput } from "@superflows/chat-ui-react";
//
// // TODO: Figure out how to solve issues where it'll generate suggestions that
// //  1. Include specifics from the demo account
// //  2. Is written in the setup language, rather than the user's language
//
// export function getFollowUpSuggestionPrompt(
//   userDescription: string | undefined,
//   orgInfo: {
//     name: string;
//     description: string;
//   },
//   prevMessages: ChatGPTMessage[],
// ): ChatGPTMessage[] {
//   const userDescriptionSection = userDescription
//     ? `\nThe following describes the user: ${userDescription}\n`
//     : "";
//   prevMessages = filterConversationForFollowUps(prevMessages).slice(-8);
//   return [
//     {
//       role: "system",
//       content: `You are talking to an expert in ${orgInfo.name}${
//         orgInfo.description ? ". " + orgInfo.description : ""
//       }Your task is to write 3 distinct follow-up messages to continue the conversation. These will usually be questions, except if you are asked a question by the USER, then give suggested responses to that.
// ${userDescriptionSection}
//
// <example>
// If you previously asked an expert in Gmail "How can I add a signature to my emails by default?", you might suggest the following follow-up messages:
// <suggestions>
// How can I include images in my signature?
// Can I include signatures on new emails but not replies?
// How do I set up an auto-reply?
// </suggestions>
// </example>
//
// <rules>
// 1. DO NOT just write 1 reply to the USER. Generate 3 suggestions.
// 2. DO NOT repeat questions that have already asked by the ASSISTANT.
// 3. DO NOT
// 4. Keep the suggestions extremely short and concise. THIS IS VERY IMPORTANT
// </rules>`,
//     },
//     ...prevMessages,
//     { role: "assistant", content: "<suggestions>\n" },
//   ];
// }
//
// export function filterConversationForFollowUps(
//   conversation: GPTMessageInclSummary[],
// ): ChatGPTMessage[] {
//   // JSON string and unstring to deepcopy
//   return (JSON.parse(JSON.stringify(conversation)) as GPTMessageInclSummary[])
//     .filter((m, idx) => {
//       return (
//         // Ensure user message isn't a confirmation
//         (m.role === "user" && m.content !== "") ||
//         // Assistant that are the last in a sequence of assistant & function messages
//         (conversation[idx + 1]?.role === "user" &&
//           // Following user message isn't a confirmation
//           conversation[idx + 1]?.content !== "") ||
//         // Most recent assistant message
//         idx === conversation.length - 1
//       );
//     })
//     .map((m) => {
//       if (m.role === "assistant") {
//         const parsedOutput = parseOutput(m.content);
//         if (parsedOutput.tellUser) {
//           return { ...m, content: parsedOutput.tellUser, role: "user" };
//         }
//       }
//       // Flip roles
//       return { ...m, role: m.role === "assistant" ? "user" : "assistant" };
//     });
// }
