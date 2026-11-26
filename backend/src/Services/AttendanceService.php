<?php

namespace App\Services;

use PDO;

class AttendanceService
{
    private const DEFAULT_POLICY = [
        'threshold_percentage' => 80.0,
        'correction_window_hours' => 48,
        'formula' => '(present + late) / (total sessions - excused) * 100',
        'attendance_unit' => 'session',
    ];

    private const DEFAULT_STATUSES = [
        [
            'status_key' => 'present',
            'label' => 'Present',
            'counts_as_present' => true,
            'excluded_from_denominator' => false,
            'requires_note' => false,
            'sort_order' => 10,
            'is_active' => true,
        ],
        [
            'status_key' => 'late',
            'label' => 'Late',
            'counts_as_present' => true,
            'excluded_from_denominator' => false,
            'requires_note' => false,
            'sort_order' => 20,
            'is_active' => true,
        ],
        [
            'status_key' => 'absent',
            'label' => 'Absent',
            'counts_as_present' => false,
            'excluded_from_denominator' => false,
            'requires_note' => false,
            'sort_order' => 30,
            'is_active' => true,
        ],
        [
            'status_key' => 'excused',
            'label' => 'Excused',
            'counts_as_present' => false,
            'excluded_from_denominator' => true,
            'requires_note' => false,
            'sort_order' => 40,
            'is_active' => true,
        ],
    ];

