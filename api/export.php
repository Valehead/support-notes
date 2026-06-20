<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/NoteRepository.php';
require_once __DIR__ . '/../includes/MarkdownExporter.php';

$repo     = new NoteRepository();
$exporter = new MarkdownExporter();

$ids = [];
if (!empty($_GET['ids'])) {
    $ids = array_map('intval', explode(',', $_GET['ids']));
    $ids = array_filter($ids, fn(int $id) => $id > 0);
}

$notes    = empty($ids) ? $repo->findAll() : $repo->findByIds(array_values($ids));
$tz       = isset($_GET['tz']) ? (string) $_GET['tz'] : 'UTC';
$markdown = $exporter->export($notes, $tz);

if (isset($_GET['download'])) {
    $filename = 'notes-' . date('Y-m-d') . '.md';
    header('Content-Type: text/markdown; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"{$filename}\"");
    echo $markdown;
    exit;
}

header('Content-Type: application/json');
echo json_encode(['markdown' => $markdown]);
