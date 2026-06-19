<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/NoteRepository.php';

header('Content-Type: application/json');

$repo   = new NoteRepository();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

try {
    match ($method) {
        'GET' => handleGet($repo, $id),
        'POST' => handlePost($repo),
        'PUT' => handlePut($repo, $id),
        'DELETE' => handleDelete($repo, $id),
        default => respond(405, ['error' => 'Method not allowed']),
    };
} catch (Throwable $e) {
    respond(500, ['error' => $e->getMessage()]);
}

function handleGet(NoteRepository $repo, ?int $id): void
{
    if ($id !== null) {
        $note = $repo->findById($id);
        $note ? respond(200, $note) : respond(404, ['error' => 'Not found']);
        return;
    }

    respond(200, $repo->findAll());
}

function handlePost(NoteRepository $repo): void
{
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = $repo->create($body);
    respond(201, $repo->findById($id));
}

function handlePut(NoteRepository $repo, ?int $id): void
{
    if ($id === null) {
        respond(400, ['error' => 'id is required']);
        return;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $repo->update($id, $body);
    respond(200, $repo->findById($id));
}

function handleDelete(NoteRepository $repo, ?int $id): void
{
    if ($id === null) {
        respond(400, ['error' => 'id is required']);
        return;
    }

    $repo->delete($id);
    respond(200, ['deleted' => $id]);
}

function respond(int $status, mixed $data): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}
