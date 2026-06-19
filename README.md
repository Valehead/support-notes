# support-notes

A lightweight, in-browser note-taking dashboard for support specialists and QA testers. Designed for situations where you need to capture structured notes in real time during a call or testing session, then export clean markdown to paste into a CRM, issue tracker, or ticket system.

## The problem it solves

Support and QA teams often rely on memory or scratch paper during calls and testing sessions, then reconstruct notes hours later — losing detail in the process. This app gives you a persistent, session-aware workspace: start a note when the call begins, type freely, and export when you're done.

## Features

- **Two modes:** Support Call and QA Testing, each with context-appropriate labels
- **Per-note timer:** Records when the note was started; elapsed timer runs client-side for the session
- **Sidebar:** Quickly switch between multiple active notes without losing your place
- **Export:** Preview all notes as formatted markdown, then download as a `.md` file
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
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

The SQLite database is created automatically on first run at `data/support_notes.db`.

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

## Future enhancements

- Authentication and per-user note lists
- Timer state persisted across page refreshes
- Note search and date filtering
- Direct export to a CRM API
