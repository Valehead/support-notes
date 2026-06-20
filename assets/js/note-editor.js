import { api } from './api-client.js';
import { state, enterRestingState, enterActiveState,
         setSaveEnabled, applyModeLabels } from './session-state.js';
import { resetTimer, startTimer, restoreTimerPaused } from './call-timer.js';
import { prependSidebarItem, updateSidebarItem, setActive } from './note-sidebar.js';

export async function saveNow() {
    const location    = document.getElementById('client-location').value.trim();
    const content     = document.getElementById('note-content').value.trim();
    const callTime    = state.callStartedAt ? state.callStartedAt.toISOString() : null;
    const callElapsed = state.isRunning ? null : (state.elapsedSeconds ?? null);
    const elBtnSave   = document.getElementById('btn-save');

    if (state.activeId === null) {
        if (!location && !content) return;

        elBtnSave.classList.add('btn-saving');
        const note = await api('POST', '/api/notes.php', {
            mode:                 state.mode,
            client_location:      location,
            contact_name:         document.getElementById('contact-name').value.trim() || null,
            content:              document.getElementById('note-content').value,
            call_started_at:      callTime,
            call_elapsed_seconds: callElapsed,
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
        mode:                 state.mode,
        client_location:      location,
        contact_name:         document.getElementById('contact-name').value.trim() || null,
        content:              document.getElementById('note-content').value,
        call_started_at:      callTime,
        call_elapsed_seconds: callElapsed,
    });

    updateSidebarItem(state.activeId, location || 'Untitled', callTime ?? undefined);
    elBtnSave.classList.remove('btn-saving');
    flashSaved();
}

export function flashSaved() {
    const elBtnSave    = document.getElementById('btn-save');
    const elSaveStatus = document.getElementById('save-status');
    elBtnSave.classList.add('btn-saved');
    elSaveStatus.textContent = 'Saved';
    elSaveStatus.classList.add('save-status-pop');
    setTimeout(() => {
        elBtnSave.classList.remove('btn-saved');
        elSaveStatus.textContent = '';
        elSaveStatus.classList.remove('save-status-pop');
    }, 1800);
}

export function loadNote(note) {
    resetTimer();

    state.activeId = note.id;
    state.mode     = note.mode;

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === note.mode));
    applyModeLabels();

    document.getElementById('client-location').value = note.client_location ?? '';
    document.getElementById('contact-name').value    = note.contact_name    ?? '';
    document.getElementById('note-content').value    = note.content         ?? '';

    enterActiveState();
    setSaveEnabled(true);

    if (note.call_started_at) {
        const restored = new Date(note.call_started_at);
        if (!isNaN(restored.getTime())) {
            if (note.call_elapsed_seconds != null) {
                const elapsed = parseInt(note.call_elapsed_seconds, 10);
                if (!isNaN(elapsed)) {
                    restoreTimerPaused(restored, elapsed);
                }
            } else {
                startTimer(restored);
            }
        }
    }
}

export async function loadNoteById(id) {
    const note = await api('GET', `/api/notes.php?id=${id}`);
    loadNote(note);
    setActive(id);
}

export async function deleteNote(id) {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    await api('DELETE', `/api/notes.php?id=${id}`);
    document.querySelector(`.note-item[data-id="${id}"]`)?.remove();

    if (state.activeId === id) {
        enterRestingState();
        document.getElementById('client-location').value = '';
        document.getElementById('contact-name').value    = '';
        document.getElementById('note-content').value    = '';
    }
}
