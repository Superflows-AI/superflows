import { Database } from "./database.types";

export type Action = Database["public"]["Tables"]["actions"]["Row"];

export type ActionTag = Database["public"]["Tables"]["action_tags"]["Row"];

export type ActionTagJoinActions = ActionTag & { actions: Action[] };

export type DBChatMessage =
  Database["public"]["Tables"]["chat_messages"]["Row"];

export type ConversationsJoinMessages =
  Database["public"]["Tables"]["conversations"]["Row"] & {
    chat_messages: DBChatMessage[];
  };

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type IsPaid = Database["public"]["Tables"]["is_paid"]["Row"];

export type OrgJoinIsPaid = Organization & { is_paid: IsPaid[] };
