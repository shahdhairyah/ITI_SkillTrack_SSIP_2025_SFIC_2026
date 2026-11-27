<?php

namespace App\Services;

use App\Support\Response;
use PDO;

class CompetencyService
{
    /**
     * Get list of modules with their practical activities & criteria
     */
    public static function getCurriculum(array $filters = [], array $currentUser = []): array
    {
        $db = Database::getConnection();
        $tradeId = $filters['trade_id'] ?? null;

        $sql = "SELECT m.*, t.name as trade_name, t.code as trade_code
                FROM modules m
                JOIN trades t ON t.id = m.trade_id
                WHERE t.institute_id = :inst_id";
        $params = [':inst_id' => $currentUser['institute_id'] ?? 1];

        if ($tradeId) {
            $sql .= " AND m.trade_id = :trade_id";
            $params[':trade_id'] = $tradeId;
        }

        $sql .= " ORDER BY m.sequence_no ASC, m.id ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $modules = $stmt->fetchAll();

        // Attach activities to modules
        foreach ($modules as &$mod) {
            $actStmt = $db->prepare("
                SELECT pa.*,
                    (SELECT COUNT(*) FROM competency_criteria cc WHERE cc.activity_id = pa.id) as criteria_count,
                    (SELECT COUNT(*) FROM activity_attempts aa WHERE aa.activity_id = pa.id) as total_attempts
                FROM practical_activities pa
                WHERE pa.module_id = :mod_id
                ORDER BY pa.id ASC
            ");
            $actStmt->execute([':mod_id' => $mod['id']]);
            $mod['activities'] = $actStmt->fetchAll();
        }

        return $modules;
    }

    /**
     * Get detail of a practical activity with its rubrics / criteria
     */
    public static function getActivityDetail(int $activityId, array $currentUser = []): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT pa.*, m.title as module_title, m.code as module_code, m.trade_id, t.name as trade_name
            FROM practical_activities pa
            JOIN modules m ON m.id = pa.module_id
            JOIN trades t ON t.id = m.trade_id
            WHERE pa.id = :act_id AND t.institute_id = :inst_id
        ");
        $stmt->execute([
            ':act_id' => $activityId,
            ':inst_id' => $currentUser['institute_id'] ?? 1
        ]);
        $activity = $stmt->fetch();

        if (!$activity) {
            Response::error('Practical activity not found', 'ACTIVITY_NOT_FOUND', [], 404);
        }

        $critStmt = $db->prepare("
            SELECT * FROM competency_criteria
            WHERE activity_id = :act_id
            ORDER BY id ASC
        ");
        $critStmt->execute([':act_id' => $activityId]);
        $activity['criteria'] = $critStmt->fetchAll();

        return $activity;
    }

    /**
     * Create/Update Module (Administrator)
     */
    public static function saveModule(array $data, array $currentUser = [], ?int $moduleId = null): array
    {
        $db = Database::getConnection();
        $tradeId = (int)($data['trade_id'] ?? 0);
        $code = trim($data['code'] ?? '');
        $title = trim($data['title'] ?? '');
        $sequence = (int)($data['sequence_no'] ?? 1);
        $status = $data['status'] ?? 'active';

        if (empty($code) || empty($title) || $tradeId <= 0) {
            Response::error('Module title, code and valid trade are required.', 'VALIDATION_ERROR', [], 422);
        }

        if ($moduleId) {
            $stmt = $db->prepare("
                UPDATE modules
                SET code = :code, title = :title, sequence_no = :sequence, status = :status
                WHERE id = :id
            ");
            $stmt->execute([
                ':code' => $code,
                ':title' => $title,
                ':sequence' => $sequence,
                ':status' => $status,
                ':id' => $moduleId
            ]);
            return ['id' => $moduleId, 'message' => 'Module updated'];
        } else {
            $stmt = $db->prepare("
                INSERT INTO modules (trade_id, code, title, sequence_no, status)
                VALUES (:trade_id, :code, :title, :sequence, :status)
            ");
            $stmt->execute([
                ':trade_id' => $tradeId,
                ':code' => $code,
                ':title' => $title,
                ':sequence' => $sequence,
                ':status' => $status
            ]);
            return ['id' => (int)$db->lastInsertId(), 'message' => 'Module created'];
        }
    }

    /**
     * Create/Update Practical Activity (Administrator)
     */
    public static function saveActivity(array $data, array $currentUser = [], ?int $activityId = null): array
    {
        $db = Database::getConnection();
        $moduleId = (int)($data['module_id'] ?? 0);
        $code = trim($data['code'] ?? '');
        $title = trim($data['title'] ?? '');
        $instructions = trim($data['instructions'] ?? '');
        $status = $data['status'] ?? 'active';
        $criteria = $data['criteria'] ?? [];

        if (empty($code) || empty($title) || empty($instructions) || $moduleId <= 0) {
            Response::error('Code, title, instructions and valid module are required.', 'VALIDATION_ERROR', [], 422);
        }

        $db->beginTransaction();
        try {
            if ($activityId) {
                $stmt = $db->prepare("
                    UPDATE practical_activities
                    SET code = :code, title = :title, instructions = :instructions, status = :status
                    WHERE id = :id
                ");
                $stmt->execute([
                    ':code' => $code,
                    ':title' => $title,
                    ':instructions' => $instructions,
                    ':status' => $status,
                    ':id' => $activityId
                ]);
            } else {
                $stmt = $db->prepare("
                    INSERT INTO practical_activities (module_id, code, title, instructions, status)
                    VALUES (:module_id, :code, :title, :instructions, :status)
                ");
                $stmt->execute([
                    ':module_id' => $moduleId,
                    ':code' => $code,
                    ':title' => $title,
                    ':instructions' => $instructions,
                    ':status' => $status
                ]);
                $activityId = (int)$db->lastInsertId();
            }

            // If criteria provided, sync criteria
            if (is_array($criteria) && count($criteria) > 0) {
                foreach ($criteria as $crit) {
                    $critId = !empty($crit['id']) ? (int)$crit['id'] : null;
                    $critCode = trim($crit['code'] ?? '');
                    $desc = trim($crit['description'] ?? '');
                    $isSafety = !empty($crit['is_safety_critical']) ? 1 : 0;
                    $weight = (int)($crit['weight'] ?? 25);
                    $maxPts = (int)($crit['max_points'] ?? 5);

                    if (empty($critCode) || empty($desc)) continue;

                    if ($critId) {
                        $upStmt = $db->prepare("
                            UPDATE competency_criteria
                            SET code = :code, description = :desc, is_safety_critical = :safety, weight = :weight, max_points = :pts
                            WHERE id = :id AND activity_id = :act_id
                        ");
                        $upStmt->execute([
                            ':code' => $critCode,
                            ':desc' => $desc,
                            ':safety' => $isSafety,
                            ':weight' => $weight,
                            ':pts' => $maxPts,
                            ':id' => $critId,
                            ':act_id' => $activityId
                        ]);
                    } else {
                        $inStmt = $db->prepare("
                            INSERT INTO competency_criteria (activity_id, code, description, is_safety_critical, weight, max_points)
                            VALUES (:act_id, :code, :desc, :safety, :weight, :pts)
                        ");
                        $inStmt->execute([
                            ':act_id' => $activityId,
                            ':code' => $critCode,
                            ':desc' => $desc,
                            ':safety' => $isSafety,
                            ':weight' => $weight,
                            ':pts' => $maxPts
                        ]);
                    }
                }
            }

            $db->commit();
            return ['id' => $activityId, 'message' => 'Practical activity saved successfully.'];
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Record a student's practical activity attempt
     */
    public static function createAttempt(array $data, array $currentUser = []): array
    {
        $db = Database::getConnection();
        $studentId = (int)($data['student_id'] ?? 0);
        $activityId = (int)($data['activity_id'] ?? 0);
        $notes = trim($data['notes'] ?? '');

        if ($studentId <= 0 || $activityId <= 0) {
            Response::error('Student ID and Activity ID are required.', 'VALIDATION_ERROR', [], 422);
        }

        // Check highest attempt number
        $stmt = $db->prepare("SELECT MAX(attempt_no) as max_att FROM activity_attempts WHERE student_id = :sid AND activity_id = :aid");
        $stmt->execute([':sid' => $studentId, ':aid' => $activityId]);
        $row = $stmt->fetch();
        $nextAttempt = ($row && $row['max_att']) ? ((int)$row['max_att'] + 1) : 1;

        $inStmt = $db->prepare("
            INSERT INTO activity_attempts (student_id, activity_id, attempt_no, started_at, status, notes)
            VALUES (:sid, :aid, :att_no, CURRENT_TIMESTAMP, 'in_progress', :notes)
        ");
        $inStmt->execute([
            ':sid' => $studentId,
            ':aid' => $activityId,
            ':att_no' => $nextAttempt,
            ':notes' => $notes
        ]);
        $attemptId = (int)$db->lastInsertId();

        return [
            'attempt_id' => $attemptId,
            'attempt_no' => $nextAttempt,
            'student_id' => $studentId,
            'activity_id' => $activityId,
            'status' => 'in_progress',
            'message' => 'Practical attempt initialized.'
        ];
    }

    /**
     * Submit an authoritative criterion-level assessment for an attempt
     * Invariant DEC-05: Safety Criteria >= 4/5 AND Overall Score >= 75% -> Competent
     */
    public static function submitAssessment(array $data, array $currentUser = []): array
    {
        $db = Database::getConnection();
        $attemptId = (int)($data['attempt_id'] ?? 0);
        $feedback = trim($data['feedback'] ?? '');
        $criterionResults = $data['criterion_results'] ?? [];
        $assessorUserId = (int)($currentUser['id'] ?? 0);

        if ($attemptId <= 0) {
            Response::error('Attempt ID is required.', 'VALIDATION_ERROR', [], 422);
        }

        // Fetch attempt details
        $attStmt = $db->prepare("
            SELECT aa.*, s.name as student_name, s.user_id as student_user_id, pa.id as activity_id, pa.title as activity_title
            FROM activity_attempts aa
            JOIN students s ON s.id = aa.student_id
            JOIN practical_activities pa ON pa.id = aa.activity_id
            WHERE aa.id = :id
        ");
        $attStmt->execute([':id' => $attemptId]);
        $attempt = $attStmt->fetch();

        if (!$attempt) {
            Response::error('Practical attempt not found.', 'ATTEMPT_NOT_FOUND', [], 404);
        }

        // Fetch all criteria for this activity
        $critStmt = $db->prepare("
            SELECT * FROM competency_criteria
            WHERE activity_id = :act_id
            ORDER BY id ASC
        ");
        $critStmt->execute([':act_id' => $attempt['activity_id']]);
        $allCriteria = $critStmt->fetchAll();

        if (empty($allCriteria)) {
            Response::error('No competency criteria configured for this activity.', 'NO_CRITERIA_FOUND', [], 400);
        }

        // Validate criterion results submitted
        $totalScore = 0.0;
        $maxPossible = 0.0;
        $passedSafety = true;
        $failedSafetyCriteria = [];
        $validatedResults = [];

        $submittedMap = [];
        foreach ($criterionResults as $cr) {
            $submittedMap[(int)$cr['criterion_id']] = $cr;
        }

        foreach ($allCriteria as $criterion) {
            $cid = (int)$criterion['id'];
            if (!isset($submittedMap[$cid])) {
                Response::error("Missing mandatory score for criterion: {$criterion['code']} - {$criterion['description']}", 'MISSING_CRITERION_SCORE', [], 422);
            }

            $score = (int)($submittedMap[$cid]['score'] ?? 0);
            $comment = trim($submittedMap[$cid]['comment'] ?? '');

            if ($score < 0 || $score > (int)$criterion['max_points']) {
                Response::error("Score for criterion {$criterion['code']} must be between 0 and {$criterion['max_points']}.", 'SCORE_OUT_OF_BOUNDS', [], 422);
            }

            $isSafety = (bool)$criterion['is_safety_critical'];
            if ($isSafety && $score < 4) {
                $passedSafety = false;
                $failedSafetyCriteria[] = $criterion['code'];
            }

            $totalScore += $score;
            $maxPossible += (float)$criterion['max_points'];

            $validatedResults[] = [
                'criterion_id' => $cid,
                'score' => $score,
                'comment' => $comment
            ];
        }

        $percentage = ($maxPossible > 0) ? round(($totalScore / $maxPossible) * 100, 2) : 0.0;

        // DEC-05 Competency rule:
        // Competent if: 1. All mandatory safety criteria >= 4/5 AND 2. Total percentage >= 75%
        $isCompetent = ($passedSafety && $percentage >= 75.0);
        $derivedStatus = $isCompetent ? 'competent' : 'needs_practice';

        $db->beginTransaction();
        try {
            // Check if assessment already exists for this attempt
            $checkStmt = $db->prepare("SELECT id FROM assessments WHERE attempt_id = :att_id");
            $checkStmt->execute([':att_id' => $attemptId]);
            $existingAssessment = $checkStmt->fetch();

            $assessmentId = null;
            if ($existingAssessment) {
                $assessmentId = (int)$existingAssessment['id'];
                $upStmt = $db->prepare("
                    UPDATE assessments
                    SET assessor_id = :assessor_id,
                        total_score = :total_score,
                        max_possible = :max_possible,
                        percentage = :percentage,
                        derived_status = :derived_status,
                        feedback = :feedback,
                        status = 'submitted',
                        assessed_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                ");
                $upStmt->execute([
                    ':assessor_id' => $assessorUserId,
                    ':total_score' => $totalScore,
                    ':max_possible' => $maxPossible,
                    ':percentage' => $percentage,
                    ':derived_status' => $derivedStatus,
                    ':feedback' => $feedback,
                    ':id' => $assessmentId
                ]);

                // Clear previous criterion results
                $delStmt = $db->prepare("DELETE FROM assessment_criterion_results WHERE assessment_id = :aid");
                $delStmt->execute([':aid' => $assessmentId]);
            } else {
                $inStmt = $db->prepare("
                    INSERT INTO assessments
                        (attempt_id, assessor_id, total_score, max_possible, percentage, derived_status, assessed_at, status, feedback)
                    VALUES
                        (:att_id, :assessor_id, :total_score, :max_possible, :percentage, :derived_status, CURRENT_TIMESTAMP, 'submitted', :feedback)
                ");
                $inStmt->execute([
                    ':att_id' => $attemptId,
                    ':assessor_id' => $assessorUserId,
                    ':total_score' => $totalScore,
                    ':max_possible' => $maxPossible,
                    ':percentage' => $percentage,
                    ':derived_status' => $derivedStatus,
                    ':feedback' => $feedback
                ]);
                $assessmentId = (int)$db->lastInsertId();
            }

            // Insert criterion results
            $critIns = $db->prepare("
                INSERT INTO assessment_criterion_results (assessment_id, criterion_id, result_value, result_status, comment)
                VALUES (:aid, :cid, :val, 'assessed', :comment)
            ");
            foreach ($validatedResults as $vr) {
                $critIns->execute([
                    ':aid' => $assessmentId,
                    ':cid' => $vr['criterion_id'],
                    ':val' => $vr['score'],
                    ':comment' => $vr['comment']
                ]);
            }

            // Update attempt status to assessed
            $attUp = $db->prepare("UPDATE activity_attempts SET status = 'assessed' WHERE id = :id");
            $attUp->execute([':id' => $attemptId]);

            // If needs_practice and auto-remedial requested, generate remedial trigger
            $autoRemedial = null;
            if (!$isCompetent) {
                $reasonText = !$passedSafety
                    ? "Mandatory safety criteria fell below threshold (4/5): " . implode(', ', $failedSafetyCriteria)
                    : "Overall score ({$percentage}%) fell below passing benchmark (75%).";

                // Check if active remedial already exists
                $remCheck = $db->prepare("
                    SELECT id FROM remedial_assignments
                    WHERE student_id = :sid AND activity_id = :aid AND status IN ('assigned', 'in_progress')
                ");
                $remCheck->execute([':sid' => $attempt['student_id'], ':aid' => $attempt['activity_id']]);
                if (!$remCheck->fetch()) {
                    $remIns = $db->prepare("
                        INSERT INTO remedial_assignments
                            (student_id, activity_id, assigned_by, reason, instructions, due_on, status)
                        VALUES
                            (:sid, :aid, :assigned_by, :reason, :instructions, :due_on, 'assigned')
                    ");
                    $dueDate = date('Y-m-d', strtotime('+7 days'));
                    $remIns->execute([
                        ':sid' => $attempt['student_id'],
                        ':aid' => $attempt['activity_id'],
                        ':assigned_by' => $assessorUserId,
                        ':reason' => $reasonText,
                        ':instructions' => 'Review relevant workshop safety manual and practice hands-on exercise with instructor supervision before re-assessment.',
                        ':due_on' => $dueDate
                    ]);
                    $autoRemedial = (int)$db->lastInsertId();
                }
            }

            // Write to audit log
            $auditStmt = $db->prepare("
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, after_json)
                VALUES (:actor, 'assessment_submitted', 'assessments', :eid, :req, :json)
            ");
            $auditStmt->execute([
                ':actor' => $assessorUserId,
                ':eid' => $assessmentId,
                ':req' => $_SERVER['HTTP_X_REQUEST_ID'] ?? uniqid('req_', true),
                ':json' => json_encode([
                    'attempt_id' => $attemptId,
                    'total_score' => $totalScore,
                    'max_possible' => $maxPossible,
                    'percentage' => $percentage,
                    'derived_status' => $derivedStatus,
                    'passed_safety' => $passedSafety,
                    'auto_remedial_id' => $autoRemedial
                ])
            ]);

            $db->commit();

            return [
                'assessment_id' => $assessmentId,
                'attempt_id' => $attemptId,
                'total_score' => $totalScore,
                'max_possible' => $maxPossible,
                'percentage' => $percentage,
                'derived_status' => $derivedStatus,
                'passed_safety' => $passedSafety,
                'failed_safety_criteria' => $failedSafetyCriteria,
                'remedial_created' => $autoRemedial !== null,
                'message' => "Assessment submitted: Student evaluated as " . strtoupper(str_replace('_', ' ', $derivedStatus))
            ];
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    /**
     * Get Competency Matrix for a Batch or Trade (Grid of Students vs Practical Activities)
     */
    public static function getCompetencyMatrix(int $batchId, array $currentUser = []): array
    {
        $db = Database::getConnection();

        // Verify batch
        $bStmt = $db->prepare("
            SELECT b.*, t.name as trade_name, t.code as trade_code, ap.name as period_name
            FROM batches b
            JOIN trades t ON t.id = b.trade_id
            JOIN academic_periods ap ON ap.id = b.academic_period_id
            WHERE b.id = :bid AND t.institute_id = :inst_id
        ");
        $bStmt->execute([':bid' => $batchId, ':inst_id' => $currentUser['institute_id'] ?? 1]);
        $batch = $bStmt->fetch();

        if (!$batch) {
            Response::error('Batch not found or unauthorized.', 'BATCH_NOT_FOUND', [], 404);
        }

        // Fetch students in batch
        $sStmt = $db->prepare("
            SELECT s.id, s.admission_no, s.name, s.gender, e.starts_on
            FROM enrollments e
            JOIN students s ON s.id = e.student_id
            WHERE e.batch_id = :bid AND e.status = 'active'
            ORDER BY s.admission_no ASC
        ");
        $sStmt->execute([':bid' => $batchId]);
        $students = $sStmt->fetchAll();

        // Fetch practical activities for this trade
        $aStmt = $db->prepare("
            SELECT pa.id, pa.code, pa.title, m.code as module_code, m.title as module_title
            FROM practical_activities pa
            JOIN modules m ON m.id = pa.module_id
            WHERE m.trade_id = :trade_id AND pa.status = 'active'
            ORDER BY m.sequence_no ASC, pa.id ASC
        ");
        $aStmt->execute([':trade_id' => $batch['trade_id']]);
        $activities = $aStmt->fetchAll();

        // Fetch latest assessment for each (student_id, activity_id)
        $assessStmt = $db->prepare("
            SELECT aa.student_id, aa.activity_id, aa.attempt_no,
                   ass.id as assessment_id, ass.total_score, ass.max_possible, ass.percentage,
                   ass.derived_status, ass.assessed_at, u.username as assessor_name
            FROM activity_attempts aa
            JOIN assessments ass ON ass.attempt_id = aa.id
            LEFT JOIN users u ON u.id = ass.assessor_id
            WHERE aa.batch_id = :bid OR aa.student_id IN (SELECT student_id FROM enrollments WHERE batch_id = :bid2)
            ORDER BY aa.attempt_no DESC
        ");
        $assessStmt->execute([':bid' => $batchId, ':bid2' => $batchId]);
        $allAssessments = $assessStmt->fetchAll();

        // Map latest assessment per student_activity
        $matrixMap = [];
        foreach ($allAssessments as $ass) {
            $key = $ass['student_id'] . '_' . $ass['activity_id'];
            if (!isset($matrixMap[$key])) {
                $matrixMap[$key] = $ass;
            }
        }

        // Build grid
        $matrixRows = [];
        $competentCount = 0;
        $needsPracticeCount = 0;
        $notAttemptedCount = 0;

        foreach ($students as $stu) {
            $row = [
                'student' => $stu,
                'activities' => [],
                'competent_count' => 0,
                'needs_practice_count' => 0,
                'not_attempted_count' => 0,
                'completion_percentage' => 0.0
            ];

            foreach ($activities as $act) {
                $key = $stu['id'] . '_' . $act['id'];
                $cell = $matrixMap[$key] ?? null;

                $status = $cell ? $cell['derived_status'] : 'not_attempted';
                if ($status === 'competent') {
                    $row['competent_count']++;
                    $competentCount++;
                } elseif ($status === 'needs_practice') {
                    $row['needs_practice_count']++;
                    $needsPracticeCount++;
                } else {
                    $row['not_attempted_count']++;
                    $notAttemptedCount++;
                }

                $row['activities'][$act['id']] = [
                    'activity_id' => $act['id'],
                    'activity_code' => $act['code'],
                    'status' => $status,
                    'percentage' => $cell ? (float)$cell['percentage'] : null,
                    'score' => $cell ? (float)$cell['total_score'] : null,
                    'max_possible' => $cell ? (float)$cell['max_possible'] : null,
                    'assessment_id' => $cell ? (int)$cell['assessment_id'] : null,
                    'assessed_at' => $cell['assessed_at'] ?? null,
                ];
            }

            $totalActs = count($activities);
            $row['completion_percentage'] = $totalActs > 0 ? round(($row['competent_count'] / $totalActs) * 100, 1) : 0.0;
            $matrixRows[] = $row;
        }

        return [
            'batch' => $batch,
            'activities' => $activities,
            'summary' => [
                'total_students' => count($students),
                'total_activities' => count($activities),
                'total_competencies_awarded' => $competentCount,
                'total_remedial_required' => $needsPracticeCount,
                'total_unattempted' => $notAttemptedCount,
            ],
            'matrix' => $matrixRows
        ];
    }

    /**
     * Get Student Practical Progress Detail
     */
    public static function getStudentCompetency(int $studentId, array $currentUser = []): array
    {
        $db = Database::getConnection();

        // Permission check: if student, can only view own profile
        if (($currentUser['role'] ?? '') === 'student') {
            $myStudentId = (int)($currentUser['profile']['student_id'] ?? 0);
            if ($myStudentId !== $studentId) {
                Response::error('Access denied to other student progress.', 'FORBIDDEN', [], 403);
            }
        }

        $sStmt = $db->prepare("
            SELECT s.*, b.id as batch_id, b.name as batch_name, t.id as trade_id, t.name as trade_name, t.code as trade_code
            FROM students s
            LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = 'active'
            LEFT JOIN batches b ON b.id = e.batch_id
            LEFT JOIN trades t ON t.id = b.trade_id
            WHERE s.id = :id AND s.institute_id = :inst_id
        ");
        $sStmt->execute([':id' => $studentId, ':inst_id' => $currentUser['institute_id'] ?? 1]);
        $student = $sStmt->fetch();

        if (!$student) {
            Response::error('Student not found.', 'STUDENT_NOT_FOUND', [], 404);
        }

        // Fetch all trade activities
        $activities = [];
        if ($student['trade_id']) {
            $actStmt = $db->prepare("
                SELECT pa.*, m.title as module_title, m.code as module_code
                FROM practical_activities pa
                JOIN modules m ON m.id = pa.module_id
                WHERE m.trade_id = :tid AND pa.status = 'active'
                ORDER BY m.sequence_no ASC, pa.id ASC
            ");
            $actStmt->execute([':tid' => $student['trade_id']]);
            $activities = $actStmt->fetchAll();
        }

        // Fetch student attempts and assessments
        $attStmt = $db->prepare("
            SELECT aa.*, ass.id as assessment_id, ass.total_score, ass.max_possible, ass.percentage,
                   ass.derived_status, ass.feedback, ass.assessed_at, u.username as assessor_name
            FROM activity_attempts aa
            LEFT JOIN assessments ass ON ass.attempt_id = aa.id
            LEFT JOIN users u ON u.id = ass.assessor_id
            WHERE aa.student_id = :sid
            ORDER BY aa.started_at DESC
        ");
        $attStmt->execute([':sid' => $studentId]);
        $attempts = $attStmt->fetchAll();

        // Attach criterion results to each attempt assessment
        foreach ($attempts as &$att) {
            if ($att['assessment_id']) {
                $crStmt = $db->prepare("
                    SELECT acr.*, cc.code as criteria_code, cc.description as criteria_desc, cc.is_safety_critical, cc.max_points
                    FROM assessment_criterion_results acr
                    JOIN competency_criteria cc ON cc.id = acr.criterion_id
                    WHERE acr.assessment_id = :aid
                    ORDER BY cc.id ASC
                ");
                $crStmt->execute([':aid' => $att['assessment_id']]);
                $att['criterion_results'] = $crStmt->fetchAll();
            } else {
                $att['criterion_results'] = [];
            }
        }

        // Fetch remedial assignments for this student
        $remStmt = $db->prepare("
            SELECT ra.*, pa.title as activity_title, pa.code as activity_code, u.username as instructor_name
            FROM remedial_assignments ra
            JOIN practical_activities pa ON pa.id = ra.activity_id
            JOIN users u ON u.id = ra.assigned_by
            WHERE ra.student_id = :sid
            ORDER BY ra.created_at DESC
        ");
        $remStmt->execute([':sid' => $studentId]);
        $remedials = $remStmt->fetchAll();

        // Calculate progress stats
        $competentCount = 0;
        $assessedCount = 0;
        $totalActivities = count($activities);

        $activityStatusMap = [];
        foreach ($attempts as $attempt) {
            $aid = $attempt['activity_id'];
            if (!isset($activityStatusMap[$aid]) && $attempt['derived_status']) {
                $activityStatusMap[$aid] = $attempt['derived_status'];
                if ($attempt['derived_status'] === 'competent') {
                    $competentCount++;
                }
                $assessedCount++;
            }
        }

        return [
            'student' => $student,
            'summary' => [
                'total_activities' => $totalActivities,
                'competent_count' => $competentCount,
                'assessed_count' => $assessedCount,
                'pending_count' => max(0, $totalActivities - $competentCount),
                'completion_percentage' => $totalActivities > 0 ? round(($competentCount / $totalActivities) * 100, 1) : 0.0,
                'active_remedials_count' => count(array_filter($remedials, fn($r) => in_array($r['status'], ['assigned', 'in_progress'])))
            ],
            'activities' => $activities,
            'attempts' => $attempts,
            'remedials' => $remedials
        ];
    }
}

