alter table "public"."apis" drop constraint "apis_auth_header_check";
alter table "public"."apis" add constraint "apis_auth_header_check" CHECK ((auth_header = ANY (ARRAY['Authorization'::text, 'Proxy-Authorization'::text, 'x-api-key'::text, 'apiKey'::text, 'Query parameter'::text]))) not valid;
alter table "public"."apis" validate constraint "apis_auth_header_check";

alter table "public"."apis" add column "auth_query_param_name" text not null default ''::text;
alter table "public"."apis" add constraint "apis_auth_query_param_name_check" CHECK ((length(auth_query_param_name) < 40)) not valid;
alter table "public"."apis" validate constraint "apis_auth_query_param_name_check";
