create or replace function get_all_page_section_counts()
returns integer
language plpgsql as $$
begin
    return (select count from
    (select page_url, section_title, count(*)
    from doc_chunks
    group by page_url, section_title
    order by page_url, section_title) as sections);
end;
$$;