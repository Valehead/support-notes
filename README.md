# support-notes

A note-taking dashboard for support specialists and QA testers. Built for situations where you need to capture structured notes in real time during a call or session, then export clean markdown to paste into a CRM, issue tracker, or ticket.

## The problem it solves

Support and QA teams often rely on memory or scratch paper during calls and testing sessions, then reconstruct notes hours later and lose detail in the process. This app gives you a persistent, session-aware workspace: start the stopwatch when the call begins, type freely, and export when you're done.

## Features

- **Dual mode:** Support Call and QA Testing, each with context-appropriate field labels and placeholder text
- **Independent stopwatch:** Start, stop, and reset the timer separately from note creation, with no forced flow
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
- **Delete confirmation:** A note currently deletes on a single click of the x button. It should require a confirmation step to prevent accidents.
- **Timer persistence:** The stopwatch resets on page refresh because it lives in JS session state. Persisting the start timestamp (via `localStorage` or a session endpoint) would let it survive accidental refreshes.

### UI / UX
- **Tablet and split-monitor layout:** The three-column layout compresses poorly on smaller viewports. A responsive breakpoint with a collapsible drawer for the sidebar and left panel would make this usable on a tablet or in a half-screen window.
- **Note search and filtering:** Once the list gets long, filtering by date, mode, or client location becomes necessary.
- **Keyboard shortcuts:** `Ctrl+S` to save, `Ctrl+N` for new note, `Ctrl+E` for export. Important for a tool used during live calls where reaching for the mouse costs time.

### Auth and persistence
- **Login and per-user accounts:** All notes currently share one SQLite database. Adding auth would let each specialist maintain their own history without seeing colleagues' work.
- **Multi-user session awareness:** Once auth exists, the sidebar could show only the logged-in user's notes, with an optional team-visible shared export.

### Export and integrations
- **Direct CRM export:** If the target CRM exposes an API, a one-click "Send to CRM" button could replace the copy-paste step entirely.
- **Rich export options:** Export as plain text, HTML, or a formatted PDF in addition to markdown.
- **Bulk export by date range:** Download all notes from a given day or week as a single combined markdown file.

### QA mode enhancements
- **Bug report template:** In QA mode, pre-fill the note area with a structured template (Steps to reproduce / Expected / Actual / Build) so findings come out consistently formatted.
- **Severity tagging:** Tag a note as Low / Medium / High / Blocker before exporting, so whoever receives the notes has immediate triage context.
