import QRCode from 'qrcode';

const copy = {
  en: {
    eyebrow: "Crown's Worship Ministry · Nepal", heroTitle: 'Welcome to registration page', heroIntro: 'Click on <strong>CONFIRM MY PLACE</strong> to secure your place in different programs.<br /><br />If you have any difficulties with registration, please contact our Manager Samikchya Rai (<a href="https://wa.me/9779816190786" target="_blank" rel="noopener">+977 9816190786</a>).', heroLink: 'Explore gatherings', upNext: "What's next", eventsTitle: 'Fill the form with your information', sectionNote: 'We always have room for you!', liveNote: 'Registration is live', refresh: 'Refresh', emptyTitle: 'The next room is taking shape.', emptyBody: "No gatherings are open right now. Check back soon or follow Crown's for the next invitation.", closing: 'Worship is not a moment we attend.<br /><strong>It is a life we carry.</strong>', savePlace: 'Save your place', yourDetails: 'Your details', paymentDetails: 'Payment details', confirmPlace: 'Confirm my place', formFootnote: "Your phone number helps us prevent duplicate registrations. We will only use your details for this gathering.", placeSaved: 'Place saved', ticketTitle: 'See you in the room.', ticketIntro: 'Keep this ticket handy when you arrive. A copy of the code is your printable fallback.', ticketFor: 'Ticket for', qrFallback: 'If your camera cannot scan, show this code at check-in.', printTicket: 'Print ticket', registerAnother: 'Register someone else', nameLabel: 'Full name', phoneLabel: 'Mobile number', emailLabel: 'Email <small>(optional)</small>', districtLabel: 'District / city', churchLabel: 'Church / community <small>(optional)</small>', ageLabel: 'Age group <small>(optional)</small>', genderLabel: 'Gender <small>(optional)</small>', paymentRef: 'Payment reference <small>(optional)</small>', consent: "I agree to receive event updates from Crown's Worship Ministry.", free: 'Free', paid: 'Paid', full: 'Full', seats: (n) => `${n} seat${n === 1 ? '' : 's'} left`, fee: (amount, currency) => `${currency || 'NPR'} ${amount}`, paymentHint: (amount, currency) => `This is a paid gathering · ${currency || 'NPR'} ${amount}. Payment instructions will be shared after you register.`, fetchError: 'We could not load gatherings right now. Please refresh and try again.', fallbackWarning: 'Live event details are temporarily unavailable. These starter gatherings are still available for registration. / प्रत्यक्ष कार्यक्रम विवरण अहिले अस्थायी रूपमा उपलब्ध छैन। यी प्रारम्भिक कार्यक्रमहरूमा अझै दर्ता गर्न सकिन्छ।', submitError: 'We could not save your registration right now. Please check your details and try again. / दर्ता अहिले सुरक्षित गर्न सकिएन। कृपया विवरण जाँचेर फेरि प्रयास गर्नुहोस्।', busy: 'Saving your place…', noEvent: 'This gathering is no longer available. / यो कार्यक्रम अब उपलब्ध छैन।', invalidPhone: 'Please enter a valid mobile number.', genericError: 'Something went wrong. Please try again.'
  },
  ne: {
    eyebrow: 'Crown\'s Worship Ministry · नेपाल', heroTitle: 'दर्ता पृष्ठमा स्वागत छ', heroIntro: 'कार्यक्रममा आफ्नो ठाउँ सुरक्षित गर्न <strong>मेरो ठाउँ पक्का गर्नुहोस्</strong> मा क्लिक गर्नुहोस्।<br /><br />दर्तामा कुनै कठिनाइ भएमा हाम्रो व्यवस्थापक समिक्षा राईलाई (<a href="https://wa.me/9779816190786" target="_blank" rel="noopener">+977 9816190786</a>) सम्पर्क गर्नुहोस्।', heroLink: 'कार्यक्रमहरू हेर्नुहोस्', upNext: 'अब के हुँदैछ', eventsTitle: 'आफ्नो विवरणसहित फारम भर्नुहोस्', sectionNote: 'हामीसँग तपाईंका लागि सधैं ठाउँ छ!', liveNote: 'दर्ता खुला छ', refresh: 'ताजा गर्नुहोस्', emptyTitle: 'अर्को कोठा तयार हुँदैछ।', emptyBody: 'अहिले कुनै कार्यक्रम खुला छैन। चाँडै फेरि हेर्नुहोस् वा अर्को निमन्त्रणाका लागि Crown\'s लाई पछ्याउनुहोस्।', closing: 'आराधना हामी सहभागी हुने क्षण मात्र होइन।<br /><strong>यो हामीले बोक्ने जीवन हो।</strong>', savePlace: 'आफ्नो ठाउँ सुरक्षित गर्नुहोस्', yourDetails: 'तपाईंको विवरण', paymentDetails: 'भुक्तानी विवरण', confirmPlace: 'मेरो ठाउँ पक्का गर्नुहोस्', formFootnote: 'तपाईंको फोन नम्बरले दोहोरो दर्ता रोक्न मद्दत गर्छ। तपाईंको विवरण यही कार्यक्रमका लागि मात्र प्रयोग हुनेछ।', placeSaved: 'ठाउँ सुरक्षित भयो', ticketTitle: 'कार्यक्रममा भेटौंला।', ticketIntro: 'आउँदा यो टिकट साथमा राख्नुहोस्। कोडको प्रति प्रिन्ट गर्न पनि सकिन्छ।', ticketFor: 'टिकट', qrFallback: 'क्यामेराले स्क्यान गर्न नसके चेक-इनमा यो कोड देखाउनुहोस्।', printTicket: 'टिकट प्रिन्ट गर्नुहोस्', registerAnother: 'अर्को व्यक्ति दर्ता गर्नुहोस्', nameLabel: 'पूरा नाम', phoneLabel: 'मोबाइल नम्बर', emailLabel: 'इमेल <small>(वैकल्पिक)</small>', districtLabel: 'जिल्ला / सहर', churchLabel: 'चर्च / समुदाय <small>(वैकल्पिक)</small>', ageLabel: 'उमेर समूह <small>(वैकल्पिक)</small>', genderLabel: 'लिङ्ग <small>(वैकल्पिक)</small>', paymentRef: 'भुक्तानी सन्दर्भ <small>(वैकल्पिक)</small>', consent: "Crown's Worship Ministry बाट कार्यक्रमसम्बन्धी सूचना पाउन म सहमत छु।", free: 'निःशुल्क', paid: 'शुल्क लाग्ने', full: 'भरियो', seats: (n) => `${n} सिट बाँकी`, fee: (amount, currency) => `${currency || 'NPR'} ${amount}`, paymentHint: (amount, currency) => `यो शुल्क लाग्ने कार्यक्रम हो · ${currency || 'NPR'} ${amount}। दर्तापछि भुक्तानी विवरण पठाइनेछ।`, fetchError: 'अहिले कार्यक्रमहरू लोड गर्न सकिएन। कृपया ताजा गरेर फेरि प्रयास गर्नुहोस्।', fallbackWarning: 'प्रत्यक्ष कार्यक्रम विवरण अहिले अस्थायी रूपमा उपलब्ध छैन। यी प्रारम्भिक कार्यक्रमहरूमा अझै दर्ता गर्न सकिन्छ। / Live event details are temporarily unavailable. These starter gatherings are still available for registration.', submitError: 'दर्ता अहिले सुरक्षित गर्न सकिएन। कृपया विवरण जाँचेर फेरि प्रयास गर्नुहोस्। / We could not save your registration right now. Please check your details and try again.', busy: 'ठाउँ सुरक्षित हुँदैछ…', noEvent: 'यो कार्यक्रम अब उपलब्ध छैन। / This gathering is no longer available.', invalidPhone: 'कृपया मान्य मोबाइल नम्बर लेख्नुहोस्।', genericError: 'केही समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।'
  }
};

