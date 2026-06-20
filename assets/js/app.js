import { api }                                              from './api-client.js';
import { state, enterRestingState, enterActiveState,
         setSaveEnabled, syncSaveButton, applyModeLabels } from './session-state.js';
import { startTimer, stopTimer, resetTimer, fmtTime }      from './call-timer.js';
import { prependSidebarItem, setActive, fmtCreatedAt }    from './note-sidebar.js';
import { saveNow, loadNoteById, deleteNote }               from './note-editor.js';

// ── Element refs ───────────────────────────────────────────────────────────

const elMode         = document.querySelectorAll('.mode-btn');
const elLocation     = document.getElementById('client-location');
const elContact      = document.getElementById('contact-name');
const elContent      = document.getElementById('note-content');
const elBtnNew       = document.getElementById('btn-new');
const elBtnSave      = document.getElementById('btn-save');
const elBtnExport    = document.getElementById('btn-export');
const elBtnStartStop = document.getElementById('btn-start-stop');
const elBtnReset     = document.getElementById('btn-reset');
const elNoteList     = document.getElementById('note-list');
const elModal        = document.getElementById('export-modal');
const elPreview      = document.getElementById('markdown-preview');

// ── Mode toggle ────────────────────────────────────────────────────────────

elMode.forEach(btn => {
    btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        elMode.forEach(b => b.classList.toggle('active', b === btn));
        applyModeLabels();
        if (state.activeId !== null) {
            clearTimeout(state.saveHandle);
            state.saveHandle = setTimeout(saveNow, 300);
        }
    });
});

// ── Timer ──────────────────────────────────────────────────────────────────

elBtnStartStop.addEventListener('click', () => {
    state.isRunning ? stopTimer() : startTimer();
});

elBtnReset.addEventListener('click', () => {
    if (state.activeId !== null && state.callStartedAt !== null) {
        if (!confirm('Reset timer? The saved call start time for this note will be cleared.')) return;
    }
    resetTimer();
});

// ── New note ───────────────────────────────────────────────────────────────

elBtnNew.addEventListener('click', async () => {
    elBtnNew.disabled = true;
    clearTimeout(state.saveHandle);
    if (state.activeId !== null) await saveNow();

    resetTimer();
    elLocation.value = '';
    elContact.value  = '';
    elContent.value  = '';

    startTimer();
    enterActiveState();

    try {
        const note = await api('POST', '/api/notes.php', {
            mode:            state.mode,
            client_location: '',
            contact_name:    null,
            content:         '',
            call_started_at: state.callStartedAt.toISOString(),
        });

        state.activeId = note.id;
        setSaveEnabled(true);
        prependSidebarItem(note);
        setActive(note.id);
        elContent.focus();
    } finally {
        elBtnNew.disabled = false;
    }
});

// ── Save ───────────────────────────────────────────────────────────────────

elBtnSave.addEventListener('click', () => {
    clearTimeout(state.saveHandle);
    saveNow();
});

elContent.addEventListener('input', () => {
    clearTimeout(state.saveHandle);
    syncSaveButton();
    state.saveHandle = setTimeout(saveNow, 1500);
});

[elLocation, elContact].forEach(el => {
    el.addEventListener('input', () => {
        enterActiveState();
        clearTimeout(state.saveHandle);
        syncSaveButton();
        state.saveHandle = setTimeout(saveNow, 800);
    });
});

// ── Sidebar ────────────────────────────────────────────────────────────────

elNoteList.addEventListener('click', async e => {
    const deleteBtn = e.target.closest('.note-delete');
    if (deleteBtn) {
        e.stopPropagation();
        deleteNote(parseInt(deleteBtn.dataset.id, 10));
        return;
    }

    const item = e.target.closest('.note-item');
    if (!item) return;

    const id = parseInt(item.dataset.id, 10);

    if (id === state.activeId) {
        clearTimeout(state.saveHandle);
        await saveNow();
        enterRestingState();
        elLocation.value = '';
        elContact.value  = '';
        elContent.value  = '';
        resetTimer();
        setActive(null);
        return;
    }

    clearTimeout(state.saveHandle);
    if (state.activeId !== null) await saveNow();
    loadNoteById(id);
});

// ── Export modal ───────────────────────────────────────────────────────────

elBtnExport.addEventListener('click', async () => {
    clearTimeout(state.saveHandle);
    if (state.activeId !== null) await saveNow();
    const tz = -new Date().getTimezoneOffset();
    const { markdown } = await api('GET', `/api/export.php?tz_offset=${tz}`);
    elPreview.textContent = markdown || '(no notes to export)';
    document.getElementById('btn-download').href = `/api/export.php?download=1&tz_offset=${tz}`;
    elModal.hidden = false;
});

document.getElementById('modal-close').addEventListener('click',     closeModal);
document.getElementById('btn-modal-close').addEventListener('click', closeModal);
elModal.addEventListener('click', e => { if (e.target === elModal) closeModal(); });

function closeModal() { elModal.hidden = true; }

// ── Init ───────────────────────────────────────────────────────────────────

enterRestingState();

document.querySelectorAll('.note-item-meta[data-created]').forEach(el => {
    el.textContent = fmtCreatedAt(el.dataset.created);
});

document.querySelectorAll('.note-item-call[data-call]').forEach(el => {
    el.textContent = 'Call: ' + fmtTime(new Date(el.dataset.call));
});
