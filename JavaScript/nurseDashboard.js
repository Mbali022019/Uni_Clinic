/**

 * ============================================================

 * nurseDashboard.js — UniClinic Nurse Dashboard Logic

 * ============================================================

 * Handles all automation for the nurse-facing dashboard:

 *

 * 1. AUTOMATIC QUEUE MANAGEMENT

 *    - loadQueue()         : Fetches today's queue ordered by queue_number

 *    - saveCheckIn()       : Adds walk-in patient, queue_number auto-assigned

 *    - checkInFromAppointment() : Moves booked patient into live queue

 *

 * 2. AUTOMATIC STATUS UPDATES

 *    - quickStatus()       : One-click Waiting → In Session → Completed

 *    - saveQueueStatus()   : Manual status change via modal

 *    - removeFromQueue()   : Remove a patient from today's queue

 *    NOTE: When status → Completed, the database trigger

 *          trg_auto_visit automatically creates a patient_visits record

 *

 * 3. LIVE DASHBOARD UPDATES

 *    - setupRealtime()     : Supabase realtime subscriptions on

 *                            patient_queue and patient_visits tables

 *    - setInterval()       : Fallback auto-refresh every 20 seconds

 *    - renderQueueStats()  : Updates Waiting/In Session/Completed counters

 *    - updateQueueBadge()  : Updates sidebar badge with waiting count

 *

 * 4. VISIT HISTORY (Filling System)

 *    - loadVisits()        : Loads all patient_visits records

 *    - renderVisits()      : Renders searchable visit cards

 *    - saveVisitRecord()   : Create or update a visit (diagnosis, meds, vitals)

 *    - filterVisits()      : Filter by name, Campus ID, date, status

 *    - viewPatientHistory(): Show all visits for a specific patient

 *

 * 5. APPOINTMENTS

 *    - loadAppointments()  : Loads today's appointments from Supabase

 *    - renderAppointments(): Renders with Check In and + Visit buttons

 *

 * Dependencies:

 *    - window.supabaseClient (from supabase.js)

 *    - localStorage key: 'uniclinic_user' (set on login)

 * ============================================================

 */


'use strict';


const db = window.supabaseClient;

if (!db) alert('Supabase client not loaded.');


// ── Auth ─────────────────────────────────────────────────────

const currentUser = JSON.parse(localStorage.getItem('uniclinic_user') || 'null');

if (!currentUser) {

  showToast('Please login first.', true);

  setTimeout(() => window.location.href = 'login.html', 1500);

}

const nurseName    = currentUser?.full_name || 'Nurse';

const nurseInitial = nurseName.charAt(0).toUpperCase();

document.getElementById('nurseName').textContent    = nurseName;

document.getElementById('nurseAvatar').textContent  = nurseInitial;

document.getElementById('topNurseAvatar').textContent = nurseInitial;


// ── Page routing ─────────────────────────────────────────────

const pageMeta = {

  dashboard:    { title:'Nurse Dashboard',     sub:'Live clinic overview' },

  queue:        { title:'Patient Queue',        sub:'Live walk-in and check-in patients' },

  visits:       { title:'Visit History',        sub:'All patient visit records — searchable and editable' },

  appointments: { title:'Appointments',         sub:'Booked appointments · click Check In to add to queue' },

};


function showPage(id, linkEl) {

  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');

  document.getElementById('page-' + id).style.display = '';

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  if (linkEl) linkEl.classList.add('active');

  else document.querySelectorAll('.nav-item').forEach(n => {

    if (n.getAttribute('onclick')?.includes("'"+id+"'")) n.classList.add('active');

  });

  document.getElementById('pageTitle').textContent = pageMeta[id].title;

  document.getElementById('pageSub').textContent   = pageMeta[id].sub;

  if (id === 'queue')        loadQueue();

  if (id === 'visits')       loadVisits();

  if (id === 'appointments') loadAppointments();

  if (id === 'dashboard')    loadDashboard();

}


// ── Toast ────────────────────────────────────────────────────

function showToast(msg, err = false) {

  const t = document.getElementById('nurseToast');

  t.textContent = msg;

  t.style.background = err ? '#dc2626' : '#0d9488';

  t.style.display = 'block';

  clearTimeout(t._t);

  t._t = setTimeout(() => t.style.display = 'none', 3200);

}


// ── Modals ───────────────────────────────────────────────────

function openModal(id)  { document.getElementById(id).classList.add('open'); }

