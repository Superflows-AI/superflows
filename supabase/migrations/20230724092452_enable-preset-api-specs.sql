-- Make conversations and chat_messages also writable by the user
create policy "Enable write access on conversations based on org_id"
on "public"."conversations"
as permissive
for insert
to authenticated
with check ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = conversations.org_id))));

create policy "Enable write access on chat_messages based on org_id"
on "public"."chat_messages"
as permissive
for insert
to authenticated
with check ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = chat_messages.org_id))));