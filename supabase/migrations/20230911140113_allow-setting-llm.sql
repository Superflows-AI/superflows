alter table "public"."organizations" add column "model" text not null default 'gpt-4-0613'::text;
