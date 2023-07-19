alter table "public"."organizations" add column "auth_header" text not null default 'Authorization'::text;

alter table "public"."organizations" add column "auth_scheme" text default 'Bearer'::text;

alter table "public"."organizations" add constraint "organizations_auth_header_check" CHECK ((auth_header = ANY (ARRAY['Authorization'::text, 'Proxy-Authorization'::text, 'x-api-key'::text, 'apiKey'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_auth_header_check";

alter table "public"."organizations" add constraint "organizations_auth_scheme_check" CHECK ((auth_scheme = ANY (ARRAY['Bearer'::text, 'Basic'::text, 'app-token'::text, 'Digest'::text, 'HOBA'::text, 'Mutual'::text, 'VAPID'::text, 'SCRAM'::text, NULL::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_auth_scheme_check";
