'use strict';

// ── State ──────────────────────────────────────────────────────────────────

const state = {
    activeId:      null,
    mode:          'support',
    isRunning:     false,
    callStartedAt: null,   // Date when START was pressed (wall clock reference)
    timerStart:    null,   // Same — used for elapsed calculation
    timerHandle:   null,
    saveHandle:    null,
};

// ── Element refs ───────────────────────────────────────────────────────────

const elMode           = document.querySelectorAll('.mode-btn');
const elLocation       = document.getElementById('client-location');
const elContact        = document.getElementById('contact-name');
const elLabelLoc       = document.getElementById('label-location');
const elLabelContact   = document.getElementById('label-contact');
const elContent        = document.getElementById('note-content');
const elCallStarted    = document.getElementById('call-started');
const elElapsed        = document.getElementById('elapsed');
const elNoteList       = document.getElementById('note-list');
const elSaveStatus     = document.getElementById('save-status');
const elBtnNew         = document.getElementById('btn-new');
const elBtnSave        = document.getElementById('btn-save');
const elBtnExport      = document.getElementById('btn-export');
const elBtnStartStop   = document.getElementById('btn-start-stop');
const elBtnReset       = document.getElementById('btn-reset');
const elModal          = document.getElementById('export-modal');
const elPreview        = document.getElementById('markdown-preview');

// ── Mode toggle ────────────────────────────────────────────────────────────

const modeLabels = {
    support: {
        location:   'Location / Client',
        contact:    'Contact',
        locationPh: 'e.g. Springfield',
        contactPh:  'optional',
    },
    qa: {
        location:   'Application',
        contact:    'Version / Branch',
        locationPh: 'e.g. Dashboard, Login screen',
        contactPh:  'e.g. v2.1 / build 447',
    },
};

elMode.forEach(btn => {
    btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        elMode.forEach(b => b.classList.toggle('active', b === btn));
        applyModeLabels();
    });
});

function applyModeLabels() {
    const labels = modeLabels[state.mode];
    elLabelLoc.textContent     = labels.location;
    elLabelContact.textContent = labels.contact;
    elLocation.placeholder     = labels.locationPh;
    elContact.placeholder      = labels.contactPh;
}

// ── Timer ──────────────────────────────────────────────────────────────────

elBtnStartStop.addEventListener('click', () => {
    state.isRunning ? stopTimer() : startTimer();
});

elBtnReset.addEventListener('click', resetTimer);

function startTimer() {
    if (state.isRunning) return;

    const now = new Date();
    state.timerStart    = now;
    state.callStartedAt = now;
    state.isRunning     = true;

    elCallStarted.textContent = fmtTime(now);
    elBtnStartStop.textContent = 'Stop';
    elBtnStartStop.classList.remove('btn-primary');
    elBtnStartStop.classList.add('btn-running');

    state.timerHandle = setInterval(tickTimer, 1000);
}

function stopTimer() {
    if (!state.isRunning) return;

    clearInterval(state.timerHandle);
    state.timerHandle = null;
    state.isRunning   = false;

    elBtnStartStop.textContent = 'Resume';
    elBtnStartStop.classList.remove('btn-running');
    elBtnStartStop.classList.add('btn-primary');
}

function resetTimer() {
    stopTimer();
    state.timerStart    = null;
    state.callStartedAt = null;

    elCallStarted.textContent = '—';
    elElapsed.textContent     = '—';
    elBtnStartStop.textContent = 'Start';
    elBtnStartStop.classList.add('btn-primary');
    elBtnStartStop.classList.remove('btn-running');
}