const fallbackEvents = [
  { id: 'baby-basics-support', slug: 'baby-basics-support', title_en: 'Baby Basics Support', title_ne: 'शिशुका आधारभूत आवश्यकतामा सहयोग', description_en: 'A caring space for families to find practical baby supplies, encouragement, and community support.', description_ne: 'शिशुका आधारभूत सामग्री, हौसला र समुदायको सहयोग पाउन परिवारहरूका लागि मायालु भेटघाट।', location_en: 'Pokhara, Nepal', location_ne: 'पोखरा, नेपाल', starts_at: null, ends_at: null, capacity: 100, registered_count: 0, registration_type: 'free', fee_amount: 0, currency: 'NPR', status: 'published' },
  { id: 'young-adult-womens-gathering', slug: 'young-adult-womens-gathering', title_en: "Young Adult Women's Gathering", title_ne: 'युवा वयस्क महिलाहरूको भेटघाट', description_en: 'A welcoming gathering for young adult women to connect, grow in faith, and encourage one another.', description_ne: 'युवा वयस्क महिलाहरूका लागि संगति, विश्वासमा वृद्धि र एकअर्कालाई हौसला दिने आत्मीय भेटघाट।', location_en: 'Pokhara, Nepal', location_ne: 'पोखरा, नेपाल', starts_at: null, ends_at: null, capacity: 100, registered_count: 0, registration_type: 'free', fee_amount: 0, currency: 'NPR', status: 'published' },
  { id: 'holy-roar-worship-school', slug: 'holy-roar-worship-school', title_en: 'Holy Roar Worship School', title_ne: 'होली रोअर आराधना विद्यालय', description_en: 'A practical worship school for singers, musicians, and worship leaders who want to serve with skill and heart.', description_ne: 'गायक, वाद्यवादक र आराधना अगुवाहरूका लागि सीप र समर्पित हृदयसाथ सेवाका लागि व्यावहारिक आराधना विद्यालय।', location_en: 'Pokhara, Nepal', location_ne: 'पोखरा, नेपाल', starts_at: null, ends_at: null, capacity: 100, registered_count: 0, registration_type: 'free', fee_amount: 0, currency: 'NPR', status: 'published' }
];

