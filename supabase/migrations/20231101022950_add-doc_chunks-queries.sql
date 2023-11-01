create or replace function get_page_section_counts(
    _limit int,
    _offset int
) returns table (
    result_page_url text,
    result_page_title text,
    result_section_title text,
    ids text
) language plpgsql as $$
begin
    return query
    select page_url as result_page_url, page_title as result_page_title, section_title as result_section_title, string_agg(id::text, ',') as ids
    from doc_chunks
    group by page_url, section_title
    order by page_url, section_title
    limit _limit offset _offset;
end;
$$;

create or replace function get_all_page_section_counts()
returns integer
language plpgsql as $$
begin
    return (select count(*) from
    (select page_url, section_title, count(*)
    from doc_chunks
    group by page_url, section_title
    order by page_url, section_title) as sections);
end;
$$;