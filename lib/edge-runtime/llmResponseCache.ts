import { SupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../database.types";
import { GPTMessageInclSummary } from "../models";
import { dataAnalysisActionName } from "../builtinActions";
import _ from "lodash";

export class LlmResponseCache {
  private matchConvId: number | null;
  private messages: GPTMessageInclSummary[];
  private analyticsMessages:
    | { instruction_message: string; output: string }[]
    | null;

  constructor() {
    this.matchConvId = null;
    this.messages = [];
    this.analyticsMessages = null;
  }

  async initialize(
    userMessage: string,
    orgId: number,
    conversationIndex: number,
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    const { data: matchingConvData, error: matchConvError } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .match({
        role: "user",
        org_id: orgId,
        content: userMessage,
        conversation_index: conversationIndex,
        fresh: true,
      })
      // Take the most recent matching conversation that isn't the current one
      .order("conversation_id", { ascending: false })
      // This will return the current convo & optionally the most recent matching 4 convos
      .limit(5);
    if (matchConvError) console.error(matchConvError.message);

    if (matchingConvData && matchingConvData?.length > 1) {
      // Get chat messages for all matching conversations
      const { data: matchingChatData, error: chatError } = await supabase
        .from("chat_messages")
        .select("role,content,name,summary,conversation_index,conversation_id")
        .eq("org_id", orgId)
        .in(
          "conversation_id",
          matchingConvData.slice(1).map((c) => c.conversation_id),
        )
        .order("conversation_id", { ascending: false });
      if (chatError) console.error(chatError.message);
      if (matchingChatData && matchingChatData.length > 1) {
        // Iterate through the matching conversations to find if there's a valid one
        for (const convId of matchingConvData
          .slice(1)
          .map((c) => c.conversation_id)) {
          const matchingChat = matchingChatData
            .filter((c) => c.conversation_id === convId)
            .sort((a, b) => a.conversation_index - b.conversation_index);

          // Skip if the conversation is too short or the last message is the same as the user message
          if (
            matchingChat.length > 1 &&
            !["", userMessage].includes(matchingChat[1].content)
          ) {
            // Sometimes due to errors, there are gaps in the conversation index, we cut
            //  the history to where these gaps are
            const cutIdx = matchingChat.findIndex(
              (m, idx) => m.conversation_index !== idx,
            );
            if (cutIdx !== -1) {
              matchingChat.splice(cutIdx);
            }
            console.log("Found matching conversation:", matchingChat);
            this.matchConvId = convId;
            this.messages = matchingChat as GPTMessageInclSummary[];
            return;
          }
        }
      }
    }
  }
  isHit(): boolean {
    return this.messages.length > 0;
  }

  _history_matches(chatHistory: GPTMessageInclSummary[]): boolean {
    // If cache conversation length less than current convo length or the same (no new messages), no match
    if (this.messages.length <= chatHistory.length) return false;

    return chatHistory.every((m, idx) => {
      const msg = this.messages[idx];
      if (m.role !== msg.role) return false;

      // Non-function messages dealt with here
      if (m.role !== "function") return m.content === msg.content;

      if (m.content === msg.content) return true;

      // Problem: long API responses are cut before being entered into the DB
      // Solution: if the output of data analysis matches, the API response was the same
      const isDataAnalysisAfter = chatHistory
        .slice(idx + 1)
        .find(
          (m2) => m2.role === "function" && m2.name === dataAnalysisActionName,
        );
      // @ts-ignore
      if (isDataAnalysisAfter && m.name === msg.name) {
        return true;
      }

      try {
        // Below is slow (hence only run if all else fails)
        return _.isEqual(JSON.parse(m.content), JSON.parse(msg.content));
      } catch (e) {
        return false;
      }
    });
  }

  checkChatCache(chatHistory: GPTMessageInclSummary[]): string {
    if (!this.isHit()) return "";
    let isMatch = this._history_matches(chatHistory);
    if (isMatch) {
      console.log("Chat output match found - returning cached message");
      const matchingMessage = this.messages[chatHistory.length];
      return matchingMessage?.content ?? "";
    }
    this.messages = [];
    return "";
  }

  async checkAnalyticsCache(
    instruction: string,
    orgId: number,
    chatHistory: GPTMessageInclSummary[],
    supabase: SupabaseClient<Database>,
  ): Promise<{ llmResponse: string; graphData?: object }> {
    if (!this.isHit()) return { llmResponse: "" };

    // Get the analytics output if all the messages (incl API outputs) match
    let isMatch = chatHistory.every(
      (m, idx) =>
        m.content === this.messages[idx].content &&
        m.role === this.messages[idx].role,
    );
    if (isMatch) console.log("Analytics output match found.");

    if (this.analyticsMessages === null) {
      const { data: matchingAnalytics, error: analyticsError } = await supabase
        .from("analytics_code_snippets")
        .select("instruction_message,output")
        .match({
          org_id: orgId,
          conversation_id: this.matchConvId,
          fresh: true,
        });
      if (analyticsError) console.error(analyticsError.message);

      if (matchingAnalytics?.length) console.log("Analytics match found");
      this.analyticsMessages = matchingAnalytics;
    }
    const matchingMessage = this.analyticsMessages!.find(
      (m) => m.instruction_message === instruction,
    );
    if (matchingMessage) {
      let graphData = undefined;
      try {
        graphData = JSON.parse(this.messages[chatHistory.length].content);
      } catch (e) {}
      return {
        llmResponse: matchingMessage.output,
        graphData: isMatch ? graphData : undefined,
      };
    }
    return { llmResponse: "" };
  }

  async checkBertieAnalyticsCache(
    instruction: string,
    chosen_actions: string[],
    orgId: number,
    supabase: SupabaseClient<Database>,
  ): Promise<string> {
    console.log("Checking Bertie analytics cache", instruction, chosen_actions);
    // Check if the instruction message and chosen_actions are the same
    const { data: matchingAnalytics, error: analyticsError } = await supabase
      .from("analytics_code_snippets")
      .select("output")
      .match({
        org_id: orgId,
        instruction_message: instruction,
        fresh: true,
        is_bertie: true,
      })
      .containedBy("chosen_actions", chosen_actions)
      .order("created_at", { ascending: false });
    if (analyticsError) console.error(analyticsError.message);

    if (matchingAnalytics?.length) {
      console.log("Analytics match found");
      return matchingAnalytics[0].output;
    }
    return "";
  }

  async checkFollowUpCache(
    orgId: number,
    chatHistory: GPTMessageInclSummary[],
    supabase: SupabaseClient<Database>,
  ): Promise<string> {
    if (!this.isHit()) return "";

    const isMatch = this._history_matches(chatHistory);
    if (!isMatch) return "";
    const { data: followUpData, error } = await supabase
      .from("follow_ups")
      .select("follow_up_text")
      .match({
        org_id: orgId,
        conversation_id: this.matchConvId,
        conversation_index: chatHistory.length - 1,
        fresh: true,
      });
    if (error) console.error(error.message);
    return followUpData?.[0]?.follow_up_text ?? "";
  }
}
