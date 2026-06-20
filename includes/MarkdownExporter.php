<?php

declare(strict_types=1);

/**
 * MarkdownExporter — converts an array of note rows into a Markdown document.
 *
 * Accepts plain note arrays (as returned by NoteRepository) and has no
 * database dependency. The document title is "QA Session Notes" only when
 * every note in the export is QA mode; otherwise "Support Call Notes".
 * Per-note timestamp labels are mode-aware ("Session Started" vs "Call Started").
 * call_started_at (ISO 8601 UTC) is formatted to local time for readability.
 * call_elapsed_seconds, when present, is rendered as a Duration line.
 */
class MarkdownExporter
{
    public function export(array $notes, int $tzOffsetMinutes = 0): string
    {
        if (empty($notes)) {
            return '';
        }

        $tz     = $this->tzFromOffset($tzOffsetMinutes);
        $date   = (new DateTimeImmutable('now', $tz))->format('F j, Y');
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
                $lines[] = "{$label} {$this->fmtTimestamp($note['call_started_at'], $tz)}";

                $elapsed = isset($note['call_elapsed_seconds']) && $note['call_elapsed_seconds'] !== null
                    ? (int) $note['call_elapsed_seconds']
                    : null;
                if ($elapsed !== null) {
                    $lines[] = "**Duration:** {$this->fmtElapsed($elapsed)}";
                }
            }

            $lines[] = '';
            $lines[] = trim($note['content']);
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    private function tzFromOffset(int $minutes): \DateTimeZone
    {
        $sign = $minutes >= 0 ? '+' : '-';
        $abs  = abs($minutes);
        return new \DateTimeZone(sprintf('%s%02d:%02d', $sign, intdiv($abs, 60), $abs % 60));
    }

    private function fmtTimestamp(string $iso, \DateTimeZone $tz): string
    {
        try {
            return (new \DateTimeImmutable($iso))->setTimezone($tz)->format('g:i A');
        } catch (\Exception) {
            return $iso;
        }
    }

    private function fmtElapsed(int $seconds): string
    {
        $h = (int) floor($seconds / 3600);
        $m = (int) floor(($seconds % 3600) / 60);
        $s = $seconds % 60;
        if ($h > 0) {
            return "{$h}h {$m}m {$s}s";
        }
        if ($m > 0) {
            return "{$m}m {$s}s";
        }
        return "{$s}s";
    }
}
