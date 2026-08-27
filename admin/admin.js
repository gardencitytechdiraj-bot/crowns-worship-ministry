const adminState = { language: 'en', authMode: 'login', events: [], attendees: [], sessionToken: sessionStorage.getItem('crowns_admin_token') || '', selectedEvent: null, imageUrl: '' };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const eventForm = $('[data-event-form]');
const eventDialog = $('[data-event-dialog]');
const authView = $('[data-auth-view]');
const dashboardView = $('[data-dashboard-view]');
const scannerDialog = $('[data-scanner-dialog]');
const scannerPreview = $('[data-scanner-preview]');
const scannerVideo = $('[data-scanner-video]');
const scannerStatus = $('[data-scanner-status]');
const scannerCameraButton = $('[data-scanner-camera]');
const scannerCode = $('[data-scanner-code]');
const scannerState = { detector: null, stream: null, timer: 0, active: false, processing: false };

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function pick(record, ...keys) { for (const key of keys) if (record?.[key] !== undefined && record?.[key] !== null) return record[key]; return ''; }
function unwrap(payload, key) { if (Array.isArray(payload)) return payload; const value = payload?.[key] || payload?.items || payload?.data || payload || []; if (Array.isArray(value)) return value; return value?.[key] || value?.items || []; }
function localDate(value) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const pad = (n) => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function isoDate(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function prettyDate(value) { if (!value) return adminState.language === 'ne' ? 'मिति घोषणा गरिनेछ' : 'Date to be announced'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(adminState.language === 'ne' ? 'ne-NP' : 'en-NP', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date); }
function slugify(value) { return String(value || 'gathering').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75) || `gathering-${Date.now()}`; }
function eventName(event) { return adminState.language === 'ne' ? event.title_ne : event.title_en; }

async function request(url, options = {}, authenticated = false) {
  const headers = { Accept: 'application/json', ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  const token = adminState.sessionToken;
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const raw = await response.text();
  let payload = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw; }
  if (!response.ok) { const error = new Error(payload?.error || payload?.message || `HTTP_${response.status}`); error.status = response.status; error.payload = payload; throw error; }
  return payload;
}

function errorMessage(error, fallback = 'Something went wrong. Please try again.') { return error?.payload?.message || error?.payload?.error?.message || (typeof error?.payload?.error === 'string' ? error.payload.error : '') || error?.message || fallback; }

function normalizeEvent(item) {
  const event = item || {};
  return { ...event, id: pick(event, 'id', 'event_id'), slug: pick(event, 'slug'), title_en: pick(event, 'title_en', 'titleEn', 'title') || '', title_ne: pick(event, 'title_ne', 'titleNe', 'title_en', 'title') || '', description_en: pick(event, 'description_en', 'descriptionEn', 'description') || '', description_ne: pick(event, 'description_ne', 'descriptionNe', 'description_en', 'description') || '', location_en: pick(event, 'location_en', 'locationEn', 'location') || '', location_ne: pick(event, 'location_ne', 'locationNe', 'location_en', 'location') || '', starts_at: pick(event, 'starts_at', 'startsAt', 'date'), ends_at: pick(event, 'ends_at', 'endsAt'), registration_deadline: pick(event, 'registration_deadline', 'registrationDeadline'), capacity: Number(pick(event, 'capacity') || 0), registered_count: Number(pick(event, 'registered_count', 'registeredCount', 'attendee_count') || 0), registration_type: pick(event, 'registration_type', 'registrationType', 'type') || 'free', fee_amount: pick(event, 'fee_amount', 'feeAmount', 'fee'), currency: pick(event, 'currency') || 'NPR', image_url: pick(event, 'image_url', 'imageUrl', 'image') || '', status: pick(event, 'status') || 'draft', payment_instructions_en: pick(event, 'payment_instructions_en', 'paymentInstructionsEn') || '', payment_instructions_ne: pick(event, 'payment_instructions_ne', 'paymentInstructionsNe') || '' };
}

