import { state, enterActiveState } from './session-state.js';

export function startTimer(existingStart = null) {
    if (state.isRunning) return;

    enterActiveState();

    let start;
    if (existingStart !== null) {
        start = existingStart;
    } else if (state.elapsedSeconds !== null) {
        // Resume from paused: reconstruct a virtual start so elapsed continues
        start = new Date(Date.now() - state.elapsedSeconds * 1000);
    } else {
        start = new Date();
    }

    state.elapsedSeconds = null;
    state.timerStart     = start;
    state.callStartedAt  = state.callStartedAt ?? start;
    state.isRunning      = true;

    document.getElementById('call-started').textContent = fmtTime(state.callStartedAt);
    document.getElementById('btn-start-stop').textContent = 'Stop';
    document.getElementById('btn-start-stop').classList.remove('btn-primary');
    document.getElementById('btn-start-stop').classList.add('btn-running');

    state.timerHandle = setInterval(tickTimer, 1000);
}

export function stopTimer() {
    if (!state.isRunning) return;

    state.elapsedSeconds = Math.floor((Date.now() - state.timerStart.getTime()) / 1000);
    clearInterval(state.timerHandle);
    state.timerHandle = null;
    state.isRunning   = false;

    document.getElementById('btn-start-stop').textContent = 'Resume';
    document.getElementById('btn-start-stop').classList.remove('btn-running');
    document.getElementById('btn-start-stop').classList.add('btn-primary');
}

export function resetTimer() {
    stopTimer();
    state.timerStart     = null;
    state.callStartedAt  = null;
    state.elapsedSeconds = null;

    document.getElementById('call-started').textContent   = '—';
    document.getElementById('elapsed').textContent        = '—';
    document.getElementById('btn-start-stop').textContent = 'Start';
    document.getElementById('btn-start-stop').classList.add('btn-primary');
    document.getElementById('btn-start-stop').classList.remove('btn-running');
}

export function restoreTimerPaused(callStartedAt, elapsedSeconds) {
    state.callStartedAt  = callStartedAt;
    state.elapsedSeconds = elapsedSeconds;
    state.timerStart     = null;
    state.isRunning      = false;

    document.getElementById('call-started').textContent   = fmtTime(callStartedAt);
    document.getElementById('elapsed').textContent        = fmtElapsed(elapsedSeconds);
    document.getElementById('btn-start-stop').textContent = 'Resume';
    document.getElementById('btn-start-stop').classList.add('btn-primary');
    document.getElementById('btn-start-stop').classList.remove('btn-running');
}

function tickTimer() {
    const elapsed = Math.floor((Date.now() - state.timerStart.getTime()) / 1000);
    document.getElementById('elapsed').textContent = fmtElapsed(elapsed);
}

function fmtElapsed(sec) {
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export function fmtTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
