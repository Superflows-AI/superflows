alter table "public"."usage" add column "num_user_queries" bigint not null default '0'::bigint;