function normalizeAttendee(item) {
  const attendee = item || {};
  return { ...attendee, id: pick(attendee, 'id', 'registration_id', 'registrationId'), event_id: pick(attendee, 'event_id', 'eventId'), full_name: pick(attendee, 'full_name', 'fullName', 'name') || '', phone: pick(attendee, 'phone'), email: pick(attendee, 'email'), church_name: pick(attendee, 'church_name', 'churchName'), district_city: pick(attendee, 'district_city', 'districtCity'), ticket_code: pick(attendee, 'ticket_code', 'ticketCode', 'code'), payment_status: pick(attendee, 'payment_status', 'paymentStatus') || 'not_required', status: pick(attendee, 'status') || 'confirmed', checked_in: Boolean(pick(attendee, 'checked_in', 'checkedIn')), registered_at: pick(attendee, 'registered_at', 'registeredAt') };
}

function setAuthError(message = '') { const node = $('[data-auth-error]'); node.textContent = message; node.hidden = !message; }
function setDashboardAlert(message = '') { const node = $('[data-dashboard-alert]'); node.textContent = message; node.hidden = !message; }

function setAuthMode(mode) {
  adminState.authMode = mode;
  const setup = mode === 'setup';
  $$('[data-auth-mode]').forEach((button) => { const active = button.dataset.authMode === mode; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); });
  $$('[data-setup-field]').forEach((field) => { field.hidden = !setup; const input = $('input', field); if (input) input.required = setup; });
  $('[data-auth-card-title]').textContent = setup ? 'Set up the portal' : 'Sign in';
  $('[data-auth-card-subtitle]').textContent = setup ? 'Use the one-time setup code from your ministry administrator.' : 'Use your ministry admin password.';
  $('[data-auth-title]').textContent = setup ? 'Set a safe foundation.' : 'Make the room ready.';
  $('[data-auth-intro]').textContent = setup ? 'Create the password that keeps your gatherings and guest list private.' : 'Manage gatherings, welcome guests, and keep every seat accounted for.';
  $('[data-password-label]').textContent = setup ? 'Create password' : 'Password';
  $('[data-auth-submit-label]').textContent = setup ? 'Create admin password' : 'Sign in securely';
  $('[data-auth-note]').textContent = setup ? 'Use 12 or more characters. Your password is never stored in this browser.' : 'Sessions expire after 12 hours. Your password is never stored in this browser.';
  $('[name="password"]', $('[data-auth-form]')).autocomplete = setup ? 'new-password' : 'current-password';
  setAuthError('');
}

async function inspectSession() {
  try {
    const payload = await request('/api/admin/session', { headers: adminState.sessionToken ? { Authorization: `Bearer ${adminState.sessionToken}` } : {} });
    const authenticated = Boolean(payload?.authenticated || payload?.valid || payload?.session_valid);
    const setupRequired = Boolean(payload?.setup_required || payload?.setupRequired || payload?.code === 'SETUP_REQUIRED');
    if (authenticated && adminState.sessionToken) { showDashboard(); return; }
    if (setupRequired) setAuthMode('setup');
  } catch (error) {
    if (error?.payload?.code === 'SETUP_REQUIRED' || error?.payload?.error === 'SETUP_REQUIRED' || error?.payload?.error?.code === 'SETUP_REQUIRED') setAuthMode('setup');
    if (error.status === 401 || error.status === 403) { adminState.sessionToken = ''; sessionStorage.removeItem('crowns_admin_token'); }
  }
}

function tokenFrom(payload) { return pick(payload, 'session_token', 'sessionToken', 'token') || pick(payload?.session, 'token', 'session_token') || pick(payload?.data, 'token', 'session_token'); }

$('[data-auth-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const submit = $('[data-auth-submit]');
  if (adminState.authMode === 'setup' && values.password !== values.confirm_password) { setAuthError('The passwords do not match.'); return; }
  submit.disabled = true; submit.setAttribute('aria-busy', 'true'); setAuthError('');
  try {
    const body = adminState.authMode === 'setup' ? { action: 'setup', setup_code: values.setup_code, new_password: values.password } : { action: 'login', password: values.password, client_identifier: `cwm-admin-${location.host}` };
    const payload = await request('/api/admin/session', { method: 'POST', body: JSON.stringify(body) });
    if (adminState.authMode === 'setup') {
      const setupOk = payload?.success !== false && payload?.setup_complete !== false && payload?.ok !== false;
      if (!setupOk) throw new Error('The setup code was not accepted.');
      setAuthMode('login'); form.reset(); setAuthError('Password created. Sign in to continue.');
    } else {
      const token = tokenFrom(payload);
      if (!token) throw new Error('Sign in did not return a session.');
      adminState.sessionToken = token; sessionStorage.setItem('crowns_admin_token', token); showDashboard();
    }
  } catch (error) { setAuthError(errorMessage(error, adminState.authMode === 'setup' ? 'Setup could not be completed. Check the code and try again.' : 'Sign in failed. Check your password and try again.')); }
  finally { submit.disabled = false; submit.removeAttribute('aria-busy'); }
});

