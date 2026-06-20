<?php
// REST endpoint for notes. Routes by HTTP method; $id comes from ?id=<int>.
//
//   GET    /api/notes.php          → all notes (array)
//   GET    /api/notes.php?id=N     → single note
//   POST   /api/notes.php          → create note (JSON body), returns created row
//   PUT    /api/notes.php?id=N     → update note (JSON body), returns updated row
//   DELETE /api/notes.php?id=N     → delete note, returns {deleted: N}
//
// respond() always calls exit, so no handler falls through to another.

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
    $body = parseNoteBody(json_decode(file_get_contents('php://input'), true) ?? []);
    $id   = $repo->create($body);
    respond(201, $repo->findById($id));
}

function handlePut(NoteRepository $repo, ?int $id): void
{
    if ($id === null) {
        respond(400, ['error' => 'id is required']);
        return;
    }

    $body = parseNoteBody(json_decode(file_get_contents('php://input'), true) ?? []);
    $repo->update($id, $body);
    respond(200, $repo->findById($id));
}

// Whitelists and casts the fields accepted from the client. Unknown keys in
// the request body are discarded here rather than reaching the repository.
function parseNoteBody(array $body): array
{
    return [
        'mode'            => isset($body['mode']) ? (string) $body['mode'] : null,
        'client_location' => isset($body['client_location']) ? trim((string) $body['client_location']) : '',
        'contact_name'    => isset($body['contact_name']) && $body['contact_name'] !== null
                                 ? trim((string) $body['contact_name'])
                                 : null,
        'content'         => isset($body['content']) ? (string) $body['content'] : '',
        'call_started_at'      => isset($body['call_started_at']) && $body['call_started_at'] !== null
                                     ? trim((string) $body['call_started_at'])
                                     : null,
        'call_elapsed_seconds' => isset($body['call_elapsed_seconds']) && $body['call_elapsed_seconds'] !== null
                                     ? (int) $body['call_elapsed_seconds']
                                     : null,
        'call_timer_running'   => !empty($body['call_timer_running']) ? 1 : 0,
    ];
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
