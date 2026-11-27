<?php

namespace App\Services;

use PDO;

class ReportService
{
    private const ATTENDANCE_THRESHOLD = 80.0;
    private const PASSING_SCORE_DEFAULT = 75.0;

    /**
     * Sanitizes CSV cell to prevent spreadsheet formula injection (DEC-09).
     */
    public static function sanitizeCell(string $value): string
    {
        if ($value !== '' && preg_match('/^[=+\-@\t\r]/', $value)) {
            return "'" . $value;
        }
        return $value;
    }

    /**
     * Enforces staff/admin access on institutional reports.
     */
    private static function assertCanViewReports(array $currentUser): void
    {
        $role = $currentUser['role'] ?? '';
        if ($role === 'student') {
            throw new \DomainException('Forbidden: trainees cannot access institutional cohort reports.', 403);
        }
    }

    /**
     * Resolves requested batch or falls back to the first active batch.
     */
    private static function resolveBatch(PDO $pdo, ?int $requestedBatchId): array
    {
        $baseSql = "
            SELECT
                b.id,
                b.trade_id,
                b.academic_period_id,
                b.name,
                b.section,
                b.shift,
                b.status,
                t.name AS trade_name,
                t.code AS trade_code,
                t.nsqf_level,
                t.duration_years,
                ap.name AS period_name,
                ap.starts_on AS period_starts_on,
                ap.ends_on AS period_ends_on
            FROM batches b
            JOIN trades t ON b.trade_id = t.id
            JOIN academic_periods ap ON b.academic_period_id = ap.id
        ";

        if ($requestedBatchId && $requestedBatchId > 0) {
            $stmt = $pdo->prepare($baseSql . " WHERE b.id = ? LIMIT 1");
            $stmt->execute([$requestedBatchId]);
            $batch = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($batch) {
                return $batch;
            }
        }

        $fallbackStmt = $pdo->query($baseSql . " ORDER BY (b.status = 'active') DESC, b.id ASC LIMIT 1");
        $fallback = $fallbackStmt ? $fallbackStmt->fetch(PDO::FETCH_ASSOC) : false;

        if (!$fallback) {
            throw new \RuntimeException('No batches found in the database.', 404);
        }

        return $fallback;
    }