function showDashboard() { authView.hidden = true; dashboardView.hidden = false; $('[data-logout]').hidden = false; refreshDashboard(); }
function showAuth() { dashboardView.hidden = true; authView.hidden = false; $('[data-logout]').hidden = true; }

async function refreshDashboard() {
  setDashboardAlert('');
  try {
    const [eventsPayload, registrationsPayload] = await Promise.all([request('/api/events', {}, true), request('/api/admin/registrations', {}, true)]);
    adminState.events = (unwrap(eventsPayload, 'events') || []).map(normalizeEvent).filter((event) => event.id);
    adminState.attendees = (unwrap(registrationsPayload, 'registrations') || []).map(normalizeAttendee).filter((attendee) => attendee.id);
    renderStats(); renderEventsTable(); populateEventFilter(); renderAttendees();
  } catch (error) {
    if (error.status === 401 || error.status === 403) { signOut({ remote: false }); return; }
    setDashboardAlert(errorMessage(error, 'We could not refresh the portal. Please try again.'));
  }
}

function renderStats() {
  const published = adminState.events.filter((event) => event.status === 'published').length;
  const activeAttendees = adminState.attendees.filter((attendee) => attendee.status !== 'cancelled');
  const checkedIn = activeAttendees.filter((attendee) => attendee.checked_in).length;
  const seats = adminState.events.filter((event) => event.status === 'published').reduce((sum, event) => sum + Math.max(0, event.capacity - event.registered_count), 0);
  $('[data-stat-events]').textContent = published; $('[data-stat-attendees]').textContent = activeAttendees.length; $('[data-stat-checked-in]').textContent = checkedIn; $('[data-stat-seats]').textContent = seats;
}

function renderEventsTable() {
  const table = $('[data-events-table]');
  const events = [...adminState.events].sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));
  table.innerHTML = events.map((event) => { const seats = Math.max(0, event.capacity - event.registered_count); return `<tr><td><div class="event-cell"><strong>${escapeHtml(eventName(event))}</strong><small>${escapeHtml(event.location_en || event.location_ne)}</small></div></td><td>${escapeHtml(prettyDate(event.starts_at))}</td><td><strong>${event.registered_count}</strong> / ${event.capacity}<small class="table-caption">${seats} open</small></td><td><span class="status-pill ${escapeHtml(event.status)}">${escapeHtml(event.status)}</span></td><td><div class="row-actions"><button class="row-action" type="button" data-edit-event="${escapeHtml(event.id)}">Edit</button>${event.status !== 'archived' ? `<button class="row-action cancel" type="button" data-archive-event-row="${escapeHtml(event.id)}">Archive</button>` : ''}</div></td></tr>`; }).join('');
  $('[data-events-empty]').hidden = events.length > 0;
  $$('[data-edit-event]', table).forEach((button) => button.addEventListener('click', () => openEventEditor(button.dataset.editEvent)));
  $$('[data-archive-event-row]', table).forEach((button) => button.addEventListener('click', () => archiveEvent(button.dataset.archiveEventRow)));
}

