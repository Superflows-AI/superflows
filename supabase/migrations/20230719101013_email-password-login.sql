CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  IF (new.raw_user_meta_data->>'full_name') IS NOT NULL THEN
    insert into public.profiles (id, full_name, avatar_url, email_address)
    values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  ELSE
    insert into public.profiles (id, email_address)
    values (new.id, new.email);
  END IF;
return new;
end;
$function$
;
