alter table "public"."organizations" drop column "hashed_api_key";

alter table "public"."organizations" add column "api_key" text not null default ''::text;

alter table "public"."organizations" add column "description" text not null default ''::text;