function populateEventFilter() { const select = $('[data-attendee-event]'); const previous = select.value; select.innerHTML = '<option value="">All gatherings</option>' + adminState.events.map((event) => `<option value="${escapeHtml(event.id)}">${escapeHtml(eventName(event))}</option>`).join(''); select.value = adminState.events.some((event) => event.id === previous) ? previous : ''; }
function attendeesForView() {
  const query = $('[data-attendee-search]').value.trim().toLowerCase(); const eventId = $('[data-attendee-event]').value; const status = $('[data-attendee-status]').value; const checkin = $('[data-attendee-checkin]').value;
  return adminState.attendees.filter((attendee) => { const event = adminState.events.find((item) => item.id === attendee.event_id); const haystack = `${attendee.full_name} ${attendee.phone} ${attendee.ticket_code} ${attendee.email}`.toLowerCase(); return (!query || haystack.includes(query)) && (!eventId || attendee.event_id === eventId) && (!status || attendee.status === status) && (!checkin || (checkin === 'checked_in' ? attendee.checked_in : !attendee.checked_in)); });
}
function renderAttendees() {
  const table = $('[data-attendees-table]'); const attendees = attendeesForView();
  table.innerHTML = attendees.map((attendee) => { const event = adminState.events.find((item) => item.id === attendee.event_id); const cancelled = attendee.status === 'cancelled'; return `<tr><td><div class="guest-cell"><strong>${escapeHtml(attendee.full_name)}</strong><small>${escapeHtml(attendee.phone || attendee.email || 'No contact')}</small></div></td><td>${escapeHtml(event ? eventName(event) : '—')}</td><td><span class="payment-pill ${escapeHtml(attendee.payment_status)}">${escapeHtml(attendee.payment_status.replace('_', ' '))}</span>${attendee.payment_status === 'pending' && !cancelled ? `<button class="row-action" type="button" data-verify-payment="${escapeHtml(attendee.id)}">Verify</button>` : ''}</td><td><span class="check-pill ${attendee.checked_in ? 'checked' : ''}">${attendee.checked_in ? 'Checked in' : 'Not yet'}</span></td><td><span class="status-pill ${escapeHtml(attendee.status)}">${escapeHtml(attendee.status)}</span></td><td><div class="row-actions">${!cancelled ? `<button class="row-action" type="button" data-toggle-checkin="${escapeHtml(attendee.id)}">${attendee.checked_in ? 'Undo check-in' : 'Check in'}</button><button class="row-action cancel" type="button" data-cancel-attendee="${escapeHtml(attendee.id)}">Cancel</button>` : ''}</div><small class="ticket-code">${escapeHtml(attendee.ticket_code || '')}</small></td></tr>`; }).join('');
  $('[data-attendees-empty]').hidden = attendees.length > 0;
  $$('[data-toggle-checkin]', table).forEach((button) => button.addEventListener('click', () => updateAttendee(button.dataset.toggleCheckin, { checked_in: !adminState.attendees.find((item) => item.id === button.dataset.toggleCheckin)?.checked_in })));
  $$('[data-verify-payment]', table).forEach((button) => button.addEventListener('click', () => updateAttendee(button.dataset.verifyPayment, { payment_status: 'verified' })));
  $$('[data-cancel-attendee]', table).forEach((button) => button.addEventListener('click', () => cancelAttendee(button.dataset.cancelAttendee)));
}

function setFormValue(name, value) { const field = eventForm.elements[name]; if (field) field.value = value ?? ''; }
function openEventEditor(eventId = '') {
  const existing = adminState.events.find((event) => String(event.id) === String(eventId)); adminState.selectedEvent = existing || null; adminState.imageUrl = existing?.image_url || '';
  eventForm.reset(); setFormValue('id', existing?.id || ''); setFormValue('title_en', existing?.title_en); setFormValue('title_ne', existing?.title_ne); setFormValue('description_en', existing?.description_en); setFormValue('description_ne', existing?.description_ne); setFormValue('location_en', existing?.location_en); setFormValue('location_ne', existing?.location_ne); setFormValue('starts_at', localDate(existing?.starts_at)); setFormValue('ends_at', localDate(existing?.ends_at)); setFormValue('registration_deadline', localDate(existing?.registration_deadline)); setFormValue('capacity', existing?.capacity || ''); setFormValue('registration_type', existing?.registration_type || 'free'); setFormValue('fee_amount', existing?.fee_amount || ''); setFormValue('status', existing?.status || 'draft'); setFormValue('payment_instructions_en', existing?.payment_instructions_en); setFormValue('payment_instructions_ne', existing?.payment_instructions_ne); setFormValue('image_url', adminState.imageUrl);
  $('[data-event-dialog-title]').textContent = existing ? 'Edit gathering' : 'New gathering'; $('[data-archive-event]').hidden = !existing || existing.status === 'archived'; $('[data-event-error]').hidden = true; toggleFeeField(); renderImagePreview(adminState.imageUrl); eventDialog.showModal();
}
function toggleFeeField() { const paid = eventForm.elements.registration_type.value === 'paid'; $('[data-fee-field]').hidden = !paid; eventForm.elements.fee_amount.required = paid; }
function renderImagePreview(url) { const target = $('[data-image-preview]'); target.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Event image preview" onerror="this.remove()" />` : '<span aria-hidden="true">▧</span><small>No image selected</small>'; }

eventForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const values = Object.fromEntries(new FormData(eventForm).entries()); const errorBox = $('[data-event-error]'); const submit = $('button[type="submit"]', eventForm); submit.disabled = true; errorBox.hidden = true;
  const payload = { slug: adminState.selectedEvent?.slug || slugify(values.title_en), title_en: values.title_en.trim(), title_ne: values.title_ne.trim(), description_en: values.description_en.trim(), description_ne: values.description_ne.trim(), location_en: values.location_en.trim(), location_ne: values.location_ne.trim(), starts_at: isoDate(values.starts_at), ends_at: isoDate(values.ends_at), registration_deadline: isoDate(values.registration_deadline), capacity: Number(values.capacity), registration_type: values.registration_type, fee_amount: values.registration_type === 'paid' ? Number(values.fee_amount) : 0, currency: 'NPR', payment_instructions_en: values.payment_instructions_en.trim(), payment_instructions_ne: values.payment_instructions_ne.trim(), image_url: adminState.imageUrl || null, status: values.status };
  try { await request('/api/events', { method: adminState.selectedEvent ? 'PATCH' : 'POST', body: JSON.stringify(adminState.selectedEvent ? { id: adminState.selectedEvent.id, ...payload } : payload) }, true); eventDialog.close(); await refreshDashboard(); } catch (error) { errorBox.textContent = errorMessage(error, 'The gathering could not be saved. Check the dates and try again.'); errorBox.hidden = false; } finally { submit.disabled = false; }
});

