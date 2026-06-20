<?php

declare(strict_types=1);

function getDb(): PDO
{
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $path = $_ENV['DB_PATH'] ?? __DIR__ . '/../data/support_notes.db';

    $pdo = new PDO('sqlite:' . $path, options: [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS notes (
            id                   INTEGER PRIMARY KEY AUTOINCREMENT,
            mode                 TEXT    NOT NULL DEFAULT 'support',
            client_location      TEXT    NOT NULL DEFAULT '',
            contact_name         TEXT,
            content              TEXT    NOT NULL DEFAULT '',
            call_started_at      TEXT,
            call_elapsed_seconds INTEGER,
            call_timer_running   INTEGER NOT NULL DEFAULT 0,
            created_at           TEXT    NOT NULL,
            updated_at           TEXT    NOT NULL
        )
    ");

    $columns     = $pdo->query('PRAGMA table_info(notes)')->fetchAll();
    $columnNames = array_column($columns, 'name');
    if (!in_array('call_elapsed_seconds', $columnNames)) {
        $pdo->exec('ALTER TABLE notes ADD COLUMN call_elapsed_seconds INTEGER');
    }
    if (!in_array('call_timer_running', $columnNames)) {
        $pdo->exec('ALTER TABLE notes ADD COLUMN call_timer_running INTEGER NOT NULL DEFAULT 0');
    }

    $pdo->exec("
        CREATE TRIGGER IF NOT EXISTS notes_set_updated_at
        AFTER UPDATE OF mode, client_location, contact_name, content,
                        call_started_at, call_elapsed_seconds, call_timer_running
        ON notes
        BEGIN
            UPDATE notes SET updated_at = datetime('now') WHERE id = NEW.id;
        END
    ");

    return $pdo;
}