function tickTimer() {
    const elapsed = Math.floor((Date.now() - state.timerStart.getTime()) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    elElapsed.textContent = `${h}:${m}:${s}`;
}

function fmtTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── New note ───────────────────────────────────────────────────────────────

elBtnNew.addEventListener('click', async () => {
    // Start the timer automatically if it hasn't been started yet
    if (!state.isRunning && !state.callStartedAt) {
        startTimer();
    }

    const callStartedAt = state.callStartedAt ? fmtTime(state.callStartedAt) : null;

    const note = await api('POST', '/api/notes.php', {
        mode:            state.mode,
        client_location: elLocation.value.trim(),
        contact_name:    elContact.value.trim() || null,
        content:         '',
        call_started_at: callStartedAt,
    });

    loadNote(note);
    prependSidebarItem(note);
    setActive(note.id);
    elContent.focus();
});

// ── Save ───────────────────────────────────────────────────────────────────

elBtnSave.addEventListener('click', saveNow);

elContent.addEventListener('input', () => {
    clearTimeout(state.saveHandle);
    elSaveStatus.textContent = '';
    state.saveHandle = setTimeout(saveNow, 1500);
});

[elLocation, elContact].forEach(el => {
    el.addEventListener('input', () => {
        clearTimeout(state.saveHandle);
        state.saveHandle = setTimeout(saveNow, 800);
    });
});

async function saveNow() {
    if (state.activeId === null) return;

    await api('PUT', `/api/notes.php?id=${state.activeId}`, {
        mode:            state.mode,
        client_location: elLocation.value.trim(),
        contact_name:    elContact.value.trim() || null,
        content:         elContent.value,
        call_started_at: state.callStartedAt ? fmtTime(state.callStartedAt) : null,
    });

    updateSidebarItem(state.activeId, elLocation.value.trim() || 'Untitled');
    flash('Saved');
}

function flash(msg) {
    elSaveStatus.textContent = msg;
    setTimeout(() => { elSaveStatus.textContent = ''; }, 2000);
}

// ── Sidebar ────────────────────────────────────────────────────────────────

elNoteList.addEventListener('click', e => {
    const deleteBtn = e.target.closest('.note-delete');
    if (deleteBtn) {
        e.stopPropagation();
        deleteNote(parseInt(deleteBtn.dataset.id, 10));
        return;
    }

    const item = e.target.closest('.note-item');
    if (item) loadNoteById(parseInt(item.dataset.id, 10));
});

async function loadNoteById(id) {
    const note = await api('GET', `/api/notes.php?id=${id}`);
    loadNote(note);
    setActive(id);
}

function loadNote(note) {
    state.activeId = note.id;
    state.mode     = note.mode;

    elMode.forEach(b => b.classList.toggle('active', b.dataset.mode === note.mode));
    applyModeLabels();

    elLocation.value = note.client_location ?? '';
    elContact.value  = note.contact_name    ?? '';
    elContent.value  = note.content         ?? '';

    // Timer display is session state — loading a note does not touch it
}

function setActive(id) {
    document.querySelectorAll('.note-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.id, 10) === id);
    });
}

function prependSidebarItem(note) {
    elNoteList.prepend(buildSidebarItem(note));
}

function buildSidebarItem(note) {
    const li = document.createElement('li');
    li.className  = 'note-item';
    li.dataset.id = note.id;

    li.innerHTML = `
        <span class="note-item-title">${esc(note.client_location || 'Untitled')}</span>
        <span class="note-item-meta">${esc(note.call_started_at || '')}</span>
        <button class="note-delete" data-id="${note.id}" title="Delete">×</button>
    `;
    return li;
}

function updateSidebarItem(id, title) {
    const el = elNoteList.querySelector(`.note-item[data-id="${id}"] .note-item-title`);
    if (el) el.textContent = title;
}

async function deleteNote(id) {
    await api('DELETE', `/api/notes.php?id=${id}`);
    document.querySelector(`.note-item[data-id="${id}"]`)?.remove();

    if (state.activeId === id) {
        state.activeId   = null;
        elLocation.value = '';
        elContact.value  = '';
        elContent.value  = '';
    }
}

// ── Export modal ───────────────────────────────────────────────────────────

elBtnExport.addEventListener('click', async () => {
    const { markdown } = await api('GET', '/api/export.php');
    elPreview.textContent = markdown || '(no notes to export)';
    document.getElementById('btn-download').href = '/api/export.php?download=1';
    elModal.hidden = false;
});

document.getElementById('modal-close').addEventListener('click',     closeModal);
document.getElementById('btn-modal-close').addEventListener('click', closeModal);
elModal.addEventListener('click', e => { if (e.target === elModal) closeModal(); });

function closeModal() { elModal.hidden = true; }

// ── API helper ─────────────────────────────────────────────────────────────

async function api(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
    return res.json();
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
