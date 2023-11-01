create or replace function get_page_section_counts(
    _limit int,
    _offset int
) returns table (
    page_url text,
    section_title text,
    count bigint
) language plpgsql as $$
begin
    return query
    select page_url, section_title, count(*)
    from doc_chunks
    group by page_url, section_title
    order by page_url, section_title
    limit _limit OFFSET _offset;
end;
$$;

create or replace function get_all_page_section_counts()
return int (
) language plpgsql as $$
begin
    return query
    select count(*) from
    (select page_url, section_title, count(*)
    from doc_chunks
    group by page_url, section_title
    order by page_url, section_title) as sections;
end;
$$;