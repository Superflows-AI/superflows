create table "public"."apis" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null default ''::text,
    "created_at" timestamp with time zone not null default now(),
    "org_id" bigint not null,
    "api_host" text not null default ''::text,
    "auth_header" text not null default 'Authorization'::text,
    "auth_scheme" text not null default 'Bearer'::text
);

alter table "public"."apis" enable row level security;
CREATE UNIQUE INDEX apis_id_key ON public.apis USING btree (id);
CREATE UNIQUE INDEX apis_pkey ON public.apis USING btree (id);
alter table "public"."apis" add constraint "apis_pkey" PRIMARY KEY using index "apis_pkey";
alter table "public"."apis" add constraint "apis_id_key" UNIQUE using index "apis_id_key";
alter table "public"."apis" add constraint "apis_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE not valid;
alter table "public"."apis" validate constraint "apis_org_id_fkey";

-- Add a row for each row in organizations table
INSERT INTO public.apis (org_id, api_host, auth_header, auth_scheme, name)
    SELECT id AS org_id, api_host, auth_header, auth_scheme, name AS name
    FROM public.organizations;

-- Add columns to actions and action_tags tables
alter table "public"."action_tags" add column "api_id" uuid;
alter table "public"."action_tags" add constraint "action_tags_api_id_fkey" FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE not valid;
alter table "public"."action_tags" validate constraint "action_tags_api_id_fkey";

alter table "public"."actions" add column "api_id" uuid;
alter table "public"."actions" add constraint "actions_api_id_fkey" FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE not valid;
alter table "public"."actions" validate constraint "actions_api_id_fkey";

-- Add constraints to apis table
alter table "public"."apis" add constraint "apis_auth_header_check" CHECK ((auth_header = ANY (ARRAY['Authorization'::text, 'Proxy-Authorization'::text, 'x-api-key'::text, 'apiKey'::text]))) not valid;
alter table "public"."apis" validate constraint "apis_auth_header_check";
alter table "public"."apis" add constraint "apis_auth_scheme_check" CHECK ((auth_scheme = ANY (ARRAY['Bearer'::text, 'Basic'::text, 'app-token'::text, 'Digest'::text, 'HOBA'::text, 'Mutual'::text, 'VAPID'::text, 'SCRAM'::text, NULL::text]))) not valid;
alter table "public"."apis" validate constraint "apis_auth_scheme_check";

-- Update api_id column in action_tags table
UPDATE public.action_tags AS a
    SET api_id = (
        SELECT id FROM public.apis AS api
        WHERE api.org_id = a.org_id
    )
    WHERE EXISTS (
        SELECT 1 FROM public.apis AS api
        WHERE api.org_id = a.org_id
    );

-- Update api_id column in actions table
UPDATE public.actions AS a
    SET api_id = (
        SELECT id FROM public.apis AS api
        WHERE api.org_id = a.org_id
    )
    WHERE EXISTS (
        SELECT 1 FROM public.apis AS api
        WHERE api.org_id = a.org_id
    );

-- Drop columns from organizations table
alter table "public"."organizations" drop constraint "organizations_auth_header_check";
alter table "public"."organizations" drop constraint "organizations_auth_scheme_check";
alter table "public"."organizations" drop column "api_host";
alter table "public"."organizations" drop column "auth_header";
alter table "public"."organizations" drop column "auth_scheme";

-- Add not null constraints to api_id columns
alter table "public"."action_tags" alter column "api_id" set not null;
alter table "public"."actions" alter column "api_id" set not null;

-- Add not null constraints to created_at column
alter table "public"."action_tags" alter column "created_at" set not null;

-- Add RLS policy for apis table
create policy "Enable all on apis for users based on org_id"
on "public"."apis"
as permissive
for all
to authenticated
using ((auth.uid() IN ( SELECT profiles.id
   FROM profiles
  WHERE (profiles.org_id = apis.org_id))));