async function archiveEvent(eventId) { if (!window.confirm('Archive this gathering? It will no longer appear publicly.')) return; try { await request('/api/events', { method: 'PATCH', body: JSON.stringify({ id: eventId, status: 'archived' }) }, true); await refreshDashboard(); } catch (error) { setDashboardAlert(errorMessage(error, 'This gathering could not be archived.')); } }
async function updateAttendee(id, changes) { try { await request('/api/admin/registrations', { method: 'PATCH', body: JSON.stringify({ id, ...changes }) }, true); await refreshDashboard(); return true; } catch (error) { setDashboardAlert(errorMessage(error, 'That attendee could not be updated.')); return false; } }
async function cancelAttendee(id) { if (!window.confirm('Cancel this registration? The seat will become available again.')) return; await updateAttendee(id, { status: 'cancelled', checked_in: false }); }

$('[data-image-input]').addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { $('[data-event-error]').textContent = 'Please choose an image under 5 MB.'; $('[data-event-error]').hidden = false; return; } const button = $('[data-image-preview]'); button.innerHTML = '<small>Uploading…</small>'; const formData = new FormData(); formData.append('file', file); try { const payload = await request('/api/admin/upload', { method: 'POST', body: formData }, true); adminState.imageUrl = pick(payload, 'image_url', 'imageUrl', 'url') || pick(payload?.data, 'image_url', 'imageUrl', 'url'); if (!adminState.imageUrl) throw new Error('Upload did not return an image URL.'); setFormValue('image_url', adminState.imageUrl); renderImagePreview(adminState.imageUrl); } catch (error) { renderImagePreview(adminState.imageUrl); $('[data-event-error]').textContent = errorMessage(error, 'The image could not be uploaded.'); $('[data-event-error]').hidden = false; } });

function scannerMessage(english, nepali) { return `${english} / ${nepali}`; }
function setScannerStatus(english, nepali) { scannerStatus.textContent = scannerMessage(english, nepali); }
function ticketCodeFromValue(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '';
  try {
    const ticket = new URL(rawValue, window.location.origin).searchParams.get('ticket');
    if (ticket) return ticket.trim();
  } catch { /* A raw ticket code is also valid scanner input. */ }
  return rawValue;
}

