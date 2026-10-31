<?php

// Front Controller - ITI SkillTrack REST API

declare(strict_types=1);

// PSR-4 style autoloader
spl_autoload_register(function (string $class) {
    $prefix = 'App\\';
    $baseDir = file_exists(__DIR__ . '/src/') ? (__DIR__ . '/src/') : (__DIR__ . '/../src/');
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Load .env
$GLOBALS['ENV_FILE_LOADED'] = false;
$envFile = file_exists(__DIR__ . '/.env') ? (__DIR__ . '/.env') : (__DIR__ . '/../.env');
if (file_exists($envFile)) {
    $GLOBALS['ENV_FILE_LOADED'] = true;
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        [$name, $value] = explode('=', $line, 2) + ['', ''];
        $name = trim($name);
        $value = trim($value);
        if ($name !== '') {
            putenv("$name=$value");
            $_ENV[$name] = $value;
        }
    }
}

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Asia/Kolkata');

// Global Exception & Error Handler
set_exception_handler(function (\Throwable $e) {
    if (class_exists(\App\Middleware\CorsMiddleware::class)) {
        try {
            (new \App\Middleware\CorsMiddleware())->handle();
        } catch (\Throwable $ignored) {}
    }
    $isDebug = getenv('APP_DEBUG') === 'true';
    $details = $isDebug ? [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ] : [];

    \App\Support\Response::error(
        $e->getMessage() ?: 'An unexpected server error occurred',
        'SERVER_ERROR',
        $details,
        500
    );
});

// Initialize Router and Middleware
$router = new \App\Support\Router();
$router->use(\App\Middleware\RequestIdMiddleware::class);
$router->use(\App\Middleware\CorsMiddleware::class);

$authMw = [\App\Middleware\AuthMiddleware::class];
$authCsrfMw = [\App\Middleware\AuthMiddleware::class, \App\Middleware\CsrfMiddleware::class];
$adminMw = [\App\Middleware\AuthMiddleware::class, \App\Middleware\CsrfMiddleware::class, \App\Middleware\RoleMiddleware::requireAdmin()];
$staffMw = [\App\Middleware\AuthMiddleware::class, \App\Middleware\CsrfMiddleware::class, \App\Middleware\RoleMiddleware::requireStaff()];

// Root informational endpoint
$router->get('/', function () {
    \App\Support\Response::success([
        'name' => 'ITI SkillTrack API',
        'version' => '3.0.0',
        'phase' => 'Phase 3 - Training Sessions & Attendance Tracking',
        'status' => 'operational',
        'documentation' => 'docs/',
        'active_database' => \App\Services\Database::getActiveDriver(),
        'endpoints' => [
            'GET /api/v1/health' => 'System & Database Health Check',
            'POST /api/v1/auth/login' => 'User Authentication with Session/Token',
            'POST /api/v1/auth/logout' => 'Session Invalidation',
            'GET /api/v1/auth/me' => 'Current User Profile, Role & Allowed Scope',
            'GET /api/v1/institute' => 'Current Institute Profile',
            'GET /api/v1/departments' => 'Departments Directory',
            'GET /api/v1/trades' => 'Institute Trades Catalog',
            'GET /api/v1/academic-periods' => 'Academic Periods',
            'GET /api/v1/batches' => 'Batches List with Dynamic Scoping',
            'GET /api/v1/students' => 'Student Trainees Directory',
            'GET /api/v1/instructors' => 'Vocational Instructors Directory',
            'GET /api/v1/users' => 'User Accounts and Role Assignments (Administrator)',
            'GET /api/v1/sessions' => 'Training Sessions with Dynamic Scoping',
            'GET /api/v1/sessions/{id}/attendance' => 'Authoritative Attendance Register',
            'GET /api/v1/students/{id}/attendance' => 'Student Attendance Summary and History',
            'GET /api/v1/attendance/report' => 'Authorized Attendance Report',
            'GET /api/v1/attendance/report/export' => 'Sanitized Attendance CSV Export'
        ]
    ]);
});

// Health check endpoint
$router->get('/api/v1/health', [\App\Controllers\HealthController::class, 'check']);

// Public config baseline
$router->get('/api/v1/config', function () {
    \App\Support\Response::success([
        'institute_name' => 'Model Industrial Training Institute',
        'institute_code' => 'ITI-MODEL-01',
        'pilot_trade' => 'Electrician (ELE-01)',
        'pilot_batch' => 'EL-2026-A',
        'academic_period' => '2026-2027 Academic Session',
        'attendance_threshold_percentage' => 80.0,
        'competency_rule' => 'All safety criteria >= 4/5 AND overall weighted score >= 75%'
    ]);
});

// ==========================================
// AUTHENTICATION ROUTES (AUTH-01 to AUTH-05)
// ==========================================
$router->post('/api/v1/auth/login', [\App\Controllers\AuthController::class, 'login']);
$router->post('/api/v1/auth/logout', [\App\Controllers\AuthController::class, 'logout'], $authMw);
$router->get('/api/v1/auth/me', [\App\Controllers\AuthController::class, 'me'], $authMw);
$router->get('/api/v1/auth/csrf', [\App\Controllers\AuthController::class, 'csrf']);

// ==========================================
// INSTITUTE, DEPARTMENTS, TRADES (ORG-01, ORG-04)
// ==========================================
$router->get('/api/v1/institute', [\App\Controllers\InstituteController::class, 'show'], $authMw);
$router->put('/api/v1/institute', [\App\Controllers\InstituteController::class, 'update'], $adminMw);

$router->get('/api/v1/departments', [\App\Controllers\DepartmentController::class, 'index'], $authMw);
$router->post('/api/v1/departments', [\App\Controllers\DepartmentController::class, 'store'], $adminMw);
$router->put('/api/v1/departments/{id}', [\App\Controllers\DepartmentController::class, 'update'], $adminMw);

$router->get('/api/v1/trades', [\App\Controllers\TradeController::class, 'index'], $authMw);
$router->get('/api/v1/trades/{id}', [\App\Controllers\TradeController::class, 'show'], $authMw);
$router->post('/api/v1/trades', [\App\Controllers\TradeController::class, 'store'], $adminMw);
$router->put('/api/v1/trades/{id}', [\App\Controllers\TradeController::class, 'update'], $adminMw);
$router->patch('/api/v1/trades/{id}/status', [\App\Controllers\TradeController::class, 'toggleStatus'], $adminMw);

// ==========================================
// ACADEMIC PERIODS ROUTES (ORG-02, ORG-04)
// ==========================================
$router->get('/api/v1/academic-periods', [\App\Controllers\AcademicPeriodController::class, 'index'], $authMw);
$router->post('/api/v1/academic-periods', [\App\Controllers\AcademicPeriodController::class, 'store'], $adminMw);
$router->put('/api/v1/academic-periods/{id}', [\App\Controllers\AcademicPeriodController::class, 'update'], $adminMw);

// ==========================================
// BATCHES ROUTES (ORG-02, ORG-04, ORG-08)
// ==========================================
$router->get('/api/v1/batches', [\App\Controllers\BatchController::class, 'index'], $authMw);
$router->get('/api/v1/batches/{id}', [\App\Controllers\BatchController::class, 'show'], $authMw);
$router->post('/api/v1/batches', [\App\Controllers\BatchController::class, 'store'], $adminMw);
$router->put('/api/v1/batches/{id}', [\App\Controllers\BatchController::class, 'update'], $adminMw);

// ==========================================
// STUDENTS & ENROLLMENT (ORG-03, ORG-05, ORG-08, AUTH-06)
// ==========================================
$router->get('/api/v1/students', [\App\Controllers\StudentController::class, 'index'], $authMw);
$router->get('/api/v1/students/{id}', [\App\Controllers\StudentController::class, 'show'], $authMw);
$router->post('/api/v1/students', [\App\Controllers\StudentController::class, 'store'], $adminMw);
$router->put('/api/v1/students/{id}', [\App\Controllers\StudentController::class, 'update'], $adminMw);
$router->patch('/api/v1/students/{id}/status', [\App\Controllers\StudentController::class, 'toggleStatus'], $adminMw);
$router->post('/api/v1/enrollments', [\App\Controllers\StudentController::class, 'enroll'], $adminMw);

// ==========================================
// INSTRUCTORS & ASSIGNMENTS (ORG-03, ORG-06, ORG-08, AUTH-06)
// ==========================================
$router->get('/api/v1/instructors', [\App\Controllers\InstructorController::class, 'index'], $authMw);
$router->get('/api/v1/instructors/{id}', [\App\Controllers\InstructorController::class, 'show'], $authMw);
$router->post('/api/v1/instructors', [\App\Controllers\InstructorController::class, 'store'], $adminMw);
$router->put('/api/v1/instructors/{id}', [\App\Controllers\InstructorController::class, 'update'], $adminMw);
$router->patch('/api/v1/instructors/{id}/status', [\App\Controllers\InstructorController::class, 'toggleStatus'], $adminMw);
$router->post('/api/v1/instructor-assignments', [\App\Controllers\InstructorController::class, 'assignBatch'], $adminMw);
$router->delete('/api/v1/instructor-assignments/{id}', [\App\Controllers\InstructorController::class, 'removeAssignment'], $adminMw);

// ==========================================
// USER ACCOUNTS, ROLES & RECOVERY (AUTH-01, ORG-07)
// ==========================================
$router->get('/api/v1/users', [\App\Controllers\UserController::class, 'index'], $adminMw);
$router->get('/api/v1/users/{id}', [\App\Controllers\UserController::class, 'show'], $adminMw);
$router->post('/api/v1/users', [\App\Controllers\UserController::class, 'store'], $adminMw);
$router->patch('/api/v1/users/{id}/role', [\App\Controllers\UserController::class, 'updateRole'], $adminMw);
$router->patch('/api/v1/users/{id}/status', [\App\Controllers\UserController::class, 'toggleStatus'], $adminMw);
$router->post('/api/v1/users/{id}/reset-password', [\App\Controllers\UserController::class, 'resetPassword'], $adminMw);
$router->get('/api/v1/roles', function () {
    \App\Support\Response::success(\App\Services\UserService::getRoles());
}, $adminMw);

// ==========================================
// TRAINING SESSIONS & ATTENDANCE (ATT-01 to ATT-12)
// ==========================================
$router->get('/api/v1/attendance/config', [\App\Controllers\AttendanceController::class, 'config'], $authMw);
$router->get('/api/v1/attendance/report', [\App\Controllers\AttendanceController::class, 'report'], $authMw);
$router->get('/api/v1/attendance/report/export', [\App\Controllers\AttendanceController::class, 'exportReport'], $authMw);
$router->patch('/api/v1/attendance/statuses/{id}', [\App\Controllers\AttendanceController::class, 'updateStatus'], $adminMw);
$router->patch('/api/v1/attendance/records/{id}', [\App\Controllers\AttendanceController::class, 'correct'], $staffMw);

$router->get('/api/v1/sessions', [\App\Controllers\AttendanceController::class, 'sessions'], $authMw);
$router->post('/api/v1/sessions', [\App\Controllers\AttendanceController::class, 'createSession'], $staffMw);
$router->get('/api/v1/sessions/{id}', [\App\Controllers\AttendanceController::class, 'showSession'], $authMw);
$router->put('/api/v1/sessions/{id}', [\App\Controllers\AttendanceController::class, 'updateSession'], $staffMw);
$router->patch('/api/v1/sessions/{id}/cancel', [\App\Controllers\AttendanceController::class, 'cancelSession'], $staffMw);
$router->get('/api/v1/sessions/{id}/roster', [\App\Controllers\AttendanceController::class, 'roster'], $authMw);
$router->get('/api/v1/sessions/{id}/attendance', [\App\Controllers\AttendanceController::class, 'register'], $authMw);
$router->put('/api/v1/sessions/{id}/attendance', [\App\Controllers\AttendanceController::class, 'saveDraft'], $staffMw);
$router->post('/api/v1/sessions/{id}/attendance/submit', [\App\Controllers\AttendanceController::class, 'submit'], $staffMw);

$router->get('/api/v1/students/{id}/attendance', [\App\Controllers\AttendanceController::class, 'studentAttendance'], $authMw);

// Dispatch request
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$router->dispatch($method, $uri);
