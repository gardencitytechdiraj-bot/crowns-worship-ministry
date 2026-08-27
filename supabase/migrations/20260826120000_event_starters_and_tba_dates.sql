-- Allow events to be published before their date is confirmed, and seed the
-- initial public invitations. This migration is safe to run more than once.

alter table public.events
  alter column starts_at drop not null;

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

  if target_event.starts_at is not null and target_event.starts_at <= now() then
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

insert into public.events (
  slug,
  title_en,
  title_ne,
  description_en,
  description_ne,
  location_en,
  location_ne,
  starts_at,
  ends_at,
  registration_deadline,
  capacity,
  registration_type,
  fee_amount,
  currency,
  payment_instructions_en,
  payment_instructions_ne,
  status
)
values
  (
    'baby-basics-support',
    'Baby Basics Support',
    'शिशुका आधारभूत आवश्यकतामा सहयोग',
    'A caring space for families to find practical baby supplies, encouragement, and community support.',
    'शिशुका आधारभूत सामग्री, हौसला र समुदायको सहयोग पाउन परिवारहरूका लागि मायालु भेटघाट।',
    'Pokhara, Nepal',
    'पोखरा, नेपाल',
    null,
    null,
    null,
    100,
    'free',
    0,
    'NPR',
    '',
    '',
    'published'
  ),
  (
    'young-adult-womens-gathering',
    'Young Adult Women''s Gathering',
    'युवा वयस्क महिलाहरूको भेटघाट',
    'A welcoming gathering for young adult women to connect, grow in faith, and encourage one another.',
    'युवा वयस्क महिलाहरूका लागि संगति, विश्वासमा वृद्धि र एकअर्कालाई हौसला दिने आत्मीय भेटघाट।',
    'Pokhara, Nepal',
    'पोखरा, नेपाल',
    null,
    null,
    null,
    100,
    'free',
    0,
    'NPR',
    '',
    '',
    'published'
  ),
  (
    'holy-roar-worship-school',
    'Holy Roar Worship School',
    'होली रोअर आराधना विद्यालय',
    'A practical worship school for singers, musicians, and worship leaders who want to serve with skill and heart.',
    'गायक, वाद्यवादक र आराधना अगुवाहरूका लागि सीप र समर्पित हृदयसाथ सेवाका लागि व्यावहारिक आराधना विद्यालय।',
    'Pokhara, Nepal',
    'पोखरा, नेपाल',
    null,
    null,
    null,
    100,
    'free',
    0,
    'NPR',
    '',
    '',
    'published'
  )
on conflict (slug) do nothing;
