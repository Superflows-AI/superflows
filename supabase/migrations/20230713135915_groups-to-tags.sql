ALTER TABLE action_groups RENAME TO action_tags;
ALTER TABLE public.actions
RENAME COLUMN action_group TO tag;
