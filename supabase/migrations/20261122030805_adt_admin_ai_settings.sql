create table private.adt_ai_config (
 singleton boolean primary key default true check(singleton),
 model text not null default '',
 skill_tct text not null default '',
 skill_olymel text not null default '',
 key_secret_id uuid,
 revision integer not null default 0,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table private.adt_ai_config enable row level security;
revoke all on private.adt_ai_config from public,anon,authenticated;
insert into private.adt_ai_config(singleton) values(true);

-- Appel serveur uniquement : aucune lecture directe par les navigateurs.
create function public.adt_ai_config_read() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('model',c.model,'skill_tct',c.skill_tct,'skill_olymel',c.skill_olymel,
 'api_key',(select decrypted_secret from vault.decrypted_secrets where id=c.key_secret_id),
 'revision',c.revision,'updated_at',c.updated_at)
 from private.adt_ai_config c where singleton;
$$;
revoke all on function public.adt_ai_config_read() from public,anon,authenticated;
grant execute on function public.adt_ai_config_read() to service_role;

create function public.adt_ai_config_write(p_model text,p_skill_tct text,p_skill_olymel text,p_key text,p_actor uuid,p_revision integer) returns integer
language plpgsql security definer set search_path='' as $$
declare old private.adt_ai_config; sid uuid;
begin
 select * into old from private.adt_ai_config where singleton for update;
 if old.revision<>p_revision then raise exception 'revision_conflict'; end if;
 if length(p_model)>200 or length(p_skill_tct)>20000 or length(p_skill_olymel)>20000 then raise exception 'invalid_settings'; end if;
 sid:=old.key_secret_id;
 if p_key is not null and length(trim(p_key))>0 then
  if length(p_key)>512 or length(p_key)<20 then raise exception 'invalid_key'; end if;
  if sid is null then sid:=vault.create_secret(p_key,'adt_openrouter_api_key','Clé OpenRouter ADT - serveur uniquement');
  else perform vault.update_secret(sid,p_key); end if;
 end if;
 update private.adt_ai_config set model=p_model,skill_tct=p_skill_tct,skill_olymel=p_skill_olymel,
 key_secret_id=sid,revision=revision+1,updated_by=p_actor,updated_at=now() where singleton;
 return old.revision+1;
end;
$$;
revoke all on function public.adt_ai_config_write(text,text,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.adt_ai_config_write(text,text,text,text,uuid,integer) to service_role;

create table private.adt_ai_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket timestamptz not null,
 requests integer not null default 1,
 primary key(user_id,bucket)
);
alter table private.adt_ai_usage enable row level security;
revoke all on private.adt_ai_usage from public,anon,authenticated;
create function public.adt_ai_consume(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare minute_count integer; day_count integer;
begin
 -- Verrou par utilisateur pour rendre les limites atomiques entre instances.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 delete from private.adt_ai_usage where bucket<now()-interval '2 days';
 select coalesce(sum(requests),0) into day_count from private.adt_ai_usage where user_id=p_user and bucket>=date_trunc('day',now());
 select requests into minute_count from private.adt_ai_usage where user_id=p_user and bucket=date_trunc('minute',now());
 if day_count>=100 or coalesce(minute_count,0)>=5 then return false; end if;
 insert into private.adt_ai_usage(user_id,bucket) values(p_user,date_trunc('minute',now()))
 on conflict(user_id,bucket) do update set requests=adt_ai_usage.requests+1;
 return true;
end;
$$;
revoke all on function public.adt_ai_consume(uuid) from public,anon,authenticated;
grant execute on function public.adt_ai_consume(uuid) to service_role;
