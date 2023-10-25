alter table "public"."actions" add column "link_name" text not null default ''::text;
alter table "public"."actions" add column "link_url" text not null default ''::text;