    /**
     * Normalizes optional YYYY-MM-DD date filters.
     */
    private static function normalizeDate(?string $value): ?string
    {
        if (!$value) {
            return null;
        }
        $trimmed = trim($value);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed)) {
            return $trimmed;
        }
        return null;
    }

    /**
     * Comprehensive Attendance Summary Report with 80% statutory qualification
     * and optional date-range filtering.
     */
    public static function getAttendanceSummary(array $filters, array $currentUser): array
    {
        self::assertCanViewReports($currentUser);

        $pdo = Database::connection();
        $batch = self::resolveBatch($pdo, !empty($filters['batch_id']) ? (int)$filters['batch_id'] : null);
        $batchId = (int)$batch['id'];
        $fromDate = self::normalizeDate($filters['from'] ?? null);
        $toDate = self::normalizeDate($filters['to'] ?? null);

        // Fetch all trainees enrolled in this batch
        $sStmt = $pdo->prepare("
            SELECT
                s.id AS student_id,
                s.admission_no AS admission_number,
                s.admission_no AS roll_number,
                s.name,
                s.gender,
                s.category,
                u.email,
                e.status AS enrollment_status
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE e.batch_id = ?
            ORDER BY s.admission_no ASC, s.name ASC
        ");
        $sStmt->execute([$batchId]);
        $students = $sStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch sessions for this batch (with optional date range)
        $sessSql = "
            SELECT
                ts.id,
                ts.session_date,
                ts.start_time,
                ts.end_time,
                ts.topic,
                ts.status,
                i.name AS instructor_name
            FROM training_sessions ts
            LEFT JOIN instructors i ON ts.instructor_id = i.id
            WHERE ts.batch_id = ? AND ts.status != 'cancelled'
        ";
        $sessParams = [$batchId];
        if ($fromDate !== null) {
            $sessSql .= " AND ts.session_date >= ?";
            $sessParams[] = $fromDate;
        }
        if ($toDate !== null) {
            $sessSql .= " AND ts.session_date <= ?";
            $sessParams[] = $toDate;
        }
        $sessSql .= " ORDER BY ts.session_date ASC, ts.start_time ASC";

        $sessStmt = $pdo->prepare($sessSql);
        $sessStmt->execute($sessParams);
        $sessions = $sessStmt->fetchAll(PDO::FETCH_ASSOC);
        $totalSessions = count($sessions);

        // Fetch attendance records for the filtered sessions
        $attSql = "
            SELECT ar.session_id, ar.student_id, ar.status
            FROM attendance_records ar
            JOIN training_sessions ts ON ar.session_id = ts.id
            WHERE ts.batch_id = ? AND ts.status != 'cancelled'
        ";
        $attParams = [$batchId];
        if ($fromDate !== null) {
            $attSql .= " AND ts.session_date >= ?";
            $attParams[] = $fromDate;
        }
        if ($toDate !== null) {
            $attSql .= " AND ts.session_date <= ?";
            $attParams[] = $toDate;
        }

        $attStmt = $pdo->prepare($attSql);
        $attStmt->execute($attParams);
        $records = $attStmt->fetchAll(PDO::FETCH_ASSOC);

        $matrix = [];
        $sessionStats = [];
        foreach ($records as $r) {
            $sid = (int)$r['student_id'];
            $sessId = (int)$r['session_id'];
            $st = $r['status'];
            $matrix[$sid][$sessId] = $st;

            if (!isset($sessionStats[$sessId])) {
                $sessionStats[$sessId] = ['present' => 0, 'late' => 0, 'excused' => 0, 'absent' => 0];
            }
            if (isset($sessionStats[$sessId][$st])) {
                $sessionStats[$sessId][$st]++;
            }
        }

        $studentSummaries = [];
        $totalEligible = 0;
        $totalAtRisk = 0;
        $totalPresentMarks = 0;
        $totalAbsentMarks = 0;

        foreach ($students as $stu) {
            $sId = (int)$stu['student_id'];
            $present = 0;
            $late = 0;
            $excused = 0;
            $absent = 0;
            $unmarked = 0;

            foreach ($sessions as $sess) {
                $status = $matrix[$sId][(int)$sess['id']] ?? null;
                if ($status === 'present') {
                    $present++;
                } elseif ($status === 'late') {
                    $late++;
                } elseif ($status === 'excused') {
                    $excused++;
                } elseif ($status === 'absent') {
                    $absent++;
                } else {
                    $unmarked++;
                }
            }

            $totalPresentMarks += ($present + $late);
            $totalAbsentMarks += $absent;

            $effectiveTotal = max(0, $totalSessions - $excused);
            $attended = $present + $late;
            $percentage = $effectiveTotal > 0 ? round(($attended / $effectiveTotal) * 100, 1) : 0.0;
            $isEligible = $effectiveTotal > 0 ? ($percentage >= self::ATTENDANCE_THRESHOLD) : false;

            // Calculate how many consecutive present sessions needed to reach 80% if currently below
            $sessionsNeeded = 0;
            if (!$isEligible && $effectiveTotal > 0) {
                // (attended + x) / (effectiveTotal + x) >= 0.8 => x >= 4*effectiveTotal - 5*attended
                $sessionsNeeded = max(0, (int)ceil((0.8 * $effectiveTotal - $attended) / 0.2));
            }

            if ($isEligible) {
                $totalEligible++;
            } else {
                $totalAtRisk++;
            }

            $studentSummaries[] = [
                'student_id' => $sId,
                'roll_number' => $stu['roll_number'],
                'admission_number' => $stu['admission_number'],
                'name' => $stu['name'],
                'email' => $stu['email'],
                'category' => $stu['category'],
                'total_sessions' => $totalSessions,
                'effective_sessions' => $effectiveTotal,
                'present' => $present,
                'late' => $late,
                'excused' => $excused,
                'absent' => $absent,
                'unmarked' => $unmarked,
                'attendance_percentage' => $percentage,
                'is_eligible' => $isEligible,
                'sessions_needed_for_80' => $sessionsNeeded,
                'status_label' => $isEligible ? 'Eligible for Exams' : 'Attendance Shortfall (<80%)',
            ];
        }

        // Build session-by-session breakdown
        $studentCount = count($students);
        $sessionBreakdown = [];
        foreach ($sessions as $sess) {
            $sessId = (int)$sess['id'];
            $counts = $sessionStats[$sessId] ?? ['present' => 0, 'late' => 0, 'excused' => 0, 'absent' => 0];
            $markedTotal = $counts['present'] + $counts['late'] + $counts['excused'] + $counts['absent'];
            $effectiveDenom = max(0, $studentCount - $counts['excused']);
            $rate = $effectiveDenom > 0 ? round((($counts['present'] + $counts['late']) / $effectiveDenom) * 100, 1) : 0.0;

            $sessionBreakdown[] = [
                'id' => $sessId,
                'session_date' => $sess['session_date'],
                'start_time' => $sess['start_time'],
                'end_time' => $sess['end_time'],
                'topic' => $sess['topic'],
                'status' => $sess['status'],
                'instructor_name' => $sess['instructor_name'] ?? 'Assigned Instructor',
                'present' => $counts['present'],
                'late' => $counts['late'],
                'excused' => $counts['excused'],
                'absent' => $counts['absent'],
                'marked_count' => $markedTotal,
                'attendance_rate' => $rate,
            ];
        }

        return [
            'batch' => $batch,
            'filters' => [
                'batch_id' => $batchId,
                'from' => $fromDate,
                'to' => $toDate,
            ],
            'threshold_percentage' => self::ATTENDANCE_THRESHOLD,
            'total_students' => $studentCount,
            'total_sessions' => $totalSessions,
            'summary' => [
                'total_eligible' => $totalEligible,
                'total_at_risk' => $totalAtRisk,
                'cohort_average' => $studentCount > 0
                    ? round(array_sum(array_column($studentSummaries, 'attendance_percentage')) / $studentCount, 1)
                    : 0.0,
                'total_present_marks' => $totalPresentMarks,
                'total_absent_marks' => $totalAbsentMarks,
            ],
            'students' => $studentSummaries,
            'sessions' => $sessionBreakdown,
        ];
    }

    /**
     * Practical Competency Mastery Matrix Report.
     */
    public static function getCompetencyMastery(array $filters, array $currentUser): array
    {
        self::assertCanViewReports($currentUser);

        $pdo = Database::connection();
        $batch = self::resolveBatch($pdo, !empty($filters['batch_id']) ? (int)$filters['batch_id'] : null);
        $batchId = (int)$batch['id'];

        // Fetch trade practical activities
        $actStmt = $pdo->prepare("
            SELECT
                pa.id,
                pa.code AS activity_number,
                pa.title,
                m.title AS module_title,
                m.code AS module_code,
                m.sequence_no AS module_number
            FROM practical_activities pa
            JOIN modules m ON pa.module_id = m.id
            WHERE m.trade_id = ? AND pa.status = 'active'
            ORDER BY m.sequence_no ASC, pa.code ASC
        ");
        $actStmt->execute([(int)$batch['trade_id']]);
        $activities = $actStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch enrolled trainees
        $sStmt = $pdo->prepare("
            SELECT
                s.id AS student_id,
                s.admission_no AS admission_number,
                s.admission_no AS roll_number,
                s.name
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.batch_id = ?
            ORDER BY s.admission_no ASC, s.name ASC
        ");
        $sStmt->execute([$batchId]);
        $students = $sStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch all assessments for trainees in this batch
        $assStmt = $pdo->prepare("
            SELECT
                a.id AS assessment_id,
                a.total_score,
                a.max_possible,
                a.percentage,
                a.derived_status,
                a.assessed_at,
                a.feedback,
                aa.student_id,
                aa.activity_id AS practical_activity_id,
                aa.attempt_no
            FROM assessments a
            JOIN activity_attempts aa ON a.attempt_id = aa.id
            JOIN enrollments e ON aa.student_id = e.student_id
            WHERE e.batch_id = ?
            ORDER BY a.assessed_at DESC, aa.attempt_no DESC, a.id DESC
        ");
        $assStmt->execute([$batchId]);
        $assessments = $assStmt->fetchAll(PDO::FETCH_ASSOC);

        $assessmentMap = [];
        $attemptCounts = [];
        foreach ($assessments as $a) {
            $key = $a['student_id'] . '_' . $a['practical_activity_id'];
            $attemptCounts[$key] = ($attemptCounts[$key] ?? 0) + 1;
            if (!isset($assessmentMap[$key])) {
                $assessmentMap[$key] = $a; // latest attempt
            }
        }

        // Per-activity aggregates
        $activitySummary = [];
        foreach ($activities as $act) {
            $activitySummary[(int)$act['id']] = [
                'activity_id' => (int)$act['id'],
                'activity_number' => $act['activity_number'],
                'title' => $act['title'],
                'module_title' => $act['module_title'],
                'competent_count' => 0,
                'remedial_count' => 0,
                'pending_count' => 0,
                'score_sum' => 0.0,
                'evaluated_count' => 0,
            ];
        }

        $grid = [];
        $totalCompetentCount = 0;
        $totalRemedialCount = 0;
        $totalEvaluations = 0;
        $scoreSumAll = 0.0;

        foreach ($students as $stu) {
            $stuId = (int)$stu['student_id'];
            $stuCompetent = 0;
            $stuRemedial = 0;
            $stuPending = 0;
            $stuScores = [];

            $studentRow = [
                'student_id' => $stuId,
                'roll_number' => $stu['roll_number'],
                'admission_number' => $stu['admission_number'],
                'name' => $stu['name'],
                'activities' => [],
            ];

            foreach ($activities as $act) {
                $actId = (int)$act['id'];
                $key = $stuId . '_' . $actId;
                $ass = $assessmentMap[$key] ?? null;

                $status = $ass ? $ass['derived_status'] : 'not_attempted';
                $score = $ass ? round((float)$ass['percentage'], 1) : null;

                if ($status === 'competent') {
                    $totalCompetentCount++;
                    $stuCompetent++;
                    $activitySummary[$actId]['competent_count']++;
                } elseif ($status === 'needs_practice') {
                    $totalRemedialCount++;
                    $stuRemedial++;
                    $activitySummary[$actId]['remedial_count']++;
                } else {
                    $stuPending++;
                    $activitySummary[$actId]['pending_count']++;
                }

                if ($ass && $score !== null) {
                    $totalEvaluations++;
                    $scoreSumAll += $score;
                    $stuScores[] = $score;
                    $activitySummary[$actId]['score_sum'] += $score;
                    $activitySummary[$actId]['evaluated_count']++;
                }

                $studentRow['activities'][$actId] = [
                    'activity_id' => $actId,
                    'status' => $status,
                    'score_percentage' => $score,
                    'total_score' => $ass ? (float)$ass['total_score'] : null,
                    'max_possible' => $ass ? (float)$ass['max_possible'] : null,
                    'attempt_count' => $attemptCounts[$key] ?? 0,
                    'assessed_at' => $ass ? $ass['assessed_at'] : null,
                    'feedback' => $ass ? $ass['feedback'] : null,
                ];
            }

            $totalActs = count($activities);
            $studentRow['summary'] = [
                'competent_count' => $stuCompetent,
                'remedial_count' => $stuRemedial,
                'pending_count' => $stuPending,
                'average_score' => count($stuScores) > 0 ? round(array_sum($stuScores) / count($stuScores), 1) : null,
                'completion_percentage' => $totalActs > 0 ? round(($stuCompetent / $totalActs) * 100, 1) : 0.0,
            ];

            $grid[] = $studentRow;
        }

        $activityStatsList = [];
        foreach ($activitySummary as $item) {
            $evalCount = $item['evaluated_count'];
            $activityStatsList[] = [
                'activity_id' => $item['activity_id'],
                'activity_number' => $item['activity_number'],
                'title' => $item['title'],
                'module_title' => $item['module_title'],
                'competent_count' => $item['competent_count'],
                'remedial_count' => $item['remedial_count'],
                'pending_count' => $item['pending_count'],
                'average_score' => $evalCount > 0 ? round($item['score_sum'] / $evalCount, 1) : null,
                'pass_rate' => $evalCount > 0 ? round(($item['competent_count'] / $evalCount) * 100, 1) : 0.0,
            ];
        }

        return [
            'batch' => $batch,
            'passing_threshold' => self::PASSING_SCORE_DEFAULT,
            'activities' => $activities,
            'activity_summary' => $activityStatsList,
            'students' => $grid,
            'metrics' => [
                'total_students' => count($students),
                'total_activities' => count($activities),
                'total_evaluations' => $totalEvaluations,
                'total_competent' => $totalCompetentCount,
                'total_remedial' => $totalRemedialCount,
                'average_score' => $totalEvaluations > 0 ? round($scoreSumAll / $totalEvaluations, 1) : 0.0,
                'competency_clearance_rate' => $totalEvaluations > 0
                    ? round(($totalCompetentCount / $totalEvaluations) * 100, 1)
                    : 0.0,
            ],
        ];
    }

    /**
     * Statutory AITT Practical Hall Ticket Eligibility Roster (DEC-03 + DEC-05).
     */
    public static function getAittEligibilityRoster(array $filters, array $currentUser): array
    {
        self::assertCanViewReports($currentUser);

        $attendance = self::getAttendanceSummary($filters, $currentUser);
        $competency = self::getCompetencyMastery($filters, $currentUser);
        $pdo = Database::connection();
        $batchId = (int)$attendance['batch']['id'];

        // Count open remedial assignments per trainee in this batch
        $remStmt = $pdo->prepare("
            SELECT ra.student_id, COUNT(*) AS open_count
            FROM remedial_assignments ra
            JOIN enrollments e ON ra.student_id = e.student_id
            WHERE e.batch_id = ? AND ra.status IN ('assigned', 'in_progress')
            GROUP BY ra.student_id
        ");
        $remStmt->execute([$batchId]);
        $openRemedialMap = [];
        foreach ($remStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $openRemedialMap[(int)$row['student_id']] = (int)$row['open_count'];
        }

        $compByStudent = [];
        foreach ($competency['students'] as $c) {
            $compByStudent[(int)$c['student_id']] = $c;
        }

        $totalActivities = count($competency['activities']);
        $requiredCompetent = $totalActivities > 0 ? max(1, (int)floor($totalActivities * 0.5)) : 0;

        $roster = [];
        foreach ($attendance['students'] as $s) {
            $sId = (int)$s['student_id'];
            $attPercentage = (float)$s['attendance_percentage'];
            $attPassed = (bool)$s['is_eligible'];

            $compRow = $compByStudent[$sId] ?? null;
            $competentActivities = $compRow ? (int)$compRow['summary']['competent_count'] : 0;
            $remedialAssessments = $compRow ? (int)$compRow['summary']['remedial_count'] : 0;
            $avgScore = $compRow ? $compRow['summary']['average_score'] : null;
            $openRemedials = $openRemedialMap[$sId] ?? 0;

            $hasSafetyOrRemedialBlock = ($remedialAssessments > 0) || ($openRemedials > 0);
            $competencyPassed = $totalActivities === 0 || ($competentActivities >= $requiredCompetent);

            $isAittEligible = $attPassed && !$hasSafetyOrRemedialBlock && $competencyPassed;

            $disqualificationReasons = [];
            if (!$attPassed) {
                $disqualificationReasons[] = "Attendance shortfall ({$attPercentage}% < 80.0% statutory threshold)";
            }
            if ($openRemedials > 0) {
                $disqualificationReasons[] = "{$openRemedials} open remedial assignment(s) pending clearance";
            } elseif ($remedialAssessments > 0) {
                $disqualificationReasons[] = "{$remedialAssessments} practical activity marked Needs Practice / Safety review";
            }
            if (!$competencyPassed) {
                $disqualificationReasons[] = "Insufficient competent practicals ({$competentActivities}/{$totalActivities}, min {$requiredCompetent} required)";
            }

            $roster[] = [
                'student_id' => $sId,
                'roll_number' => $s['roll_number'],
                'admission_number' => $s['admission_number'],
                'name' => $s['name'],
                'attendance_percentage' => $attPercentage,
                'attendance_status' => $attPassed ? 'PASSED' : 'FAILED',
                'competent_activities' => $competentActivities,
                'total_activities' => $totalActivities,
                'required_activities' => $requiredCompetent,
                'average_score' => $avgScore,
                'open_remedials' => $openRemedials,
                'safety_clearance' => !$hasSafetyOrRemedialBlock ? 'CLEARED' : 'PENDING_REMEDIAL',
                'aitt_practical_verdict' => $isAittEligible ? 'QUALIFIED' : 'DISQUALIFIED',
                'disqualification_reason' => !empty($disqualificationReasons)
                    ? implode('; ', $disqualificationReasons)
                    : 'All DGT / NCVT statutory criteria satisfied',
                'hall_ticket_status' => $isAittEligible ? 'APPROVED_FOR_ISSUE' : 'HELD_STATUTORY_GATE',
            ];
        }

        $totalQualified = count(array_filter($roster, fn($r) => $r['aitt_practical_verdict'] === 'QUALIFIED'));
        $totalDisqualified = count($roster) - $totalQualified;

        return [
            'batch' => $attendance['batch'],
            'total_trainees' => count($roster),
            'total_qualified' => $totalQualified,
            'total_disqualified' => $totalDisqualified,
            'qualification_rate' => count($roster) > 0 ? round(($totalQualified / count($roster)) * 100, 1) : 0.0,
            'generated_at' => date('Y-m-d H:i:s'),
            'regulatory_body' => 'Directorate General of Training (DGT) / NCVT',
            'roster' => $roster,
        ];
    }

    /**
     * Remedial Tracking & Session Attendance Trend Report.
     */
    public static function getRemedialAndTrends(array $filters, array $currentUser): array
    {
        self::assertCanViewReports($currentUser);

        $pdo = Database::connection();
        $batch = self::resolveBatch($pdo, !empty($filters['batch_id']) ? (int)$filters['batch_id'] : null);
        $batchId = (int)$batch['id'];

        $stmt = $pdo->prepare("
            SELECT
                ra.id,
                ra.student_id,
                s.admission_no,
                s.name AS student_name,
                pa.code AS activity_code,
                pa.title AS activity_title,
                ra.reason,
                ra.due_on,
                ra.status,
                ra.created_at,
                u.username AS assigned_by_name
            FROM remedial_assignments ra
            JOIN enrollments e ON ra.student_id = e.student_id
            JOIN students s ON ra.student_id = s.id
            JOIN practical_activities pa ON ra.activity_id = pa.id
            LEFT JOIN users u ON ra.assigned_by = u.id
            WHERE e.batch_id = ?
            ORDER BY FIELD(ra.status, 'assigned', 'in_progress', 'completed'), ra.due_on ASC, ra.id DESC
        ");
        $stmt->execute([$batchId]);
        $remedials = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $today = date('Y-m-d');
        $openCount = 0;
        $inProgressCount = 0;
        $completedCount = 0;
        $overdueCount = 0;

        foreach ($remedials as &$r) {
            $isOverdue = $r['status'] !== 'completed' && !empty($r['due_on']) && $r['due_on'] < $today;
            $r['is_overdue'] = $isOverdue;

            if ($r['status'] === 'assigned') {
                $openCount++;
            } elseif ($r['status'] === 'in_progress') {
                $inProgressCount++;
            } elseif ($r['status'] === 'completed') {
                $completedCount++;
            }

            if ($isOverdue) {
                $overdueCount++;
            }
        }
        unset($r);

        $attendance = self::getAttendanceSummary($filters, $currentUser);

        return [
            'batch' => $batch,
            'summary' => [
                'total_remedials' => count($remedials),
                'open_assigned' => $openCount,
                'in_progress' => $inProgressCount,
                'completed' => $completedCount,
                'overdue' => $overdueCount,
            ],
            'remedials' => $remedials,
            'session_trends' => $attendance['sessions'],
        ];
    }
}
