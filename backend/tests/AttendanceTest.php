<?php

// Integration Test Suite for Phase 3: Sessions, Roster, Attendance & Policy Calculations

declare(strict_types=1);

spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require_once $file;
});

// Initialize session cleanly before CLI output
\App\Services\AuthService::startSession();

echo "=== ITI SkillTrack Phase 3: Attendance & Training Sessions Tests ===\n\n";

$passCount = 0;
$failCount = 0;

function assertTest(bool $condition, string $testName, string $details = ''): void {
    global $passCount, $failCount;
    if ($condition) {
        echo "[PASS] $testName\n";
        $passCount++;
    } else {
        echo "[FAIL] $testName ($details)\n";
        $failCount++;
    }
}

// 1. Authenticate Instructor and Admin
$adminUser = \App\Services\AuthService::login('admin@itiskilltrack.org', 'Password@123');
$instructorUser = \App\Services\AuthService::login('rajesh.sharma@itiskilltrack.org', 'Password@123');
$studentUser = \App\Services\AuthService::login('amit.kumar@student.iti.org', 'Password@123');

// 2. Test ATT-01 & ATT-02: Create and List Training Sessions
try {
    $sessionData = [
        'batch_id' => 1,
        'session_date' => '2026-11-01',
        'start_time' => '09:00',
        'end_time' => '13:00',
        'topic' => 'Phase 3 Practical: Relay Calibration and Circuit Testing',
        'session_type' => 'practical',
        'notes' => 'Workshop 2 - Workbench 4'
    ];
    $newSession = \App\Services\AttendanceService::createSession($sessionData, $instructorUser);
    assertTest(
        !empty($newSession['id']) && $newSession['status'] === 'scheduled',
        'ATT-01/02: Instructor creates scheduled training session within assigned batch'
    );
    $createdSessionId = (int)$newSession['id'];
} catch (\Throwable $e) {
    assertTest(false, 'ATT-01/02: Create session', $e->getMessage());
    exit(1);
}

// 3. Test Cross-Batch Access Denial (Instructor cannot create session for unassigned batch)
try {
    $unassignedSessionData = [
        'batch_id' => 999, // Unassigned batch
        'session_date' => '2026-11-01',
        'start_time' => '09:00',
        'end_time' => '13:00',
        'topic' => 'Unauthorized Session'
    ];
    \App\Services\AttendanceService::createSession($unassignedSessionData, $instructorUser);
    assertTest(false, 'ATT-02: Instructor creating session in unassigned batch must throw 403/422');
} catch (\Throwable $e) {
    assertTest(true, 'ATT-02: Cross-batch session creation correctly blocked');
}

// 4. Test ATT-03: Authoritative Roster Generation
try {
    $roster = \App\Services\AttendanceService::getRoster($createdSessionId, $instructorUser);
    assertTest(
        is_array($roster) && count($roster) >= 3,
        'ATT-03: Authoritative roster queries enrolled active students for session date'
    );
    $studentIds = array_column($roster, 'student_id');
    assertTest(in_array(1, $studentIds) && in_array(2, $studentIds) && in_array(3, $studentIds), 'ATT-03: Trainees Amit, Priya, Rahul present in roster');
} catch (\Throwable $e) {
    assertTest(false, 'ATT-03: Roster generation', $e->getMessage());
}

// 5. Test ATT-05 & ATT-06: Draft Attendance Save
try {
    $draftMarks = [
        ['student_id' => 1, 'status' => 'present'],
        ['student_id' => 2, 'status' => 'late'],
        // student 3 left unmarked for draft test
    ];
    $savedDraft = \App\Services\AttendanceService::saveDraft($createdSessionId, $draftMarks, $instructorUser);
    assertTest(
        $savedDraft['session']['status'] === 'draft',
        'ATT-06: Partial marks saved in draft mode, status transitions to draft'
    );
    assertTest(
        ($savedDraft['summary']['counts']['present'] ?? 0) === 1 && ($savedDraft['summary']['counts']['late'] ?? 0) === 1,
        'ATT-06: Draft summary correctly reflects entered marks'
    );
} catch (\Throwable $e) {
    assertTest(false, 'ATT-06: Draft attendance save', $e->getMessage());
}

// 6. Test ATT-07: Validation - Cannot Submit Register with Unmarked Students
try {
    \App\Services\AttendanceService::submit($createdSessionId, $instructorUser);
    assertTest(false, 'ATT-07: Submitting incomplete register with unmarked students must throw 422');
} catch (\InvalidArgumentException $e) {
    assertTest(true, 'ATT-07: Submission blocked when roster has unmarked students (' . $e->getMessage() . ')');
}