function closeModal(id) { document.getElementById(id).classList.remove('open'); }


// ── Escape HTML ──────────────────────────────────────────────

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }


// ── Services dropdown ────────────────────────────────────────

async function loadServicesDropdowns() {

  try {

    const { data, error } = await db.from('clinic_services').select('service_id,service_name').eq('is_active',true).order('service_name');

    if (error) throw error;

    ['ci-service','nv-service'].forEach(id => {

      const sel = document.getElementById(id);

      if (!sel) return;

      sel.innerHTML = '<option value="">Select a service…</option>' +

        (data||[]).map(s => `<option value="${esc(s.service_name)}">${esc(s.service_name)}</option>`).join('');

    });

  } catch(e) { console.error('loadServicesDropdowns', e); }

}


// ════════════════════════════════════════════════

// QUEUE

// ════════════════════════════════════════════════

let queueCache = [];


async function loadQueue() {

  try {

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await db

      .from('patient_queue')

      .select('*')

      .eq('queue_date', today)

      .order('queue_number', { ascending: true });

    if (error) throw error;

    queueCache = data || [];

    renderQueue(queueCache);

    renderQueueStats(queueCache);

    renderQueuePreview(queueCache);

    updateQueueBadge(queueCache);

  } catch(e) {

    console.error('loadQueue', e);

    document.getElementById('queueBody').innerHTML =

      '<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:24px;">Failed to load queue.</td></tr>';

  }

}


function renderQueue(data) {

  const tbody = document.getElementById('queueBody');

  if (!data.length) {

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:28px;">No patients in queue today.</td></tr>';

    return;

  }

  const sc = { 'Waiting':'badge-yellow','In Session':'badge-green','Completed':'badge-teal','No Show':'badge-blue','Cancelled':'badge-blue' };

  tbody.innerHTML = data.map(q => {

    const arrival  = new Date(q.arrival_time).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});

    const isActive = q.status === 'Waiting' || q.status === 'In Session';

    return `<tr data-id="${q.queue_id}" data-status="${q.status}">

      <td><span class="q-num${q.status==='In Session'?' active':''}">${q.queue_number}</span></td>

      <td><strong>${esc(q.student_name)}</strong></td>

      <td>${esc(q.student_number||'—')}</td>

      <td>${esc(q.service_name)}</td>

      <td>${arrival}</td>

      <td><span class="badge ${sc[q.status]||'badge-blue'}">${q.status}</span></td>

      <td><div class="tbl-actions">

        ${isActive ? `

          <button class="tbl-btn save" onclick="quickStatus('${q.queue_id}','In Session')">▶ Session</button>

          <button class="tbl-btn edit" onclick="quickStatus('${q.queue_id}','Completed')">✓ Done</button>

        ` : ''}

        <button class="tbl-btn edit" onclick="openStatusModal('${q.queue_id}','${esc(q.student_name)}','${q.status}')">Status</button>

        <button class="tbl-btn del"  onclick="removeFromQueue('${q.queue_id}')">Remove</button>

      </div></td>

    </tr>`;

  }).join('');

}


function renderQueueStats(data) {

  document.getElementById('qs-waiting').textContent   = data.filter(q=>q.status==='Waiting').length;

  document.getElementById('qs-session').textContent   = data.filter(q=>q.status==='In Session').length;

  document.getElementById('qs-completed').textContent = data.filter(q=>q.status==='Completed').length;

  document.getElementById('qs-total').textContent     = data.length;

}


function renderQueuePreview(data) {

  const tbody  = document.getElementById('dash-queuePreview');

  const active = data.filter(q=>q.status!=='Completed'&&q.status!=='Cancelled').slice(0,5);

  if (!active.length) {

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:14px;">Queue is empty.</td></tr>';

    return;

  }

  const sc = { 'Waiting':'badge-yellow','In Session':'badge-green' };

  tbody.innerHTML = active.map(q =>

    `<tr><td><span class="q-num${q.status==='In Session'?' active':''}">${q.queue_number}</span></td>

     <td>${esc(q.student_name)}</td><td>${esc(q.service_name)}</td>

     <td><span class="badge ${sc[q.status]||'badge-blue'}">${q.status}</span></td></tr>`

  ).join('');

}


function updateQueueBadge(data) {

  const waiting = data.filter(q=>q.status==='Waiting').length;

  const badge   = document.getElementById('queueBadge');

  badge.style.display = waiting > 0 ? 'inline' : 'none';

  badge.textContent   = waiting;

}


