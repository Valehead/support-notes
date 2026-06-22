# support-notes

A note-taking dashboard for support specialists and QA testers. Built to stand alongside a CRM, ticket system, or issue tracker as its own workspace. You can capture structured notes in real time during a call or testing session, then hand off however you like.

## The problem it solves

Support and QA teams often rely on memory or scratch paper during calls and testing sessions, then reconstruct notes hours later and lose detail in the process. This app gives you a persistent, structured workspace that runs alongside whatever else is on your screen. Start the timer when the call begins, type freely, switch between notes without losing your place. You can even export to markdown when you're done if you'd like. The value is in the session, not the handoff.

## Features

- **Dual mode:** Support Call and QA Testing, each with context-appropriate field labels and placeholder text
- **Call timer:** Start, stop, and reset independently from note creation. Timer state (running or paused at N seconds) is saved per note and restored when you switch back
- **Per-note sidebar:** Switch between multiple notes without losing your place; the active note's timer auto-resumes on return
- **Resting state:** Idle overlay on load. The workspace stays clean until you start a note
- **Auto-save:** Notes save automatically as you type (debounced at 1.5 s for content, 800 ms for fields), with a manual Save button in the header
- **Delete confirmation:** Single-click × on a note prompts before deleting
- **Export:** Preview all notes as formatted markdown in-page, with human-readable timestamps and call duration; download as a `.md` file

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) : recommended, no other setup needed

**Without Docker:** PHP 8.2+ with the `pdo_sqlite` extension enabled. The SQLite database file is created automatically; no database server is needed.

## Running locally

### Docker (recommended)

```bash
git clone <repo-url>
cd support-notes
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). To stop: `docker compose down`.

### PHP built-in server

```bash
git clone <repo-url>
cd support-notes
cp .env.example .env          # optional - sets DB_PATH if you want a custom location
php -S localhost:8080
```

Open [http://localhost:8080](http://localhost:8080).

The SQLite database is created automatically at `data/support_notes.db` on first request.

## Project structure

```
support-notes/
├── index.php               Entry point and main dashboard view
├── api/
│   ├── notes.php           REST CRUD for notes (GET/POST/PUT/DELETE)
│   └── export.php          Markdown export (JSON preview or file download)
├── includes/
│   ├── db.php              PDO connection and schema initialization
│   ├── NoteRepository.php  All database access
│   └── MarkdownExporter.php  Converts note rows to a Markdown document
├── assets/
│   ├── css/style.css
│   ├── img/
│   │   └── mmp-grey.png
│   └── js/
│       ├── app.js          Entry point: event binding and init
│       ├── api-client.js   fetch() wrapper and HTML-escape utility
│       ├── session-state.js  Shared state object and workspace state helpers
│       ├── call-timer.js   Timer start/stop/reset and paused-state restore
│       ├── note-sidebar.js  Sidebar rendering and active-item tracking
│       └── note-editor.js  Save, load, and delete note operations
└── data/                   SQLite database (gitignored, created at runtime)
```

## Planned features

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