const state = { language: 'en', events: [], selectedEvent: null, usingFallback: false };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const eventGrid = $('[data-event-grid]');
const emptyState = $('[data-empty-state]');
const notice = $('[data-page-notice]');
const registrationDialog = $('[data-registration-dialog]');
const confirmationDialog = $('[data-confirmation-dialog]');
const registrationForm = $('[data-registration-form]');
const dateLocale = () => state.language === 'ne' ? 'ne-NP' : 'en-NP';
const text = (key, ...args) => typeof copy[state.language][key] === 'function' ? copy[state.language][key](...args) : copy[state.language][key];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function pick(record, ...keys) {
  for (const key of keys) if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  return '';
}

function unwrap(payload) {
  if (Array.isArray(payload)) return payload;
  const value = payload?.events || payload?.items || payload?.data || payload?.event || payload;
  if (Array.isArray(value)) return value;
  return value?.events || value?.items || value?.registrations || [];
}

function normalizeEvent(item) {
  const event = item || {};
  return {
    ...event,
    id: pick(event, 'id', 'event_id'),
    title_en: pick(event, 'title_en', 'titleEn', 'title') || 'Crown\'s gathering',
    title_ne: pick(event, 'title_ne', 'titleNe', 'title_en', 'title') || 'Crown\'s gathering',
    description_en: pick(event, 'description_en', 'descriptionEn', 'description') || '',
    description_ne: pick(event, 'description_ne', 'descriptionNe', 'description_en', 'description') || '',
    location_en: pick(event, 'location_en', 'locationEn', 'location') || 'Pokhara, Nepal',
    location_ne: pick(event, 'location_ne', 'locationNe', 'location_en', 'location') || 'पोखरा, नेपाल',
    starts_at: pick(event, 'starts_at', 'startsAt', 'date'),
    ends_at: pick(event, 'ends_at', 'endsAt'),
    capacity: Number(pick(event, 'capacity') || 0),
    registered_count: Number(pick(event, 'registered_count', 'registeredCount', 'attendee_count') || 0),
    registration_type: pick(event, 'registration_type', 'registrationType', 'type') || 'free',
    fee_amount: pick(event, 'fee_amount', 'feeAmount', 'fee'),
    currency: pick(event, 'currency') || 'NPR',
    image_url: pick(event, 'image_url', 'imageUrl', 'image'),
    status: pick(event, 'status') || 'published',
    payment_instructions_en: pick(event, 'payment_instructions_en', 'paymentInstructionsEn') || '',
    payment_instructions_ne: pick(event, 'payment_instructions_ne', 'paymentInstructionsNe') || ''
  };
}