function filterQueueTable(q) {

  q = q.toLowerCase();

  document.querySelectorAll('#queueBody tr').forEach(r => {

    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';

  });

}


function filterQueueStatus(val) {

  document.querySelectorAll('#queueBody tr[data-status]').forEach(r => {

    r.style.display = (!val || r.dataset.status === val) ? '' : 'none';

  });

}


async function quickStatus(queueId, newStatus) {

  try {

    const { error } = await db.from('patient_queue').update({ status: newStatus }).eq('queue_id', queueId);

    if (error) throw error;

    showToast(newStatus === 'Completed' ? '✓ Patient completed — visit record auto-created.' : '▶ Session started.');

    loadQueue();

    loadDashboardStats();

  } catch(e) { showToast('Failed to update status.', true); }

}


function openStatusModal(queueId, name, currentStatus) {

  document.getElementById('sm-queueId').value    = queueId;

  document.getElementById('statusModalSub').textContent = 'Updating: ' + name;

  document.getElementById('sm-status').value     = currentStatus;

  openModal('statusModal');

}


async function saveQueueStatus() {

  const queueId   = document.getElementById('sm-queueId').value;

  const newStatus = document.getElementById('sm-status').value;

  try {

    const { error } = await db.from('patient_queue').update({ status: newStatus }).eq('queue_id', queueId);

    if (error) throw error;

    closeModal('statusModal');

    showToast('Status updated to: ' + newStatus);

    loadQueue();

    loadDashboardStats();

  } catch(e) { showToast('Failed to update.', true); }

}


async function removeFromQueue(queueId) {

  if (!confirm('Remove this patient from the queue?')) return;

  try {

    const { error } = await db.from('patient_queue').delete().eq('queue_id', queueId);

    if (error) throw error;

    showToast('Removed from queue.');

    loadQueue();

  } catch(e) { showToast('Failed to remove.', true); }

}


// ── Check In ─────────────────────────────────────────────────

function openCheckInModal() {

  ['ci-name','ci-number','ci-notes'].forEach(id => document.getElementById(id).value = '');

  document.getElementById('ci-service').value = '';

  openModal('checkInModal');

}


async function saveCheckIn() {

  const name    = document.getElementById('ci-name').value.trim();

  const number  = document.getElementById('ci-number').value.trim();

  const service = document.getElementById('ci-service').value;

  const notes   = document.getElementById('ci-notes').value.trim();

  if (!name || !service) { showToast('Patient name and service are required.', true); return; }

  try {

    const today = new Date().toISOString().split('T')[0];

    const { error } = await db.from('patient_queue').insert({

      student_name: name, student_number: number||null,

      service_name: service, queue_date: today,

      status: 'Waiting', notes: notes||null,

    });

    if (error) throw error;

    closeModal('checkInModal');

    showToast('✓ Patient added to queue.');

    loadQueue();

    loadDashboardStats();

  } catch(e) {

    console.error('saveCheckIn', e);

    showToast('Failed to check in patient: ' + (e?.message || e), true);

  }

}


// ── Check-in from appointment ─────────────────────────────────

async function checkInFromAppointment(apptId, userId, name, number, service) {

  try {

    const today = new Date().toISOString().split('T')[0];

    await db.from('appointments').update({ check_in_status: true }).eq('appointment_id', apptId);

    const { error } = await db.from('patient_queue').insert({

      appointment_id: apptId, user_id: userId||null,

      student_name: name, student_number: number,

      service_name: service, queue_date: today, status: 'Waiting',

    });

    if (error) throw error;

    showToast('✓ ' + name + ' added to live queue.');

    loadAppointments();

    loadQueue();

  } catch(e) {

    console.error('checkInFromAppointment', e);

    showToast('Check-in failed: ' + (e?.message || e), true);

  }

}


// ════════════════════════════════════════════════

// VISIT HISTORY

// ════════════════════════════════════════════════

let visitsCache = [];


async function loadVisits() {

  try {

    const { data, error } = await db

      .from('patient_visits')

      .select('*')

      .order('visit_date', { ascending: false })

      .order('created_at', { ascending: false });

    if (error) throw error;

    visitsCache = data || [];

    renderVisits(visitsCache);

    renderVisitPreview(visitsCache);

  } catch(e) {

    console.error('loadVisits', e);

    document.getElementById('visitsList').innerHTML =

      '<div style="text-align:center;color:#ef4444;padding:40px;">Failed to load visit records: ' + esc(e?.message || e) + '</div>';

  }

}


