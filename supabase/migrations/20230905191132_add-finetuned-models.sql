create table "public"."finetuned_models" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "org_id" bigint not null,
    "openai_name" text not null default ''::text
);

-- RLS
alter table "public"."finetuned_models" enable row level security;
create policy "Enable read access for users based on user_id"
on "public"."finetuned_models"
as permissive
for select
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = finetuned_models.org_id))));

CREATE UNIQUE INDEX finetuned_models_openai_name_key ON public.finetuned_models USING btree (openai_name);
CREATE UNIQUE INDEX finetuned_models_pkey ON public.finetuned_models USING btree (id);

alter table "public"."finetuned_models" add constraint "finetuned_models_pkey" PRIMARY KEY using index "finetuned_models_pkey";
alter table "public"."finetuned_models" add constraint "finetuned_models_openai_name_key" UNIQUE using index "finetuned_models_openai_name_key";
alter table "public"."finetuned_models" add constraint "finetuned_models_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) not valid;
alter table "public"."finetuned_models" validate constraint "finetuned_models_org_id_fkey";
