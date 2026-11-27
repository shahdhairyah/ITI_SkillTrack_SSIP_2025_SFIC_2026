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

    private function handleException(\Throwable $e, string $fallbackCode = 'REPORT_ERROR'): void
    {
        $code = $e->getCode();
        $httpStatus = ($code >= 400 && $code < 600) ? (int)$code : 500;
        Response::error($e->getMessage(), $fallbackCode, [], $httpStatus);
    }

    public function attendanceSummary(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
            'from' => Request::query('from'),
            'to' => Request::query('to'),
        ];

        try {
            $data = ReportService::getAttendanceSummary($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            $this->handleException($e, 'REPORT_ERROR');
        }
    }

    public function exportAttendanceSummary(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
            'from' => Request::query('from'),
            'to' => Request::query('to'),
        ];

        try {
            $report = ReportService::getAttendanceSummary($filters, $this->user());
            AuditService::log(
                $this->user()['id'] ?? null,
                'REPORT_EXPORTED',
                'batch',
                (int)($report['batch']['id'] ?? 0),
                null,
                ['type' => 'attendance_summary', 'from' => $filters['from'], 'to' => $filters['to'], 'timestamp' => date('c')]
            );
        } catch (\Throwable $e) {
            $this->handleException($e, 'EXPORT_ERROR');
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
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, ['# ITI SkillTrack - Institutional Attendance Summary Report']);
        fputcsv($out, ['# Batch:', $report['batch']['name'] ?? '', 'Trade:', $report['batch']['trade_name'] ?? '']);
        fputcsv($out, ['# Date Range:', ($report['filters']['from'] ?: 'Start') . ' to ' . ($report['filters']['to'] ?: 'Latest')]);
        fputcsv($out, ['# Generated:', date('Y-m-d H:i:s'), 'Total Trainees:', $report['total_students']]);
        fputcsv($out, ['# Statutory Threshold: 80.0% Minimum Practical Attendance for AITT Practical Exam']);
        fputcsv($out, []);

        fputcsv($out, [
            'Roll No',
            'Admission No',
            'Trainee Name',
            'Email',
            'Total Sessions',
            'Effective Sessions',
            'Present',
            'Late',
            'Excused',
            'Absent',
            'Attendance %',
            'Statutory Exam Status',
        ]);

        foreach ($report['students'] as $s) {
            fputcsv($out, [
                ReportService::sanitizeCell((string)$s['roll_number']),
                ReportService::sanitizeCell((string)$s['admission_number']),
                ReportService::sanitizeCell((string)$s['name']),
                ReportService::sanitizeCell((string)$s['email']),
                (string)$s['total_sessions'],
                (string)$s['effective_sessions'],
                (string)$s['present'],
                (string)$s['late'],
                (string)$s['excused'],
                (string)$s['absent'],
                $s['attendance_percentage'] . '%',
                ReportService::sanitizeCell($s['status_label']),
            ]);
        }

        fclose($out);
        exit;
    }

    public function competencyMastery(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
        ];

        try {
            $data = ReportService::getCompetencyMastery($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            $this->handleException($e, 'REPORT_ERROR');
        }
    }

    public function exportCompetencyMastery(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
        ];

        try {
            $report = ReportService::getCompetencyMastery($filters, $this->user());
            AuditService::log(
                $this->user()['id'] ?? null,
                'REPORT_EXPORTED',
                'batch',
                (int)($report['batch']['id'] ?? 0),
                null,
                ['type' => 'competency_mastery', 'timestamp' => date('c')]
            );
        } catch (\Throwable $e) {
            $this->handleException($e, 'EXPORT_ERROR');
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $filename = 'iti-competency-mastery-' . date('Ymd-His') . '.csv';
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'w');
        fputs($out, "\xEF\xBB\xBF");

        fputcsv($out, ['# ITI SkillTrack - Practical Competency Mastery Matrix']);
        fputcsv($out, ['# Batch:', $report['batch']['name'] ?? '', 'Trade:', $report['batch']['trade_name'] ?? '']);
        fputcsv($out, ['# Generated:', date('Y-m-d H:i:s'), 'Clearance Rate:', ($report['metrics']['competency_clearance_rate'] ?? 0) . '%']);
        fputcsv($out, []);

        $headers = ['Roll No', 'Trainee Name', 'Competent', 'Remedial', 'Avg Score %', 'Completion %'];
        foreach ($report['activities'] as $act) {
            $headers[] = 'Act ' . $act['activity_number'] . ': ' . $act['title'];
        }
        fputcsv($out, $headers);

        foreach ($report['students'] as $stu) {
            $row = [
                ReportService::sanitizeCell((string)$stu['roll_number']),
                ReportService::sanitizeCell((string)$stu['name']),
                (string)$stu['summary']['competent_count'],
                (string)$stu['summary']['remedial_count'],
                $stu['summary']['average_score'] !== null ? $stu['summary']['average_score'] . '%' : 'N/A',
                $stu['summary']['completion_percentage'] . '%',
            ];
            foreach ($report['activities'] as $act) {
                $res = $stu['activities'][$act['id']] ?? null;
                if (!$res || $res['status'] === 'not_attempted') {
                    $row[] = 'Pending';
                } else {
                    $label = $res['status'] === 'competent' ? 'Competent' : 'Remedial';
                    $score = $res['score_percentage'] !== null ? " ({$res['score_percentage']}%)" : '';
                    $row[] = $label . $score;
                }
            }
            fputcsv($out, $row);
        }

        fclose($out);
        exit;
    }

    public function aittEligibility(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
        ];

        try {
            $data = ReportService::getAittEligibilityRoster($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            $this->handleException($e, 'REPORT_ERROR');
        }
    }

    public function exportAittEligibility(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
        ];

        try {
            $report = ReportService::getAittEligibilityRoster($filters, $this->user());
            AuditService::log(
                $this->user()['id'] ?? null,
                'REPORT_EXPORTED',
                'batch',
                (int)($report['batch']['id'] ?? 0),
                null,
                ['type' => 'aitt_eligibility_roster', 'timestamp' => date('c')]
            );
        } catch (\Throwable $e) {
            $this->handleException($e, 'EXPORT_ERROR');
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
            'Open Remedials',
            'Safety Protocol Clearance',
            'AITT Practical Verdict',
            'Disqualification Remarks / Remedial Note',
            'Hall Ticket Release Status',
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
                (string)$r['open_remedials'],
                $r['safety_clearance'],
                $r['aitt_practical_verdict'],
                ReportService::sanitizeCell($r['disqualification_reason']),
                $r['hall_ticket_status'],
            ]);
        }

        fclose($out);
        exit;
    }

    public function remedialSummary(): void
    {
        $filters = [
            'batch_id' => Request::query('batch_id'),
            'from' => Request::query('from'),
            'to' => Request::query('to'),
        ];

        try {
            $data = ReportService::getRemedialAndTrends($filters, $this->user());
            Response::success($data);
        } catch (\Throwable $e) {
            $this->handleException($e, 'REPORT_ERROR');
        }
    }
}