    public static function getConfig(int $instituteId): array
    {
        $pdo = Database::getConnection();
        $policy = self::DEFAULT_POLICY;

        $stmt = $pdo->prepare('SELECT setting_value FROM system_settings WHERE institute_id = :inst AND setting_key = :key LIMIT 1');
        $stmt->execute(['inst' => $instituteId, 'key' => 'attendance_policy']);
        $raw = $stmt->fetchColumn();
        if ($raw !== false && $raw !== null && $raw !== '') {
            $decoded = json_decode((string)$raw, true);
            if (is_array($decoded)) {
                $policy = array_merge($policy, $decoded);
            }
        }

        $policy['threshold_percentage'] = (float)$policy['threshold_percentage'];
        $policy['correction_window_hours'] = (int)$policy['correction_window_hours'];

        $statusStmt = $pdo->prepare('
            SELECT id, status_key, label, counts_as_present, excluded_from_denominator,
                   requires_note, sort_order, is_active
            FROM attendance_statuses
            WHERE institute_id = :inst AND is_active = 1
            ORDER BY sort_order ASC, id ASC
        ');
        $statusStmt->execute(['inst' => $instituteId]);
        $statuses = $statusStmt->fetchAll();

        if (!$statuses) {
            $statuses = self::DEFAULT_STATUSES;
        }

        $statuses = array_map(static function (array $row): array {
            return [
                'id' => isset($row['id']) ? (int)$row['id'] : null,
                'status_key' => (string)$row['status_key'],
                'label' => (string)$row['label'],
                'counts_as_present' => (bool)$row['counts_as_present'],
                'excluded_from_denominator' => (bool)$row['excluded_from_denominator'],
                'requires_note' => (bool)$row['requires_note'],
                'sort_order' => (int)$row['sort_order'],
                'is_active' => (bool)$row['is_active'],
            ];
        }, $statuses);

        return [
            'statuses' => $statuses,
            'status_map' => self::indexStatuses($statuses),
            'policy' => $policy,
        ];
    }

    public static function updateStatus(int $id, array $data, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        if ($user['role'] !== 'administrator') {
            throw new \DomainException('Forbidden: only an administrator can change attendance statuses.', 403);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM attendance_statuses WHERE id = :id AND institute_id = :inst LIMIT 1');
        $stmt->execute(['id' => $id, 'inst' => (int)$user['institute_id']]);
        $existing = $stmt->fetch();
        if (!$existing) {
            throw new \InvalidArgumentException("Attendance status #{$id} not found.", 404);
        }

        $label = trim((string)($data['label'] ?? $existing['label']));
        if ($label === '') {
            throw new \InvalidArgumentException('Status label is required.', 422);
        }

        $countsAsPresent = array_key_exists('counts_as_present', $data)
            ? (bool)$data['counts_as_present']
            : (bool)$existing['counts_as_present'];
        $excluded = array_key_exists('excluded_from_denominator', $data)
            ? (bool)$data['excluded_from_denominator']
            : (bool)$existing['excluded_from_denominator'];
        $requiresNote = array_key_exists('requires_note', $data)
            ? (bool)$data['requires_note']
            : (bool)$existing['requires_note'];
        $sortOrder = array_key_exists('sort_order', $data)
            ? (int)$data['sort_order']
            : (int)$existing['sort_order'];
        $isActive = array_key_exists('is_active', $data)
            ? (bool)$data['is_active']
            : (bool)$existing['is_active'];

        if ($countsAsPresent && $excluded) {
            throw new \InvalidArgumentException('A status cannot count as present and be excluded from the denominator.', 422);
        }

        $upd = $pdo->prepare('
            UPDATE attendance_statuses
            SET label = :label, counts_as_present = :present, excluded_from_denominator = :excluded,
                requires_note = :note, sort_order = :sort_order, is_active = :active
            WHERE id = :id AND institute_id = :inst
        ');
        $upd->execute([
            'label' => $label,
            'present' => $countsAsPresent ? 1 : 0,
            'excluded' => $excluded ? 1 : 0,
            'note' => $requiresNote ? 1 : 0,
            'sort_order' => $sortOrder,
            'active' => $isActive ? 1 : 0,
            'id' => $id,
            'inst' => (int)$user['institute_id'],
        ]);

        AuthService::logAudit(
            (int)$user['id'],
            'ATTENDANCE_STATUS_UPDATE',
            'attendance_statuses',
            $id,
            ['label' => $label, 'counts_as_present' => $countsAsPresent, 'excluded_from_denominator' => $excluded, 'is_active' => $isActive],
            $existing
        );

        return self::getConfig((int)$user['institute_id']);
    }

    public static function getSessions(array $filters = [], ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        $pdo = Database::getConnection();
        $instituteId = (int)$user['institute_id'];

        $sql = '
            SELECT ts.id, ts.batch_id, ts.instructor_id, ts.session_date, ts.start_time, ts.end_time,
                   ts.topic, ts.session_type, ts.notes, ts.status, ts.submitted_at, ts.submitted_by,
                   ts.cancelled_at, ts.cancellation_reason, ts.created_at, ts.updated_at,
                   b.name AS batch_name, b.section AS batch_section, b.shift AS batch_shift,
                   b.trade_id, t.name AS trade_name, t.code AS trade_code, t.institute_id,
                   ap.name AS academic_period_name,
                   i.name AS instructor_name, i.employee_code,
                   (SELECT COUNT(*) FROM enrollments e
                     WHERE e.batch_id = ts.batch_id
                       AND e.starts_on <= ts.session_date
                       AND (e.ends_on IS NULL OR e.ends_on >= ts.session_date)) AS roster_count,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ts.id) AS marked_count,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ts.id AND ar.status = \'present\') AS present_count,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ts.id AND ar.status = \'late\') AS late_count,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ts.id AND ar.status = \'absent\') AS absent_count,
                   (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ts.id AND ar.status = \'excused\') AS excused_count
            FROM training_sessions ts
            JOIN batches b ON b.id = ts.batch_id
            JOIN trades t ON t.id = b.trade_id
            JOIN academic_periods ap ON ap.id = b.academic_period_id
            JOIN instructors i ON i.id = ts.instructor_id
            WHERE t.institute_id = ?
        ';
        $params = [$instituteId];

        if ($user['role'] === 'instructor') {
            $batches = array_values(array_map('intval', $user['scope']['batches'] ?? []));
            if (!$batches) {
                return [];
            }
            $sql .= ' AND ts.batch_id IN (' . implode(',', array_fill(0, count($batches), '?')) . ')';
            $params = array_merge($params, $batches);
        } elseif ($user['role'] === 'student') {
            $batches = array_values(array_map('intval', $user['scope']['batches'] ?? []));
            if (!$batches) {
                return [];
            }
            $sql .= ' AND ts.batch_id IN (' . implode(',', array_fill(0, count($batches), '?')) . ')';
            $params = array_merge($params, $batches);
            $sql .= " AND ts.status = 'submitted'";
        }

        if (!empty($filters['batch_id'])) {
            $sql .= ' AND ts.batch_id = ?';
            $params[] = (int)$filters['batch_id'];
        }
        if (!empty($filters['instructor_id'])) {
            $sql .= ' AND ts.instructor_id = ?';
            $params[] = (int)$filters['instructor_id'];
        }
        if (!empty($filters['status'])) {
            $sql .= ' AND ts.status = ?';
            $params[] = trim((string)$filters['status']);
        }
        if (!empty($filters['from'])) {
            $sql .= ' AND ts.session_date >= ?';
            $params[] = self::normalizeDate((string)$filters['from']);
        }
        if (!empty($filters['to'])) {
            $sql .= ' AND ts.session_date <= ?';
            $params[] = self::normalizeDate((string)$filters['to']);
        }

        $sql .= ' ORDER BY ts.session_date DESC, ts.start_time DESC, ts.id DESC';
        $limit = isset($filters['limit']) ? max(1, min(200, (int)$filters['limit'])) : 100;
        $sql .= ' LIMIT ' . $limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $sessions = $stmt->fetchAll();

        foreach ($sessions as &$session) {
            $session = self::normalizeSessionRow($session);
            $session['can_manage'] = self::canManageSession($session, $user);
            $session['can_submit'] = $session['can_manage'] && in_array($session['status'], ['scheduled', 'draft'], true);
        }
        unset($session);

        return $sessions;
    }

    public static function getSession(int $id, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        $session = self::findSession($id);
        if (!$session) {
            throw new \InvalidArgumentException("Training session #{$id} not found.", 404);
        }
        self::assertCanViewSession($session, $user);
        $session = self::hydrateSession($session, $user);
        return $session;
    }

    public static function createSession(array $data, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        self::assertStaff($user);
        $pdo = Database::getConnection();

        $batchId = (int)($data['batch_id'] ?? 0);
        $sessionDate = self::normalizeDate((string)($data['session_date'] ?? ''));
        $startTime = self::normalizeTime((string)($data['start_time'] ?? ''));
        $endTime = self::normalizeTime((string)($data['end_time'] ?? ''));
        $topic = trim((string)($data['topic'] ?? ''));
        $sessionType = self::normalizeSessionType((string)($data['session_type'] ?? 'practical'));
        $notes = trim((string)($data['notes'] ?? ''));

        if ($batchId <= 0 || $topic === '') {
            throw new \InvalidArgumentException('Batch, date, time window and topic are required.', 422);
        }
        if (mb_strlen($topic) < 3 || mb_strlen($topic) > 255) {
            throw new \InvalidArgumentException('Topic must be between 3 and 255 characters.', 422);
        }
        if (strtotime('1970-01-01 ' . $endTime) <= strtotime('1970-01-01 ' . $startTime)) {
            throw new \InvalidArgumentException('Session end time must be after the start time.', 422);
        }

        $batch = self::findBatch($batchId);
        if (!$batch || (int)$batch['institute_id'] !== (int)$user['institute_id']) {
            throw new \InvalidArgumentException('Selected batch does not exist in your institute.', 404);
        }
        self::assertCanManageBatch($batch, $sessionDate, $user);

        if ($user['role'] === 'instructor') {
            $instructorId = (int)($user['profile']['instructor_id'] ?? 0);
        } else {
            $instructorId = (int)($data['instructor_id'] ?? 0);
            if ($instructorId <= 0) {
                throw new \InvalidArgumentException('Select the instructor responsible for this session.', 422);
            }
        }

        self::assertInstructorForBatch($instructorId, $batchId, $sessionDate, (int)$user['institute_id']);
        $status = (string)($data['status'] ?? 'scheduled');
        if (!in_array($status, ['scheduled', 'draft'], true)) {
            throw new \InvalidArgumentException('New sessions must be scheduled or draft.', 422);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $pdo->prepare('
            INSERT INTO training_sessions
                (batch_id, instructor_id, session_date, start_time, end_time, topic, session_type,
                 notes, status, created_at, updated_at)
            VALUES
                (:batch, :instructor, :date, :start, :end, :topic, :type,
                 :notes, :status, :created, :updated)
        ');
        $stmt->execute([
            'batch' => $batchId,
            'instructor' => $instructorId,
            'date' => $sessionDate,
            'start' => $startTime,
            'end' => $endTime,
            'topic' => $topic,
            'type' => $sessionType,
            'notes' => $notes !== '' ? $notes : null,
            'status' => $status,
            'created' => $now,
            'updated' => $now,
        ]);

        $sessionId = (int)$pdo->lastInsertId();
        AuthService::logAudit((int)$user['id'], 'SESSION_CREATE', 'training_sessions', $sessionId, [
            'batch_id' => $batchId,
            'instructor_id' => $instructorId,
            'session_date' => $sessionDate,
            'topic' => $topic,
        ]);

        return self::getSession($sessionId, $user);
    }

    public static function updateSession(int $id, array $data, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        self::assertStaff($user);
        $pdo = Database::getConnection();

        $existing = self::findSession($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Training session #{$id} not found.", 404);
        }
        self::assertCanManageSession($existing, $user);

        if (!in_array($existing['status'], ['scheduled', 'draft'], true)) {
            throw new \DomainException('Submitted or cancelled sessions cannot be edited.', 423);
        }

        $batchId = array_key_exists('batch_id', $data) ? (int)$data['batch_id'] : (int)$existing['batch_id'];
        $sessionDate = array_key_exists('session_date', $data)
            ? self::normalizeDate((string)$data['session_date'])
            : (string)$existing['session_date'];
        $startTime = array_key_exists('start_time', $data)
            ? self::normalizeTime((string)$data['start_time'])
            : (string)$existing['start_time'];
        $endTime = array_key_exists('end_time', $data)
            ? self::normalizeTime((string)$data['end_time'])
            : (string)$existing['end_time'];
        $topic = trim((string)($data['topic'] ?? $existing['topic']));
        $sessionType = self::normalizeSessionType((string)($data['session_type'] ?? $existing['session_type']));
        $notes = array_key_exists('notes', $data) ? trim((string)$data['notes']) : (string)($existing['notes'] ?? '');

        if ($topic === '') {
            throw new \InvalidArgumentException('Session topic is required.', 422);
        }
        if (strtotime('1970-01-01 ' . $endTime) <= strtotime('1970-01-01 ' . $startTime)) {
            throw new \InvalidArgumentException('Session end time must be after the start time.', 422);
        }

        $batch = self::findBatch($batchId);
        if (!$batch || (int)$batch['institute_id'] !== (int)$user['institute_id']) {
            throw new \InvalidArgumentException('Selected batch does not exist in your institute.', 404);
        }
        self::assertCanManageBatch($batch, $sessionDate, $user);

        $attendanceCountStmt = $pdo->prepare('SELECT COUNT(*) FROM attendance_records WHERE session_id = :sid');
        $attendanceCountStmt->execute(['sid' => $id]);
        if ((int)$attendanceCountStmt->fetchColumn() > 0 && ($batchId !== (int)$existing['batch_id'] || $sessionDate !== $existing['session_date'])) {
            throw new \InvalidArgumentException('Batch and session date are locked after attendance has been entered.', 423);
        }

        if ($user['role'] === 'instructor') {
            $instructorId = (int)($user['profile']['instructor_id'] ?? 0);
        } else {
            $instructorId = array_key_exists('instructor_id', $data)
                ? (int)$data['instructor_id']
                : (int)$existing['instructor_id'];
            if ($instructorId <= 0) {
                throw new \InvalidArgumentException('Select the instructor responsible for this session.', 422);
            }
        }
        self::assertInstructorForBatch($instructorId, $batchId, $sessionDate, (int)$user['institute_id']);

        $stmt = $pdo->prepare('
            UPDATE training_sessions
            SET batch_id = :batch, instructor_id = :instructor, session_date = :date,
                start_time = :start, end_time = :end, topic = :topic, session_type = :type,
                notes = :notes, updated_at = :updated
            WHERE id = :id
        ');
        $stmt->execute([
            'batch' => $batchId,
            'instructor' => $instructorId,
            'date' => $sessionDate,
            'start' => $startTime,
            'end' => $endTime,
            'topic' => $topic,
            'type' => $sessionType,
            'notes' => $notes !== '' ? $notes : null,
            'updated' => date('Y-m-d H:i:s'),
            'id' => $id,
        ]);

        AuthService::logAudit((int)$user['id'], 'SESSION_UPDATE', 'training_sessions', $id, $data, $existing);
        return self::getSession($id, $user);
    }

    public static function cancelSession(int $id, array $data, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        self::assertStaff($user);
        $pdo = Database::getConnection();

        $existing = self::findSession($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Training session #{$id} not found.", 404);
        }
        self::assertCanManageSession($existing, $user);

        if ($existing['status'] === 'submitted') {
            throw new \DomainException('A submitted attendance register cannot be cancelled.', 423);
        }
        if ($existing['status'] === 'cancelled') {
            return self::getSession($id, $user);
        }

        $reason = trim((string)($data['reason'] ?? ''));
        if (mb_strlen($reason) < 5) {
            throw new \InvalidArgumentException('A cancellation reason of at least 5 characters is required.', 422);
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $pdo->prepare('
            UPDATE training_sessions
            SET status = :status, cancelled_at = :cancelled, cancelled_by = :by,
                cancellation_reason = :reason, updated_at = :updated
            WHERE id = :id
        ');
        $stmt->execute([
            'status' => 'cancelled',
            'cancelled' => $now,
            'by' => (int)$user['id'],
            'reason' => $reason,
            'updated' => $now,
            'id' => $id,
        ]);

        AuthService::logAudit((int)$user['id'], 'SESSION_CANCEL', 'training_sessions', $id, [
            'reason' => $reason,
        ], $existing);

        return self::getSession($id, $user);
    }

    public static function getRegister(int $sessionId, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        if ($user['role'] === 'student') {
            throw new \DomainException('Forbidden: students cannot access the full attendance register.', 403);
        }

        $session = self::findSession($sessionId);
        if (!$session) {
            throw new \InvalidArgumentException("Training session #{$sessionId} not found.", 404);
        }
        self::assertCanViewSession($session, $user);

        $config = self::getConfig((int)$session['institute_id']);
        $roster = self::getRosterForSession($session);
        $counts = self::getAttendanceCounts($sessionId);
        $marked = array_sum($counts);
        $rosterCount = count($roster);
        $missing = $rosterCount - $marked;

        $summary = [
            'roster_count' => $rosterCount,
            'marked_count' => $marked,
            'missing_count' => max(0, $missing),
            'counts' => $counts,
            'present_or_late' => ($counts['present'] ?? 0) + ($counts['late'] ?? 0),
        ];

        return [
            'session' => self::hydrateSession($session, $user, $roster, $summary),
            'roster' => $roster,
            'statuses' => $config['statuses'],
            'policy' => $config['policy'],
            'summary' => $summary,
        ];
    }

    public static function getRoster(int $sessionId, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        if ($user['role'] === 'student') {
            throw new \DomainException('Forbidden: students cannot access the full attendance roster.', 403);
        }
        $session = self::findSession($sessionId);
        if (!$session) {
            throw new \InvalidArgumentException("Training session #{$sessionId} not found.", 404);
        }
        self::assertCanViewSession($session, $user);
        return self::getRosterForSession($session);
    }

    public static function saveDraft(int $sessionId, array $marks, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        self::assertStaff($user);
        $pdo = Database::getConnection();

        $session = self::findSession($sessionId);
        if (!$session) {
            throw new \InvalidArgumentException("Training session #{$sessionId} not found.", 404);
        }
        self::assertCanManageSession($session, $user);

        if (!in_array($session['status'], ['scheduled', 'draft'], true)) {
            throw new \DomainException('Attendance is locked after the register is submitted or cancelled.', 423);
        }

        $roster = self::getRosterForSession($session);
        if (!$roster) {
            throw new \InvalidArgumentException('No eligible students are enrolled for this session date.', 422);
        }
        $rosterMap = [];
        foreach ($roster as $row) {
            $rosterMap[(int)$row['student_id']] = $row;
        }

        if (!$marks) {
            throw new \InvalidArgumentException('No attendance marks were provided.', 422);
        }

        $config = self::getConfig((int)$session['institute_id']);
        $statusMap = $config['status_map'];
        $normalized = [];
        foreach ($marks as $index => $mark) {
            if (!is_array($mark)) {
                throw new \InvalidArgumentException('Each attendance mark must be an object.', 422);
            }
            $studentId = (int)($mark['student_id'] ?? 0);
            if ($studentId <= 0 || !isset($rosterMap[$studentId])) {
                throw new \InvalidArgumentException('Attendance contains a student who is not on the authoritative roster.', 422);
            }
            if (isset($normalized[$studentId])) {
                throw new \InvalidArgumentException('Duplicate attendance marks for the same student are not allowed.', 422);
            }
            $status = strtolower(trim((string)($mark['status'] ?? '')));
            if (!isset($statusMap[$status])) {
                throw new \InvalidArgumentException("Unknown attendance status '{$status}'.", 422);
            }
            $note = trim((string)($mark['status_note'] ?? ''));
            if (mb_strlen($note) > 500) {
                throw new \InvalidArgumentException('Attendance notes may not exceed 500 characters.', 422);
            }
            $normalized[$studentId] = [
                'status' => $status,
                'status_note' => $note !== '' ? $note : null,
            ];
        }

        $now = date('Y-m-d H:i:s');
        $pdo->beginTransaction();
        try {
            $selectStmt = $pdo->prepare('
                SELECT id FROM attendance_records
                WHERE session_id = :session AND student_id = :student
                LIMIT 1
            ');
            $updateStmt = $pdo->prepare('
                UPDATE attendance_records
                SET status = :status, status_note = :note, marked_by = :by, marked_at = :marked,
                    updated_at = :updated
                WHERE id = :id
            ');
            $insertStmt = $pdo->prepare('
                INSERT INTO attendance_records
                    (session_id, student_id, status, status_note, marked_by, marked_at, created_at, updated_at)
                VALUES
                    (:session, :student, :status, :note, :by, :marked, :created, :updated)
            ');

            foreach ($normalized as $studentId => $mark) {
                $selectStmt->execute(['session' => $sessionId, 'student' => $studentId]);
                $existingId = $selectStmt->fetchColumn();
                if ($existingId !== false && $existingId !== null) {
                    $updateStmt->execute([
                        'status' => $mark['status'],
                        'note' => $mark['status_note'],
                        'by' => (int)$user['id'],
                        'marked' => $now,
                        'updated' => $now,
                        'id' => (int)$existingId,
                    ]);
                } else {
                    $insertStmt->execute([
                        'session' => $sessionId,
                        'student' => $studentId,
                        'status' => $mark['status'],
                        'note' => $mark['status_note'],
                        'by' => (int)$user['id'],
                        'marked' => $now,
                        'created' => $now,
                        'updated' => $now,
                    ]);
                }
            }

            if ($session['status'] === 'scheduled') {
                $pdo->prepare("UPDATE training_sessions SET status = 'draft', updated_at = :updated WHERE id = :id")
                    ->execute(['updated' => $now, 'id' => $sessionId]);
            } else {
                $pdo->prepare('UPDATE training_sessions SET updated_at = :updated WHERE id = :id')
                    ->execute(['updated' => $now, 'id' => $sessionId]);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        AuthService::logAudit((int)$user['id'], 'ATTENDANCE_DRAFT_SAVE', 'training_sessions', $sessionId, [
            'saved_marks' => count($normalized),
        ]);

        return self::getRegister($sessionId, $user);
    }

    public static function submit(int $sessionId, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        self::assertStaff($user);
        $pdo = Database::getConnection();

        $session = self::findSession($sessionId);
        if (!$session) {
            throw new \InvalidArgumentException("Training session #{$sessionId} not found.", 404);
        }
        self::assertCanManageSession($session, $user);

        if (!in_array($session['status'], ['scheduled', 'draft'], true)) {
            throw new \DomainException('This attendance register has already been submitted or cancelled.', 423);
        }

        $roster = self::getRosterForSession($session);
        if (!$roster) {
            throw new \InvalidArgumentException('The roster is empty. Add enrolled students before submitting attendance.', 422);
        }

        $recordsStmt = $pdo->prepare('
            SELECT ar.student_id, ar.status
            FROM attendance_records ar
            WHERE ar.session_id = :session
        ');
        $recordsStmt->execute(['session' => $sessionId]);
        $records = [];
        foreach ($recordsStmt->fetchAll() as $row) {
            $records[(int)$row['student_id']] = (string)$row['status'];
        }

        $missing = [];
        foreach ($roster as $row) {
            if (!isset($records[(int)$row['student_id']])) {
                $missing[] = $row['name'] . ' (' . $row['admission_no'] . ')';
            }
        }
        if ($missing) {
            throw new \InvalidArgumentException(
                'Attendance is incomplete. Mark every eligible student before submitting. Missing: ' . implode(', ', $missing),
                422
            );
        }

        $now = date('Y-m-d H:i:s');
        $pdo->beginTransaction();
        try {
            $updateSession = $pdo->prepare("
                UPDATE training_sessions
                SET status = 'submitted', submitted_at = :submitted, submitted_by = :by, updated_at = :updated
                WHERE id = :id AND status IN ('scheduled', 'draft')
            ");
            $updateSession->execute([
                'submitted' => $now,
                'by' => (int)$user['id'],
                'updated' => $now,
                'id' => $sessionId,
            ]);
            if ($updateSession->rowCount() === 0) {
                throw new \DomainException('This register changed state before submission. Reload and try again.', 409);
            }

            $pdo->prepare('
                UPDATE attendance_records
                SET submitted_at = :submitted, updated_at = :updated
                WHERE session_id = :session AND submitted_at IS NULL
            ')->execute(['submitted' => $now, 'updated' => $now, 'session' => $sessionId]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $counts = self::getAttendanceCounts($sessionId);
        AuthService::logAudit((int)$user['id'], 'ATTENDANCE_SUBMIT', 'training_sessions', $sessionId, [
            'counts' => $counts,
            'submitted_at' => $now,
        ]);

        return self::getRegister($sessionId, $user);
    }

    public static function correctRecord(int $recordId, array $data, ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        self::assertStaff($user);
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('
            SELECT ar.*, ts.batch_id, ts.session_date, ts.status AS session_status,
                   ts.submitted_at AS session_submitted_at, t.institute_id,
                   s.name AS student_name, s.admission_no
            FROM attendance_records ar
            JOIN training_sessions ts ON ts.id = ar.session_id
            JOIN batches b ON b.id = ts.batch_id
            JOIN trades t ON t.id = b.trade_id
            JOIN students s ON s.id = ar.student_id
            WHERE ar.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $recordId]);
        $existing = $stmt->fetch();
        if (!$existing) {
            throw new \InvalidArgumentException("Attendance record #{$recordId} not found.", 404);
        }
        self::assertCanManageSession($existing, $user);

        if ($existing['session_status'] !== 'submitted') {
            throw new \DomainException('Only submitted attendance records can be corrected. Use the draft register instead.', 423);
        }

        $status = strtolower(trim((string)($data['status'] ?? '')));
        $reason = trim((string)($data['correction_reason'] ?? ''));
        $note = trim((string)($data['status_note'] ?? ''));
        if (mb_strlen($reason) < 10) {
            throw new \InvalidArgumentException('A correction reason of at least 10 characters is required.', 422);
        }
        if (mb_strlen($reason) > 2000 || mb_strlen($note) > 500) {
            throw new \InvalidArgumentException('Correction reason or note is too long.', 422);
        }

        $config = self::getConfig((int)$existing['institute_id']);
        if (!isset($config['status_map'][$status])) {
            throw new \InvalidArgumentException("Unknown attendance status '{$status}'.", 422);
        }

        $submittedAt = $existing['submitted_at'] ?: ($existing['session_submitted_at'] ?: $existing['marked_at']);
        $windowHours = (int)$config['policy']['correction_window_hours'];
        if ($user['role'] === 'instructor' && $submittedAt) {
            $ageSeconds = time() - strtotime((string)$submittedAt);
            if ($ageSeconds > $windowHours * 3600) {
                throw new \DomainException(
                    "This register is outside the {$windowHours}-hour correction window. An administrator counter-signature is required.",
                    403
                );
            }
        }

        $now = date('Y-m-d H:i:s');
        $upd = $pdo->prepare('
            UPDATE attendance_records
            SET status = :status, status_note = :note, correction_reason = :reason,
                correction_count = correction_count + 1, corrected_by = :by,
                corrected_at = :corrected, updated_at = :updated
            WHERE id = :id
        ');
        $upd->execute([
            'status' => $status,
            'note' => $note !== '' ? $note : null,
            'reason' => $reason,
            'by' => (int)$user['id'],
            'corrected' => $now,
            'updated' => $now,
            'id' => $recordId,
        ]);

        AuthService::logAudit((int)$user['id'], 'ATTENDANCE_CORRECTION', 'attendance_records', $recordId, [
            'status' => $status,
            'status_note' => $note !== '' ? $note : null,
            'correction_reason' => $reason,
            'student_id' => (int)$existing['student_id'],
            'session_id' => (int)$existing['session_id'],
        ], [
            'status' => $existing['status'],
            'status_note' => $existing['status_note'] ?? null,
            'correction_count' => (int)$existing['correction_count'],
        ]);

        $fresh = $pdo->prepare('
            SELECT ar.*, s.name AS student_name, s.admission_no
            FROM attendance_records ar
            JOIN students s ON s.id = ar.student_id
            WHERE ar.id = :id
            LIMIT 1
        ');
        $fresh->execute(['id' => $recordId]);
        $record = $fresh->fetch();
        $record['status_meta'] = $config['status_map'][$record['status']] ?? null;

        return $record;
    }

    public static function getStudentAttendance(int $studentId, array $filters = [], ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        $student = StudentService::getStudentById($studentId, $user);
        if (!$student) {
            throw new \InvalidArgumentException("Student #{$studentId} not found.", 404);
        }

        $pdo = Database::getConnection();
        $instituteId = (int)$student['institute_id'];
        $config = self::getConfig($instituteId);
        $statusMap = $config['status_map'];

        $sql = '
            SELECT ts.id AS session_id, ts.session_date, ts.start_time, ts.end_time, ts.topic,
                   ts.session_type, ts.status AS session_status, ts.submitted_at AS session_submitted_at,
                   b.id AS batch_id, b.name AS batch_name, b.section AS batch_section,
                   t.name AS trade_name, t.code AS trade_code,
                   i.name AS instructor_name,
                   ar.id AS attendance_id, ar.status, ar.status_note, ar.correction_reason,
                   ar.correction_count, ar.marked_at, ar.corrected_at
            FROM training_sessions ts
            JOIN batches b ON b.id = ts.batch_id
            JOIN trades t ON t.id = b.trade_id
            JOIN instructors i ON i.id = ts.instructor_id
            JOIN enrollments e ON e.batch_id = ts.batch_id
                AND e.student_id = ?
                AND e.starts_on <= ts.session_date
                AND (e.ends_on IS NULL OR e.ends_on >= ts.session_date)
            LEFT JOIN attendance_records ar ON ar.session_id = ts.id AND ar.student_id = ?
            WHERE t.institute_id = ? AND ts.status = \'submitted\'
        ';
        $params = [$studentId, $studentId, $instituteId];
        if (!empty($filters['from'])) {
            $sql .= ' AND ts.session_date >= ?';
            $params[] = self::normalizeDate((string)$filters['from']);
        }
        if (!empty($filters['to'])) {
            $sql .= ' AND ts.session_date <= ?';
            $params[] = self::normalizeDate((string)$filters['to']);
        }
        $sql .= ' ORDER BY ts.session_date DESC, ts.start_time DESC, ts.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $sessions = $stmt->fetchAll();

        $counts = ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0, 'unmarked' => 0];
        $presentCredit = 0;
        $excluded = 0;

        foreach ($sessions as &$session) {
            $status = $session['status'] ?: null;
            $meta = $status ? ($statusMap[$status] ?? null) : null;
            $session['status'] = $status;
            $session['status_label'] = $meta['label'] ?? ($status ? ucfirst(str_replace('_', ' ', $status)) : 'Not marked');
            $session['counts_as_present'] = (bool)($meta['counts_as_present'] ?? false);
            $session['excluded_from_denominator'] = (bool)($meta['excluded_from_denominator'] ?? false);
            $session['is_marked'] = $status !== null;
            $session['is_excused'] = (bool)($meta['excluded_from_denominator'] ?? false);
            $session['correction_count'] = (int)($session['correction_count'] ?? 0);

            if (!$status) {
                $counts['unmarked']++;
            } elseif (isset($counts[$status])) {
                $counts[$status]++;
            } else {
                $counts['unmarked']++;
            }

            if ($session['is_excused']) {
                $excluded++;
            } elseif ($session['counts_as_present']) {
                $presentCredit++;
            }
        }
        unset($session);

        $totalSessions = count($sessions);
        $denominator = max(0, $totalSessions - $excluded);
        $percentage = $denominator > 0 ? round(($presentCredit / $denominator) * 100, 2) : null;
        $threshold = (float)$config['policy']['threshold_percentage'];
        $eligible = $percentage === null ? null : $percentage >= $threshold;

        return [
            'student' => [
                'id' => (int)$student['id'],
                'admission_no' => $student['admission_no'],
                'name' => $student['name'],
                'batch_id' => $student['batch_id'] ?? null,
                'batch_name' => $student['batch_name'] ?? null,
                'trade_name' => $student['trade_name'] ?? null,
            ],
            'summary' => [
                'total_sessions' => $totalSessions,
                'applicable_sessions' => $denominator,
                'excluded_sessions' => $excluded,
                'present_count' => $counts['present'],
                'late_count' => $counts['late'],
                'absent_count' => $counts['absent'],
                'excused_count' => $counts['excused'],
                'unmarked_count' => $counts['unmarked'],
                'present_or_late' => $presentCredit,
                'attendance_percentage' => $percentage,
                'threshold_percentage' => $threshold,
                'eligible' => $eligible,
                'warning' => $eligible === false
                    ? "Attendance is below the {$threshold}% certification threshold."
                    : null,
            ],
            'sessions' => $sessions,
            'statuses' => $config['statuses'],
            'policy' => $config['policy'],
        ];
    }

    public static function getReport(array $filters = [], ?array $currentUser = null): array
    {
        $user = self::requireUser($currentUser);
        if ($user['role'] === 'student') {
            throw new \DomainException('Forbidden: students cannot access institute attendance reports.', 403);
        }

        $pdo = Database::getConnection();
        $instituteId = (int)$user['institute_id'];
        $config = self::getConfig($instituteId);
        $statusMap = $config['status_map'];

        $sql = '
            SELECT ts.id AS session_id, ts.session_date, ts.start_time, ts.end_time, ts.topic,
                   ts.session_type, ts.status AS session_status, ts.submitted_at,
                   b.id AS batch_id, b.name AS batch_name, b.section AS batch_section,
                   t.name AS trade_name, t.code AS trade_code,
                   i.name AS instructor_name,
                   s.id AS student_id, s.admission_no, s.name AS student_name, s.status AS student_status,
                   ar.id AS attendance_id, ar.status, ar.status_note, ar.correction_count, ar.marked_at
            FROM training_sessions ts
            JOIN batches b ON b.id = ts.batch_id
            JOIN trades t ON t.id = b.trade_id
            JOIN instructors i ON i.id = ts.instructor_id
            JOIN enrollments e ON e.batch_id = ts.batch_id
                AND e.starts_on <= ts.session_date
                AND (e.ends_on IS NULL OR e.ends_on >= ts.session_date)
            JOIN students s ON s.id = e.student_id
            LEFT JOIN attendance_records ar ON ar.session_id = ts.id AND ar.student_id = s.id
            WHERE t.institute_id = ? AND ts.status = ?
        ';
        $params = [$instituteId, 'submitted'];

        if ($user['role'] === 'instructor') {
            $batches = array_values(array_map('intval', $user['scope']['batches'] ?? []));
            if (!$batches) {
                return self::emptyReport($filters, $config);
            }
            $sql .= ' AND ts.batch_id IN (' . implode(',', array_fill(0, count($batches), '?')) . ')';
            $params = array_merge($params, $batches);
        }

        if (!empty($filters['batch_id'])) {
            $sql .= ' AND ts.batch_id = ?';
            $params[] = (int)$filters['batch_id'];
        }
        if (!empty($filters['student_id'])) {
            $sql .= ' AND s.id = ?';
            $params[] = (int)$filters['student_id'];
        }
        if (!empty($filters['from'])) {
            $sql .= ' AND ts.session_date >= ?';
            $params[] = self::normalizeDate((string)$filters['from']);
        }
        if (!empty($filters['to'])) {
            $sql .= ' AND ts.session_date <= ?';
            $params[] = self::normalizeDate((string)$filters['to']);
        }

        $sql .= ' ORDER BY ts.session_date DESC, ts.start_time DESC, b.name ASC, s.admission_no ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $sessionGroups = [];
        $studentGroups = [];

        foreach ($rows as $row) {
            $sessionId = (int)$row['session_id'];
            $studentId = (int)$row['student_id'];
            $status = $row['status'] ? (string)$row['status'] : null;
            $meta = $status ? ($statusMap[$status] ?? null) : null;
            $isExcused = (bool)($meta['excluded_from_denominator'] ?? false);
            $isPresent = (bool)($meta['counts_as_present'] ?? false);

            if (!isset($sessionGroups[$sessionId])) {
                $sessionGroups[$sessionId] = [
                    'session_id' => $sessionId,
                    'session_date' => $row['session_date'],
                    'start_time' => $row['start_time'],
                    'end_time' => $row['end_time'],
                    'topic' => $row['topic'],
                    'session_type' => $row['session_type'],
                    'batch_id' => (int)$row['batch_id'],
                    'batch_name' => $row['batch_name'],
                    'batch_section' => $row['batch_section'],
                    'trade_name' => $row['trade_name'],
                    'instructor_name' => $row['instructor_name'],
                    'roster_count' => 0,
                    'marked_count' => 0,
                    'present_count' => 0,
                    'late_count' => 0,
                    'absent_count' => 0,
                    'excused_count' => 0,
                    'unmarked_count' => 0,
                ];
            }

            $sessionGroups[$sessionId]['roster_count']++;
            if ($status) {
                $sessionGroups[$sessionId]['marked_count']++;
            }
            if ($status === 'present') $sessionGroups[$sessionId]['present_count']++;
            elseif ($status === 'late') $sessionGroups[$sessionId]['late_count']++;
            elseif ($status === 'absent') $sessionGroups[$sessionId]['absent_count']++;
            elseif ($status === 'excused') $sessionGroups[$sessionId]['excused_count']++;
            else $sessionGroups[$sessionId]['unmarked_count']++;

            if (!isset($studentGroups[$studentId])) {
                $studentGroups[$studentId] = [
                    'student_id' => $studentId,
                    'admission_no' => $row['admission_no'],
                    'student_name' => $row['student_name'],
                    'student_status' => $row['student_status'],
                    'batch_id' => (int)$row['batch_id'],
                    'batch_name' => $row['batch_name'],
                    'batch_section' => $row['batch_section'],
                    'total_sessions' => 0,
                    'present_count' => 0,
                    'late_count' => 0,
                    'absent_count' => 0,
                    'excused_count' => 0,
                    'unmarked_count' => 0,
                    'present_or_late' => 0,
                    'excluded_sessions' => 0,
                ];
            }

            $studentGroups[$studentId]['total_sessions']++;
            if ($isExcused) {
                $studentGroups[$studentId]['excused_count']++;
                $studentGroups[$studentId]['excluded_sessions']++;
            } elseif ($isPresent) {
                $studentGroups[$studentId]['present_or_late']++;
                if ($status === 'late') {
                    $studentGroups[$studentId]['late_count']++;
                } else {
                    $studentGroups[$studentId]['present_count']++;
                }
            } elseif ($status === 'absent') {
                $studentGroups[$studentId]['absent_count']++;
            } else {
                $studentGroups[$studentId]['unmarked_count']++;
            }
        }

        $threshold = (float)$config['policy']['threshold_percentage'];
        foreach ($sessionGroups as &$session) {
            $denominator = max(0, (int)$session['roster_count'] - (int)$session['excused_count']);
            $session['attendance_percentage'] = $denominator > 0
                ? round((((int)$session['present_count'] + (int)$session['late_count']) / $denominator) * 100, 2)
                : null;
        }
        unset($session);

        foreach ($studentGroups as &$student) {
            $denominator = max(0, (int)$student['total_sessions'] - (int)$student['excluded_sessions']);
            $student['applicable_sessions'] = $denominator;
            $student['attendance_percentage'] = $denominator > 0
                ? round(((int)$student['present_or_late'] / $denominator) * 100, 2)
                : null;
            $student['threshold_percentage'] = $threshold;
            $student['eligible'] = $student['attendance_percentage'] === null
                ? null
                : $student['attendance_percentage'] >= $threshold;
            $student['warning'] = $student['eligible'] === false
                ? "Below {$threshold}% attendance threshold."
                : null;
        }
        unset($student);

        $sessions = array_values($sessionGroups);
        usort($sessions, static fn (array $a, array $b): int => strcmp(
            $b['session_date'] . ' ' . $b['start_time'],
            $a['session_date'] . ' ' . $a['start_time']
        ));

        $students = array_values($studentGroups);
        usort($students, static fn (array $a, array $b): int => strcmp((string)$a['admission_no'], (string)$b['admission_no']));

        $percentages = array_values(array_filter(
            array_map(static fn (array $row) => $row['attendance_percentage'], $students),
            static fn ($value) => $value !== null
        ));
        $average = $percentages ? round(array_sum($percentages) / count($percentages), 2) : null;

        return [
            'filters' => [
                'batch_id' => !empty($filters['batch_id']) ? (int)$filters['batch_id'] : null,
                'student_id' => !empty($filters['student_id']) ? (int)$filters['student_id'] : null,
                'from' => !empty($filters['from']) ? self::normalizeDate((string)$filters['from']) : null,
                'to' => !empty($filters['to']) ? self::normalizeDate((string)$filters['to']) : null,
            ],
            'summary' => [
                'session_count' => count($sessions),
                'student_count' => count($students),
                'average_attendance_percentage' => $average,
                'at_risk_count' => count(array_filter($students, static fn (array $row): bool => $row['eligible'] === false)),
                'threshold_percentage' => $threshold,
            ],
            'sessions' => $sessions,
            'students' => $students,
            'rows' => $rows,
            'statuses' => $config['statuses'],
            'policy' => $config['policy'],
            'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    private static function emptyReport(array $filters, array $config): array
    {
        return [
            'filters' => [
                'batch_id' => !empty($filters['batch_id']) ? (int)$filters['batch_id'] : null,
                'student_id' => !empty($filters['student_id']) ? (int)$filters['student_id'] : null,
                'from' => !empty($filters['from']) ? self::normalizeDate((string)$filters['from']) : null,
                'to' => !empty($filters['to']) ? self::normalizeDate((string)$filters['to']) : null,
            ],
            'summary' => [
                'session_count' => 0,
                'student_count' => 0,
                'average_attendance_percentage' => null,
                'at_risk_count' => 0,
                'threshold_percentage' => (float)$config['policy']['threshold_percentage'],
            ],
            'sessions' => [],
            'students' => [],
            'rows' => [],
            'statuses' => $config['statuses'],
            'policy' => $config['policy'],
            'generated_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    private static function findSession(int $id): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT ts.*, b.name AS batch_name, b.section AS batch_section, b.shift AS batch_shift,
                   b.trade_id, t.name AS trade_name, t.code AS trade_code, t.institute_id,
                   ap.name AS academic_period_name,
                   i.name AS instructor_name, i.employee_code
            FROM training_sessions ts
            JOIN batches b ON b.id = ts.batch_id
            JOIN trades t ON t.id = b.trade_id
            JOIN academic_periods ap ON ap.id = b.academic_period_id
            JOIN instructors i ON i.id = ts.instructor_id
            WHERE ts.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $session = $stmt->fetch();
        return $session ? self::normalizeSessionRow($session) : null;
    }

    private static function findBatch(int $id): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT b.*, t.name AS trade_name, t.code AS trade_code, t.institute_id
            FROM batches b
            JOIN trades t ON t.id = b.trade_id
            WHERE b.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $batch = $stmt->fetch();
        return $batch ?: null;
    }

    private static function hydrateSession(array $session, array $user, ?array $roster = null, ?array $summary = null): array
    {
        $roster = $roster ?? self::getRosterForSession($session);
        $summary = $summary ?? [
            'roster_count' => count($roster),
            'marked_count' => array_sum(self::getAttendanceCounts((int)$session['id'])),
            'counts' => self::getAttendanceCounts((int)$session['id']),
        ];
        if (!isset($summary['missing_count'])) {
            $summary['missing_count'] = max(0, (int)$summary['roster_count'] - (int)$summary['marked_count']);
        }
        if (!isset($summary['present_or_late'])) {
            $summary['present_or_late'] = ($summary['counts']['present'] ?? 0) + ($summary['counts']['late'] ?? 0);
        }

        $session['summary'] = $summary;
        $session['roster_count'] = (int)$summary['roster_count'];
        $session['marked_count'] = (int)$summary['marked_count'];
        $session['missing_count'] = (int)$summary['missing_count'];
        $session['can_manage'] = self::canManageSession($session, $user);
        $session['can_submit'] = $session['can_manage'] && in_array($session['status'], ['scheduled', 'draft'], true);
        $session['correction_window_open'] = self::isCorrectionWindowOpen($session);
        $session['can_correct'] = $user['role'] === 'administrator'
            ? $session['status'] === 'submitted'
            : ($user['role'] === 'instructor'
                && $session['status'] === 'submitted'
                && $session['can_manage']
                && $session['correction_window_open']);

        return $session;
    }

    private static function getRosterForSession(array $session): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT s.id AS student_id, s.admission_no, s.name, s.gender, s.phone,
                   s.status AS student_status,
                   e.id AS enrollment_id, e.starts_on, e.ends_on, e.status AS enrollment_status,
                   ar.id AS attendance_id, ar.status, ar.status_note, ar.correction_reason,
                   ar.correction_count, ar.marked_at, ar.submitted_at,
                   ar.corrected_at, ar.corrected_by
            FROM enrollments e
            JOIN students s ON s.id = e.student_id
            LEFT JOIN attendance_records ar
                ON ar.session_id = :session AND ar.student_id = s.id
            WHERE e.batch_id = :batch
              AND e.starts_on <= :session_date
              AND (e.ends_on IS NULL OR e.ends_on >= :session_date_end)
              AND (s.status = \'active\' OR ar.id IS NOT NULL)
            ORDER BY s.admission_no ASC
        ');
        $stmt->execute([
            'session' => (int)$session['id'],
            'batch' => (int)$session['batch_id'],
            'session_date' => $session['session_date'],
            'session_date_end' => $session['session_date'],
        ]);

        $roster = $stmt->fetchAll();
        foreach ($roster as &$row) {
            $row['student_id'] = (int)$row['student_id'];
            $row['attendance_id'] = $row['attendance_id'] !== null ? (int)$row['attendance_id'] : null;
            $row['correction_count'] = (int)($row['correction_count'] ?? 0);
            $row['is_marked'] = $row['status'] !== null;
        }
        unset($row);
        return $roster;
    }

    private static function getAttendanceCounts(int $sessionId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT status, COUNT(*) AS total
            FROM attendance_records
            WHERE session_id = :session
            GROUP BY status
        ');
        $stmt->execute(['session' => $sessionId]);
        $counts = [
            'present' => 0,
            'late' => 0,
            'absent' => 0,
            'excused' => 0,
        ];
        foreach ($stmt->fetchAll() as $row) {
            $counts[(string)$row['status']] = (int)$row['total'];
        }
        return $counts;
    }

    private static function normalizeSessionRow(array $row): array
    {
        $intFields = ['id', 'batch_id', 'instructor_id', 'trade_id', 'institute_id', 'submitted_by', 'cancelled_by', 'roster_count', 'marked_count', 'present_count', 'late_count', 'absent_count', 'excused_count'];
        foreach ($intFields as $field) {
            if (array_key_exists($field, $row) && $row[$field] !== null) {
                $row[$field] = (int)$row[$field];
            }
        }
        $row['start_time'] = self::shortTime((string)$row['start_time']);
        $row['end_time'] = self::shortTime((string)$row['end_time']);
        return $row;
    }

    private static function assertCanViewSession(array $session, array $user): void
    {
        if ((int)$session['institute_id'] !== (int)$user['institute_id']) {
            throw new \DomainException('Forbidden: session belongs to another institute.', 403);
        }

        if ($user['role'] === 'instructor') {
            $batches = array_map('intval', $user['scope']['batches'] ?? []);
            if (!in_array((int)$session['batch_id'], $batches, true)) {
                throw new \DomainException('Forbidden: this session is outside your assigned batches.', 403);
            }
        } elseif ($user['role'] === 'student') {
            $batches = array_map('intval', $user['scope']['batches'] ?? []);
            if (!in_array((int)$session['batch_id'], $batches, true) || $session['status'] !== 'submitted') {
                throw new \DomainException('Forbidden: this session is not part of your submitted attendance history.', 403);
            }
        } elseif (!in_array($user['role'], ['administrator', 'monitoring_officer'], true)) {
            throw new \DomainException('Forbidden: unsupported role for attendance access.', 403);
        }
    }

    private static function canManageSession(array $session, array $user): bool
    {
        if ((int)$session['institute_id'] !== (int)$user['institute_id']) {
            return false;
        }
        if ($user['role'] === 'administrator') {
            return true;
        }
        if ($user['role'] !== 'instructor') {
            return false;
        }
        $instructorId = (int)($user['profile']['instructor_id'] ?? 0);
        $batches = array_map('intval', $user['scope']['batches'] ?? []);
        if (!$instructorId || !in_array((int)$session['batch_id'], $batches, true)) {
            return false;
        }
        return self::instructorAssignmentCovers($instructorId, (int)$session['batch_id'], (string)$session['session_date']);
    }

    private static function assertCanManageSession(array $session, array $user): void
    {
        if (!self::canManageSession($session, $user)) {
            throw new \DomainException('Forbidden: you cannot manage attendance for this session.', 403);
        }
    }

    private static function assertCanManageBatch(array $batch, string $sessionDate, array $user): void
    {
        if ($user['role'] === 'administrator') {
            return;
        }
        if ($user['role'] !== 'instructor') {
            throw new \DomainException('Forbidden: only instructors and administrators can schedule sessions.', 403);
        }
        $instructorId = (int)($user['profile']['instructor_id'] ?? 0);
        $batches = array_map('intval', $user['scope']['batches'] ?? []);
        if (!$instructorId || !in_array((int)$batch['id'], $batches, true)
            || !self::instructorAssignmentCovers($instructorId, (int)$batch['id'], $sessionDate)) {
            throw new \DomainException('Forbidden: this batch is outside your active instructor assignment.', 403);
        }
    }

    private static function assertInstructorForBatch(int $instructorId, int $batchId, string $sessionDate, int $instituteId): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT id FROM instructors
            WHERE id = :id AND institute_id = :inst AND status = \'active\'
            LIMIT 1
        ');
        $stmt->execute(['id' => $instructorId, 'inst' => $instituteId]);
        if (!$stmt->fetchColumn()) {
            throw new \InvalidArgumentException('Selected instructor is not active in your institute.', 422);
        }
        if (!self::instructorAssignmentCovers($instructorId, $batchId, $sessionDate)) {
            throw new \InvalidArgumentException('Selected instructor is not assigned to this batch on the session date.', 422);
        }
    }

    public static function exportBatchAttendanceCsvSanitize(string $value): string
    {
        if ($value !== '' && preg_match('/^[=+\-@\t\r]/', $value)) {
            return "'" . $value;
        }
        return $value;
    }

    private static function instructorAssignmentCovers(int $instructorId, int $batchId, string $sessionDate): bool
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT id FROM instructor_assignments
            WHERE instructor_id = :instructor AND batch_id = :batch
              AND starts_on <= :session_date
              AND (ends_on IS NULL OR ends_on >= :session_date_end)
            LIMIT 1
        ');
        $stmt->execute([
            'instructor' => $instructorId,
            'batch' => $batchId,
            'session_date' => $sessionDate,
            'session_date_end' => $sessionDate,
        ]);
        return (bool)$stmt->fetchColumn();
    }

    private static function isCorrectionWindowOpen(array $session): bool
    {
        if (empty($session['submitted_at'])) {
            return true;
        }
        $config = self::getConfig((int)$session['institute_id']);
        $hours = (int)$config['policy']['correction_window_hours'];
        return (time() - strtotime((string)$session['submitted_at'])) <= ($hours * 3600);
    }

    private static function assertStaff(array $user): void
    {
        if (!in_array($user['role'], ['administrator', 'instructor'], true)) {
            throw new \DomainException('Forbidden: this action requires instructor or administrator access.', 403);
        }
    }

    private static function requireUser(?array $currentUser): array
    {
        if (!$currentUser || empty($currentUser['id'])) {
            throw new \DomainException('Unauthenticated.', 401);
        }
        return $currentUser;
    }

    private static function indexStatuses(array $statuses): array
    {
        $map = [];
        foreach ($statuses as $status) {
            $map[$status['status_key']] = $status;
        }
        return $map;
    }

    private static function normalizeDate(string $value): string
    {
        $value = trim($value);
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            throw new \InvalidArgumentException('Date must use the YYYY-MM-DD format.', 422);
        }
        return $value;
    }

    private static function normalizeTime(string $value): string
    {
        $value = trim($value);
        $formats = ['!H:i:s', '!H:i'];
        foreach ($formats as $format) {
            $time = \DateTimeImmutable::createFromFormat($format, $value);
            if ($time) {
                return $time->format('H:i:s');
            }
        }
        throw new \InvalidArgumentException('Time must use the HH:MM or HH:MM:SS format.', 422);
    }

    private static function normalizeSessionType(string $value): string
    {
        $value = strtolower(trim($value));
        if (!preg_match('/^[a-z][a-z_]{2,29}$/', $value)) {
            throw new \InvalidArgumentException('Invalid session type.', 422);
        }
        return $value;
    }

    private static function shortTime(string $value): string
    {
        return preg_match('/^\d{2}:\d{2}/', $value) ? substr($value, 0, 5) : $value;
    }
}