function renderVisits(data) {

  const container = document.getElementById('visitsList');

  if (!data.length) {

    container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:40px;">No visit records found.</div>';

    return;

  }

  const sc = { Active:'badge-green', Completed:'badge-teal', Referred:'badge-yellow', 'Follow-up':'badge-blue' };

  container.innerHTML = data.map(v => `

    <div class="visit-card">

      <div class="visit-card-header">

        <div>

          <div class="visit-card-name">${esc(v.student_name)}</div>

          <div class="visit-card-meta">${esc(v.student_number||'No Campus ID')} · ${esc(v.service_name)} · ${v.visit_type} · ${v.visit_date}</div>

        </div>

        <span class="badge ${sc[v.status]||'badge-blue'}">${v.status}</span>

      </div>

      <div class="visit-card-body">

        <div class="visit-field"><label>Diagnosis</label><p>${esc(v.diagnosis||'—')}</p></div>

        <div class="visit-field"><label>Medication</label><p>${esc(v.medication||'—')}</p></div>

        <div class="visit-field"><label>Treatment</label><p>${esc(v.treatment||'—')}</p></div>

        <div class="visit-field"><label>Referral</label><p>${esc(v.referral||'—')}</p></div>

        ${v.blood_pressure||v.temperature||v.weight ? `<div class="visit-field"><label>Vitals</label><p>BP: ${esc(v.blood_pressure||'—')} · Temp: ${esc(v.temperature||'—')} · Wt: ${esc(v.weight||'—')}</p></div>` : ''}

        ${v.attended_by ? `<div class="visit-field"><label>Attended By</label><p>${esc(v.attended_by)}</p></div>` : ''}

        ${v.notes ? `<div class="visit-field" style="grid-column:1/-1;"><label>Notes</label><p>${esc(v.notes)}</p></div>` : ''}

      </div>

      <div class="visit-actions">

        <button class="btn btn-outline btn-sm" onclick="openEditVisitModal('${v.visit_id}')">Edit Record</button>

        <button class="btn btn-sm" style="background:#f1f5f9;color:#64748b;" onclick="viewPatientHistory('${esc(v.student_number||'')}','${esc(v.student_name)}')">All Visits for Patient</button>

      </div>

    </div>`).join('');

}


function renderVisitPreview(data) {

  const tbody  = document.getElementById('dash-visitPreview');

  const recent = data.slice(0,5);

  if (!recent.length) {

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:14px;">No visits yet.</td></tr>';

    return;

  }

  const sc = { Active:'badge-green', Completed:'badge-teal', Referred:'badge-yellow', 'Follow-up':'badge-blue' };

  tbody.innerHTML = recent.map(v =>

    `<tr><td>${esc(v.student_name)}</td><td>${esc(v.service_name)}</td><td>${v.visit_date}</td>

     <td><span class="badge ${sc[v.status]||'badge-blue'}">${v.status}</span></td></tr>`

  ).join('');

}


function filterVisits() {

  const q       = document.getElementById('visitSearch').value.toLowerCase();

  const status  = document.getElementById('visitStatusFilter').value;

  const dateVal = document.getElementById('visitDateFilter').value;

  renderVisits(visitsCache.filter(v => {

    const mQ = !q || v.student_name.toLowerCase().includes(q) || (v.student_number||'').toLowerCase().includes(q);

    const mS = !status  || v.status === status;

    const mD = !dateVal || v.visit_date === dateVal;

    return mQ && mS && mD;

  }));

}


function viewPatientHistory(studentNumber, studentName) {

  showPage('visits', null);

  document.getElementById('visitSearch').value = studentNumber || studentName;

  filterVisits();

  showToast('Showing all visits for ' + studentName);

}


// ── Visit modal ───────────────────────────────────────────────

function openNewVisitModal(prefill = {}) {

  document.getElementById('visitModalTitle').textContent = 'New Visit Record';

  document.getElementById('nv-visitId').value   = '';

  document.getElementById('nv-name').value      = prefill.name || '';

  document.getElementById('nv-number').value    = prefill.number || '';

  document.getElementById('nv-service').value   = prefill.service || '';

  document.getElementById('nv-type').value      = prefill.type || 'Walk-in';

  document.getElementById('nv-date').value      = new Date().toISOString().split('T')[0];

  document.getElementById('nv-attendedBy').value = nurseName;

  ['nv-diagnosis','nv-treatment','nv-medication','nv-bp','nv-temp','nv-weight','nv-referral','nv-notes'].forEach(id => document.getElementById(id).value = '');

  document.getElementById('nv-status').value    = 'Active';

  openModal('newVisitModal');

}


