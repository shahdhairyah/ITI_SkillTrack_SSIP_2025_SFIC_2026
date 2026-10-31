<?php

namespace App\Controllers;

use App\Services\AttendanceService;
use App\Support\Response;

class AttendanceController
{
    public function config(): void
    {
        $user = $this->user();
        try {
            Response::success(AttendanceService::getConfig((int)$user['institute_id']));
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_CONFIG_FAILED');
        }
    }

    public function updateStatus(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = $this->body();
        try {
            $config = AttendanceService::updateStatus($id, $data, $this->user());
            Response::success($config, ['message' => 'Attendance status configuration updated.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_STATUS_UPDATE_FAILED');
        }
    }

    public function sessions(): void
    {
        $filters = [
            'batch_id' => $_GET['batch_id'] ?? null,
            'instructor_id' => $_GET['instructor_id'] ?? null,
            'status' => $_GET['status'] ?? null,
            'from' => $_GET['from'] ?? null,
            'to' => $_GET['to'] ?? null,
            'limit' => $_GET['limit'] ?? null,
        ];

        try {
            Response::success(AttendanceService::getSessions($filters, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'SESSIONS_LIST_FAILED');
        }
    }

    public function showSession(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            Response::success(AttendanceService::getSession($id, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'SESSION_READ_FAILED');
        }
    }

    public function createSession(): void
    {
        try {
            $session = AttendanceService::createSession($this->body(), $this->user());
            Response::success($session, ['message' => 'Training session scheduled successfully.'], 201);
        } catch (\Throwable $e) {
            $this->fail($e, 'SESSION_CREATE_FAILED');
        }
    }

    public function updateSession(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $session = AttendanceService::updateSession($id, $this->body(), $this->user());
            Response::success($session, ['message' => 'Training session updated successfully.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'SESSION_UPDATE_FAILED');
        }
    }

    public function cancelSession(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $session = AttendanceService::cancelSession($id, $this->body(), $this->user());
            Response::success($session, ['message' => 'Training session cancelled.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'SESSION_CANCEL_FAILED');
        }
    }

    public function roster(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            Response::success(AttendanceService::getRoster($id, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_ROSTER_FAILED');
        }
    }

    public function register(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            Response::success(AttendanceService::getRegister($id, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_REGISTER_FAILED');
        }
    }

    public function saveDraft(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        $data = $this->body();
        $marks = $data['marks'] ?? [];
        if (!is_array($marks)) {
            Response::error('Marks must be an array.', 'VALIDATION_ERROR', [], 422);
            return;
        }

        try {
            $register = AttendanceService::saveDraft($id, $marks, $this->user());
            Response::success($register, ['message' => 'Attendance draft saved.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_SAVE_FAILED');
        }
    }

    public function submit(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $register = AttendanceService::submit($id, $this->user());
            Response::success($register, ['message' => 'Attendance register submitted and locked.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_SUBMIT_FAILED');
        }
    }

    public function correct(array $params): void
    {
        $id = (int)($params['id'] ?? 0);
        try {
            $record = AttendanceService::correctRecord($id, $this->body(), $this->user());
            Response::success($record, ['message' => 'Attendance record corrected and audit logged.']);
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_CORRECTION_FAILED');
        }
    }

    public function studentAttendance(array $params): void
    {
        $studentId = (int)($params['id'] ?? 0);
        $filters = [
            'from' => $_GET['from'] ?? null,
            'to' => $_GET['to'] ?? null,
        ];

        try {
            Response::success(AttendanceService::getStudentAttendance($studentId, $filters, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'STUDENT_ATTENDANCE_FAILED');
        }
    }

    public function report(): void
    {
        $filters = [
            'batch_id' => $_GET['batch_id'] ?? null,
            'student_id' => $_GET['student_id'] ?? null,
            'from' => $_GET['from'] ?? null,
            'to' => $_GET['to'] ?? null,
        ];

        try {
            Response::success(AttendanceService::getReport($filters, $this->user()));
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_REPORT_FAILED');
        }
    }

    public function exportReport(): void
    {
        $filters = [
            'batch_id' => $_GET['batch_id'] ?? null,
            'student_id' => $_GET['student_id'] ?? null,
            'from' => $_GET['from'] ?? null,
            'to' => $_GET['to'] ?? null,
        ];

        try {
            $report = AttendanceService::getReport($filters, $this->user());
        } catch (\Throwable $e) {
            $this->fail($e, 'ATTENDANCE_EXPORT_FAILED');
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        $filename = 'attendance-register-' . date('Ymd-His') . '.csv';
        http_response_code(200);
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');
        header('X-Content-Type-Options: nosniff');

        $out = fopen('php://output', 'wb');
        if ($out === false) {
            Response::error('Unable to prepare CSV export.', 'EXPORT_FAILED', [], 500);
            return;
        }

        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, [
            'Session Date',
            'Start Time',
            'End Time',
            'Batch',
            'Section',
            'Trade',
            'Topic',
            'Instructor',
            'Admission No',
            'Student',
            'Attendance Status',
            'Marked At',
            'Correction Count',
        ]);

        $statusMap = AttendanceService::getConfig((int)$this->user()['institute_id'])['status_map'];
        foreach ($report['rows'] as $row) {
            $status = $row['status'] ?: 'unmarked';
            fputcsv($out, array_map([$this, 'csvCell'], [
                $row['session_date'],
                substr((string)$row['start_time'], 0, 5),
                substr((string)$row['end_time'], 0, 5),
                $row['batch_name'],
                $row['batch_section'],
                $row['trade_name'],
                $row['topic'],
                $row['instructor_name'],
                $row['admission_no'],
                $row['student_name'],
                $statusMap[$status]['label'] ?? ucfirst(str_replace('_', ' ', $status)),
                $row['marked_at'] ?? '',
                (string)($row['correction_count'] ?? 0),
            ]));
        }
        fclose($out);
        exit;
    }

    private function csvCell(string $value): string
    {
        if ($value !== '' && preg_match('/^[=+\-@\t\r]/', $value)) {
            return "'" . $value;
        }
        return $value;
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '[]', true);
        return is_array($data) ? $data : [];
    }

    private function user(): array
    {
        return $GLOBALS['CURRENT_USER'] ?? [];
    }

    private function fail(\Throwable $e, string $fallbackCode): void
    {
        $code = (int)$e->getCode();
        $httpStatus = in_array($code, [401, 403, 404, 409, 422, 423], true) ? $code : 500;
        $errorCode = match ($httpStatus) {
            401 => 'UNAUTHENTICATED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            409 => 'CONFLICT',
            422 => 'VALIDATION_ERROR',
            423 => 'LOCKED',
            default => $fallbackCode,
        };
        Response::error($e->getMessage() ?: 'Attendance request failed.', $errorCode, [], $httpStatus);
    }
}
