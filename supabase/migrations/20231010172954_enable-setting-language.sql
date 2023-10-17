alter table "public"."organizations" add column "language" text not null default 'Detect Language'::text;
alter table "public"."organizations" add constraint "organizations_language_check" CHECK ((language = ANY (ARRAY['Detect Language'::text, 'English'::text, 'French'::text, 'Spanish'::text, 'German'::text, 'Russian'::text, 'Chinese'::text, 'Portuguese'::text, 'Arabic'::text]))) not valid;
alter table "public"."organizations" validate constraint "organizations_language_check";
