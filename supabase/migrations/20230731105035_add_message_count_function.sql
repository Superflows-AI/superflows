-- Counts the number of user messages per day, excluding messages that are suggestions in the presets 
-- (Only excludes the first instance of the preset message, so it is counted if the user clicks it)

CREATE OR REPLACE FUNCTION public.count_user_messages(organisation_id INT, presets TEXT[])
RETURNS TABLE(date date, "count" bigint) LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
  RETURN QUERY 
    WITH msgs AS (
        SELECT DATE("created_at") as date_created, 
            content, 
            ROW_NUMBER() OVER (PARTITION BY content ORDER BY "created_at") AS rank_in_group
        FROM chat_messages
        WHERE role = 'user' AND org_id = count_user_messages.organisation_id
    )
    SELECT date_created as date, COUNT(*) as "count"
    FROM msgs
    WHERE NOT (content IN (SELECT UNNEST(presets)) AND rank_in_group = 1)
    GROUP BY date_created
    ORDER BY date_created;
END;
$BODY$;