async function checkInTicket(value) {
  const code = ticketCodeFromValue(value);
  if (!code) { setDashboardAlert('Enter or scan a ticket code.'); setScannerStatus('Enter a ticket code to continue.', 'जारी राख्न टिकट कोड लेख्नुहोस्।'); return false; }
  const attendee = adminState.attendees.find((item) => String(item.ticket_code || '').trim().toLowerCase() === code.toLowerCase());
  if (!attendee) { setDashboardAlert('No registration matched that ticket code.'); setScannerStatus('No registration matched that code.', 'यो कोडसँग कुनै दर्ता भेटिएन।'); return false; }
  if (attendee.status === 'cancelled') { setDashboardAlert('That registration is cancelled.'); setScannerStatus('That registration is cancelled.', 'यो दर्ता रद्द गरिएको छ।'); return false; }
  if (attendee.checked_in) { setDashboardAlert('That ticket is already checked in.'); setScannerStatus('That ticket is already checked in.', 'यो टिकटबाट पहिले नै चेक-इन भइसकेको छ।'); return false; }
  setScannerStatus('Ticket found. Checking in…', 'टिकट भेटियो। चेक-इन हुँदैछ…');
  const updated = await updateAttendee(attendee.id, { checked_in: true });
  if (!updated) { setScannerStatus('Check-in could not be completed. Try again.', 'चेक-इन पूरा हुन सकेन। फेरि प्रयास गर्नुहोस्।'); return false; }
  $('[data-ticket-search]').value = '';
  setDashboardAlert(`${attendee.full_name} is checked in.`);
  setScannerStatus('Ticket checked in successfully.', 'टिकट सफलतापूर्वक चेक-इन भयो।');
  return true;
}

function stopScanner() {
  scannerState.active = false;
  scannerState.processing = false;
  if (scannerState.timer) window.clearTimeout(scannerState.timer);
  scannerState.timer = 0;
  scannerState.stream?.getTracks().forEach((track) => track.stop());
  scannerState.stream = null;
  scannerState.detector = null;
  scannerVideo.pause();
  scannerVideo.srcObject = null;
  scannerPreview.hidden = true;
  scannerCameraButton.textContent = 'Try camera again';
}

function scheduleScannerFrame() {
  if (scannerState.active) scannerState.timer = window.setTimeout(scanScannerFrame, 250);
}

async function scanScannerFrame() {
  if (!scannerState.active || !scannerState.detector || scannerState.processing) return;
  scannerState.processing = true;
  try {
    const detections = await scannerState.detector.detect(scannerVideo);
    const value = detections.find((item) => item.rawValue)?.rawValue;
    if (value) {
      scannerCode.value = ticketCodeFromValue(value);
      $('[data-ticket-search]').value = scannerCode.value;
      const checkedIn = await checkInTicket(scannerCode.value);
      if (checkedIn) { stopScanner(); scannerDialog.close(); }
    }
  } catch {
    setScannerStatus('The camera could not read that QR code. Try again or enter the code below.', 'क्यामेराले QR कोड पढ्न सकेन। फेरि प्रयास गर्नुहोस् वा तल कोड लेख्नुहोस्।');
  } finally {
    scannerState.processing = false;
    scheduleScannerFrame();
  }
}

async function startScanner() {
  if (scannerState.active) return;
  scannerCameraButton.hidden = false;
  if (!('BarcodeDetector' in window)) {
    scannerCameraButton.hidden = true;
    setScannerStatus('Camera scanning is unavailable here. Enter the ticket code below.', 'यस ब्राउजरमा क्यामेरा स्क्यान उपलब्ध छैन। तल टिकट कोड लेख्नुहोस्।');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    scannerCameraButton.hidden = true;
    setScannerStatus('Camera access is unavailable here. Enter the ticket code below.', 'यस ठाउँमा क्यामेरा उपलब्ध छैन। तल टिकट कोड लेख्नुहोस्।');
    return;
  }
  let detector;
  try {
    detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    try { detector = new window.BarcodeDetector(); } catch {
      scannerCameraButton.hidden = true;
      setScannerStatus('This browser cannot scan QR codes. Enter the ticket code below.', 'यस ब्राउजरले QR कोड स्क्यान गर्न सक्दैन। तल टिकट कोड लेख्नुहोस्।');
      return;
    }
  }
  setScannerStatus('Requesting camera permission…', 'क्यामेरा अनुमति मागिँदैछ…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    if (!scannerDialog.open) { stream.getTracks().forEach((track) => track.stop()); return; }
    scannerState.detector = detector;
    scannerState.stream = stream;
    scannerVideo.srcObject = stream;
    scannerPreview.hidden = false;
    await scannerVideo.play();
    scannerState.active = true;
    scannerCameraButton.textContent = 'Stop camera';
    setScannerStatus('Point the camera at a ticket QR code.', 'टिकटको QR कोडतर्फ क्यामेरा देखाउनुहोस्।');
    scheduleScannerFrame();
  } catch (error) {
    stopScanner();
    setScannerStatus(error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'Camera permission was denied. Enter the code below, or try again.' : 'The camera could not be started. Enter the code below, or try again.', error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'क्यामेरा अनुमति अस्वीकार भयो। तल कोड लेख्नुहोस् वा फेरि प्रयास गर्नुहोस्।' : 'क्यामेरा सुरु हुन सकेन। तल कोड लेख्नुहोस् वा फेरि प्रयास गर्नुहोस्।');
  }
}

