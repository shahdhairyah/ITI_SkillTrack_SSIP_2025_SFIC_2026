<?php

namespace App\Services;

use PDO;

class UserService
{
    public const MANAGEABLE_ROLES = ['administrator', 'monitoring_officer'];

    public const ROLE_LABELS = [
        'administrator' => 'Institute Administrator',
        'instructor' => 'Vocational Instructor',
        'student' => 'Enrolled Trainee',
        'monitoring_officer' => 'Monitoring Officer',
    ];

    public static function getRoles(): array
    {
        $pdo = Database::getConnection();
        return $pdo->query('SELECT id, `key`, label, description FROM roles ORDER BY id ASC')->fetchAll();
    }

    public static function getUsers(array $filters = []): array
    {
        $pdo = Database::getConnection();
        $sql = '
            SELECT u.id, u.institute_id, u.email, u.username, u.role, u.status, u.created_at, u.updated_at,
                   i.name as institute_name, i.code as institute_code,
                   s.id as student_id, s.admission_no, s.name as student_name, s.status as student_status,
                   ins.id as instructor_id, ins.employee_code, ins.name as instructor_name, ins.status as instructor_status
            FROM users u
            JOIN institutes i ON u.institute_id = i.id
            LEFT JOIN students s ON s.user_id = u.id
            LEFT JOIN instructors ins ON ins.user_id = u.id
            WHERE 1=1
        ';
        $params = [];

        if (!empty($filters['role'])) {
            $sql .= ' AND u.role = ?';
            $params[] = $filters['role'];
        }

        if (!empty($filters['status'])) {
            $sql .= ' AND u.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= ' AND (u.email LIKE ? OR u.username LIKE ? OR s.name LIKE ? OR ins.name LIKE ?)';
            $term = '%' . trim($filters['search']) . '%';
            array_push($params, $term, $term, $term, $term);
        }

        $sql .= ' ORDER BY u.id ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();

        foreach ($users as &$user) {
            $user['role_label'] = self::ROLE_LABELS[$user['role']] ?? ucfirst($user['role']);

            $scopeStmt = $pdo->prepare('
                SELECT ur.id, ur.scope_type, ur.scope_id, r.`key` as role_key, r.label as role_label
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = :uid
            ');
            $scopeStmt->execute(['uid' => $user['id']]);
            $user['role_assignments'] = $scopeStmt->fetchAll();
        }

        return $users;
    }

    public static function getUserById(int $id): ?array
    {
        $users = self::getUsers();
        foreach ($users as $user) {
            if ((int)$user['id'] === $id) {
                return $user;
            }
        }
        return null;
    }

    public static function createUser(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();

        $instituteId = (int)($data['institute_id'] ?? 1);
        $email = strtolower(trim($data['email'] ?? ''));
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? '';
        $status = $data['status'] ?? 'active';

        if (!in_array($role, self::MANAGEABLE_ROLES, true)) {
            throw new \InvalidArgumentException(
                'Only administrator and monitoring officer accounts can be created here. Use student or instructor setup for training accounts.',
                422
            );
        }

        if ($email === '' || $username === '' || $password === '') {
            throw new \InvalidArgumentException('Email, username and password are required.');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Please provide a valid email address.');
        }

        if (strlen($password) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters long.');
        }

        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new \InvalidArgumentException('Invalid account status.');
        }

        $check = $pdo->prepare('
            SELECT id FROM users WHERE institute_id = :inst AND (email = :email OR username = :username) LIMIT 1
        ');
        $check->execute(['inst' => $instituteId, 'email' => $email, 'username' => $username]);
        if ($check->fetch()) {
            throw new \InvalidArgumentException('A user with the same email or username already exists.', 409);
        }

        $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE `key` = :key LIMIT 1');
        $roleStmt->execute(['key' => $role]);
        $roleRow = $roleStmt->fetch();
        if (!$roleRow) {
            throw new \InvalidArgumentException('Selected role is not configured.', 422);
        }

        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare('
                INSERT INTO users (institute_id, email, username, password_hash, role, status)
                VALUES (:inst, :email, :username, :hash, :role, :status)
            ');
            $stmt->execute([
                'inst' => $instituteId,
                'email' => $email,
                'username' => $username,
                'hash' => password_hash($password, PASSWORD_BCRYPT),
                'role' => $role,
                'status' => $status,
            ]);
            $userId = (int)$pdo->lastInsertId();

            $pdo->prepare('
                INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
                VALUES (:uid, :rid, "institute", :inst)
            ')->execute(['uid' => $userId, 'rid' => (int)$roleRow['id'], 'inst' => $instituteId]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        AuthService::logAudit($actorUserId, 'USER_CREATE', 'users', $userId, [
            'email' => $email,
            'username' => $username,
            'role' => $role,
        ]);

        return self::getUserById($userId);
    }

    public static function updateRole(int $id, string $role, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getUserById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("User #{$id} not found.", 404);
        }

        if (!in_array($role, self::MANAGEABLE_ROLES, true)) {
            throw new \InvalidArgumentException(
                'Only administrator and monitoring officer roles can be reassigned here. Student and instructor profiles own their role lifecycle.',
                422
            );
        }

        if (!in_array($existing['role'], self::MANAGEABLE_ROLES, true)) {
            throw new \InvalidArgumentException('This account role is managed by its student or instructor profile.', 422);
        }

        if ($actorUserId === $id && $role !== 'administrator') {
            throw new \InvalidArgumentException('You cannot remove your own administrator role.', 400);
        }

        if ($existing['role'] === 'administrator' && $role !== 'administrator') {
            $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'administrator' AND status = 'active'")->fetchColumn();
            if ($adminCount <= 1) {
                throw new \InvalidArgumentException('At least one active administrator must remain.', 400);
            }
        }

        $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE `key` = :key LIMIT 1');
        $roleStmt->execute(['key' => $role]);
        $roleRow = $roleStmt->fetch();
        if (!$roleRow) {
            throw new \InvalidArgumentException('Selected role is not configured.', 422);
        }

        $pdo->beginTransaction();

        try {
            $pdo->prepare('UPDATE users SET role = :role WHERE id = :id')
                ->execute(['role' => $role, 'id' => $id]);

            $pdo->prepare('DELETE FROM user_roles WHERE user_id = :uid')
                ->execute(['uid' => $id]);

            $pdo->prepare('
                INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
                VALUES (:uid, :rid, "institute", :inst)
            ')->execute([
                'uid' => $id,
                'rid' => (int)$roleRow['id'],
                'inst' => (int)$existing['institute_id'],
            ]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        AuthService::logAudit($actorUserId, 'USER_ROLE_UPDATE', 'users', $id, ['role' => $role], ['role' => $existing['role']]);

        return self::getUserById($id);
    }

    public static function resetPassword(int $id, string $password, ?int $actorUserId = null): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        if (!$stmt->fetch()) {
            throw new \InvalidArgumentException("User #{$id} not found.", 404);
        }

        if (strlen($password) < 8) {
            throw new \InvalidArgumentException('Password must be at least 8 characters long.');
        }

        $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id')
            ->execute(['hash' => password_hash($password, PASSWORD_BCRYPT), 'id' => $id]);

        AuthService::logAudit($actorUserId, 'USER_PASSWORD_RESET', 'users', $id, []);
    }
}
