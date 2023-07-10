drop policy "Enable all on action_groups for users based on org_id" on "public"."action_groups";

alter table "public"."action_groups" drop constraint "action_groups_id_key";

alter table "public"."action_groups" drop constraint "action_groups_org_id_fkey";

alter table "public"."actions" drop constraint "actions_action_group_fkey";

alter table "public"."action_groups" drop constraint "action_groups_pkey";

drop index if exists "public"."action_groups_id_key";

drop index if exists "public"."action_groups_pkey";

drop table "public"."action_groups";

alter table "public"."actions" drop column "action_group";



