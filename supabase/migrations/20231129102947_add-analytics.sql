create table "public"."analytics_code_snippets" (
    "id" uuid not null default gen_random_uuid(),
    "instruction_message" text not null default ''::text,
    "output" text not null,
    "org_id" bigint not null,
    "conversation_id" bigint not null,
    "conversation_index" bigint not null,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."analytics_code_snippets" enable row level security;
alter table "public"."organizations" add column "analytics_enabled" boolean not null default false;
CREATE UNIQUE INDEX analytics_code_snippets_pkey ON public.analytics_code_snippets USING btree (id);

alter table "public"."analytics_code_snippets" add constraint "analytics_code_snippets_pkey" PRIMARY KEY using index "analytics_code_snippets_pkey";
alter table "public"."analytics_code_snippets" add constraint "analytics_code_snippets_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;
alter table "public"."analytics_code_snippets" validate constraint "analytics_code_snippets_org_id_fkey";

alter table "public"."analytics_code_snippets" add constraint "analytics_code_snippets_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;
alter table "public"."analytics_code_snippets" validate constraint "analytics_code_snippets_conversation_id_fkey";


create policy "Enable insert for users based on user_id"
on "public"."analytics_code_snippets"
as permissive
for insert
to authenticated
with check ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = analytics_code_snippets.org_id))));
