create policy "Read access for organization team members"
on "public"."profiles"
as permissive
for select
to public
using ((org_id = ( SELECT profiles_1.org_id
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid()))));

alter table "public"."conversations" add column "is_playground" boolean not null default false;

alter table "public"."conversations" add column "profile_id" uuid;
alter table "public"."conversations" add constraint "public_conversations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."conversations" validate constraint "public_conversations_profile_id_fkey";
