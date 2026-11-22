create or replace function private.adt_create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.email like '%@adt.system' or new.email like '%@adt-extracteur-ai.vercel.app' then
  insert into public.adt_profiles(id,dome,employee_id,full_name) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'dome'),''),split_part(new.email,'@',1)),coalesce(new.raw_user_meta_data->>'employee_id',''),coalesce(new.raw_user_meta_data->>'full_name',''));
 end if; return new;
end;$$;
revoke all on function private.adt_create_profile() from public,anon,authenticated;
