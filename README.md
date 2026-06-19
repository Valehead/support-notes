# support-notes

A lightweight, in-browser note-taking dashboard for support specialists and QA testers. Designed for situations where you need to capture structured notes in real time during a call or testing session, then export clean markdown to paste into a CRM, issue tracker, or ticket system.

## The problem it solves

Support and QA teams often rely on memory or scratch paper during calls and testing sessions, then reconstruct notes hours later — losing detail in the process. This app gives you a persistent, session-aware workspace: start the stopwatch when the call begins, type freely, and export when you're done.

## Features

- **Dual mode:** Support Call and QA Testing, each with context-appropriate field labels and placeholder text
- **Independent stopwatch:** Start, stop, and reset the timer separately from note creation — no forced flow
- **Per-note sidebar:** Quickly switch between multiple active notes without losing your place; the timer keeps running regardless of which note is loaded
- **Auto-save:** Notes save automatically as you type (debounced), with a manual Save button in the header
- **Export:** Preview all notes as formatted markdown in-page, then download as a `.md` file
- **Persistent storage:** Notes survive page refreshes via SQLite

## Stack

- PHP 8.2 (no framework)
- SQLite via PDO
- Apache (Docker)
- Vanilla JS + CSS

## Running locally

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone <repo-url>
cd support-notes
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080).

The SQLite database is created automatically on first run at `data/support_notes.db`. To stop the container: `docker compose down`.

## Project structure

```
support-notes/
├── index.php               Entry point and main dashboard view
├── api/
│   ├── notes.php           REST CRUD for notes (GET/POST/PUT/DELETE)
│   └── export.php          Markdown export (JSON or file download)
├── includes/
│   ├── db.php              PDO connection + schema initialization
│   └── NoteRepository.php  All database access lives here
├── data/                   SQLite database (gitignored, created at runtime)
└── assets/
    ├── css/style.css
    └── js/app.js
```

## Planned features

### Core workflow
- **Delete confirmation** — currently a note is deleted on a single click of the × button; should require a confirm step to prevent accidents
- **Timer persistence** — the stopwatch resets on page refresh since it lives in JS session state; persisting the start timestamp (via `localStorage` or a session endpoint) would let it survive accidental refreshes

### UI / UX
- **Tablet and split-monitor layout** — the three-column layout compresses poorly on smaller viewports; a responsive breakpoint with a collapsible hamburger drawer for the sidebar and left panel would make this usable on a tablet or in a half-screen window
- **Note search and filtering** — when the list grows long, filtering by date, mode, or client location becomes necessary
- **Keyboard shortcuts** — `Ctrl+S` to save, `Ctrl+N` for new note, `Ctrl+E` for export; important for a tool used during live calls where mouse reach costs time

### Auth and persistence
- **Login and per-user accounts** — currently all notes are shared in one SQLite database; adding auth would let each specialist maintain their own note history without seeing colleagues' work
- **Multi-user session awareness** — once auth exists, the sidebar could show only the logged-in user's notes, with optional team-visible shared exports

### Export and integrations
- **Direct CRM export** — if the target CRM exposes an API, a one-click "Send to CRM" button could replace the copy-paste step entirely
- **Rich export options** — export as plain text, HTML, or a formatted PDF in addition to markdown
- **Bulk export by date range** — download all notes from a given day or week as a single combined markdown file

### QA mode enhancements
- **Bug report template** — in QA mode, pre-fill the note area with a structured template (Steps to reproduce / Expected / Actual / Build) so findings are consistently formatted
- **Severity tagging** — tag a note as Low / Medium / High / Blocker before exporting, so the developer receiving the notes has immediate triage context
