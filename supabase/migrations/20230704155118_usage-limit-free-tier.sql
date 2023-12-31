create table "public"."is_paid" (
    "id" bigint generated by default as identity not null,
    "org_id" bigint not null,
    "is_premium" boolean not null default false
);

-- Make both is_paid and usage tables are read-only for users
drop policy "enable all based on organisation id" on "public"."usage";

create policy "Enable select for users based on organization id"
on "public"."usage"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = usage.org_id))));

alter table "public"."is_paid" enable row level security;

create policy "Enable select for users based on organization id"
on "public"."is_paid"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = is_paid.org_id))));

CREATE UNIQUE INDEX is_paid_pkey ON public.is_paid USING btree (id);

alter table "public"."is_paid" add constraint "is_paid_pkey" PRIMARY KEY using index "is_paid_pkey";

alter table "public"."is_paid" add constraint "is_paid_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;

alter table "public"."is_paid" validate constraint "is_paid_org_id_fkey";


-- Make conversations and chat_messages only readable by the user. Not writable
drop policy "Enable all on conversations for authenticated users based on org_id" on "public"."conversations";
create policy "Enable read access on conversations for authenticated users based on org_id"
on "public"."conversations"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = conversations.org_id))));

drop policy "Enable all on chat_messages for authenticated users based on org_id" on "public"."chat_messages";
create policy "Enable read access on chat_messages for authenticated users based on org_id"
on "public"."chat_messages"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = chat_messages.org_id))));
