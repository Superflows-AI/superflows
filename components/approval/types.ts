import {
  ApprovalAnswer,
  ApprovalAnswerMessage,
  ApprovalQuestion,
} from "../../lib/types";

export type UIAnswerType = Omit<
  ApprovalAnswer,
  "created_at" | "description" | "fnName" | "org_id" | "is_docs"
> & {
  approval_questions: Pick<ApprovalQuestion, "text" | "primary_question">[];
};

export type UIMessageData = Pick<
  ApprovalAnswerMessage,
  "id" | "raw_text" | "message_idx" | "message_type" | "generated_output"
>;
