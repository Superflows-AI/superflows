alter table "public"."actions" add column "filtering_description" text not null default ''::text;
alter table "public"."organizations" drop column "analytics_enabled";
alter table "public"."organizations" add column "bertie_enabled" boolean not null default false;
alter table "public"."analytics_code_snippets" add column "chosen_actions" text[];
alter table "public"."analytics_code_snippets" add column "is_bertie" boolean not null default false;

