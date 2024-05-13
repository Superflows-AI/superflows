import { Database } from "./database.types";

export type Action = Database["public"]["Tables"]["actions"]["Row"];

export type ActionPlusApiInfo = Action & {
  api: Api;
  headers: HeaderRow[];
};

export type HeaderRow = Database["public"]["Tables"]["fixed_headers"]["Row"];

export type ActionTag = Database["public"]["Tables"]["action_tags"]["Row"];

export type Api = Database["public"]["Tables"]["apis"]["Row"];

export type ActionTagJoin = ActionTag & { actions: Action[] };

export type ActionTagJoinApiAndHeaders = ActionTagJoin & {
  apis: (Api & { fixed_headers: HeaderRow[] }) | null;
};

export type DBChatMessage =
  Database["public"]["Tables"]["chat_messages"]["Row"];

export type DocChunkInsert =
  Database["public"]["Tables"]["doc_chunks"]["Insert"];

export type DocChunk = Database["public"]["Tables"]["doc_chunks"]["Row"];

export type SimilaritySearchResult = { similarity: number } & Omit<
  DocChunk,
  "embedding" | "created_at" | "org_id"
>;

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type IsPaid = Database["public"]["Tables"]["is_paid"]["Row"];

type FinetunedModels = Database["public"]["Tables"]["finetuned_models"]["Row"];

export type OrgJoinIsPaid = Organization & {
  is_paid: Pick<IsPaid, "is_premium">[];
};

export type OrgJoinIsPaidFinetunedModels = Omit<
  OrgJoinIsPaid,
  "created_at" | "join_link_id"
> & {
  finetuned_models: Pick<FinetunedModels, "openai_name">[];
};
export type OrgJoinIsPaidFinetunedModelsFrontend = OrgJoinIsPaid & {
  finetuned_models: FinetunedModels[];
};

export type HeadersInsert =
  Database["public"]["Tables"]["fixed_headers"]["Insert"];

export type ApprovalQuestion =
  Database["public"]["Tables"]["approval_questions"]["Row"];

export type ApprovalAnswer =
  Database["public"]["Tables"]["approval_answers"]["Row"];

export type ApprovalAnswerMessage =
  Database["public"]["Tables"]["approval_answer_messages"]["Row"];

export type ApprovalVariable =
  Database["public"]["Tables"]["approval_variables"]["Row"];

export type ApprovalAnswerData = Pick<
  ApprovalAnswer,
  "approved" | "generation_failed" | "is_generating"
> & {
  approval_questions: Pick<ApprovalQuestion, "text" | "primary_question">[];
  approval_answer_messages: ApprovalAnswerMessage[];
};

export interface BertieGraphData {
  title: string | number;
  type: "line" | "bar" | "table";
  data:
    | {
        x?: any; // Should be a number | string;
        y?: any; // Should be a number;
        [key: string]: any; // The wildcard is to add extra information shown in the table and when hovering the data point
      }[]
    | (string | number)[][]; // Sometimes it makes the mistake of putting in Object.entries()-esque data
  labels?: { x: string; y: string };
}

export type ExecuteCode2Item =
  | {
      type: "log" | "error" | "call-human-format";
      args: { message: string };
    }
  | {
      type: "plot";
      args: any;
    }
  | {
      type: "call";
      args: { name: string; params: Record<string, unknown> };
    };
