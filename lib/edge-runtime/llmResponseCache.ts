import { SupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../database.types";
import { GPTMessageInclSummary } from "../models";
import { dataAnalysisActionName } from "../builtinActions";

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
    supabase: SupabaseClient<Database>,
  ): Promise<void> {
    const { data: matchingConvData, error: matchConvError } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .match({
        role: "user",
        org_id: orgId,
        content: userMessage,
        fresh: true,
      })
      // Take the most recent matching conversation that isn't the current one
      .order("conversation_id", { ascending: false })
      // This will return the current convo & optionally the most recent matching convo
      .limit(2);
    if (matchConvError) console.error(matchConvError.message);

    if (matchingConvData && matchingConvData?.length > 1) {
      const matchingConv = matchingConvData[1];
      const { data: matchingChatData, error: chatError } = await supabase
        .from("chat_messages")
        .select("role,content,name,summary")
        .match({
          org_id: orgId,
          conversation_id: matchingConv.conversation_id,
        })
        .order("conversation_index", { ascending: true });
      if (chatError) console.error(chatError.message);

      if (matchingChatData && matchingChatData.length > 1) {
        console.log(
          "Found matching conversation with id:",
          matchingConv.conversation_id,
        );
        this.matchConvId = matchingConv.conversation_id;
        this.messages = matchingChatData as GPTMessageInclSummary[];
      }
    }
  }
  isHit(): boolean {
    return this.messages.length > 0;
  }

  _history_matches(chatHistory: GPTMessageInclSummary[]): boolean {
    // If cache conversation length less than current convo length, no match
    if (this.messages.length < chatHistory.length) return false;
    return chatHistory.every((m, idx) => {
      const isDataAnalysisAfter = chatHistory
        .slice(idx + 1)
        .find(
          (m2) => m2.role === "function" && m2.name === dataAnalysisActionName,
        );
      const msg = this.messages[idx];
      return (
        m.role === msg.role &&
        (m.content === msg.content ||
          (m.role === "function" &&
            msg.role === "function" && // For TS
            isDataAnalysisAfter &&
            m.name === msg.name))
      );
    });
  }

  checkChatCache(chatHistory: GPTMessageInclSummary[]): string {
    if (!this.isHit()) return "";
    let isMatch = this._history_matches(chatHistory);
    if (isMatch) {
      const matchingMessage = this.messages[chatHistory.length];
      return matchingMessage.content;
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
    let isMatch = chatHistory.every((m, idx) => {
      return (
        m.content === this.messages[idx].content &&
        m.role === this.messages[idx].role
      );
    });
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
      return {
        llmResponse: matchingMessage.output,
        graphData: isMatch
          ? JSON.parse(this.messages[chatHistory.length].content)
          : undefined,
      };
    }
    return { llmResponse: "" };
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
