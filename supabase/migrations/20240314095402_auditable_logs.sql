create schema if not exists audit;

create table audit.record_version (
  id bigserial primary key,
  -- auditing metadata
  record_id uuid, -- identifies a new record by it's table + primary key
  old_record_id uuid, -- ^
  op varchar(8) not null, -- INSERT/UPDATE/DELETE/TRUNCATE
  ts timestamptz not null default now(),
  -- table identifiers
  table_oid oid not null, -- pg internal id for a table
  table_schema name not null, -- audited table's schema name e.g. 'public'
  table_name name not null, -- audited table's table name e.g. 'account'
  -- record data
  record jsonb, -- contents of the new record
  old_record jsonb, -- previous record contents (for UPDATE/DELETE)
  user_role text, -- postgres role of the user making the change
  user_id uuid, -- Of who is making the change
  session_role text
);

-- index ts for time range filtering
create index record_version_ts
  on audit.record_version
  using brin(ts);

-- index table_oid for table filtering
create index record_version_table_oid
  on audit.record_version
  using btree(table_oid);

create or replace function audit.primary_key_columns(entity_oid oid)
    returns text[]
    stable
    security definer
    language sql
as $$
    -- Looks up the names of a table's primary key columns
    select
        coalesce(
            array_agg(pa.attname::text order by pa.attnum),
            array[]::text[]
        ) column_names
    from
        pg_index pi
        join pg_attribute pa
            on pi.indrelid = pa.attrelid
            and pa.attnum = any(pi.indkey)
    where
        indrelid = $1
        and indisprimary
$$;

create or replace function audit.to_record_id(
		entity_oid oid,
		pkey_cols text[],
		rec jsonb
)
    returns uuid
    stable
    language sql
as $$
    select
        case
            when rec is null then null
						-- if no primary key exists, use a random uuid
            when pkey_cols = array[]::text[] then gen_random_uuid()
            else (
                select
                    uuid_generate_v5(
                        'fd62bc3d-8d6e-43c2-919c-802ba3762271',
                        (
                            jsonb_build_array(to_jsonb($1))
                            || jsonb_agg($3 ->> key_)
                        )::text
                    )
                from
                    unnest($2) x(key_)
            )
        end
$$;

create or replace function audit.insert_update_delete_trigger()
    returns trigger
    security definer
    language plpgsql
as $$
declare
    pkey_cols text[] = audit.primary_key_columns(TG_RELID);
    record_jsonb jsonb = to_jsonb(new);
    record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, record_jsonb);
    old_record_jsonb jsonb = to_jsonb(old);
    old_record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, old_record_jsonb);
    current_user_role text = current_user; -- New addition to get current user
begin

    insert into audit.record_version(
        record_id,
        old_record_id,
        op,
        table_oid,
        table_schema,
        table_name,
        record,
        old_record,
        user_role,
        user_id,
        session_role
    )
    select
        record_id,
        old_record_id,
        TG_OP,
        TG_RELID,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        record_jsonb,
        old_record_jsonb,
        current_user_role,
        auth.uid(),
        session_user;

    return coalesce(new, old);
end;
$$;


create or replace function audit.enable_tracking(regclass)
    returns void
    volatile
    security definer
    language plpgsql
as $$
declare
    statement_row text = format('
        create trigger audit_i_u_d
            before insert or update or delete
            on %I
            for each row
            execute procedure audit.insert_update_delete_trigger();',
        $1
    );

    pkey_cols text[] = audit.primary_key_columns($1);
begin
    if pkey_cols = array[]::text[] then
        raise exception 'Table % can not be audited because it has no primary key', $1;
    end if;

    if not exists(select 1 from pg_trigger where tgrelid = $1 and tgname = 'audit_i_u_d') then
        execute statement_row;
    end if;
end;
$$;

create or replace function audit.disable_tracking(regclass)
    returns void
    volatile
    security definer
    language plpgsql
as $$
declare
    statement_row text = format(
        'drop trigger if exists audit_i_u_d on %I;',
        $1
    );
begin
    execute statement_row;
end;
$$;

-- Track the tables which may contain user data
select audit.enable_tracking('public.chat_messages'::regclass);
select audit.enable_tracking('public.follow_ups'::regclass);
select audit.enable_tracking('public.analytics_code_snippets'::regclass);
select audit.enable_tracking('public.feedback'::regclass);

-- Automatic data deletion - set to 30 days
create extension if not exists pg_cron with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select
  cron.schedule (
    'daily-delete-old-audit-logs',
    '5 2 * * *', -- Daily at 2:05am (GMT)
    $$ DELETE FROM "audit"."record_version" WHERE ts < NOW() - INTERVAL '30 days' $$
  );
