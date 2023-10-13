alter table "public"."organizations"
add column "chat_to_docs_enabled" boolean not null default false;
create extension if not exists "vector" with schema "extensions";
create sequence "public"."docs_id_seq";
create table "public"."docs" (
    "id" integer not null default nextval('docs_id_seq'::regclass),
    "created_at" timestamp with time zone default now(),
    "text_chunk" text not null,
    "embedding" vector(1536),
    "org_id" bigint not null,
    "page_url" text,
    "chunk_idx" integer not null,
    "page_title" text,
    "section_title" text,
);
alter table "public"."docs" enable row level security;
alter sequence "public"."docs_id_seq" owned by "public"."docs"."id";
CREATE UNIQUE INDEX docs_pkey ON public.docs USING btree (id);
alter table "public"."docs"
add constraint "docs_pkey" PRIMARY KEY using index "docs_pkey";
alter table "public"."docs"
add constraint "docs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) not valid;
alter table "public"."docs" validate constraint "docs_org_id_fkey";
create policy "Enable select for users based on organization id" on "public"."docs" as permissive for
select to public using (
        (
            auth.uid() IN (
                SELECT profiles.id
                FROM profiles
                WHERE (profiles.org_id = docs.org_id)
            )
        )
    );
-- Similarity search
create or replace function match_embeddings (
        query_embedding vector(1536),
        similarity_threshold float,
        match_count int,
        _org_id int
    ) returns table (
        id integer,
        text_chunks text [],
        similarity float,
        page_url text,
        chunk_idx integer,
        page_title text,
        section_title text,
        window_length integer
    ) language plpgsql as $$ begin return query
select docs.id,
    docs.text_chunks,
    1 - (docs.embedding <=> query_embedding) as similarity,
    docs.page_url,
    docs.chunk_idx,
    docs.page_title,
    docs.section_title,
    docs.window_length
from docs
where 1 - (docs.embedding <=> query_embedding) > similarity_threshold
    and docs.org_id = _org_id
order by docs.embedding <=> query_embedding
limit match_count;
end;
$$;