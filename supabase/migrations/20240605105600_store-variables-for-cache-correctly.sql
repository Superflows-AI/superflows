alter table "public"."approval_questions" add column "variable_values" jsonb not null default '{}'::jsonb;

update public.approval_questions
set
  variable_values = (
    select
      raw_text::jsonb
    from
      public.approval_answer_messages
    where
      answer_id = approval_questions.answer_id
      and message_type = 'user'
  )
where
  exists (
    select
      1
    from
      public.approval_answer_messages
    where
      answer_id = approval_questions.answer_id
      and message_type = 'user'
  );

CREATE UNIQUE INDEX unique_action_name_per_org ON public.actions USING btree (org_id, name);
alter table "public"."actions" add constraint "unique_action_name_per_org" UNIQUE using index "unique_action_name_per_org";
