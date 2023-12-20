alter table "public"."analytics_code_snippets" add column "fresh" boolean not null default true;
alter table "public"."analytics_code_snippets" alter column "conversation_index" set data type integer using "conversation_index"::integer;
alter table "public"."chat_messages" add column "fresh" boolean not null default true;
alter table "public"."organizations" drop column "caching_enabled";

create table "public"."follow_ups" (
    "id" uuid not null default gen_random_uuid(),
    "follow_up_text" text not null,
    "conversation_index" smallint not null,
    "conversation_id" bigint not null,
    "org_id" bigint not null,
    "created_at" timestamp with time zone not null default now(),
    "fresh" boolean not null default true
);


alter table "public"."follow_ups" enable row level security;
CREATE UNIQUE INDEX "follow-ups_pkey" ON public.follow_ups USING btree (id);
alter table "public"."follow_ups" add constraint "follow-ups_pkey" PRIMARY KEY using index "follow-ups_pkey";
alter table "public"."follow_ups" add constraint "follow_ups_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."follow_ups" validate constraint "follow_ups_conversation_id_fkey";
alter table "public"."follow_ups" add constraint "follow_ups_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."follow_ups" validate constraint "follow_ups_org_id_fkey";


set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.invalidate_cache()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
   IF TG_OP IN ('INSERT','UPDATE') THEN -- Check if operation is INSERT or UPDATE
       UPDATE public.chat_messages SET fresh = false
           WHERE ((fresh = true) AND (org_id = new.org_id));

       UPDATE public.analytics_code_snippets SET fresh = false
           WHERE ((fresh = true) AND (org_id = new.org_id));

       UPDATE public.follow_ups SET fresh = false
           WHERE ((fresh = true) AND (org_id = new.org_id));
   ELSE -- Else operation is DELETE
       UPDATE public.chat_messages SET fresh = false
           WHERE org_id = OLD.org_id AND fresh = true;

       UPDATE public.analytics_code_snippets SET fresh = false
           WHERE org_id = OLD.org_id AND fresh = true;

       UPDATE public.follow_ups SET fresh = false
           WHERE ((fresh = true) AND (org_id = new.org_id));
   END IF;
   RETURN null; -- Since it's an AFTER trigger, return value is ignored
END;$function$
;

create policy "Enable update for users based on user_id"
on "public"."analytics_code_snippets"
as permissive
for update
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = analytics_code_snippets.org_id))));


create policy "Enable insert based on org"
on "public"."chat_messages"
as permissive
for update
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = chat_messages.org_id))));


CREATE TRIGGER invalidate_cache AFTER INSERT OR DELETE OR UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION invalidate_cache();
