alter table "public"."conversations" add column "is_playground" boolean not null default false;

alter table "public"."conversations" add column "profile_id" uuid;
alter table "public"."conversations" add constraint "public_conversations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."conversations" validate constraint "public_conversations_profile_id_fkey";
