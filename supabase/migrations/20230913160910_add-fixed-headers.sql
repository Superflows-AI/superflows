create table "public"."fixed_headers" (
    "id" uuid not null default gen_random_uuid(),
    "api_id" uuid not null,
    "name" text not null default ''::text,
    "value" text not null default ''::text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."fixed_headers" enable row level security;
CREATE UNIQUE INDEX fixed_headers_pkey ON public.fixed_headers USING btree (id);
alter table "public"."fixed_headers" add constraint "fixed_headers_pkey" PRIMARY KEY using index "fixed_headers_pkey";
alter table "public"."fixed_headers" add constraint "fixed_headers_api_id_fkey" FOREIGN KEY (api_id) REFERENCES apis(id) ON DELETE CASCADE not valid;
alter table "public"."fixed_headers" validate constraint "fixed_headers_api_id_fkey";

CREATE POLICY "enable all operations based on org_id" ON "public"."fixed_headers" AS PERMISSIVE FOR ALL TO AUTHENTICATED USING (
    auth.uid() IN (
        SELECT profiles.id
        FROM profiles
            JOIN apis ON apis.org_id = profiles.org_id
        WHERE apis.id = fixed_headers.api_id
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT profiles.id
        FROM profiles
            JOIN apis ON apis.org_id = profiles.org_id
        WHERE apis.id = fixed_headers.api_id
    )
);