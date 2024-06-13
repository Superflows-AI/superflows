CREATE OR REPLACE FUNCTION get_all_page_section_counts()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM (
      SELECT 1
      FROM doc_chunks
      GROUP BY page_url, section_title
    ) AS sections
  );
END;
$$;