// 7. Test Complete Marks Entry and Final Submission
try {
    $completeMarks = [
        ['student_id' => 1, 'status' => 'present'],
        ['student_id' => 2, 'status' => 'late'],
        ['student_id' => 3, 'status' => 'absent']
    ];
    \App\Services\AttendanceService::saveDraft($createdSessionId, $completeMarks, $instructorUser);
    $submittedRegister = \App\Services\AttendanceService::submit($createdSessionId, $instructorUser);
    assertTest(
        $submittedRegister['session']['status'] === 'submitted' && !empty($submittedRegister['session']['submitted_at']),
        'ATT-07: Register submitted and locked with timestamp'
    );
} catch (\Throwable $e) {
    assertTest(false, 'ATT-07: Complete register submission', $e->getMessage());
}

// 8. Test ATT-08: Controlled Correction - Reason Validation
// Find attendance record for Student 3 (Rahul, marked absent)
$rosterItems = $submittedRegister['roster'];
$student3Record = null;
foreach ($rosterItems as $r) {
    if ((int)$r['student_id'] === 3) {
        $student3Record = $r;
        break;
    }
}

try {
    // Attempt correction with empty or short reason
    \App\Services\AttendanceService::correctRecord((int)$student3Record['attendance_id'], [
        'status' => 'present',
        'correction_reason' => 'short' // Less than 10 characters
    ], $instructorUser);
    assertTest(false, 'ATT-08: Correction with short reason (<10 chars) must be rejected');
} catch (\InvalidArgumentException $e) {
    assertTest(true, 'ATT-08: Correction rejected without sufficient explanation');
}

// 9. Test ATT-08: Valid Controlled Correction with Audit Log
try {
    $corrected = \App\Services\AttendanceService::correctRecord((int)$student3Record['attendance_id'], [
        'status' => 'excused',
        'correction_reason' => 'Official medical exemption slip verified by warden'
    ], $instructorUser);
    assertTest(
        $corrected['status'] === 'excused' && $corrected['correction_count'] >= 1,
        'ATT-08: Attendance record updated with correction reason and incremented count'
    );

    // Verify audit log entry
    $pdo = \App\Services\Database::getConnection();
    $auditStmt = $pdo->prepare('SELECT COUNT(*) FROM audit_logs WHERE action = "ATTENDANCE_CORRECTION" AND entity_id = :id');
    $auditStmt->execute(['id' => $student3Record['attendance_id']]);
    $auditFound = (int)$auditStmt->fetchColumn() > 0;
    assertTest($auditFound, 'ATT-08/AUD-02: Correction generates immutable audit log record');
} catch (\Throwable $e) {
    assertTest(false, 'ATT-08: Controlled correction', $e->getMessage());
}

// 10. Test ATT-10: Student Attendance History & Formula Calculation
// Formula: (Present + Late) / (Total - Excused) * 100%
try {
    $student1History = \App\Services\AttendanceService::getStudentAttendance(1, [], $studentUser);
    assertTest(
        !empty($student1History['summary']),
        'ATT-10: Student can view personal attendance summary'
    );
    $pct = $student1History['summary']['attendance_percentage'];
    assertTest(
        $pct !== null && $pct >= 80.0 && $student1History['summary']['eligible'] === true,
        "ATT-10/DEC-03: Attendance formula correctly evaluated ($pct% >= 80% Threshold: ELIGIBLE)"
    );
} catch (\Throwable $e) {
    assertTest(false, 'ATT-10: Student attendance calculation', $e->getMessage());
}

// 11. Test Student IDOR Protection (Student 1 trying to view Student 2)
try {
    \App\Services\AttendanceService::getStudentAttendance(2, [], $studentUser);
    assertTest(false, 'ATT-10: Student viewing another student attendance must throw 403 Forbidden');
} catch (\DomainException $e) {
    assertTest($e->getCode() === 403, 'ATT-10: Cross-student attendance view denied with 403 Forbidden');
}

// 12. Test ATT-11: Batch Attendance Report & Statistics
try {
    $report = \App\Services\AttendanceService::getReport(['batch_id' => 1], $instructorUser);
    assertTest(
        !empty($report['students']) && !empty($report['sessions']),
        'ATT-11: Batch attendance matrix report generated with student-level summaries'
    );
    assertTest(
        isset($report['policy']['threshold_percentage']) && $report['policy']['threshold_percentage'] == 80.0,
        'ATT-11: Policy threshold 80% confirmed in report output'
    );
} catch (\Throwable $e) {
    assertTest(false, 'ATT-11: Batch report generation', $e->getMessage());
}

// 13. Test CSV Formula Injection Sanitization
$sanitizedCell = \App\Services\AttendanceService::exportBatchAttendanceCsvSanitize('=cmd|\' /C calc\'!A0');
assertTest(
    str_starts_with($sanitizedCell, "'="),
    'ATT-11/DEC-09: Formula injection payload safely escaped with single quote'
);

echo "\n========================================\n";
echo "Phase 3 Test Summary: $passCount Passed, $failCount Failed.\n";
if ($failCount === 0) {
    echo "✓ ALL Phase 3 Attendance & Training Session Tests PASSED.\n";
} else {
    echo "✗ Some tests failed. Please review.\n";
}
