import { Database } from "./database.types";

export type Action = Database["public"]["Tables"]["actions"]["Row"];

export type ActionGroup = Database["public"]["Tables"]["action_groups"]["Row"];

export type ActionGroupJoinActions = ActionGroup & { actions: Action[] };

export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export type ConversationsJoinMessages =
  Database["public"]["Tables"]["conversations"]["Row"] & {
    chat_messages: ChatMessage[];
  };

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
