<?php

namespace App\Services;

use App\Services\Database;
use PDO;

class AuthService
{
    /**
     * Capability map returned to the SPA. The API still authorizes every request;
     * these flags only control navigation and visible actions.
     */
    public const ROLE_CAPABILITIES = [
        'administrator' => [
            'manage_organization' => true,
            'manage_users' => true,
            'manage_students' => true,
            'manage_instructors' => true,
            'view_all_data' => true,
            'read_only' => false,
        ],
        'instructor' => [
            'manage_organization' => false,
            'manage_users' => false,
            'manage_students' => false,
            'manage_instructors' => false,
            'view_all_data' => false,
            'read_only' => false,
        ],
        'student' => [
            'manage_organization' => false,
            'manage_users' => false,
            'manage_students' => false,
            'manage_instructors' => false,
            'view_all_data' => false,
            'read_only' => true,
        ],
        'monitoring_officer' => [
            'manage_organization' => false,
            'manage_users' => false,
            'manage_students' => false,
            'manage_instructors' => false,
            'view_all_data' => true,
            'read_only' => true,
        ],
    ];

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            if (!headers_sent()) {
                // Check for Bearer token or X-Session-ID header
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
                $customSessionId = null;

                if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
                    $customSessionId = $matches[1];
                } elseif (!empty($_SERVER['HTTP_X_SESSION_ID'])) {
                    $customSessionId = $_SERVER['HTTP_X_SESSION_ID'];
                }

                $sessionName = getenv('SESSION_NAME') ?: 'iti_skilltrack_session';
                session_name($sessionName);

                $isSecure = getenv('SESSION_SECURE_COOKIE') === 'true';
                $sameSite = getenv('SESSION_SAMESITE') ?: 'Lax';

                session_set_cookie_params([
                    'lifetime' => 86400, // 24 hours
                    'path' => '/',
                    'domain' => '',
                    'secure' => $isSecure,
                    'httponly' => true,
                    'samesite' => $sameSite
                ]);