function openEditVisitModal(visitId) {

  const v = visitsCache.find(v => v.visit_id === visitId);

  if (!v) { showToast('Visit not found.', true); return; }

  document.getElementById('visitModalTitle').textContent = 'Edit Visit Record';

  document.getElementById('nv-visitId').value    = v.visit_id;

  document.getElementById('nv-name').value       = v.student_name;

  document.getElementById('nv-number').value     = v.student_number || '';

  document.getElementById('nv-service').value    = v.service_name;

  document.getElementById('nv-type').value       = v.visit_type;

  document.getElementById('nv-date').value       = v.visit_date;

  document.getElementById('nv-attendedBy').value = v.attended_by || '';

  document.getElementById('nv-diagnosis').value  = v.diagnosis || '';

  document.getElementById('nv-treatment').value  = v.treatment || '';

  document.getElementById('nv-medication').value = v.medication || '';

  document.getElementById('nv-bp').value         = v.blood_pressure || '';

  document.getElementById('nv-temp').value       = v.temperature || '';

  document.getElementById('nv-weight').value     = v.weight || '';

  document.getElementById('nv-referral').value   = v.referral || '';

  document.getElementById('nv-status').value     = v.status;

  document.getElementById('nv-notes').value      = v.notes || '';

  openModal('newVisitModal');

}


async function saveVisitRecord() {

  const visitId = document.getElementById('nv-visitId').value;

  const name    = document.getElementById('nv-name').value.trim();

  const service = document.getElementById('nv-service').value;

  if (!name || !service) { showToast('Patient name and service are required.', true); return; }


  const payload = {

    student_name:   name,

    student_number: document.getElementById('nv-number').value.trim() || null,

    service_name:   service,

    visit_type:     document.getElementById('nv-type').value,

    visit_date:     document.getElementById('nv-date').value,

    attended_by:    document.getElementById('nv-attendedBy').value.trim() || null,

    diagnosis:      document.getElementById('nv-diagnosis').value.trim() || null,

    treatment:      document.getElementById('nv-treatment').value.trim() || null,

    medication:     document.getElementById('nv-medication').value.trim() || null,

    blood_pressure: document.getElementById('nv-bp').value.trim() || null,

    temperature:    document.getElementById('nv-temp').value.trim() || null,

    weight:         document.getElementById('nv-weight').value.trim() || null,

    referral:       document.getElementById('nv-referral').value.trim() || null,

    status:         document.getElementById('nv-status').value,

    notes:          document.getElementById('nv-notes').value.trim() || null,

  };


  try {

    let error;

    if (visitId) {

      ({ error } = await db.from('patient_visits').update(payload).eq('visit_id', visitId));

    } else {

      payload.visit_time = new Date().toTimeString().split(' ')[0];

      ({ error } = await db.from('patient_visits').insert(payload));

    }

    if (error) throw error;

    closeModal('newVisitModal');

    showToast(visitId ? '✓ Visit record updated.' : '✓ Visit record saved.');

    loadVisits();

  } catch(e) {

    console.error('saveVisitRecord', e);

    showToast('Failed to save visit record: ' + (e?.message || e), true);

  }

}


// ════════════════════════════════════════════════

// APPOINTMENTS

// ════════════════════════════════════════════════

async function loadAppointments() {

  try {

    const today = new Date().toISOString().split('T')[0];

    const { data: appts, error } = await db

      .from('appointments')

      .select('appointment_id,student_id,appointment_date,appointment_time,status,check_in_status,notes,service_id')

      .eq('appointment_date', today)

      .order('appointment_time');

    if (error) throw error;

    if (!appts?.length) { renderAppointments([]); return; }


    const userIds = [...new Set(appts.map(a=>a.student_id).filter(Boolean))];

    const { data: users } = await db.from('users').select('user_id,full_name,student_number').in('user_id', userIds);

    const userMap = {};

    (users||[]).forEach(u => userMap[u.user_id] = u);


    const svcIds = [...new Set(appts.map(a=>a.service_id).filter(Boolean))];

    let svcMap = {};

    if (svcIds.length) {

      const { data: svcs, error: svcError } = await db.from('clinic_services').select('service_id,service_name').in('service_id', svcIds);

      if (svcError) throw svcError;

      (svcs||[]).forEach(s => svcMap[s.service_id] = s.service_name);

    }


    renderAppointments(appts.map(a => ({ ...a, _user: userMap[a.student_id]||null, _service: svcMap[a.service_id]||null })));

  } catch(e) {

    console.error('loadAppointments', e);

    document.getElementById('nurseApptBody').innerHTML =

      '<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:24px;">Failed to load appointments: ' + esc(e?.message || e) + '</td></tr>';

  }

}


