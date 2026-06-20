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
            created_at           TEXT    NOT NULL,
            updated_at           TEXT    NOT NULL
        )
    ");

    $columns = $pdo->query('PRAGMA table_info(notes)')->fetchAll();
    if (!in_array('call_elapsed_seconds', array_column($columns, 'name'))) {
        $pdo->exec('ALTER TABLE notes ADD COLUMN call_elapsed_seconds INTEGER');
    }

    return $pdo;
}
