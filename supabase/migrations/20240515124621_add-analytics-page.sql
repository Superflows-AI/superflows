alter table "public"."conversations" add column "is_playground" boolean not null default false;

alter table "public"."conversations" add column "profile_id" uuid;
alter table "public"."conversations" add constraint "public_conversations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."conversations" validate constraint "public_conversations_profile_id_fkey";


-- Change type of chat_messages.role to chat_message_roles enum
BEGIN;

-- Create new enum type
create type "public"."chat_message_roles" as enum ('user', 'assistant', 'function', 'error');

-- Add new column
ALTER TABLE public.chat_messages ADD COLUMN role_new chat_message_roles;

-- Update new column with values from old column
UPDATE public.chat_messages SET role_new = role::chat_message_roles;

-- Drop old column constraint
alter table "public"."chat_messages" drop constraint "chat_messages_role_method_check";

-- Drop old column
ALTER TABLE public.chat_messages DROP COLUMN role;

-- Rename new column to old column name
ALTER TABLE public.chat_messages RENAME COLUMN role_new TO role;

alter table "public"."chat_messages" alter column "role" set not null;

COMMIT;

-- These indices are necessary to speed up the queries to get analytics page data
CREATE INDEX idx_chat_messages_role ON chat_messages(role);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_feedback_conversation_id ON feedback(conversation_id);
