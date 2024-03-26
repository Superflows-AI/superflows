-- Store conversation history summary
ALTER table "public"."chat_messages" add column "chat_summary" text not null default ''::text;

-- Store filtering results
ALTER table "public"."chat_messages" add column "chosen_actions" text[];

-- Store routing result
ALTER table "public"."chat_messages" add column "chosen_route" text;

