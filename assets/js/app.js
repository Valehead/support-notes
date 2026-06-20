'use strict';

// app.js — client-side controller for support-notes.
//
// Architecture overview:
//   PHP (index.php) renders the page shell and seeds the sidebar with any
//   existing notes from the DB. After that, all interaction is handled here.
//   The right-side note list, the timer, and the editor are
//   all kept in sync with the `state` object below.
//
// Data flow:
//   User action → update `state` → call api() → update DOM
//
// Auto-save:
//   Content changes debounce at 1500 ms; location/contact fields at 800 ms.
//   Both share `state.saveHandle` so typing in any field resets the single
//   pending timer. saveNow() is also called explicitly before New Note and
//   when the Save button is clicked.

// ── State ──────────────────────────────────────────────────────────────────

// Single source of truth for session state. Timer fields are wall-clock Dates,
// not offsets — elapsed is computed fresh on each tick from timerStart.
const state = {
    activeId:      null,   // id of the note currently open in the editor
    mode:          'support',
    isRunning:     false,
    callStartedAt: null,   // Date when Start was pressed; stored to the DB as a formatted string
    timerStart:    null,   // Same Date — kept separate in case pause/resume ever needs them to diverge
    timerHandle:   null,   // setInterval handle for the elapsed ticker
    saveHandle:    null,   // setTimeout handle for the debounced auto-save
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

    elCallStarted.textContent  = '—';
    elElapsed.textContent      = '—';
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
    // Flush any pending debounced save, then commit current note before resetting
    clearTimeout(state.saveHandle);
    if (state.activeId !== null) await saveNow();

    // Full reset so the next call starts clean
    resetTimer();
    elLocation.value = '';
    elContact.value  = '';
    elContent.value  = '';

    startTimer();

    const note = await api('POST', '/api/notes.php', {
        mode:            state.mode,
        client_location: '',
        contact_name:    null,
        content:         '',
        call_started_at: fmtTime(state.callStartedAt),
    });

    state.activeId = note.id;
    setSaveEnabled(true);
    prependSidebarItem(note);
    setActive(note.id);
    elContent.focus();
});

// ── Save ───────────────────────────────────────────────────────────────────

elBtnSave.addEventListener('click', saveNow);

elContent.addEventListener('input', () => {
    clearTimeout(state.saveHandle);
    syncSaveButton();
    state.saveHandle = setTimeout(saveNow, 1500);
});

[elLocation, elContact].forEach(el => {
    el.addEventListener('input', () => {
        clearTimeout(state.saveHandle);
        syncSaveButton();
        state.saveHandle = setTimeout(saveNow, 800);
    });
});

async function saveNow() {
    const location = elLocation.value.trim();
    const content  = elContent.value.trim();
    const callTime = state.callStartedAt ? fmtTime(state.callStartedAt) : null;

    if (state.activeId === null) {
        // No note record yet — create one on first save rather than dropping the data.
        if (!location && !content) return;

        elBtnSave.classList.add('btn-saving');
        const note = await api('POST', '/api/notes.php', {
            mode:            state.mode,
            client_location: location,
            contact_name:    elContact.value.trim() || null,
            content:         elContent.value,
            call_started_at: callTime,
        });
        state.activeId = note.id;
        prependSidebarItem(note);
        setActive(note.id);
        elBtnSave.classList.remove('btn-saving');
        flashSaved();
        return;
    }

    elBtnSave.classList.add('btn-saving');

    await api('PUT', `/api/notes.php?id=${state.activeId}`, {
        mode:            state.mode,
        client_location: location,
        contact_name:    elContact.value.trim() || null,
        content:         elContent.value,
        call_started_at: callTime,
    });

    updateSidebarItem(state.activeId, location || 'Untitled', callTime ?? undefined);
    elBtnSave.classList.remove('btn-saving');
    flashSaved();
}

function flashSaved() {
    elBtnSave.classList.add('btn-saved');
    elSaveStatus.textContent = 'Saved';
    elSaveStatus.classList.add('save-status-pop');
    setTimeout(() => {
        elBtnSave.classList.remove('btn-saved');
        elSaveStatus.textContent = '';
        elSaveStatus.classList.remove('save-status-pop');
    }, 1800);
}

// ── Save button enabled state ──────────────────────────────────────────────
// Save is enabled as soon as any field has content (even before a note record
// exists). On first save with no activeId, saveNow() auto-creates the record.
// Explicit overrides (loadNote, deleteNote) still call setSaveEnabled directly.

function syncSaveButton() {
    const hasContent = elLocation.value.trim() || elContact.value.trim() || elContent.value.trim();
    elBtnSave.disabled = !(hasContent || state.activeId !== null);
}

function setSaveEnabled(enabled) {
    elBtnSave.disabled = !enabled;
}

// ── Sidebar ────────────────────────────────────────────────────────────────
// Populated two ways:
//   1. PHP renders existing notes on page load (index.php).
//   2. JS prepends new notes via prependSidebarItem() when New Note is clicked.
// loadNote() switches to an existing note and does NOT add a sidebar item.
// The New Note handler sets state.activeId directly and skips loadNote()
// because the editor fields start empty for a brand-new note.

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

    setSaveEnabled(true);

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

    const callHtml = note.call_started_at
        ? `<span class="note-item-call">Call: ${esc(note.call_started_at)}</span>`
        : '';

    li.innerHTML = `
        <span class="note-item-title">${esc(note.client_location || 'Untitled')}</span>
        <span class="note-item-meta">${esc(fmtCreatedAt(note.created_at))}</span>
        ${callHtml}
        <button class="note-delete" data-id="${note.id}" title="Delete">×</button>
    `;
    return li;
}

function updateSidebarItem(id, title, callTime) {
    const item = elNoteList.querySelector(`.note-item[data-id="${id}"]`);
    if (!item) return;
    const titleEl = item.querySelector('.note-item-title');
    if (titleEl) titleEl.textContent = title;
    if (callTime !== undefined) {
        let callEl = item.querySelector('.note-item-call');
        if (!callEl) {
            callEl = document.createElement('span');
            callEl.className = 'note-item-call';
            item.querySelector('.note-delete').before(callEl);
        }
        callEl.textContent = 'Call: ' + callTime;
    }
}

// Formats the DB-stored "YYYY-MM-DD HH:MM:SS" timestamp for sidebar display.
// Shows "Today, H:MM AM/PM" for notes created today; "Mon D, H:MM AM/PM" otherwise.
function fmtCreatedAt(dbStr) {
    if (!dbStr) return '';
    const d     = new Date(dbStr.replace(' ', 'T') + 'Z');
    const today = new Date();
    const time  = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + time;
}

async function deleteNote(id) {
    await api('DELETE', `/api/notes.php?id=${id}`);
    document.querySelector(`.note-item[data-id="${id}"]`)?.remove();

    if (state.activeId === id) {
        state.activeId   = null;
        elLocation.value = '';
        elContact.value  = '';
        elContent.value  = '';
        setSaveEnabled(false);
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

// ── Init ───────────────────────────────────────────────────────────────────

setSaveEnabled(false);

// Format the created_at timestamps on PHP-rendered sidebar items using the
// same client-side formatter so timezone conversion is consistent everywhere.
document.querySelectorAll('.note-item-meta[data-created]').forEach(el => {
    el.textContent = fmtCreatedAt(el.dataset.created);
});
