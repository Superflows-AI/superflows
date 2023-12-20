alter table "public"."analytics_code_snippets" add column "fresh" boolean not null default true;
alter table "public"."analytics_code_snippets" alter column "conversation_index" set data type integer using "conversation_index"::integer;
alter table "public"."chat_messages" add column "fresh" boolean not null default true;
alter table "public"."organizations" drop column "caching_enabled";
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
   ELSE -- Else operation is DELETE
       UPDATE public.chat_messages SET fresh = false
           WHERE org_id = OLD.org_id AND fresh = true;

       UPDATE public.analytics_code_snippets SET fresh = false
           WHERE org_id = OLD.org_id AND fresh = true;
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
