export const state = {
    activeId:       null,
    mode:           'support',
    isRunning:      false,
    callStartedAt:  null,
    timerStart:     null,
    timerHandle:    null,
    saveHandle:     null,
    elapsedSeconds: null, // set by stopTimer(); used by startTimer() to resume from the right offset
};

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

export function applyModeLabels() {
    const labels = modeLabels[state.mode];
    document.getElementById('label-location').textContent  = labels.location;
    document.getElementById('label-contact').textContent   = labels.contact;
    document.getElementById('client-location').placeholder = labels.locationPh;
    document.getElementById('contact-name').placeholder    = labels.contactPh;
}

export function enterRestingState() {
    const ws = document.querySelector('.workspace');
    ws.classList.remove('workspace--active');
    ws.classList.add('workspace--resting');
    state.activeId = null;
    setSaveEnabled(false);
}

export function enterActiveState() {
    const ws = document.querySelector('.workspace');
    ws.classList.remove('workspace--resting');
    ws.classList.add('workspace--active');
}

export function setSaveEnabled(enabled) {
    document.getElementById('btn-save').disabled = !enabled;
}

export function syncSaveButton() {
    const hasContent = document.getElementById('client-location').value.trim()
        || document.getElementById('contact-name').value.trim()
        || document.getElementById('note-content').value.trim();
    document.getElementById('btn-save').disabled = !(hasContent || state.activeId !== null);
}
