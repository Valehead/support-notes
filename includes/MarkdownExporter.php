<?php

declare(strict_types=1);

/**
 * MarkdownExporter — converts an array of note rows into a Markdown document.
 *
 * Accepts plain note arrays (as returned by NoteRepository) and has no
 * database dependency. The document title is derived from the first note's
 * mode, so mixed-mode exports label themselves by whichever note comes first.
 */
class MarkdownExporter
{
    public function export(array $notes): string
    {
        if (empty($notes)) {
            return '';
        }

        $date  = (new DateTimeImmutable())->format('F j, Y');
        $title = $notes[0]['mode'] === 'qa' ? '# QA Session Notes' : '# Support Call Notes';

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
                $lines[] = "**Call Started:** {$note['call_started_at']}";
            }
            $lines[] = '';
            $lines[] = trim($note['content']);
            $lines[] = '';
        }

        return implode("\n", $lines);
    }
}
