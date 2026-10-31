<?php

// Integration Test Suite for Phase 2: Auth, Roles, Organization & Scopes

declare(strict_types=1);

// Register autoloader
spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) require_once $file;
});

// Initialize session cleanly before any CLI output
\App\Services\AuthService::startSession();

echo "=== ITI SkillTrack Phase 2: Auth, Role & Scope Policy Tests ===\n\n";

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

// 1. Test Admin Login
try {
    $adminSession = \App\Services\AuthService::login('admin@itiskilltrack.org', 'Password@123');
    assertTest(
        $adminSession['role'] === 'administrator' && !empty($adminSession['session_id']),
        'AUTH-01/02: Administrator can login with valid credentials',
        'Session not created'
    );
    assertTest(!empty($adminSession['csrf_token']), 'AUTH-04: CSRF token is issued upon successful login');
    assertTest($adminSession['scope']['is_all_institute'] === true, 'AUTH-05: Administrator receives institute-wide scope');
} catch (\Throwable $e) {
    assertTest(false, 'AUTH-01/02: Administrator can login', $e->getMessage());
}

// 2. Test Instructor Login & Scoped Batches
try {
    $instSession = \App\Services\AuthService::login('rajesh.sharma@itiskilltrack.org', 'Password@123');
    assertTest(
        $instSession['role'] === 'instructor' && !empty($instSession['profile']),
        'AUTH-02: Instructor can login and receive instructor profile',
        'Profile missing'
    );
    assertTest(
        in_array(1, $instSession['scope']['batches'], true),
        'ORG-08: Instructor scope includes assigned Batch #1 (EL-2026-A)',
        'Batch 1 not in scope'
    );
} catch (\Throwable $e) {
    assertTest(false, 'AUTH-02: Instructor can login', $e->getMessage());
}

// 3. Test Student Login & Self-Scope
try {
    $stuSession = \App\Services\AuthService::login('amit.kumar@student.iti.org', 'Password@123');
    assertTest(
        $stuSession['role'] === 'student' && $stuSession['profile']['student_id'] == 1,
        'AUTH-02/05: Student can login and receive personal student profile',
        'Student profile missing'
    );
    assertTest(
        $stuSession['profile']['admission_no'] === 'ADM-2026-001',
        'ORG-03: Student admission number is correctly linked'
    );
} catch (\Throwable $e) {
    assertTest(false, 'AUTH-02: Student can login', $e->getMessage());
}

// 4. Test Invalid Password Rejection
try {
    \App\Services\AuthService::login('admin@itiskilltrack.org', 'WrongPassword!');
    assertTest(false, 'AUTH-02: Invalid password must be rejected');
} catch (\InvalidArgumentException $e) {
    assertTest($e->getCode() === 401, 'AUTH-02: Invalid password rejected with HTTP 401');
}

// 5. Test Non-existent User Rejection
try {
    \App\Services\AuthService::login('ghost.user@iti.org', 'Password@123');
    assertTest(false, 'AUTH-02: Non-existent user must be rejected');
} catch (\InvalidArgumentException $e) {
    assertTest($e->getCode() === 401, 'AUTH-02: Unknown user rejected with HTTP 401');
}

// 6. Test IDOR / Cross-Student Access Denial
try {
    // Trainee 1 (Amit) trying to read Trainee 2 (Priya)
    \App\Services\StudentService::getStudentById(2, $stuSession);
    assertTest(false, 'AUTH-07: Cross-student IDOR access must throw 403 Forbidden');
} catch (\DomainException $e) {
    assertTest($e->getCode() === 403, 'AUTH-07: Student accessing another student profile denied with 403');
}

// 7. Test Student Accessing Self Succeeds
try {
    $self = \App\Services\StudentService::getStudentById(1, $stuSession);
    assertTest($self !== null && $self['id'] == 1, 'AUTH-06: Student can access own profile successfully');
} catch (\Throwable $e) {
    assertTest(false, 'AUTH-06: Student accessing own profile', $e->getMessage());
}

// 8. Test Cross-Batch Access Denial for Instructor
try {
    // Create an unassigned batch #99 or mock batch
    $fakeInstSession = $instSession;
    $fakeInstSession['scope']['batches'] = [999]; // Rajesh only assigned to 999, not Batch 1

    \App\Services\OrganizationService::getBatchById(1, $fakeInstSession);
    assertTest(false, 'AUTH-07: Instructor accessing unassigned batch must throw 403 Forbidden');
} catch (\DomainException $e) {
    assertTest($e->getCode() === 403, 'AUTH-07: Cross-batch instructor access denied with 403 Forbidden');
}

// 9. Test Trade & Batch Management (ORG-01, ORG-02)
try {
    $trades = \App\Services\OrganizationService::getAllTrades();
    assertTest(count($trades) >= 1 && $trades[0]['code'] === 'ELE-01', 'ORG-01: Trades catalogue loaded successfully');

    $batches = \App\Services\OrganizationService::getBatches([], $adminSession);
    assertTest(count($batches) >= 1 && $batches[0]['name'] === 'EL-2026-A', 'ORG-02: Batches list loaded with relations');
} catch (\Throwable $e) {
    assertTest(false, 'ORG-01/02: Master data listing', $e->getMessage());
}

// 10. Test Soft Deactivation without deleting history (ORG-07)
try {
    // Toggle student status to inactive
    $updatedStudent = \App\Services\StudentService::toggleStatus(3, 'inactive', 1);
    assertTest($updatedStudent['status'] === 'inactive', 'ORG-07: Student can be deactivated without deleting record');

    // Verify linked user cannot login
    try {
        \App\Services\AuthService::login('rahul.singh@student.iti.org', 'Password@123');
        assertTest(false, 'ORG-07: Deactivated student user cannot login');
    } catch (\DomainException $e) {
        assertTest($e->getCode() === 403, 'ORG-07: Deactivated user login rejected with 403 Account Disabled');
    }

    // Re-activate
    \App\Services\StudentService::toggleStatus(3, 'active', 1);
    $reactivated = \App\Services\StudentService::getStudentById(3);
    assertTest($reactivated['status'] === 'active', 'ORG-07: Student can be reactivated successfully');
} catch (\Throwable $e) {
    assertTest(false, 'ORG-07: Account toggle workflow', $e->getMessage());
}

// 11. Test CSRF Protection
$csrfValid = \App\Services\AuthService::verifyCsrf($adminSession['csrf_token']);
assertTest($csrfValid === true, 'AUTH-04: CSRF token verification succeeds with valid token');

$csrfInvalid = \App\Services\AuthService::verifyCsrf('invalid-csrf-payload-token');
assertTest($csrfInvalid === false, 'AUTH-04: CSRF token verification fails with tampered token');

// 12. Test Audit Log Persistence
try {
    $pdo = \App\Services\Database::getConnection();
    $auditStmt = $pdo->query('SELECT COUNT(*) FROM audit_logs WHERE action = "AUTH_LOGIN"');
    $auditCount = (int)$auditStmt->fetchColumn();
    assertTest($auditCount >= 3, 'AUD-02: Login events are recorded to audit_logs table');
} catch (\Throwable $e) {
    assertTest(false, 'AUD-02: Audit trail assertion', $e->getMessage());
}

echo "\n========================================\n";
echo "Test Summary: $passCount Passed, $failCount Failed.\n";
if ($failCount === 0) {
    echo "✓ All Phase 2 Security & Organizational Scope Tests PASSED.\n";
} else {
    echo "✗ Some tests failed. Please review.\n";
}
