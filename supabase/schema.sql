-- Kenik - databaseschema voor Supabase (Postgres)
-- Uitvoeren in de SQL-editor van het Supabase-project. Zie README-deploy.md.
--
-- Principes
--  * Ouders zijn gebruikers in auth.users (inloggen met e-maillink). Een gezin heeft 1..n ouders (family_members).
--  * Kinderen hebben geen account: rijen in children. Een kind krijgt op een toestel een "kindtoken" (JWT met rol child
--    en claim child_id), uitgereikt door de edge function child-login in ruil voor een code die een ouder maakte.
--  * Row Level Security: ouders zien alles van hun gezin; een kindtoken ziet alleen zijn eigen kind en mag alleen
--    zijn eigen voortgang en aanvragen schrijven. Instellingen, lijsten, opdrachten en beloningen zijn alleen voor ouders.

create extension if not exists pgcrypto;

-- ---------- gezinnen en ouders ----------
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text,
  region text not null default 'be-nl',
  lang text not null default 'nl',
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('owner','parent')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (family_id, email)
);

-- ---------- kinderen ----------
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  grade int not null default 4,
  theme jsonb not null default '{"style":"tuin","variant":"hondjes"}',
  modules jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- voortgang: punten, reeks, tuin, statistieken per oefening, beurten, logboek. Eén rij per kind; kind mag ze zelf schrijven.
create table if not exists child_progress (
  child_id uuid primary key references children(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  points int not null default 0,
  streak int not null default 0,
  best int not null default 0,
  garden jsonb not null default '{"flowers":0,"collected":[],"parties":0}',
  stats jsonb not null default '{}',
  sessions jsonb not null default '[]',
  log jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- toegangscodes (15 min geldig, eenmalig) en aangemelde toestellen
create table if not exists child_codes (
  code text primary key,
  child_id uuid not null references children(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists child_devices (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  label text,
  token_hash text not null,          -- sha256 van het vernieuwingstoken dat het toestel bewaart
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked_at timestamptz
);

-- ---------- gezinsinhoud (alleen ouders schrijven) ----------
-- Eén JSON-document per soort, zoals de app ze lokaal bewaart: lists, texts, verbs, rewards, tasks, settings.
create table if not exists family_docs (
  family_id uuid not null references families(id) on delete cascade,
  key text not null check (key in ('lists','texts','verbs','rewards','tasks','settings')),
  data jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (family_id, key)
);

-- aanvragen uit de winkel: kind maakt aan, ouder keurt goed of weigert
create table if not exists reward_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  reward text not null,
  cost int not null,
  status text not null default 'open' check (status in ('open','ok','no')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ---------- helpers ----------
create or replace function is_parent_of(fam uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_members where family_id = fam and user_id = auth.uid());
$$;

-- claim uit een kindtoken (de edge function zet role = 'child' en child_id in de JWT)
create or replace function jwt_child_id() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'child_id', '')::uuid;
$$;
create or replace function is_child(ch uuid) returns boolean language sql stable as $$
  select jwt_child_id() = ch;
$$;

-- nieuw gezin voor een ouder die voor het eerst inlogt
create or replace function create_family(p_name text default null) returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  insert into families(name) values (p_name) returning id into fid;
  insert into family_members(family_id, user_id, role) values (fid, auth.uid(), 'owner');
  return fid;
end $$;

-- uitnodiging aannemen: de ingelogde ouder wordt lid van het gezin waarvoor zijn e-mail uitgenodigd is
create or replace function accept_invites() returns setof uuid language plpgsql security definer set search_path = public as $$
declare r record; mail text;
begin
  select email into mail from auth.users where id = auth.uid();
  for r in select * from family_invites where lower(email) = lower(mail) and accepted_at is null loop
    insert into family_members(family_id, user_id, role) values (r.family_id, auth.uid(), 'parent') on conflict do nothing;
    update family_invites set accepted_at = now() where id = r.id;
    return next r.family_id;
  end loop;
end $$;

-- ---------- Row Level Security ----------
alter table families enable row level security;
alter table family_members enable row level security;
alter table family_invites enable row level security;
alter table children enable row level security;
alter table child_progress enable row level security;
alter table child_codes enable row level security;
alter table child_devices enable row level security;
alter table family_docs enable row level security;
alter table reward_requests enable row level security;

create policy fam_parent on families for all using (is_parent_of(id)) with check (is_parent_of(id));
create policy fam_child_read on families for select using (exists (select 1 from children c where c.family_id = families.id and is_child(c.id)));

create policy members_parent on family_members for select using (is_parent_of(family_id));
create policy members_owner_delete on family_members for delete using (exists (select 1 from family_members m where m.family_id = family_members.family_id and m.user_id = auth.uid() and m.role = 'owner') and role <> 'owner');

create policy invites_parent on family_invites for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));

create policy children_parent on children for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));
create policy children_child_read on children for select using (is_child(id));

