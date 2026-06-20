<?php

declare(strict_types=1);

/**
 * MarkdownExporter — converts an array of note rows into a Markdown document.
 *
 * Accepts plain note arrays (as returned by NoteRepository) and has no
 * database dependency. The document title is "QA Session Notes" only when
 * every note in the export is QA mode; otherwise "Support Call Notes".
 * Per-note timestamp labels are also mode-aware ("Session Started" vs "Call Started").
 */
class MarkdownExporter
{
    public function export(array $notes): string
    {
        if (empty($notes)) {
            return '';
        }

        $date   = (new DateTimeImmutable())->format('F j, Y');
        $modes  = array_unique(array_column($notes, 'mode'));
        $title  = count($modes) === 1 && $modes[0] === 'qa'
            ? '# QA Session Notes'
            : '# Support Call Notes';

        $lines = [$title, "**Date:** {$date}", ''];

        foreach ($notes as $note) {
            $heading = $note['client_location'] ?: 'Unnamed';
            if (!empty($note['contact_name'])) {
                $heading .= " — {$note['contact_name']}";
            }

            $lines[] = '---';
            $lines[] = '';
            $lines[] = "## {$heading}";
            if (!empty($note['call_started_at'])) {
                $label   = $note['mode'] === 'qa' ? '**Session Started:**' : '**Call Started:**';
                $lines[] = "{$label} {$note['call_started_at']}";
            }
            $lines[] = '';
            $lines[] = trim($note['content']);
            $lines[] = '';
        }

        return implode("\n", $lines);
    }
}