function getFallbackEvents() {
  return fallbackEvents.map(normalizeEvent);
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) } });
  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
  if (!response.ok) {
    const errorDetail = payload?.error;
    const error = new Error(errorDetail?.message || errorDetail?.code || payload?.message || (typeof errorDetail === 'string' ? errorDetail : '') || `HTTP_${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function formatDate(event) {
  if (!event.starts_at) return state.language === 'ne' ? 'मिति घोषणा गरिनेछ' : 'Date to be announced';
  const date = new Date(event.starts_at);
  if (Number.isNaN(date.getTime())) return event.starts_at;
  const dateString = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  const timeString = new Intl.DateTimeFormat(dateLocale(), { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${dateString} · ${timeString}`;
}

function formatFee(event) {
  if (event.registration_type !== 'paid') return text('free');
  return text('fee', Number(event.fee_amount || 0).toLocaleString(dateLocale()), event.currency);
}

function eventIsFull(event) {
  return event.capacity > 0 && event.registered_count >= event.capacity;
}

function renderEvents() {
  eventGrid.setAttribute('aria-busy', 'false');
  const visibleEvents = state.events.filter((event) => event.status !== 'archived' && event.status !== 'draft' && event.status !== 'closed');
  eventGrid.innerHTML = visibleEvents.map((event) => {
    const title = state.language === 'ne' ? event.title_ne : event.title_en;
    const description = state.language === 'ne' ? event.description_ne : event.description_en;
    const location = state.language === 'ne' ? event.location_ne : event.location_en;
    const full = eventIsFull(event);
    const remaining = Math.max(0, event.capacity - event.registered_count);
    const image = event.image_url ? `<img src="${escapeHtml(event.image_url)}" alt="" loading="lazy" onerror="this.style.display='none'" />` : '';
    return `<article class="event-card">
      <div class="event-image">${image}<div class="event-badges"><span class="badge ${event.registration_type === 'paid' ? 'paid' : ''}">${event.registration_type === 'paid' ? text('paid') : text('free')}</span>${full ? '<span class="badge full">' + text('full') + '</span>' : ''}</div></div>
      <div class="event-content"><p class="event-date">${escapeHtml(formatDate(event))}</p><h3>${escapeHtml(title)}</h3><p class="event-description">${escapeHtml(description)}</p><div class="event-meta"><span><b class="meta-icon" aria-hidden="true">⌖</b>${escapeHtml(location)}</span><span class="capacity ${full ? 'is-full' : ''}"><b class="meta-icon" aria-hidden="true">◷</b>${full ? text('full') : text('seats', remaining)} · ${escapeHtml(formatFee(event))}</span></div><button class="register-button" type="button" data-register-event="${escapeHtml(event.id)}" ${full ? 'disabled' : ''}>${full ? text('full') : text('confirmPlace')}</button></div>
    </article>`;
  }).join('');
  emptyState.hidden = visibleEvents.length > 0;
  $$('.register-button', eventGrid).forEach((button) => button.addEventListener('click', () => openRegistration(button.dataset.registerEvent)));
}

function showNotice(message) { notice.textContent = message; notice.hidden = !message; }

async function loadEvents() {
  showNotice('');
  eventGrid.setAttribute('aria-busy', 'true');
  try {
    const payload = await request('/api/events');
    const apiEvents = (unwrap(payload) || []).map(normalizeEvent).filter((event) => event.id);
    state.usingFallback = apiEvents.length === 0;
    state.events = state.usingFallback ? getFallbackEvents() : apiEvents;
    renderEvents();
    if (state.usingFallback) showNotice(text('fallbackWarning'));
  } catch (error) {
    state.usingFallback = true;
    state.events = getFallbackEvents();
    renderEvents();
    showNotice(text('fallbackWarning'));
  }
}

function openRegistration(eventId) {
  const event = state.events.find((item) => String(item.id) === String(eventId));
  if (!event || eventIsFull(event)) { showNotice(text('noEvent')); return; }
  state.selectedEvent = event;
  registrationForm.reset();
  $('[name="event_id"]', registrationForm).value = event.id;
  $('[data-registration-title]').textContent = state.language === 'ne' ? event.title_ne : event.title_en;
  $('[data-registration-meta]').textContent = `${formatDate(event)} · ${state.language === 'ne' ? event.location_ne : event.location_en}`;
  const paidFields = $('[data-payment-fields]');
  paidFields.hidden = event.registration_type !== 'paid';
  $('[data-payment-hint]').textContent = event.registration_type === 'paid' ? text('paymentHint', Number(event.fee_amount || 0).toLocaleString(dateLocale()), event.currency) : '';
  $('[data-form-error]').hidden = true;
  registrationDialog.showModal();
  window.setTimeout(() => $('[name="full_name"]', registrationForm)?.focus(), 50);
}

function closeDialog(dialog) { dialog?.close(); }

function readRegistration() {
  const formData = new FormData(registrationForm);
  return Object.fromEntries(formData.entries());
}

function getRegistrationResult(payload) {
  const data = payload?.registration || payload?.result || payload?.data || payload || {};
  return {
    id: pick(data, 'registration_id', 'registrationId', 'id'),
    ticket_code: pick(data, 'ticket_code', 'ticketCode', 'code'),
    event_title_en: pick(data, 'event_title_en', 'eventTitleEn', 'title_en') || state.selectedEvent?.title_en,
    event_title_ne: pick(data, 'event_title_ne', 'eventTitleNe', 'title_ne') || state.selectedEvent?.title_ne,
    starts_at: pick(data, 'event_starts_at', 'eventStartsAt', 'starts_at') || state.selectedEvent?.starts_at,
    location_en: pick(data, 'event_location_en', 'eventLocationEn', 'location_en') || state.selectedEvent?.location_en,
    location_ne: pick(data, 'event_location_ne', 'eventLocationNe', 'location_ne') || state.selectedEvent?.location_ne
  };
}

function renderQr(ticketCode) {
  const target = $('[data-qr]');
  target.innerHTML = '';
  const value = `${window.location.origin}/events/?ticket=${encodeURIComponent(ticketCode)}`;
  const canvas = document.createElement('canvas');
  target.append(canvas);
  try {
    QRCode.toCanvas(canvas, value, { width: 136, margin: 1, errorCorrectionLevel: 'M' }).catch(() => {
      if (target.contains(canvas)) renderQrFallback(target, ticketCode);
    });
  } catch { renderQrFallback(target, ticketCode); }
}

function renderQrFallback(target, ticketCode) {
  target.innerHTML = `<div class="qr-fallback"><strong>QR</strong><br />${escapeHtml(ticketCode)}</div>`;
}

function openConfirmation(result, registration) {
  const title = state.language === 'ne' ? result.event_title_ne : result.event_title_en;
  const location = state.language === 'ne' ? result.location_ne : result.location_en;
  $('[data-ticket-name]').textContent = registration.full_name;
  $('[data-ticket-event]').textContent = title;
  $('[data-ticket-meta]').textContent = `${formatDate({ starts_at: result.starts_at })} · ${location}`;
  $('[data-ticket-code]').textContent = result.ticket_code || 'CWM-TICKET';
  renderQr(result.ticket_code || registration.full_name);
  confirmationDialog.showModal();
}

registrationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = $('button[type="submit"]', registrationForm);
  const errorBox = $('[data-form-error]');
  const values = readRegistration();
  if (String(values.phone || '').replace(/\D/g, '').length < 7) { errorBox.textContent = text('invalidPhone'); errorBox.hidden = false; return; }
  submit.disabled = true; submit.setAttribute('aria-busy', 'true'); submit.querySelector('span').textContent = text('busy'); errorBox.hidden = true;
  try {
    const payload = await request('/api/events/register', { method: 'POST', body: JSON.stringify({ ...values, language: state.language }) });
    const result = getRegistrationResult(payload);
    if (!result.id || !result.ticket_code) throw new Error('Registration response was incomplete.');
    registrationDialog.close();
    openConfirmation(result, values);
    const current = state.events.find((item) => item.id === state.selectedEvent?.id);
    if (current) { current.registered_count += 1; }
  } catch (error) {
    const code = error?.payload?.code || error?.payload?.error?.code;
    errorBox.textContent = code === 'EVENT_FULL' ? text('noEvent') : text('submitError');
    errorBox.hidden = false;
  } finally {
    submit.disabled = false; submit.removeAttribute('aria-busy'); submit.querySelector('span').textContent = text('confirmPlace');
  }
});

