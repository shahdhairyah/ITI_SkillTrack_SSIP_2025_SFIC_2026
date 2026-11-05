<?php

namespace App\Controllers;

use App\Services\AuditService;
use App\Services\ReportService;
use App\Support\Request;
use App\Support\Response;

class ReportController
{
    private function user(): array
    {
        return $GLOBALS['CURRENT_USER'] ?? [];
    }

    public function attendanceSummary(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id', 1),
            'from' => Request::query('from'),
            'to' => Request::query('to')
        ];

        try {
            $data = ReportService::getAttendanceSummary($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'REPORT_ERROR', [], 500);
        }
    }

    public function exportAttendanceSummary(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id', 1),
            'from' => Request::query('from'),
            'to' => Request::query('to')
        ];

        try {
            $report = ReportService::getAttendanceSummary($filters, $this->user());
            AuditService::log(
                $this->user()['id'] ?? null,
                'REPORT_EXPORTED',
                'batch',
                (int)$filters['batch_id'],
                null,
                ['type' => 'attendance_summary', 'timestamp' => date('c')]
            );
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'EXPORT_ERROR', [], 500);
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $filename = 'iti-attendance-summary-' . date('Ymd-His') . '.csv';
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM
        fputs($out, "\xEF\xBB\xBF");

        // Metadata Header
        fputcsv($out, ['# ITI SkillTrack - Institutional Attendance Summary Report']);
        fputcsv($out, ['# Batch:', $report['batch']['name'] ?? '', 'Trade:', $report['batch']['trade_name'] ?? '']);
        fputcsv($out, ['# Generated:', date('Y-m-d H:i:s'), 'Total Trainees:', $report['total_students']]);
        fputcsv($out, ['# Statutory Threshold: 80.0% Minimum Practical Attendance for AITT Practical Exam']);
        fputcsv($out, []); // Blank line

        // Table Header
        fputcsv($out, [
            'Roll No',
            'Admission No',
            'Trainee Name',
            'Email',
            'Total Sessions',
            'Present',
            'Late',
            'Excused',
            'Absent',
            'Attendance %',
            'Statutory Exam Status'
        ]);

        foreach ($report['students'] as $s) {
            fputcsv($out, [
                ReportService::sanitizeCell((string)$s['roll_number']),
                ReportService::sanitizeCell((string)$s['admission_number']),
                ReportService::sanitizeCell((string)$s['name']),
                ReportService::sanitizeCell((string)$s['email']),
                (string)$s['total_sessions'],
                (string)$s['present'],
                (string)$s['late'],
                (string)$s['excused'],
                (string)$s['absent'],
                $s['attendance_percentage'] . '%',
                ReportService::sanitizeCell($s['status_label'])
            ]);
        }

        fclose($out);
        exit;
    }

    public function competencyMastery(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id', 1)
        ];

        try {
            $data = ReportService::getCompetencyMastery($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'REPORT_ERROR', [], 500);
        }
    }

    public function aittEligibility(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id', 1)
        ];

        try {
            $data = ReportService::getAittEligibilityRoster($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'REPORT_ERROR', [], 500);
        }
    }

    public function exportAittEligibility(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id', 1)
        ];

        try {
            $report = ReportService::getAittEligibilityRoster($filters, $this->user());
            AuditService::log(
                $this->user()['id'] ?? null,
                'REPORT_EXPORTED',
                'batch',
                (int)$filters['batch_id'],
                null,
                ['type' => 'aitt_eligibility_roster', 'timestamp' => date('c')]
            );
        } catch (\Throwable $e) {
            Response::error($e->getMessage(), 'EXPORT_ERROR', [], 500);
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $filename = 'aitt-practical-eligibility-' . date('Ymd-His') . '.csv';
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'w');
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, ['# ITI SkillTrack - AITT Practical Exam Statutory Eligibility Roster']);
        fputcsv($out, ['# Regulatory Framework: DGT / NCVT Craftsmen Training Scheme (CTS)']);
        fputcsv($out, ['# Batch:', $report['batch']['name'] ?? '', 'Trade:', $report['batch']['trade_name'] ?? '']);
        fputcsv($out, ['# Generated At:', $report['generated_at'], 'Total Evaluated:', $report['total_trainees']]);
        fputcsv($out, ['# Qualified:', $report['total_qualified'], 'Disqualified:', $report['total_disqualified']]);
        fputcsv($out, []);

        fputcsv($out, [
            'Roll No',
            'Admission No',
            'Trainee Name',
            'Attendance %',
            'Attendance Gate',
            'Competent Activities',
            'Total Activities',
            'Safety Protocol Clearance',
            'AITT Practical Verdict',
            'Disqualification Remarks / Remedial Note',
            'Hall Ticket Release Status'
        ]);

        foreach ($report['roster'] as $r) {
            fputcsv($out, [
                ReportService::sanitizeCell((string)$r['roll_number']),
                ReportService::sanitizeCell((string)$r['admission_number']),
                ReportService::sanitizeCell((string)$r['name']),
                $r['attendance_percentage'] . '%',
                $r['attendance_status'],
                (string)$r['competent_activities'],
                (string)$r['total_activities'],
                $r['safety_clearance'],
                $r['aitt_practical_verdict'],
                ReportService::sanitizeCell($r['disqualification_reason']),
                $r['hall_ticket_status']
            ]);
        }

        fclose($out);
        exit;
    }
}

