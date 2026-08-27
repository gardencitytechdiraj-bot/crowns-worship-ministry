import { ApiError, assert, email, isoDate, nonNegativeNumber, optionalString, phone, pick, positiveInteger, stringField } from './http.js';

export const EVENT_FIELDS = 'id,slug,title_en,title_ne,description_en,description_ne,location_en,location_ne,starts_at,ends_at,registration_deadline,capacity,registered_count,registration_type,fee_amount,currency,payment_instructions_en,payment_instructions_ne,image_url,status,created_at,updated_at';

export function normalizeSlug(value) {
  const slug = stringField(value, 'slug', { min: 1, max: 120, required: true }).toLowerCase();
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug), 400, 'INVALID_INPUT', 'slug must contain lowercase letters, numbers, and single hyphens.');
  return slug;
}

export function normalizeEventInput(input, { partial = false } = {}) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 400, 'INVALID_INPUT', 'Event data must be an object.');
  const output = {};
  const field = (key, fn, required = false) => {
    if (partial && !Object.prototype.hasOwnProperty.call(input, key)) return;
    output[key] = fn(input[key], key, { required });
  };

  field('slug', (value) => normalizeSlug(value), true);
  field('title_en', (value, name, options) => stringField(value, name, { min: 1, max: 200, required: options.required }), true);
  field('title_ne', (value, name, options) => stringField(value, name, { min: 1, max: 200, required: options.required }), true);
  field('description_en', (value, name, options) => stringField(value, name, { max: 5000, required: options.required }));
  field('description_ne', (value, name, options) => stringField(value, name, { max: 5000, required: options.required }));
  field('location_en', (value, name, options) => stringField(value, name, { min: 1, max: 300, required: options.required }), true);
  field('location_ne', (value, name, options) => stringField(value, name, { min: 1, max: 300, required: options.required }), true);
  field('starts_at', (value, name, options) => isoDate(value, name, { required: options.required }));
  field('ends_at', (value, name) => isoDate(value, name));
  field('registration_deadline', (value, name) => isoDate(value, name));
  field('capacity', (value, name) => positiveInteger(value, name), true);
  field('registration_type', (value, name) => pick(value, ['free', 'paid'], name), true);
  field('fee_amount', (value, name) => value === null || value === undefined || value === '' ? null : nonNegativeNumber(value, name));
  field('currency', (value, name, options) => (stringField(value, name, { min: 3, max: 6, required: options.required }) || '').toUpperCase() || null, false);
  field('payment_instructions_en', (value, name, options) => stringField(value, name, { max: 3000, required: options.required }));
  field('payment_instructions_ne', (value, name, options) => stringField(value, name, { max: 3000, required: options.required }));
  field('image_url', (value, name) => optionalString(value, name, { max: 1000 }));
  field('status', (value, name) => value === null || value === undefined || value === '' ? null : pick(value, ['draft', 'published', 'closed', 'archived'], name));

  if (Object.prototype.hasOwnProperty.call(output, 'ends_at') && output.ends_at && output.starts_at && new Date(output.ends_at) <= new Date(output.starts_at)) {
    throw new ApiError(400, 'INVALID_INPUT', 'ends_at must be after starts_at.');
  }
  if (Object.prototype.hasOwnProperty.call(output, 'registration_deadline') && output.registration_deadline && output.starts_at && new Date(output.registration_deadline) > new Date(output.starts_at)) {
    throw new ApiError(400, 'INVALID_INPUT', 'registration_deadline must be before starts_at.');
  }

  const type = output.registration_type;
  if (type === 'free' && Object.prototype.hasOwnProperty.call(output, 'fee_amount')) {
    assert(output.fee_amount === null || output.fee_amount === 0, 400, 'INVALID_INPUT', 'Free events cannot have a fee.');
  }
  if (type === 'paid' && Object.prototype.hasOwnProperty.call(output, 'fee_amount')) {
    assert(output.fee_amount > 0, 400, 'INVALID_INPUT', 'Paid events must have a fee.');
  }
  if (!partial && type === 'paid') assert(output.fee_amount > 0, 400, 'INVALID_INPUT', 'Paid events must have a fee.');
  if (!partial && type === 'free') output.fee_amount = 0;
  if (!partial) {
    output.description_en ??= '';
    output.description_ne ??= '';
    output.starts_at ??= null;
    output.ends_at ??= null;
    output.registration_deadline ??= null;
    output.fee_amount ??= 0;
    output.currency ??= 'NPR';
    output.payment_instructions_en ??= '';
    output.payment_instructions_ne ??= '';
    output.image_url ??= null;
    output.status ??= 'draft';
  }
  return output;
}

export function publicEvent(event) {
  const now = Date.now();
  const deadline = event.registration_deadline ? Date.parse(event.registration_deadline) : null;
  const open = event.status === 'published'
    && (!event.starts_at || Date.parse(event.starts_at) > now)
    && (!deadline || deadline >= now)
    && event.registered_count < event.capacity;
  return { ...event, spots_remaining: Math.max(event.capacity - event.registered_count, 0), registration_open: open };
}

export function registrationInput(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 400, 'INVALID_INPUT', 'Registration data must be an object.');
  const language = input.language === undefined ? 'en' : pick(input.language, ['en', 'ne'], 'language');
  return {
    p_event_id: input.event_id,
    p_full_name: stringField(input.full_name, 'full_name', { min: 2, max: 120, required: true }),
    p_phone: phone(input.phone),
    p_email: email(input.email),
    p_church_name: optionalString(input.church_name, 'church_name', { max: 200 }),
    p_district_city: stringField(input.district_city, 'district_city', { min: 1, max: 160, required: true }),
    p_age_group: optionalString(input.age_group, 'age_group', { max: 60 }),
    p_gender: optionalString(input.gender, 'gender', { max: 60 }),
    p_language: language,
    p_payment_reference: optionalString(input.payment_reference, 'payment_reference', { max: 160 }),
  };
}
