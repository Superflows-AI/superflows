set check_function_bodies = off;

CREATE OR REPLACE FUNCTION audit.insert_update_delete_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    pkey_cols text[] = audit.primary_key_columns(TG_RELID);
    record_jsonb jsonb = to_jsonb(new);
    record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, record_jsonb);
    old_record_jsonb jsonb = to_jsonb(old);
    old_record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, old_record_jsonb);
    current_user_role text = current_user; -- New addition to get current user
begin

    insert into audit.record_version(
        record_id,
        old_record_id,
        op,
        table_oid,
        table_schema,
        table_name,
        record,
        old_record,
        user_role,
        user_id,
     session_role
    )
    select
        record_id,
        old_record_id,
        TG_OP,
        TG_RELID,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        record_jsonb,
        old_record_jsonb,
        current_user_role,
        auth.uid(),
        session_user;

    return coalesce(new, old);
end;
$function$
;


create type "public"."verified_message_types" as enum ('user', 'routing', 'filtering', 'code', 'text', 'function', 'suggestions', 'error');

create table "public"."approval_answer_groups" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null default ''::text,
    "org_id" bigint not null
);


alter table "public"."approval_answer_groups" enable row level security;

create table "public"."approval_answer_messages" (
    "id" uuid not null default gen_random_uuid(),
    "raw_text" text not null default ''::text,
    "created_at" timestamp with time zone not null default now(),
    "org_id" bigint not null,
    "answer_id" uuid not null,
    "message_idx" smallint not null default '0'::smallint,
    "message_type" verified_message_types not null,
    "generated_output" jsonb[] not null default '{}'::jsonb[]
);


alter table "public"."approval_answer_messages" enable row level security;

create table "public"."approval_answers" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "fnName" text not null default ''::text,
    "approved" boolean not null default false,
    "is_generating" boolean not null default false,
    "group_id" uuid not null,
    "org_id" bigint not null,
    "generation_failed" boolean not null default false,
    "description" text not null default ''::text
);


alter table "public"."approval_answers" enable row level security;

create table "public"."approval_questions" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "text" text not null default ''::text,
    "embedding" vector(3072),
    "embedded_text" text not null default ''::text,
    "answer_id" uuid not null,
    "user_added" boolean not null default false,
    "primary_question" boolean not null default false,
    "org_id" bigint not null
);


alter table "public"."approval_questions" enable row level security;

create table "public"."approval_variables" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null default ''::text,
    "type" text not null default ''::text,
    "description" text not null default ''::text,
    "org_id" bigint not null,
    "default" jsonb not null default '{}'::jsonb,
    "consts" text[] not null default '{}'::text[],
    "typeName" text not null default ''::text
);

alter table "public"."approval_variables" enable row level security;

alter table "public"."organizations" add column "fallback_to_bertie" boolean not null default false;
alter table "public"."organizations" add column "yond_cassius" boolean not null default false;

CREATE UNIQUE INDEX unique_answer_message_idx ON public.approval_answer_messages USING btree (answer_id, message_idx);
CREATE UNIQUE INDEX unique_approval_name_org ON public.approval_variables USING btree (name, org_id);
CREATE UNIQUE INDEX verified_answer_messages_pkey ON public.approval_answer_messages USING btree (id);
CREATE UNIQUE INDEX verified_answers_pkey ON public.approval_questions USING btree (id);
CREATE UNIQUE INDEX verified_groups_pkey ON public.approval_answers USING btree (id);
CREATE UNIQUE INDEX verified_question_groups_pkey ON public.approval_answer_groups USING btree (id);
CREATE UNIQUE INDEX verified_variables_pkey ON public.approval_variables USING btree (id);
CREATE UNIQUE INDEX unique_approval_answer_fnname_per_org ON public.approval_answers USING btree (org_id, "fnName");

alter table "public"."approval_answer_groups" add constraint "verified_question_groups_pkey" PRIMARY KEY using index "verified_question_groups_pkey";
alter table "public"."approval_answer_groups" add constraint "public_verified_answer_groups_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_answer_groups" validate constraint "public_verified_answer_groups_org_id_fkey";

alter table "public"."approval_answer_messages" add constraint "verified_answer_messages_pkey" PRIMARY KEY using index "verified_answer_messages_pkey";
alter table "public"."approval_answer_messages" add constraint "public_verified_answer_messages_answer_id_fkey" FOREIGN KEY (answer_id) REFERENCES approval_answers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_answer_messages" validate constraint "public_verified_answer_messages_answer_id_fkey";
alter table "public"."approval_answer_messages" add constraint "public_verified_answer_messages_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_answer_messages" validate constraint "public_verified_answer_messages_org_id_fkey";
alter table "public"."approval_answer_messages" add constraint "unique_answer_message_idx" UNIQUE using index "unique_answer_message_idx";