function setLanguage(language) {
  state.language = language;
  document.documentElement.lang = language === 'ne' ? 'ne' : 'en';
  $$('[data-i18n]').forEach((node) => { const value = text(node.dataset.i18n); if (value) node.innerHTML = typeof value === 'function' ? value() : value; });
  $$('[data-language-toggle]').forEach((button) => { button.setAttribute('aria-pressed', String(language === 'ne')); button.setAttribute('aria-label', language === 'en' ? 'Switch to Nepali' : 'Switch to English'); });
  if (state.events.length) renderEvents();
  if (state.usingFallback) showNotice(text('fallbackWarning'));
  if (state.selectedEvent && registrationDialog.open) openRegistration(state.selectedEvent.id);
}

$$('[data-language-toggle]').forEach((button) => button.addEventListener('click', () => setLanguage(state.language === 'en' ? 'ne' : 'en')));
$$('[data-close-registration]').forEach((button) => button.addEventListener('click', () => closeDialog(registrationDialog)));
$$('[data-close-confirmation]').forEach((button) => button.addEventListener('click', () => closeDialog(confirmationDialog)));
$('[data-register-another]').addEventListener('click', () => { confirmationDialog.close(); if (state.selectedEvent) openRegistration(state.selectedEvent.id); });
$('[data-print-ticket]').addEventListener('click', () => window.print());
$('[data-refresh]').addEventListener('click', loadEvents);
$$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }));
$('[data-current-year]').textContent = new Date().getFullYear();
setLanguage('en');
loadEvents();
