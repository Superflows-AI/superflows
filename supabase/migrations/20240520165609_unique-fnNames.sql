CREATE OR REPLACE FUNCTION unique_fnname_per_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."fnName" != '' AND EXISTS (
    SELECT 1 FROM "public"."approval_answers"
    WHERE "org_id" = NEW."org_id" AND "fnName" = NEW."fnName"
  ) THEN
    RAISE EXCEPTION 'Duplicate org_id and fnName combination';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_unique_fnname_per_org
BEFORE INSERT OR UPDATE ON "public"."approval_answers"
FOR EACH ROW EXECUTE FUNCTION unique_fnname_per_org();

-- Unique answer_groups
CREATE UNIQUE INDEX unique_approval_answer_group_name_per_org ON public.approval_answer_groups USING btree (org_id, name);
alter table "public"."approval_answer_groups" add constraint "unique_approval_answer_group_name_per_org" UNIQUE using index "unique_approval_answer_group_name_per_org";