alter table "public"."approval_answers" add constraint "verified_groups_pkey" PRIMARY KEY using index "verified_groups_pkey";
alter table "public"."approval_answers" add constraint "public_verified_answers_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_answers" validate constraint "public_verified_answers_org_id_fkey";
alter table "public"."approval_answers" add constraint "verified_answers_group_id_fkey" FOREIGN KEY (group_id) REFERENCES approval_answer_groups(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_answers" validate constraint "verified_answers_group_id_fkey";
alter table "public"."approval_answers" add constraint "unique_approval_answer_fnname_per_org" UNIQUE using index "unique_approval_answer_fnname_per_org";

alter table "public"."approval_questions" add constraint "verified_answers_pkey" PRIMARY KEY using index "verified_answers_pkey";
alter table "public"."approval_questions" add constraint "public_verified_questions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_questions" validate constraint "public_verified_questions_org_id_fkey";
alter table "public"."approval_questions" add constraint "verified_questions_answer_id_fkey" FOREIGN KEY (answer_id) REFERENCES approval_answers(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_questions" validate constraint "verified_questions_answer_id_fkey";

alter table "public"."approval_variables" add constraint "verified_variables_pkey" PRIMARY KEY using index "verified_variables_pkey";
alter table "public"."approval_variables" add constraint "public_verified_variables_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."approval_variables" validate constraint "public_verified_variables_org_id_fkey";
alter table "public"."approval_variables" add constraint "unique_approval_name_org" UNIQUE using index "unique_approval_name_org";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_approved_answers_with_group_ranking(query_embedding vector, similarity_threshold double precision, match_count integer)
 RETURNS TABLE(answer_id uuid, text text, mean_similarity double precision)
 LANGUAGE plpgsql
AS $function$ begin return query
select approval_questions.answer_id,
    string_agg(approval_questions.text, '| ') as text,
    avg(1 - (embedding <=> query_embedding)) as mean_similarity
from approval_questions
join approval_answers
on approval_questions.answer_id = approval_answers.id
where 1 - (embedding <=> query_embedding) > similarity_threshold
and approval_answers.approved = true
group by approval_questions.answer_id
order by mean_similarity desc
limit match_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_verified_answers(query_embedding vector, similarity_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, text text, similarity double precision)
 LANGUAGE plpgsql
AS $function$ begin return query
select verified_answers.id,
    verified_answers.text,
    1 - (verified_answers.embedding <=> query_embedding) as similarity
from verified_answers
where 1 - (verified_answers.embedding <=> query_embedding) > similarity_threshold
--     and verified_answers.org_id = _org_id
order by verified_answers.embedding <=> query_embedding
limit match_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_verified_answers_with_group_uuid(query_embedding vector, _group_uuid uuid)
 RETURNS TABLE(id uuid, text text, similarity double precision)
 LANGUAGE plpgsql
AS $function$ begin return query
select verified_answers.id,
    verified_answers.text,
    1 - (verified_answers.embedding <=> query_embedding) as similarity
from verified_answers
where verified_answers.group_uuid = _group_uuid
order by verified_answers.embedding <=> query_embedding
limit 1;
end;
$function$
;

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

grant delete on table "public"."approval_answer_groups" to "anon";
grant insert on table "public"."approval_answer_groups" to "anon";
grant references on table "public"."approval_answer_groups" to "anon";
grant select on table "public"."approval_answer_groups" to "anon";
grant trigger on table "public"."approval_answer_groups" to "anon";
grant truncate on table "public"."approval_answer_groups" to "anon";
grant update on table "public"."approval_answer_groups" to "anon";
grant delete on table "public"."approval_answer_groups" to "authenticated";
grant insert on table "public"."approval_answer_groups" to "authenticated";
grant references on table "public"."approval_answer_groups" to "authenticated";
grant select on table "public"."approval_answer_groups" to "authenticated";
grant trigger on table "public"."approval_answer_groups" to "authenticated";
grant truncate on table "public"."approval_answer_groups" to "authenticated";
grant update on table "public"."approval_answer_groups" to "authenticated";
grant delete on table "public"."approval_answer_groups" to "service_role";
grant insert on table "public"."approval_answer_groups" to "service_role";
grant references on table "public"."approval_answer_groups" to "service_role";
grant select on table "public"."approval_answer_groups" to "service_role";
grant trigger on table "public"."approval_answer_groups" to "service_role";
grant truncate on table "public"."approval_answer_groups" to "service_role";
grant update on table "public"."approval_answer_groups" to "service_role";
grant delete on table "public"."approval_answer_messages" to "anon";
grant insert on table "public"."approval_answer_messages" to "anon";
grant references on table "public"."approval_answer_messages" to "anon";
grant select on table "public"."approval_answer_messages" to "anon";
grant trigger on table "public"."approval_answer_messages" to "anon";
grant truncate on table "public"."approval_answer_messages" to "anon";
grant update on table "public"."approval_answer_messages" to "anon";
grant delete on table "public"."approval_answer_messages" to "authenticated";
grant insert on table "public"."approval_answer_messages" to "authenticated";
grant references on table "public"."approval_answer_messages" to "authenticated";
grant select on table "public"."approval_answer_messages" to "authenticated";
grant trigger on table "public"."approval_answer_messages" to "authenticated";
grant truncate on table "public"."approval_answer_messages" to "authenticated";
grant update on table "public"."approval_answer_messages" to "authenticated";
grant delete on table "public"."approval_answer_messages" to "service_role";
grant insert on table "public"."approval_answer_messages" to "service_role";
grant references on table "public"."approval_answer_messages" to "service_role";
grant select on table "public"."approval_answer_messages" to "service_role";
grant trigger on table "public"."approval_answer_messages" to "service_role";
grant truncate on table "public"."approval_answer_messages" to "service_role";
grant update on table "public"."approval_answer_messages" to "service_role";
grant delete on table "public"."approval_answers" to "anon";
grant insert on table "public"."approval_answers" to "anon";
grant references on table "public"."approval_answers" to "anon";
grant select on table "public"."approval_answers" to "anon";
grant trigger on table "public"."approval_answers" to "anon";
grant truncate on table "public"."approval_answers" to "anon";
grant update on table "public"."approval_answers" to "anon";
grant delete on table "public"."approval_answers" to "authenticated";
grant insert on table "public"."approval_answers" to "authenticated";
grant references on table "public"."approval_answers" to "authenticated";
grant select on table "public"."approval_answers" to "authenticated";
grant trigger on table "public"."approval_answers" to "authenticated";
grant truncate on table "public"."approval_answers" to "authenticated";
grant update on table "public"."approval_answers" to "authenticated";
grant delete on table "public"."approval_answers" to "service_role";
grant insert on table "public"."approval_answers" to "service_role";
grant references on table "public"."approval_answers" to "service_role";
grant select on table "public"."approval_answers" to "service_role";
grant trigger on table "public"."approval_answers" to "service_role";
grant truncate on table "public"."approval_answers" to "service_role";
grant update on table "public"."approval_answers" to "service_role";
grant delete on table "public"."approval_questions" to "anon";
grant insert on table "public"."approval_questions" to "anon";
grant references on table "public"."approval_questions" to "anon";
grant select on table "public"."approval_questions" to "anon";
grant trigger on table "public"."approval_questions" to "anon";
grant truncate on table "public"."approval_questions" to "anon";
grant update on table "public"."approval_questions" to "anon";
grant delete on table "public"."approval_questions" to "authenticated";
grant insert on table "public"."approval_questions" to "authenticated";
grant references on table "public"."approval_questions" to "authenticated";
grant select on table "public"."approval_questions" to "authenticated";
grant trigger on table "public"."approval_questions" to "authenticated";
grant truncate on table "public"."approval_questions" to "authenticated";
grant update on table "public"."approval_questions" to "authenticated";
grant delete on table "public"."approval_questions" to "service_role";
grant insert on table "public"."approval_questions" to "service_role";
grant references on table "public"."approval_questions" to "service_role";
grant select on table "public"."approval_questions" to "service_role";
grant trigger on table "public"."approval_questions" to "service_role";
grant truncate on table "public"."approval_questions" to "service_role";
grant update on table "public"."approval_questions" to "service_role";
grant delete on table "public"."approval_variables" to "anon";
grant insert on table "public"."approval_variables" to "anon";
grant references on table "public"."approval_variables" to "anon";
grant select on table "public"."approval_variables" to "anon";
grant trigger on table "public"."approval_variables" to "anon";
grant truncate on table "public"."approval_variables" to "anon";
grant update on table "public"."approval_variables" to "anon";
grant delete on table "public"."approval_variables" to "authenticated";
grant insert on table "public"."approval_variables" to "authenticated";
grant references on table "public"."approval_variables" to "authenticated";
grant select on table "public"."approval_variables" to "authenticated";
grant trigger on table "public"."approval_variables" to "authenticated";
grant truncate on table "public"."approval_variables" to "authenticated";
grant update on table "public"."approval_variables" to "authenticated";
grant delete on table "public"."approval_variables" to "service_role";
grant insert on table "public"."approval_variables" to "service_role";
grant references on table "public"."approval_variables" to "service_role";
grant select on table "public"."approval_variables" to "service_role";
grant trigger on table "public"."approval_variables" to "service_role";
grant truncate on table "public"."approval_variables" to "service_role";
grant update on table "public"."approval_variables" to "service_role";

create policy "Enable all on verified_answer_groups for users based on org_id"
on "public"."approval_answer_groups"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = approval_answer_groups.org_id))));


create policy "Enable all on verified_answer_messages for users based on org_i"
on "public"."approval_answer_messages"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = approval_answer_messages.org_id))));


create policy "Enable all on verified_answers for users based on org_id"
on "public"."approval_answers"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = approval_answers.org_id))));


create policy "Enable all on verified_questions for users based on org_id"
on "public"."approval_questions"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = approval_questions.org_id))));


create policy "Enable all on verified_variables for users based on org_id"
on "public"."approval_variables"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = approval_variables.org_id))));


alter table "public"."usage" drop constraint "usage_org_id_fkey";
alter table "public"."usage" add constraint "public_usage_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;
alter table "public"."usage" validate constraint "public_usage_org_id_fkey";
