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

export type OrgJoinIsPaid = Organization & { is_paid: IsPaid[] };

export type OrgJoinIsPaidFinetunedModels = OrgJoinIsPaid & {
  finetuned_models: FinetunedModels[];
};

export type HeadersInsert =
  Database["public"]["Tables"]["fixed_headers"]["Insert"];

export interface BertieGraphData {
  title: string | number;
  type: "line" | "bar" | "table";
  data: {
    x: number | string;
    y: number;
    [key: string]: any; // The wildcard is to add extra information shown in the table and when hovering the data point
  }[];
  labels: { x: string; y: string };
}

export type ExecuteCode2Item =
  | {
      type: "log" | "error";
      args: { message: string };
    }
  | {
      type: "plot";
      args: BertieGraphData;
    }
  | {
      type: "call";
      args: { name: string; params: Record<string, unknown> };
    };
