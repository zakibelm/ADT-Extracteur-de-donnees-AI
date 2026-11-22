-- Les données de profil ne confèrent aucun privilège : adt_role reste dans app_metadata.
create or replace function private.adt_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.raw_user_meta_data->>'adt_app'='extracteur'
   or new.email like '%@adt.system'
   or new.email like '%@adt-extracteur-ai.vercel.app' then
  if coalesce(new.raw_user_meta_data->>'dome','') !~ '^[0-9]{1,12}$'
     or coalesce(new.raw_user_meta_data->>'employee_id','') !~ '^[0-9]{1,12}$' then
   raise exception 'Dôme et ID employé requis';
  end if;
  insert into public.adt_profiles(id,dome,employee_id,full_name)
  values(new.id,new.raw_user_meta_data->>'dome',new.raw_user_meta_data->>'employee_id',coalesce(new.raw_user_meta_data->>'full_name',''));
 end if;
 return new;
end;
$$;
revoke all on function private.adt_create_profile() from public,anon,authenticated;
