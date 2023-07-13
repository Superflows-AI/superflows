drop policy "Enable all on action_groups for users based on org_id" on "public"."action_groups";

alter table "public"."action_groups" drop constraint "action_groups_id_key";

alter table "public"."action_groups" drop constraint "action_groups_org_id_fkey";

alter table "public"."actions" drop constraint "actions_action_group_fkey";

alter table "public"."action_groups" drop constraint "action_groups_pkey";

drop index if exists "public"."action_groups_id_key";

drop index if exists "public"."action_groups_pkey";

drop table "public"."action_groups";

create table "public"."action_tags" (
    "id" bigint generated by default as identity not null,
    "name" text not null default ''::text,
    "description" text not null default ''::text,
    "created_at" timestamp with time zone default now(),
    "org_id" bigint
);


alter table "public"."action_tags" enable row level security;

alter table "public"."actions" drop column "action_group";

alter table "public"."actions" add column "tag" bigint;

CREATE UNIQUE INDEX action_groups_id_key ON public.action_tags USING btree (id);

CREATE UNIQUE INDEX action_groups_pkey ON public.action_tags USING btree (id);

alter table "public"."action_tags" add constraint "action_groups_pkey" PRIMARY KEY using index "action_groups_pkey";

alter table "public"."action_tags" add constraint "action_groups_id_key" UNIQUE using index "action_groups_id_key";

alter table "public"."action_tags" add constraint "action_tags_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."action_tags" validate constraint "action_tags_org_id_fkey";

alter table "public"."actions" add constraint "actions_tag_fkey" FOREIGN KEY (tag) REFERENCES action_tags(id) ON DELETE CASCADE not valid;

alter table "public"."actions" validate constraint "actions_tag_fkey";

create policy "Enable all on action_groups for users based on org_id"
on "public"."action_tags"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = action_tags.org_id))));




