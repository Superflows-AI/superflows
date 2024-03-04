alter table "public"."feedback" drop constraint "feedback_conversation_id_fkey";
alter table "public"."feedback" add constraint "feedback_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."feedback" validate constraint "feedback_conversation_id_fkey";
