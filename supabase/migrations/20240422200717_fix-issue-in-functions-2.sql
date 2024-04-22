DROP FUNCTION public.search_approved_answers_with_group_ranking(query_embedding vector, similarity_threshold double precision, match_count integer, org_id integer);

CREATE OR REPLACE FUNCTION public.search_approved_answers_with_group_ranking(query_embedding vector, similarity_threshold double precision, match_count integer, _org_id integer)
 RETURNS TABLE(answer_id uuid, text text, mean_similarity double precision)
 LANGUAGE plpgsql
AS $function$ begin return query
select approval_questions.answer_id,
    string_agg(approval_questions.text, '| ') as text,
    avg(1 - (embedding <=> query_embedding)) as mean_similarity
from approval_questions
join approval_answers
on approval_questions.answer_id = approval_answers.id
where 1 - (embedding <=> query_embedding) > similarity_threshold
and approval_answers.approved = true
and approval_answers.org_id = _org_id
group by approval_questions.answer_id
order by mean_similarity desc
limit match_count;
end;
$function$
;
