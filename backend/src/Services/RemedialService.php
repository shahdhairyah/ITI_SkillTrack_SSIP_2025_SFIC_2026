<?php

namespace App\Services;

use App\Support\Response;
use PDO;

class RemedialService
{
    /**
     * Get list of remedial assignments with filtering by batch, student, status
     */
    public static function getRemedials(array $filters = [], array $currentUser = []): array
    {
        $db = Database::getConnection();
        $userRole = $currentUser['role'] ?? 'student';
        $instId = $currentUser['institute_id'] ?? 1;

        $sql = "SELECT ra.*, s.name as student_name, s.admission_no, b.name as batch_name,
                       pa.title as activity_title, pa.code as activity_code,
                       u.username as assigned_by_name
                FROM remedial_assignments ra
                JOIN students s ON s.id = ra.student_id
                JOIN practical_activities pa ON pa.id = ra.activity_id
                JOIN users u ON u.id = ra.assigned_by
                LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'active'
                LEFT JOIN batches b ON b.id = e.batch_id
                WHERE s.institute_id = :inst_id";
        $params = [':inst_id' => $instId];

        // Scoping for students
        if ($userRole === 'student') {
            $myStudentId = (int)($currentUser['profile']['student_id'] ?? 0);
            $sql .= " AND ra.student_id = :my_sid";
            $params[':my_sid'] = $myStudentId;
        }

        if (!empty($filters['student_id'])) {
            $sql .= " AND ra.student_id = :student_id";
            $params[':student_id'] = (int)$filters['student_id'];
        }

        if (!empty($filters['batch_id'])) {
            $sql .= " AND b.id = :batch_id";
            $params[':batch_id'] = (int)$filters['batch_id'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND ra.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['activity_id'])) {
            $sql .= " AND ra.activity_id = :activity_id";
            $params[':activity_id'] = (int)$filters['activity_id'];
        }

        $sql .= " ORDER BY ra.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $remedials = $stmt->fetchAll();

        // Attach reviews to each remedial
        foreach ($remedials as &$rem) {
            $revStmt = $db->prepare("
                SELECT rr.*, u.username as reviewer_name
                FROM remedial_reviews rr
                JOIN users u ON u.id = rr.reviewed_by
                WHERE rr.remedial_assignment_id = :rid
                ORDER BY rr.reviewed_at DESC
            ");
            $revStmt->execute([':rid' => $rem['id']]);
            $rem['reviews'] = $revStmt->fetchAll();

            // Computed overdue flag
            $rem['is_overdue'] = false;
            if ($rem['due_on'] && in_array($rem['status'], ['assigned', 'in_progress'])) {
                $rem['is_overdue'] = (strtotime($rem['due_on']) < strtotime('today'));
            }
        }

        return $remedials;
    }

    /**
     * Create a new remedial assignment
     */
    public static function createRemedial(array $data, array $currentUser = []): array
    {
        $db = Database::getConnection();
        $studentId = (int)($data['student_id'] ?? 0);
        $activityId = (int)($data['activity_id'] ?? 0);
        $reason = trim($data['reason'] ?? '');
        $instructions = trim($data['instructions'] ?? '');
        $dueOn = !empty($data['due_on']) ? $data['due_on'] : null;
        $assignedBy = (int)($currentUser['id'] ?? 0);

        if ($studentId <= 0 || $activityId <= 0 || empty($reason) || empty($instructions)) {
            Response::error('Student, practical activity, reason, and instructions are required.', 'VALIDATION_ERROR', [], 422);
        }

        $stmt = $db->prepare("
            INSERT INTO remedial_assignments (student_id, activity_id, assigned_by, reason, instructions, due_on, status)
            VALUES (:sid, :aid, :assigned_by, :reason, :instructions, :due_on, 'assigned')
        ");
        $stmt->execute([
            ':sid' => $studentId,
            ':aid' => $activityId,
            ':assigned_by' => $assignedBy,
            ':reason' => $reason,
            ':instructions' => $instructions,
            ':due_on' => $dueOn
        ]);
        $remedialId = (int)$db->lastInsertId();

        // Audit log
        $audit = $db->prepare("
            INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, after_json)
            VALUES (:actor, 'remedial_assigned', 'remedial_assignments', :eid, :req, :json)
        ");
        $audit->execute([
            ':actor' => $assignedBy,
            ':eid' => $remedialId,
            ':req' => $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true),
            ':json' => json_encode(['student_id' => $studentId, 'activity_id' => $activityId, 'due_on' => $dueOn])
        ]);

        return [
            'id' => $remedialId,
            'message' => 'Remedial training assigned successfully.'
        ];
    }

    /**
     * Instructor reviews and resolves a remedial assignment
     */
    public static function reviewRemedial(int $remedialId, array $data, array $currentUser = []): array
    {
        $db = Database::getConnection();
        $outcome = trim($data['outcome'] ?? '');
        $notes = trim($data['notes'] ?? '');
        $newStatus = trim($data['status'] ?? 'completed');
        $reviewedBy = (int)($currentUser['id'] ?? 0);

        if (empty($outcome)) {
            Response::error('Review outcome (e.g. Satisfactorily Completed, Needs Further Practice) is required.', 'VALIDATION_ERROR', [], 422);
        }

        $validStatuses = ['completed', 'cancelled', 'in_progress'];
        if (!in_array($newStatus, $validStatuses, true)) {
            Response::error('Invalid remedial status transition.', 'INVALID_STATUS', [], 422);
        }

        $db->beginTransaction();
        try {
            // Update remedial record status
            $upStmt = $db->prepare("
                UPDATE remedial_assignments
                SET status = :status, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $upStmt->execute([':status' => $newStatus, ':id' => $remedialId]);

            // Insert review record
            $revStmt = $db->prepare("
                INSERT INTO remedial_reviews (remedial_assignment_id, reviewed_by, reviewed_at, outcome, notes)
                VALUES (:rid, :rev_by, CURRENT_TIMESTAMP, :outcome, :notes)
            ");
            $revStmt->execute([
                ':rid' => $remedialId,
                ':rev_by' => $reviewedBy,
                ':outcome' => $outcome,
                ':notes' => $notes
            ]);

            // Audit
            $audit = $db->prepare("
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, after_json)
                VALUES (:actor, 'remedial_reviewed', 'remedial_assignments', :eid, :req, :json)
            ");
            $audit->execute([
                ':actor' => $reviewedBy,
                ':eid' => $remedialId,
                ':req' => $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true),
                ':json' => json_encode(['new_status' => $newStatus, 'outcome' => $outcome])
            ]);

            $db->commit();
            return [
                'id' => $remedialId,
                'status' => $newStatus,
                'outcome' => $outcome,
                'message' => 'Remedial review recorded successfully.'
            ];
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Consolidated Institute Dashboards (DASH-01, DASH-02, DASH-03)
     */
    public static function getAdminDashboardStats(array $currentUser = []): array
    {
        $db = Database::getConnection();
        $instId = $currentUser['institute_id'] ?? 1;

        // Core Counts
        $counts = [];
        $queries = [
            'total_students' => "SELECT COUNT(*) FROM students WHERE institute_id = :id AND status = 'active'",
            'total_instructors' => "SELECT COUNT(*) FROM instructors WHERE institute_id = :id AND status = 'active'",
            'total_trades' => "SELECT COUNT(*) FROM trades WHERE institute_id = :id AND status = 'active'",
            'total_batches' => "SELECT COUNT(*) FROM batches b JOIN trades t ON t.id = b.trade_id WHERE t.institute_id = :id AND b.status = 'active'",
            'total_sessions' => "SELECT COUNT(*) FROM training_sessions ts JOIN batches b ON b.id = ts.batch_id JOIN trades t ON t.id = b.trade_id WHERE t.institute_id = :id",
            'total_assessments' => "SELECT COUNT(*) FROM assessments",
            'total_competent' => "SELECT COUNT(*) FROM assessments WHERE derived_status = 'competent'",
            'active_remedials' => "SELECT COUNT(*) FROM remedial_assignments ra JOIN students s ON s.id = ra.student_id WHERE s.institute_id = :id AND ra.status IN ('assigned', 'in_progress')"
        ];

        foreach ($queries as $key => $q) {
            $stmt = $db->prepare($q);
            if (strpos($q, ':id') !== false) {
                $stmt->execute([':id' => $instId]);
            } else {
                $stmt->execute();
            }
            $counts[$key] = (int)$stmt->fetchColumn();
        }

        // Attendance health overview
        $attStmt = $db->query("
            SELECT status, COUNT(*) as count
            FROM attendance_records
            GROUP BY status
        ");
        $attDist = $attStmt->fetchAll();

        // Recent assessments list
        $recentStmt = $db->prepare("
            SELECT ass.id, ass.total_score, ass.max_possible, ass.percentage, ass.derived_status, ass.assessed_at,
                   s.name as student_name, s.admission_no, pa.title as activity_title, pa.code as activity_code,
                   u.username as assessor_name
            FROM assessments ass
            JOIN activity_attempts aa ON aa.id = ass.attempt_id
            JOIN students s ON s.id = aa.student_id
            JOIN practical_activities pa ON pa.id = aa.activity_id
            LEFT JOIN users u ON u.id = ass.assessor_id
            ORDER BY ass.assessed_at DESC
            LIMIT 5
        ");
        $recentStmt->execute();
        $recentAssessments = $recentStmt->fetchAll();

        return [
            'counts' => $counts,
            'attendance_distribution' => $attDist,
            'recent_assessments' => $recentAssessments
        ];
    }
}
