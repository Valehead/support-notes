<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * NoteRepository — sole DB access point for the notes table.
 *
 * The SQLite connection and schema creation live in db.php (getDb()).
 * Nothing outside this class should query the database directly.
 *
 * Schema (auto-created by getDb() if absent):
 *   id, mode, client_location, contact_name, content, call_started_at,
 *   created_at, updated_at
 *
 * Modes: 'support' (default) | 'qa' — controls labels in the UI and the
 * heading in exported Markdown. Unknown values are coerced to 'support'.
 */
class NoteRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = getDb();
    }

    public function findAll(): array
    {
        return $this->db
            ->query('SELECT * FROM notes ORDER BY created_at DESC')
            ->fetchAll();
    }

    public function findById(int $id): array|false
    {
        $stmt = $this->db->prepare('SELECT * FROM notes WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /** @param int[] $ids */
    public function findByIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT * FROM notes WHERE id IN ({$placeholders}) ORDER BY created_at DESC"
        );
        $stmt->execute($ids);
        return $stmt->fetchAll();
    }

    private const VALID_MODES = ['support', 'qa'];

    // Coerces any unrecognised mode to 'support'. Mode drives the export
    // document heading and the UI field labels, so an unexpected value
    // would silently corrupt both.
    private function sanitizeMode(mixed $mode): string
    {
        return in_array($mode, self::VALID_MODES, strict: true) ? $mode : 'support';
    }

    public function create(array $fields): int
    {
        $now = (new DateTimeImmutable())->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare('
            INSERT INTO notes (mode, client_location, contact_name, content, call_started_at, created_at, updated_at)
            VALUES (:mode, :client_location, :contact_name, :content, :call_started_at, :created_at, :updated_at)
        ');

        $stmt->execute([
            ':mode'            => $this->sanitizeMode($fields['mode'] ?? null),
            ':client_location' => $fields['client_location'] ?? '',
            ':contact_name'    => $fields['contact_name']    ?? null,
            ':content'         => $fields['content']         ?? '',
            ':call_started_at' => $fields['call_started_at'] ?? null,
            ':created_at'      => $now,
            ':updated_at'      => $now,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $fields): bool
    {
        $now = (new DateTimeImmutable())->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare('
            UPDATE notes
            SET mode            = :mode,
                client_location = :client_location,
                contact_name    = :contact_name,
                content         = :content,
                call_started_at = :call_started_at,
                updated_at      = :updated_at
            WHERE id = :id
        ');

        return $stmt->execute([
            ':id'              => $id,
            ':mode'            => $this->sanitizeMode($fields['mode'] ?? null),
            ':client_location' => $fields['client_location'] ?? '',
            ':contact_name'    => $fields['contact_name']    ?? null,
            ':content'         => $fields['content']         ?? '',
            ':call_started_at' => $fields['call_started_at'] ?? null,
            ':updated_at'      => $now,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM notes WHERE id = ?');
        return $stmt->execute([$id]);
    }
}
