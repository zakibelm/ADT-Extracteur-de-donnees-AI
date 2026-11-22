begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000a01','adt-test-a@example.com','{}'),
 ('00000000-0000-4000-8000-000000000a02','adt-test-b@example.com','{}');
insert into public.adt_profiles(id,dome) values ('00000000-0000-4000-8000-000000000a01','adt-test-a'),('00000000-0000-4000-8000-000000000a02','adt-test-b');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated","app_metadata":{}}',true);
insert into public.adt_extractions(user_id,request_id,row_index,doc_type,data) values ('00000000-0000-4000-8000-000000000a01','00000000-0000-4000-8000-000000000b01',0,'TCT','{"tournee":"SYNTHETIC"}');
do $$ begin
 if (select count(*) from public.adt_profiles)<>1 then raise exception 'profile isolation failed'; end if;
 if (select count(*) from public.adt_extractions)<>1 then raise exception 'own data read failed'; end if;
 begin
 update public.adt_profiles set account_role='admin';
 raise exception 'role escalation allowed';
 exception when insufficient_privilege then null; end;
 begin
 insert into public.adt_extractions(user_id,request_id,row_index,doc_type,data) values ('00000000-0000-4000-8000-000000000a02',gen_random_uuid(),0,'TCT','{}');
 raise exception 'cross-owner insert allowed';
 exception when insufficient_privilege then null; end;
 begin
 update public.adt_extractions set user_id='00000000-0000-4000-8000-000000000a02';
 raise exception 'owner reassignment allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a02","role":"authenticated","app_metadata":{}}',true);
do $$ begin
 if (select count(*) from public.adt_extractions)<>0 then raise exception 'cross-user read allowed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated","app_metadata":{"adt_role":"admin"}}',true);
do $$ begin
 if not exists(select 1 from public.adt_extractions where data->>'tournee'='SYNTHETIC') then raise exception 'admin read failed'; end if;
end $$;
set local role anon;
do $$ begin
 begin
 perform * from public.adt_extractions;
 raise exception 'anonymous read allowed';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