                if ($customSessionId && preg_match('/^[a-zA-Z0-9,-]{16,128}$/', $customSessionId)) {
                    session_id($customSessionId);
                }
            }

            if (session_status() === PHP_SESSION_NONE) {
                @session_start();
            }

            if (empty($_SESSION['session_token'])) {
                $_SESSION['session_token'] = session_id() ?: bin2hex(random_bytes(24));
            }

            if (empty($_SESSION['csrf_token'])) {
                $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            }
        }
    }

    public static function login(string $identity, string $password): array
    {
        self::startSession();

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT u.*, i.name as institute_name, i.code as institute_code
            FROM users u
            JOIN institutes i ON u.institute_id = i.id
            WHERE (u.email = :id_email OR u.username = :id_user)
            LIMIT 1
        ');
        $stmt->execute(['id_email' => $identity, 'id_user' => $identity]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new \InvalidArgumentException('Invalid email/username or password.', 401);
        }

        if ($user['status'] !== 'active') {
            throw new \DomainException('Account is disabled or inactive. Contact institute administrator.', 403);
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new \InvalidArgumentException('Invalid email/username or password.', 401);
        }

        // Regenerate session ID to prevent session fixation
        if (!headers_sent()) {
            @session_regenerate_id(true);
        }
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['logged_at'] = time();

        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        // Record audit log
        self::logAudit((int)$user['id'], 'AUTH_LOGIN', 'users', (int)$user['id'], [
            'username' => $user['username'],
            'role' => $user['role'],
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        return self::getCurrentUserPayload((int)$user['id']);
    }

    public static function logout(): void
    {
        self::startSession();

        if (!empty($_SESSION['user_id'])) {
            self::logAudit((int)$_SESSION['user_id'], 'AUTH_LOGOUT', 'users', (int)$_SESSION['user_id'], []);
        }

        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
    }

    public static function getAuthenticatedUser(): ?array
    {
        self::startSession();

        if (empty($_SESSION['user_id'])) {
            return null;
        }

        return self::getCurrentUserPayload((int)$_SESSION['user_id']);
    }

    public static function getCurrentUserPayload(int $userId): array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('
            SELECT u.id, u.institute_id, u.email, u.username, u.role, u.status, u.created_at,
                   i.name as institute_name, i.code as institute_code
            FROM users u
            JOIN institutes i ON u.institute_id = i.id
            WHERE u.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            return [];
        }

        $role = $user['role'];
        $profile = null;
        $scopes = [
            'institute_id' => (int)$user['institute_id'],
            'role' => $role,
            'batches' => [],
            'trades' => []
        ];

        if ($role === 'student') {
            $studentStmt = $pdo->prepare('
                SELECT s.id as student_id, s.admission_no, s.name, s.gender, s.category, s.phone, s.status as student_status,
                       e.batch_id, e.status as enrollment_status,
                       b.name as batch_name, b.section as batch_section, b.shift as batch_shift,
                       t.id as trade_id, t.name as trade_name, t.code as trade_code
                FROM students s
                LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = "active"
                LEFT JOIN batches b ON b.id = e.batch_id
                LEFT JOIN trades t ON t.id = b.trade_id
                WHERE s.user_id = :uid
                LIMIT 1
            ');
            $studentStmt->execute(['uid' => $userId]);
            $profile = $studentStmt->fetch();

            if ($profile && !empty($profile['batch_id'])) {
                $scopes['batches'][] = (int)$profile['batch_id'];
                $scopes['trades'][] = (int)$profile['trade_id'];
            }
        } elseif ($role === 'instructor') {
            $instStmt = $pdo->prepare('
                SELECT i.id as instructor_id, i.employee_code, i.name, i.qualification, i.status as instructor_status
                FROM instructors i
                WHERE i.user_id = :uid
                LIMIT 1
            ');
            $instStmt->execute(['uid' => $userId]);
            $profile = $instStmt->fetch();

            if ($profile) {
                $assignStmt = $pdo->prepare('
                    SELECT ia.batch_id, b.name as batch_name, b.trade_id, t.name as trade_name
                    FROM instructor_assignments ia
                    JOIN batches b ON b.id = ia.batch_id
                    JOIN trades t ON t.id = b.trade_id
                    WHERE ia.instructor_id = :iid AND ia.ends_on IS NULL
                ');
                $assignStmt->execute(['iid' => $profile['instructor_id']]);
                $assignments = $assignStmt->fetchAll();

                $assignedBatches = [];
                foreach ($assignments as $row) {
                    $assignedBatches[] = (int)$row['batch_id'];
                    $scopes['trades'][] = (int)$row['trade_id'];
                }
                $scopes['batches'] = array_values(array_unique($assignedBatches));
                $scopes['trades'] = array_values(array_unique($scopes['trades']));
                $profile['assigned_batches'] = $assignments;
            }
        } elseif ($role === 'administrator' || $role === 'monitoring_officer') {
            $scopes['is_all_institute'] = true;
        }

        $roleLabels = [
            'administrator' => 'Institute Administrator',
            'instructor' => 'Vocational Instructor',
            'student' => 'Enrolled Trainee',
            'monitoring_officer' => 'Monitoring Officer',
        ];

        return [
            'id' => (int)$user['id'],
            'institute_id' => (int)$user['institute_id'],
            'institute_name' => $user['institute_name'],
            'institute_code' => $user['institute_code'],
            'email' => $user['email'],
            'username' => $user['username'],
            'role' => $user['role'],
            'role_label' => $roleLabels[$role] ?? ucfirst(str_replace('_', ' ', $role)),
            'capabilities' => self::ROLE_CAPABILITIES[$role] ?? self::ROLE_CAPABILITIES['student'],
            'status' => $user['status'],
            'profile' => $profile,
            'scope' => $scopes,
            'session_id' => session_id() ?: ($_SESSION['session_token'] ?? ''),
            'csrf_token' => $_SESSION['csrf_token'] ?? ''
        ];
    }

    public static function verifyCsrf(?string $token): bool
    {
        self::startSession();

        // If authenticated with Bearer or X-Session-ID header, CSRF header is checked if present
        if (!empty($_SESSION['csrf_token']) && $token) {
            return hash_equals($_SESSION['csrf_token'], $token);
        }

        // If no token in session yet, create one
        return false;
    }

    public static function logAudit(?int $actorUserId, string $action, string $entityType, int $entityId, array $afterData = [], array $beforeData = []): void
    {
        try {
            $pdo = Database::getConnection();
            $requestId = $GLOBALS['REQUEST_ID'] ?? uniqid('req_', true);

            $stmt = $pdo->prepare('
                INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, before_json, after_json)
                VALUES (:actor, :action, :etype, :eid, :req, :before, :after)
            ');
            $stmt->execute([
                'actor' => $actorUserId,
                'action' => $action,
                'etype' => $entityType,
                'eid' => $entityId,
                'req' => $requestId,
                'before' => !empty($beforeData) ? json_encode($beforeData) : null,
                'after' => !empty($afterData) ? json_encode($afterData) : null
            ]);
        } catch (\Throwable $e) {
            // Suppress audit log failures from breaking main transaction
            error_log("Failed to write audit log: " . $e->getMessage());
        }
    }
}
