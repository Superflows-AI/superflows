
alter table "public"."finetuned_models" drop constraint "finetuned_models_openai_name_key";

drop index if exists "public"."finetuned_models_openai_name_key";
