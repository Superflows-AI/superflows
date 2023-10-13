alter table "public"."organizations"
add column "chat_to_docs_enabled" boolean not null default false;

create extension if not exists "vector" with schema "extensions";
create sequence "public"."doc_chunks_id_seq";
create table "public"."doc_chunks" (
    "id" integer not null default nextval('doc_chunks_id_seq'::regclass),
    "created_at" timestamp with time zone default now(),
    "text_chunks" text [] not null,
    "embedding" vector(1536),
    "org_id" bigint not null,
    "page_url" text,
    "chunk_idx" integer not null,
    "page_title" text,
    "section_title" text
);
alter table "public"."doc_chunks" enable row level security;
alter sequence "public"."doc_chunks_id_seq" owned by "public"."doc_chunks"."id";
CREATE UNIQUE INDEX doc_chunks_pkey ON public.doc_chunks USING btree (id);
alter table "public"."doc_chunks"
add constraint "doc_chunks_pkey" PRIMARY KEY using index "doc_chunks_pkey";
alter table "public"."doc_chunks"
add constraint "doc_chunks_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) not valid;
alter table "public"."doc_chunks" validate constraint "doc_chunks_org_id_fkey";
create policy "Enable select for users based on organization id" on "public"."doc_chunks" as permissive for
select to public using (
        (
            auth.uid() IN (
                SELECT profiles.id
                FROM profiles
                WHERE (profiles.org_id = doc_chunks.org_id)
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
        section_title text
    ) language plpgsql as $$ begin return query
select doc_chunks.id,
    doc_chunks.text_chunks,
    1 - (doc_chunks.embedding <=> query_embedding) as similarity,
    doc_chunks.page_url,
    doc_chunks.chunk_idx,
    doc_chunks.page_title,
    doc_chunks.section_title
from doc_chunks
where 1 - (doc_chunks.embedding <=> query_embedding) > similarity_threshold
    and doc_chunks.org_id = _org_id
order by doc_chunks.embedding <=> query_embedding
limit match_count;
end;
$$;