function renderAppointments(data) {

  const tbody = document.getElementById('nurseApptBody');

  if (!data.length) {

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px;">No appointments today.</td></tr>';

    return;

  }

  const sc = { Booked:'badge-green', Waitlisted:'badge-yellow', Cancelled:'badge-blue' };

  tbody.innerHTML = data.map(a => {

    const name    = a._user?.full_name || 'Unknown';

    const number  = a._user?.student_number || '—';

    const service = a._service || '—';

    const canCI   = !a.check_in_status && (a.status === 'Booked' || a.status === 'Waitlisted');

    const statusLabel = a.check_in_status ? 'Checked In' : a.status;

    const statusBadge = a.check_in_status ? 'badge-teal' : (sc[a.status]||'badge-blue');

    return `<tr>

      <td><strong>${esc(name)}</strong></td>

      <td>${esc(number)}</td>

      <td>${esc(service)}</td>

      <td>${esc(a.appointment_time)}</td>

      <td><span class="badge ${statusBadge}">${statusLabel}</span></td>

      <td><div class="tbl-actions">

        ${canCI ? `<button class="tbl-btn save" onclick="checkInFromAppointment('${a.appointment_id}','${a.student_id}','${esc(name)}','${esc(number)}','${esc(service)}')">Check In</button>` : ''}

        <button class="tbl-btn edit" onclick="openNewVisitModal({name:'${esc(name)}',number:'${esc(number)}',service:'${esc(service)}',type:'Appointment'})">+ Visit</button>

      </div></td>

    </tr>`;

  }).join('');

}


// ════════════════════════════════════════════════

// DASHBOARD STATS

// ════════════════════════════════════════════════

async function loadDashboard() {

  await Promise.all([loadDashboardStats(), loadQueue(), loadVisits()]);

}


async function loadDashboardStats() {

  try {

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await db.from('patient_queue').select('status').eq('queue_date', today);

    if (error) throw error;

    const waiting   = (data||[]).filter(r=>r.status==='Waiting').length;

    const session   = (data||[]).filter(r=>r.status==='In Session').length;

    const completed = (data||[]).filter(r=>r.status==='Completed').length;

    const total     = (data||[]).length;

    document.getElementById('dash-patientsToday').textContent  = total;

    document.getElementById('dash-waitingCount').textContent   = waiting + session;

    document.getElementById('dash-completedToday').textContent = completed;

    document.getElementById('dash-patientsTrend').textContent  = total + ' in queue today';

    document.getElementById('dash-waitingTrend').textContent   = session + ' in session';

    document.getElementById('dash-completedTrend').textContent = completed + ' served today';

    updateQueueBadge(data||[]);

  } catch(e) { console.error('loadDashboardStats', e); }

}


// ════════════════════════════════════════════════

// REALTIME + AUTO-REFRESH

// ════════════════════════════════════════════════

function setupRealtime() {

  db.channel('nurse-queue-changes')

    .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_queue' }, () => {

      loadQueue();

      loadDashboardStats();

    })

    .subscribe();


  db.channel('nurse-visit-changes')

    .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_visits' }, () => {

      loadVisits();

    })

    .subscribe();

}


function filterTable(tableId, q) {

  q = q.toLowerCase();

  document.querySelectorAll('#'+tableId+' tbody tr').forEach(r => {

    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';

  });

}


document.getElementById('logoutBtn').addEventListener('click', () => {

  localStorage.removeItem('uniclinic_user');

});


// ── INIT ─────────────────────────────────────────────────────

(async function init() {

  await loadServicesDropdowns();

  await loadDashboard();

  setupRealtime();

  setInterval(() => { loadQueue(); loadDashboardStats(); }, 20000);

})();