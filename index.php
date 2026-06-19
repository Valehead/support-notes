<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/NoteRepository.php';

$repo  = new NoteRepository();
$notes = $repo->findAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>support-notes</title>
    <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>

<header class="app-header">
    <div class="mode-toggle">
        <button class="mode-btn active" data-mode="support">Support Call</button>
        <button class="mode-btn" data-mode="qa">QA Testing</button>
    </div>
    <div class="meta-bar">
        <label class="meta-field">
            <span class="meta-label" id="label-location">Location / Client</span>
            <input type="text" id="client-location" placeholder="e.g. Springfield" autocomplete="off">
        </label>
        <label class="meta-field">
            <span class="meta-label" id="label-contact">Contact</span>
            <input type="text" id="contact-name" placeholder="optional" autocomplete="off">
        </label>
        <div class="header-actions">
            <button class="btn btn-orange" id="btn-new">New Note</button>
            <button class="btn btn-primary" id="btn-save">Save</button>
            <button class="btn btn-secondary" id="btn-export">Export</button>
            <span class="save-status" id="save-status"></span>
        </div>
    </div>
    <span class="app-title">support-notes</span>
</header>

<div class="workspace">

    <aside class="panel-left">
        <div class="call-info">
            <div class="info-block">
                <span class="info-label">Call Started</span>
                <span class="info-value" id="call-started">—</span>
            </div>
            <div class="info-block">
                <span class="info-label">Elapsed</span>
                <span class="info-value" id="elapsed">—</span>
            </div>
        </div>
        <div class="timer-controls">
            <button class="btn btn-primary btn-timer" id="btn-start-stop">Start</button>
            <button class="btn btn-secondary btn-timer-reset" id="btn-reset">Reset</button>
        </div>
    </aside>

    <main class="panel-center">
        <textarea
            id="note-content"
            placeholder="Start typing your notes here…"
            spellcheck="true"
        ></textarea>
    </main>

    <aside class="panel-right">
        <div class="sidebar-header">Notes</div>
        <ul class="note-list" id="note-list">
            <?php foreach ($notes as $note): ?>
            <li class="note-item" data-id="<?= (int) $note['id'] ?>" data-mode="<?= $note['mode'] ?>">
                <span class="note-item-title"><?= $note['client_location'] ?: 'Untitled' ?></span>
                <span class="note-item-meta"><?= $note['call_started_at'] ?? '' ?></span>
                <button class="note-delete" data-id="<?= (int) $note['id'] ?>" title="Delete">×</button>
            </li>
            <?php endforeach; ?>
        </ul>
    </aside>

</div>

<div class="modal-overlay" id="export-modal" hidden>
    <div class="modal">
        <div class="modal-header">
            <h2>Export Preview</h2>
            <button class="modal-close" id="modal-close">×</button>
        </div>
        <pre class="markdown-preview" id="markdown-preview"></pre>
        <div class="modal-footer">
            <a class="btn btn-primary" id="btn-download" href="/api/export.php?download=1" download>Download .md</a>
            <button class="btn" id="btn-modal-close">Close</button>
        </div>
    </div>
</div>

<script src="/assets/js/app.js"></script>
</body>
</html>
