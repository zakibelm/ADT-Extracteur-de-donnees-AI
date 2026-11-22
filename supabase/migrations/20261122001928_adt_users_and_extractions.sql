create table public.adt_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 dome text not null unique check (length(trim(dome)) > 0),
 employee_id text not null default '',
 full_name text not null default '',
 account_role text not null default 'user' check (account_role in ('user','admin')),
 created_at timestamptz not null default now()
);
create table public.adt_extractions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id),
 request_id uuid not null,
 row_index integer not null check (row_index >= 0),
 doc_type text not null check (doc_type in ('TCT','OLYMEL')),
 source_file text not null default '',
 schedule_date date,
 data jsonb not null check (jsonb_typeof(data) = 'object'),
 created_at timestamptz not null default now(),
 unique (user_id, request_id, row_index)
);
create index adt_extractions_user_date on public.adt_extractions(user_id,created_at desc);
alter table public.adt_profiles enable row level security;
alter table public.adt_extractions enable row level security;
revoke all on public.adt_profiles, public.adt_extractions from anon, authenticated;
grant select on public.adt_profiles to authenticated;
grant update (full_name) on public.adt_profiles to authenticated;
grant select, insert on public.adt_extractions to authenticated;
grant update (data) on public.adt_extractions to authenticated;
create policy adt_profile_read on public.adt_profiles for select to authenticated
 using (id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'adt_role')='admin');
create policy adt_profile_name_update on public.adt_profiles for update to authenticated
 using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy adt_extraction_read on public.adt_extractions for select to authenticated
 using (user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'adt_role')='admin');
create policy adt_extraction_insert on public.adt_extractions for insert to authenticated
 with check (user_id=(select auth.uid()) and exists(select 1 from public.adt_profiles where id=(select auth.uid())));
create policy adt_extraction_update on public.adt_extractions for update to authenticated
 using (user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'adt_role')='admin')
 with check (user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'adt_role')='admin');
create schema if not exists private;
create or replace function private.adt_create_profile() returns trigger
 language plpgsql security definer set search_path = '' as $$
begin
 if new.email like '%@adt.system' then
  insert into public.adt_profiles(id,dome,employee_id,full_name)
  values(new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'dome'),''),split_part(new.email,'@',1)),
   coalesce(new.raw_user_meta_data->>'employee_id',''),coalesce(new.raw_user_meta_data->>'full_name',''));
 end if;
 return new;
end;
$$;
revoke all on function private.adt_create_profile() from public, anon, authenticated;
create trigger adt_auth_profile_created after insert on auth.users for each row execute function private.adt_create_profile();
comment on table public.adt_profiles is 'Comptes ADT : rôle non modifiable par le navigateur. Mot de passe conservé uniquement dans Supabase Auth.';
comment on table public.adt_extractions is 'Lignes extraites ADT avec provenance et date du document. Pas de données sources dans Git.';

