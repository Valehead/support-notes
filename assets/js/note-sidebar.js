import { esc } from './api-client.js';
import { fmtTime } from './call-timer.js';

export function buildSidebarItem(note) {
    const li = document.createElement('li');
    li.className  = 'note-item';
    li.dataset.id = note.id;

    const callHtml = note.call_started_at
        ? `<span class="note-item-call">Call: ${esc(fmtTime(new Date(note.call_started_at)))}</span>`
        : '';

    li.innerHTML = `
        <span class="note-item-title">${esc(note.client_location || 'Untitled')}</span>
        <span class="note-item-meta">${esc(fmtCreatedAt(note.created_at))}</span>
        ${callHtml}
        <button class="note-delete" data-id="${note.id}" title="Delete">×</button>
    `;
    return li;
}

export function updateSidebarItem(id, title, callTime) {
    const item = document.getElementById('note-list').querySelector(`.note-item[data-id="${id}"]`);
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
        callEl.textContent = 'Call: ' + fmtTime(new Date(callTime));
    }
}

export function prependSidebarItem(note) {
    document.getElementById('note-list').prepend(buildSidebarItem(note));
}

export function setActive(id) {
    document.querySelectorAll('.note-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.id, 10) === id);
    });
}

export function fmtCreatedAt(dbStr) {
    if (!dbStr) return '';
    const d     = new Date(dbStr.replace(' ', 'T') + 'Z');
    const today = new Date();
    const time  = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + time;
}
