<?php

namespace App\Services;

class ReportService
{
    /**
     * Sanitizes CSV cell to prevent formula injection (DEC-09).
     */
    public static function sanitizeCell(string $value): string
    {
        if ($value !== '' && preg_match('/^[=+\-@\t\r]/', $value)) {
            return "'" . $value;
        }
        return $value;
    }

    /**
     * Comprehensive Attendance Summary Report with 80% statutory qualification.
     */
    public static function getAttendanceSummary(array $filters, array $currentUser): array
    {
        $pdo = Database::connection();
        $batchId = !empty($filters['batch_id']) ? (int)$filters['batch_id'] : 1;

        // Fetch batch details
        $bStmt = $pdo->prepare("
            SELECT b.*, t.name as trade_name, t.code as trade_code, ap.name as period_name 
            FROM batches b 
            JOIN trades t ON b.trade_id = t.id 
            JOIN academic_periods ap ON b.academic_period_id = ap.id 
            WHERE b.id = ?
        ");
        $bStmt->execute([$batchId]);
        $batch = $bStmt->fetch();

        // Fetch all students enrolled in this batch
        $sStmt = $pdo->prepare("
            SELECT s.id as student_id, s.admission_number, u.first_name, u.last_name, u.email, e.roll_number
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE e.batch_id = ?
            ORDER BY e.roll_number ASC, u.first_name ASC
        ");
        $sStmt->execute([$batchId]);
        $students = $sStmt->fetchAll();

        // Fetch total sessions scheduled for this batch
        $sessStmt = $pdo->prepare("
            SELECT id, session_date, start_time, end_time, topic, session_type, status 
            FROM training_sessions 
            WHERE batch_id = ? AND status != 'cancelled'
            ORDER BY session_date ASC, start_time ASC
        ");
        $sessStmt->execute([$batchId]);
        $sessions = $sessStmt->fetchAll();
        $totalSessions = count($sessions);

        // Fetch all attendance records for this batch
        $attStmt = $pdo->prepare("
            SELECT ar.session_id, ar.student_id, ar.status 
            FROM attendance_records ar
            JOIN training_sessions ts ON ar.session_id = ts.id
            WHERE ts.batch_id = ? AND ts.status != 'cancelled'
        ");
        $attStmt->execute([$batchId]);
        $records = $attStmt->fetchAll();

        // Map records by student_id and session_id
        $matrix = [];
        foreach ($records as $r) {
            $matrix[$r['student_id']][$r['session_id']] = $r['status'];
        }

        $studentSummaries = [];
        $totalEligible = 0;
        $totalAtRisk = 0;

        foreach ($students as $stu) {
            $sId = $stu['student_id'];
            $present = 0;
            $late = 0;
            $excused = 0;
            $absent = 0;
            $unmarked = 0;

            foreach ($sessions as $sess) {
                $status = $matrix[$sId][$sess['id']] ?? null;
                if ($status === 'present') $present++;
                elseif ($status === 'late') $late++;
                elseif ($status === 'excused') $excused++;
                elseif ($status === 'absent') $absent++;
                else $unmarked++;
            }

            $effectiveTotal = max(0, $totalSessions - $excused);
            $percentage = $effectiveTotal > 0 ? round((($present + $late) / $effectiveTotal) * 100, 1) : 0.0;
            $isEligible = $percentage >= 80.0;

            if ($isEligible) {
                $totalEligible++;
            } else {
                $totalAtRisk++;
            }

            $studentSummaries[] = [
                'student_id' => $sId,
                'roll_number' => $stu['roll_number'],
                'admission_number' => $stu['admission_number'],
                'name' => trim($stu['first_name'] . ' ' . $stu['last_name']),
                'email' => $stu['email'],
                'total_sessions' => $totalSessions,
                'present' => $present,
                'late' => $late,
                'excused' => $excused,
                'absent' => $absent,
                'unmarked' => $unmarked,
                'attendance_percentage' => $percentage,
                'is_eligible' => $isEligible,
                'status_label' => $isEligible ? 'Eligible for Exams' : 'Attendance Shortfall (<80%)'
            ];
        }

        return [
            'batch' => $batch,
            'total_students' => count($students),
            'total_sessions' => $totalSessions,
            'summary' => [
                'total_eligible' => $totalEligible,
                'total_at_risk' => $totalAtRisk,
                'cohort_average' => count($studentSummaries) > 0 
                    ? round(array_sum(array_column($studentSummaries, 'attendance_percentage')) / count($studentSummaries), 1) 
                    : 0.0
            ],
            'students' => $studentSummaries
        ];
    }

    /**
     * Practical Competency Mastery Report.
     */
    public static function getCompetencyMastery(array $filters, array $currentUser): array
    {
        $pdo = Database::connection();
        $batchId = !empty($filters['batch_id']) ? (int)$filters['batch_id'] : 1;

        // Fetch trade & activities
        $actStmt = $pdo->prepare("
            SELECT pa.id, pa.activity_number, pa.title, pa.passing_percentage, m.title as module_title, m.module_number
            FROM practical_activities pa
            JOIN modules m ON pa.module_id = m.id
            JOIN batches b ON m.trade_id = b.trade_id
            WHERE b.id = ?
            ORDER BY m.module_number ASC, pa.activity_number ASC
        ");
        $actStmt->execute([$batchId]);
        $activities = $actStmt->fetchAll();

        // Fetch students
        $sStmt = $pdo->prepare("
            SELECT s.id as student_id, s.admission_number, u.first_name, u.last_name, e.roll_number
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE e.batch_id = ?
            ORDER BY e.roll_number ASC, u.first_name ASC
        ");
        $sStmt->execute([$batchId]);
        $students = $sStmt->fetchAll();

        // Fetch all assessments for this batch
        $assStmt = $pdo->prepare("
            SELECT a.*, s.id as student_id
            FROM assessments a
            JOIN enrollments e ON a.student_id = e.student_id
            JOIN students s ON a.student_id = s.id
            WHERE e.batch_id = ?
            ORDER BY a.assessed_at DESC
        ");
        $assStmt->execute([$batchId]);
        $assessments = $assStmt->fetchAll();

        $assessmentMap = [];
        foreach ($assessments as $a) {
            $key = $a['student_id'] . '_' . $a['practical_activity_id'];
            if (!isset($assessmentMap[$key])) {
                $assessmentMap[$key] = $a; // latest attempt
            }
        }

        $grid = [];
        $totalCompetentCount = 0;
        $totalEvaluations = 0;

        foreach ($students as $stu) {
            $studentRow = [
                'student_id' => $stu['student_id'],
                'roll_number' => $stu['roll_number'],
                'name' => trim($stu['first_name'] . ' ' . $stu['last_name']),
                'activities' => []
            ];

            foreach ($activities as $act) {
                $key = $stu['student_id'] . '_' . $act['id'];
                $ass = $assessmentMap[$key] ?? null;

                $status = $ass ? $ass['derived_status'] : 'not_attempted';
                $score = $ass ? (float)$ass['percentage'] : null;

                if ($status === 'competent') $totalCompetentCount++;
                if ($ass) $totalEvaluations++;

                $studentRow['activities'][$act['id']] = [
                    'activity_id' => $act['id'],
                    'status' => $status,
                    'score_percentage' => $score,
                    'assessed_at' => $ass ? $ass['assessed_at'] : null
                ];
            }

            $grid[] = $studentRow;
        }

        return [
            'activities' => $activities,
            'students' => $grid,
            'metrics' => [
                'total_students' => count($students),
                'total_activities' => count($activities),
                'total_evaluations' => $totalEvaluations,
                'competency_clearance_rate' => $totalEvaluations > 0 ? round(($totalCompetentCount / $totalEvaluations) * 100, 1) : 0.0
            ]
        ];
    }

    /**
     * Statutory AITT Practical Hall Ticket Eligibility Roster (DEC-03 + DEC-05).
     */
    public static function getAittEligibilityRoster(array $filters, array $currentUser): array
    {
        $attendance = self::getAttendanceSummary($filters, $currentUser);
        $competency = self::getCompetencyMastery($filters, $currentUser);

        $students = $attendance['students'];
        $roster = [];

        foreach ($students as $s) {
            $sId = $s['student_id'];
            $attPercentage = $s['attendance_percentage'];
            $attPassed = $attPercentage >= 80.0;

            // Find student's competency row
            $compRow = null;
            foreach ($competency['students'] as $c) {
                if ($c['student_id'] === $sId) {
                    $compRow = $c;
                    break;
                }
            }

            $totalActivities = count($competency['activities']);
            $competentActivities = 0;
            $hasSafetyFailure = false;

            if ($compRow) {
                foreach ($compRow['activities'] as $actRes) {
                    if ($actRes['status'] === 'competent') {
                        $competentActivities++;
                    } elseif ($actRes['status'] === 'needs_practice') {
                        $hasSafetyFailure = true;
                    }
                }
            }

            // Invariant: Trainee is eligible for AITT Practical Exam IF:
            // 1. Attendance >= 80%
            // 2. No open safety failures and at least 50% practicals competent
            $isAittEligible = $attPassed && !$hasSafetyFailure && ($competentActivities >= max(1, (int)floor($totalActivities * 0.5)));

            $disqualificationReasons = [];
            if (!$attPassed) {
                $disqualificationReasons[] = "Attendance shortfall ({$attPercentage}% < 80.0% statutory threshold)";
            }
            if ($hasSafetyFailure) {
                $disqualificationReasons[] = "Unresolved safety-critical remedial task pending";
            }
            if ($competentActivities < max(1, (int)floor($totalActivities * 0.5))) {
                $disqualificationReasons[] = "Insufficient competent practical completions ({$competentActivities}/{$totalActivities})";
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
                'safety_clearance' => !$hasSafetyFailure ? 'CLEARED' : 'PENDING_REMEDIAL',
                'aitt_practical_verdict' => $isAittEligible ? 'QUALIFIED' : 'DISQUALIFIED',
                'disqualification_reason' => !empty($disqualificationReasons) ? implode('; ', $disqualificationReasons) : 'None (All criteria met)',
                'hall_ticket_status' => $isAittEligible ? 'APPROVED_FOR_ISSUE' : 'HELD_STATUTORY_GATE'
            ];
        }

        return [
            'batch' => $attendance['batch'],
            'total_trainees' => count($roster),
            'total_qualified' => count(array_filter($roster, fn($r) => $r['aitt_practical_verdict'] === 'QUALIFIED')),
            'total_disqualified' => count(array_filter($roster, fn($r) => $r['aitt_practical_verdict'] === 'DISQUALIFIED')),
            'generated_at' => date('Y-m-d H:i:s'),
            'regulatory_body' => 'Directorate General of Training (DGT) / NCVT',
            'roster' => $roster
        ];
    }
}