create policy progress_parent on child_progress for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));
create policy progress_child on child_progress for all using (is_child(child_id)) with check (is_child(child_id));

create policy codes_parent on child_codes for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));
create policy devices_parent on child_devices for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));
create policy devices_child_read on child_devices for select using (is_child(child_id));

create policy docs_parent on family_docs for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));
-- een kind mag lijsten, teksten, werkwoorden, beloningen, opdrachten en instellingen lezen, niet schrijven
create policy docs_child_read on family_docs for select using (exists (select 1 from children c where c.family_id = family_docs.family_id and is_child(c.id)));

create policy requests_parent on reward_requests for all using (is_parent_of(family_id)) with check (is_parent_of(family_id));
create policy requests_child_insert on reward_requests for insert with check (is_child(child_id));
create policy requests_child_read on reward_requests for select using (is_child(child_id));

-- opdrachten afgewerkt door een kind: de status staat in family_docs/tasks, dat een kind niet mag schrijven.
-- Daarom een aparte functie die alleen die ene overgang toelaat.
create or replace function complete_task(p_family uuid, p_task text, p_score text) returns void language plpgsql security definer set search_path = public as $$
declare ch uuid := jwt_child_id();
begin
  if ch is null or not exists (select 1 from children where id = ch and family_id = p_family) then raise exception 'not allowed'; end if;
  update family_docs set data = (
    select jsonb_agg(case when t->>'id' = p_task and t->>'status' = 'open'
      then t || jsonb_build_object('status','done','doneAt',now(),'doneBy',ch,'score',p_score) else t end)
    from jsonb_array_elements(data) t), updated_at = now()
  where family_id = p_family and key = 'tasks';
end $$;

-- opruimen van verlopen codes (kan als cron in Supabase, of gebeurt bij elke nieuwe code vanuit de app)
create or replace function purge_codes() returns void language sql security definer set search_path = public as $$
  delete from child_codes where expires_at < now();
$$;

-- ---------- rol voor kindtokens en rechten op functies ----------
do $$ begin if not exists (select 1 from pg_roles where rolname = 'child') then create role child nologin; end if; end $$;
grant child to authenticator;
grant usage on schema public to child;
grant select on all tables in schema public to child;
grant insert on reward_requests to child;
grant insert, update on child_progress to child;

alter function jwt_child_id() set search_path = public;
alter function is_child(uuid) set search_path = public;
revoke execute on function create_family(text) from public, anon;
revoke execute on function accept_invites() from public, anon;
revoke execute on function complete_task(uuid, text, text) from public, anon, authenticated;
revoke execute on function purge_codes() from public, anon;
revoke execute on function is_parent_of(uuid) from public, anon;
revoke execute on function jwt_child_id() from public, anon;
revoke execute on function is_child(uuid) from public, anon;
grant execute on function create_family(text) to authenticated;
grant execute on function accept_invites() to authenticated;
grant execute on function purge_codes() to authenticated;
grant execute on function is_parent_of(uuid) to authenticated, child;
grant execute on function jwt_child_id() to authenticated, child;
grant execute on function is_child(uuid) to authenticated, child;
grant execute on function complete_task(uuid, text, text) to child;

-- ---------- beheer (zie ook migratie kenik_admin) ----------
-- Tabel admins: enkel wie hier in staat, krijgt admin_stats(). Rijen toevoegen kan alleen via het Supabase-dashboard:
--   insert into admins(user_id) select id from auth.users where email = 'iemand@voorbeeld.be';
-- admin_stats() geeft uitsluitend geaggregeerde cijfers terug (geen namen, geen e-mails).

-- ---------------------------------------------------------------------------
-- Foto met je gsm: de laptop maakt een sessie met token, de gsm stuurt de foto's naar de edge function "ai"
-- met dat token, de laptop leest het resultaat. (Toegepast als migratie kenik_photo_sessions + kenik_photo_session_token_fix.)
-- ---------------------------------------------------------------------------
create table if not exists photo_sessions (
  token text primary key,
  family_id uuid not null references families(id) on delete cascade,
  prompt text not null,
  status text not null default 'open',          -- open | reading | done | error
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table photo_sessions enable row level security;
create policy "ouders lezen eigen fotosessies" on photo_sessions for select
  using (family_id in (select family_id from family_members where user_id = auth.uid()));

create or replace function public.create_photo_session(p_prompt text)
returns text language plpgsql security definer set search_path = public as $$
declare fam uuid; tok text;
begin
  select family_id into fam from family_members where user_id = auth.uid() order by joined_at limit 1;
  if fam is null then raise exception 'not allowed' using errcode = '42501'; end if;
  delete from photo_sessions where expires_at < now();
  -- geen gen_random_bytes: pgcrypto staat in schema extensions en valt buiten het search_path
  tok := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into photo_sessions(token, family_id, prompt) values (tok, fam, p_prompt);
  return tok;
end $$;