function openScanner() {
  stopScanner();
  scannerCode.value = '';
  scannerCameraButton.hidden = false;
  setScannerStatus('Camera access starts only when you choose Scan ticket.', 'तपाईंले टिकट स्क्यान गर्नुहोस् रोजेपछि मात्र क्यामेरा सुरु हुन्छ।');
  scannerDialog.showModal();
  void startScanner();
}

$('[data-manual-checkin]').addEventListener('click', () => { void checkInTicket($('[data-ticket-search]').value); });

function downloadCsv() { const rows = attendeesForView(); const header = ['Name', 'Phone', 'Email', 'Gathering', 'Ticket code', 'Payment status', 'Check-in', 'Registration status', 'Registered at']; const lines = [header, ...rows.map((row) => { const event = adminState.events.find((item) => item.id === row.event_id); return [row.full_name, row.phone, row.email, event ? eventName(event) : '', row.ticket_code, row.payment_status, row.checked_in ? 'checked_in' : 'not_checked_in', row.status, row.registered_at]; })].map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')); const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `crowns-attendees-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); }

function setLanguage(language) { adminState.language = language; document.documentElement.lang = language === 'ne' ? 'ne' : 'en'; $$('[data-language-toggle]').forEach((button) => { button.setAttribute('aria-pressed', String(language === 'ne')); }); renderEventsTable(); populateEventFilter(); renderAttendees(); }
function switchDashboardTab(tab) { $$('[data-dashboard-tab]').forEach((button) => { const active = button.dataset.dashboardTab === tab; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); }); $$('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== tab; }); }
async function signOut({ remote = true } = {}) { if (remote && adminState.sessionToken) { try { await request('/api/admin/session', { method: 'DELETE' }, true); } catch { /* local sign-out still succeeds when the network is unavailable */ } } adminState.sessionToken = ''; sessionStorage.removeItem('crowns_admin_token'); showAuth(); setAuthMode('login'); }

$$('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
$$('[data-new-event]').forEach((button) => button.addEventListener('click', () => openEventEditor()));
$$('[data-close-event]').forEach((button) => button.addEventListener('click', () => eventDialog.close()));
eventDialog.addEventListener('click', (event) => { if (event.target === eventDialog) eventDialog.close(); });
eventForm.elements.registration_type.addEventListener('change', toggleFeeField);
$('[data-archive-event]').addEventListener('click', () => { if (adminState.selectedEvent) { eventDialog.close(); archiveEvent(adminState.selectedEvent.id); } });
$$('[data-dashboard-tab]').forEach((button) => button.addEventListener('click', () => switchDashboardTab(button.dataset.dashboardTab)));
$$('[data-attendee-search], [data-attendee-event], [data-attendee-status], [data-attendee-checkin]').forEach((input) => input.addEventListener('input', renderAttendees));
$$('[data-close-scanner]').forEach((button) => button.addEventListener('click', () => scannerDialog.close()));
$('[data-scan-ticket]').addEventListener('click', openScanner);
scannerCameraButton.addEventListener('click', () => { if (scannerState.active) { stopScanner(); setScannerStatus('Camera stopped. Choose Try camera again when ready.', 'क्यामेरा रोकियो। तयार भएपछि फेरि प्रयास गर्नुहोस्।'); } else void startScanner(); });
$('[data-scanner-manual]').addEventListener('click', () => { void checkInTicket(scannerCode.value); });
scannerCode.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); void checkInTicket(scannerCode.value); } });
scannerDialog.addEventListener('click', (event) => { if (event.target === scannerDialog) scannerDialog.close(); });
scannerDialog.addEventListener('close', stopScanner);
$('[data-download-csv]').addEventListener('click', downloadCsv); $('[data-print-attendees]').addEventListener('click', () => window.print()); $('[data-logout]').addEventListener('click', signOut); $('[data-language-toggle]').addEventListener('click', () => setLanguage(adminState.language === 'en' ? 'ne' : 'en'));
$('[data-current-year]').textContent = new Date().getFullYear();
inspectSession();
