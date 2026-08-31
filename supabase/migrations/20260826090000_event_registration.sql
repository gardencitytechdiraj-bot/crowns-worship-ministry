create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin
  create type public.event_registration_type as enum ('free', 'paid');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_status as enum ('draft', 'published', 'closed', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.registration_status as enum ('confirmed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('not_required', 'pending', 'verified');
exception when duplicate_object then null;
end $$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_en text not null,
  title_ne text not null,
  description_en text not null default '',
  description_ne text not null default '',
  location_en text not null,
  location_ne text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_deadline timestamptz,
  capacity integer not null check (capacity > 0),
  registered_count integer not null default 0 check (registered_count >= 0 and registered_count <= capacity),
  registration_type public.event_registration_type not null default 'free',
  fee_amount numeric(12, 2) check (fee_amount is null or fee_amount >= 0),
  currency text not null default 'NPR' check (char_length(currency) between 3 and 6),
  payment_instructions_en text not null default '',
  payment_instructions_ne text not null default '',
  image_url text,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_dates_are_ordered check (ends_at is null or ends_at > starts_at),
  constraint paid_event_has_fee check (
    (registration_type = 'free' and coalesce(fee_amount, 0) = 0)
    or (registration_type = 'paid' and fee_amount is not null and fee_amount > 0)
  )
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text not null check (char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15),
  phone_normalized text generated always as (regexp_replace(phone, '[^0-9]', '', 'g')) stored,
  email text,
  church_name text,
  district_city text not null,
  age_group text,
  gender text,
  language text not null default 'en' check (language in ('en', 'ne')),
  payment_reference text,
  payment_status public.payment_status not null default 'not_required',
  ticket_code text not null unique,
  status public.registration_status not null default 'confirmed',
  registered_at timestamptz not null default now(),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint checked_in_timestamp_matches check (
    (checked_in and checked_in_at is not null) or (not checked_in and checked_in_at is null)
  )
);

create unique index if not exists registrations_one_active_phone_per_event
  on public.registrations (event_id, phone_normalized)
  where status = 'confirmed';

create index if not exists registrations_event_registered_at_idx
  on public.registrations (event_id, registered_at desc);

create index if not exists registrations_event_checked_in_idx
  on public.registrations (event_id, checked_in)
  where status = 'confirmed';

create table if not exists private.admin_credentials (
  id boolean primary key default true check (id),
  password_hash text,
  bootstrap_hash text,
  password_changed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.admin_sessions (
  token_hash bytea primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists private.admin_login_attempts (
  client_hash bytea primary key,
  attempts integer not null default 0,
  last_attempt_at timestamptz not null default now(),
  blocked_until timestamptz
);

insert into private.admin_credentials (id, bootstrap_hash)
values (true, '$2a$12$JSonoorEEh.0z61VfgenE.OG12NbtzHrlc142pSFKyJ4mtj3rEva2')
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table private.admin_credentials enable row level security;
alter table private.admin_sessions enable row level security;
alter table private.admin_login_attempts enable row level security;

drop policy if exists "Published events are public" on public.events;
create policy "Published events are public"
on public.events
for select
to anon, authenticated
using (status = 'published');

revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
revoke all on public.registrations from anon, authenticated;

grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;
grant all on public.events, public.registrations to service_role;

create or replace function public.register_for_event(
  p_event_id uuid,
  p_full_name text,
  p_phone text,
  p_email text default null,
  p_church_name text default null,
  p_district_city text default null,
  p_age_group text default null,
  p_gender text default null,
  p_language text default 'en',
  p_payment_reference text default null
)
returns table (
  registration_id uuid,
  ticket_code text,
  event_title_en text,
  event_title_ne text,
  event_starts_at timestamptz,
  event_location_en text,
  event_location_ne text,
  registration_payment_status public.payment_status
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  new_registration_id uuid;
  new_ticket_code text;
  normalized_phone text;
  initial_payment_status public.payment_status;
begin
  select * into target_event
  from public.events as event_row
  where event_row.id = p_event_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'EVENT_NOT_FOUND';
  end if;

  if target_event.status <> 'published' then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;

  if target_event.registration_deadline is not null and now() > target_event.registration_deadline then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;

  if target_event.starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;

  if target_event.registered_count >= target_event.capacity then
    raise exception using errcode = 'P0001', message = 'EVENT_FULL';
  end if;

  normalized_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if char_length(normalized_phone) < 7 or char_length(normalized_phone) > 15 then
    raise exception using errcode = 'P0001', message = 'INVALID_PHONE';
  end if;

  if exists (
    select 1 from public.registrations as registration_row
    where registration_row.event_id = p_event_id
      and registration_row.phone_normalized = normalized_phone
      and registration_row.status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REGISTERED';
  end if;

  new_registration_id := gen_random_uuid();
  new_ticket_code := 'CWM-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
  initial_payment_status := case
    when target_event.registration_type = 'paid' then 'pending'::public.payment_status
    else 'not_required'::public.payment_status
  end;

  insert into public.registrations (
    id,
    event_id,
    full_name,
    phone,
    email,
    church_name,
    district_city,
    age_group,
    gender,
    language,
    payment_reference,
    payment_status,
    ticket_code
  ) values (
    new_registration_id,
    p_event_id,
    trim(p_full_name),
    trim(p_phone),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_church_name, '')), ''),
    trim(coalesce(p_district_city, '')),
    nullif(trim(coalesce(p_age_group, '')), ''),
    nullif(trim(coalesce(p_gender, '')), ''),
    case when p_language = 'ne' then 'ne' else 'en' end,
    nullif(trim(coalesce(p_payment_reference, '')), ''),
    initial_payment_status,
    new_ticket_code
  );

  update public.events
  set registered_count = registered_count + 1
  where id = p_event_id;

  return query
  select
    new_registration_id,
    new_ticket_code,
    target_event.title_en,
    target_event.title_ne,
    target_event.starts_at,
    target_event.location_en,
    target_event.location_ne,
    initial_payment_status;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'ALREADY_REGISTERED';
end;
$$;

create or replace function public.admin_bootstrap(p_setup_code text, p_new_password text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stored_bootstrap_hash text;
begin
  if char_length(coalesce(p_new_password, '')) < 12 then
    raise exception using errcode = 'P0001', message = 'PASSWORD_TOO_SHORT';
  end if;

  select bootstrap_hash into stored_bootstrap_hash
  from private.admin_credentials
  where id = true
  for update;

  if stored_bootstrap_hash is null
    or extensions.crypt(coalesce(p_setup_code, ''), stored_bootstrap_hash) <> stored_bootstrap_hash then
    return false;
  end if;

  update private.admin_credentials
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
      bootstrap_hash = null,
      password_changed_at = now()
  where id = true;

  delete from private.admin_sessions;
  return true;
end;
$$;

create or replace function public.admin_login(p_password text, p_client_identifier text)
returns table (session_token text, session_expires_at timestamptz, error_code text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stored_password_hash text;
  attempt_row private.admin_login_attempts%rowtype;
  identifier_hash bytea;
  raw_token text;
  expiry timestamptz;
begin
  identifier_hash := extensions.digest(coalesce(p_client_identifier, 'unknown'), 'sha256');

  select * into attempt_row
  from private.admin_login_attempts
  where client_hash = identifier_hash
  for update;

  if found and attempt_row.blocked_until is not null and attempt_row.blocked_until > now() then
    return query select null::text, null::timestamptz, 'TOO_MANY_ATTEMPTS'::text;
    return;
  end if;

  select password_hash into stored_password_hash
  from private.admin_credentials
  where id = true;

  if stored_password_hash is null then
    return query select null::text, null::timestamptz, 'SETUP_REQUIRED'::text;
    return;
  end if;

  if extensions.crypt(coalesce(p_password, ''), stored_password_hash) <> stored_password_hash then
    insert into private.admin_login_attempts (client_hash, attempts, last_attempt_at, blocked_until)
    values (identifier_hash, 1, now(), null)
    on conflict (client_hash) do update
    set attempts = case
          when private.admin_login_attempts.last_attempt_at < now() - interval '15 minutes' then 1
          else private.admin_login_attempts.attempts + 1
        end,
        last_attempt_at = now(),
        blocked_until = case
          when (
            case
              when private.admin_login_attempts.last_attempt_at < now() - interval '15 minutes' then 1
              else private.admin_login_attempts.attempts + 1
            end
          ) >= 5 then now() + interval '15 minutes'
          else null
        end;

    return query select null::text, null::timestamptz, 'INVALID_PASSWORD'::text;
    return;
  end if;

  delete from private.admin_login_attempts where client_hash = identifier_hash;
  delete from private.admin_sessions where expires_at <= now();

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  expiry := now() + interval '12 hours';

  insert into private.admin_sessions (token_hash, expires_at)
  values (extensions.digest(raw_token, 'sha256'), expiry);

  return query select raw_token, expiry, null::text;
end;
$$;

create or replace function public.admin_validate_session(p_session_token text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  valid_session boolean;
begin
  update private.admin_sessions
  set last_seen_at = now()
  where token_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256')
    and expires_at > now()
  returning true into valid_session;

  return coalesce(valid_session, false);
end;
$$;

create or replace function public.admin_logout(p_session_token text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from private.admin_sessions
  where token_hash = extensions.digest(coalesce(p_session_token, ''), 'sha256');
$$;

create or replace function public.admin_cancel_registration(p_registration_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_registration public.registrations%rowtype;
begin
  select * into target_registration
  from public.registrations
  where id = p_registration_id
  for update;

  if not found or target_registration.status = 'cancelled' then
    return false;
  end if;

  update public.registrations
  set status = 'cancelled', checked_in = false, checked_in_at = null
  where id = p_registration_id;

  update public.events
  set registered_count = greatest(registered_count - 1, 0)
  where id = target_registration.event_id;

  return true;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.register_for_event(uuid, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_bootstrap(text, text) from public, anon, authenticated;
revoke all on function public.admin_login(text, text) from public, anon, authenticated;
revoke all on function public.admin_validate_session(text) from public, anon, authenticated;
revoke all on function public.admin_logout(text) from public, anon, authenticated;
revoke all on function public.admin_cancel_registration(uuid) from public, anon, authenticated;

grant execute on function public.register_for_event(uuid, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.admin_bootstrap(text, text) to service_role;
grant execute on function public.admin_login(text, text) to service_role;
grant execute on function public.admin_validate_session(text) to service_role;
grant execute on function public.admin_logout(text) to service_role;
grant execute on function public.admin_cancel_registration(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.events is 'Bilingual public event catalogue with atomic capacity tracking.';
comment on table public.registrations is 'Private attendee records. Access only through service-role Edge Functions.';
