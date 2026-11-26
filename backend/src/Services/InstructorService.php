<?php

namespace App\Services;

use App\Services\Database;
use App\Services\AuthService;
use PDO;

class InstructorService
{
    public static function getInstructors(array $filters = [], ?array $currentUser = null): array
    {
        $pdo = Database::getConnection();

        $sql = '
            SELECT i.id, i.user_id, i.employee_code, i.name, i.qualification, i.status, i.created_at,
                   u.email, u.username, u.status as user_status,
                   (SELECT COUNT(*) FROM instructor_assignments ia WHERE ia.instructor_id = i.id AND ia.ends_on IS NULL) as assigned_batch_count
            FROM instructors i
            JOIN users u ON i.user_id = u.id
            WHERE 1=1
        ';
        $params = [];

        if ($currentUser && $currentUser['role'] === 'student') {
            $batchIds = $currentUser['scope']['batches'] ?? [];
            if (empty($batchIds)) {
                return [];
            }
            $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
            $sql .= " AND i.id IN (
                SELECT ia.instructor_id FROM instructor_assignments ia
                WHERE ia.ends_on IS NULL AND ia.batch_id IN ($placeholders)
            )";
            $params = array_values($batchIds);
        } elseif ($currentUser && $currentUser['role'] === 'instructor') {
            $sql .= ' AND i.user_id = ?';
            $params[] = (int)$currentUser['id'];
        }

        if (!empty($filters['status'])) {
            $sql .= ' AND i.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= ' AND (i.name LIKE ? OR i.employee_code LIKE ? OR u.email LIKE ?)';
            $term = '%' . trim($filters['search']) . '%';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= ' ORDER BY i.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $instructors = $stmt->fetchAll();

        // Attach assigned batches summary
        foreach ($instructors as &$inst) {
            $bStmt = $pdo->prepare('
                SELECT ia.id as assignment_id, ia.batch_id, ia.starts_on, ia.ends_on,
                       b.name as batch_name, b.section as batch_section, b.shift as batch_shift,
                       t.name as trade_name, t.code as trade_code
                FROM instructor_assignments ia
                JOIN batches b ON ia.batch_id = b.id
                JOIN trades t ON b.trade_id = t.id
                WHERE ia.instructor_id = :iid
                ORDER BY ia.starts_on DESC
            ');
            $bStmt->execute(['iid' => $inst['id']]);
            $inst['assigned_batches'] = $bStmt->fetchAll();
            $inst['active_assignments'] = array_values(array_filter(
                $inst['assigned_batches'],
                static fn (array $row): bool => empty($row['ends_on'])
            ));
        }

        return $instructors;
    }

    public static function getInstructorById(int $id, ?array $currentUser = null): ?array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('
            SELECT i.id, i.user_id, i.employee_code, i.name, i.qualification, i.status, i.created_at,
                   u.email, u.username, u.status as user_status
            FROM instructors i
            JOIN users u ON i.user_id = u.id
            WHERE i.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $instructor = $stmt->fetch();

        if (!$instructor) {
            return null;
        }

        if ($currentUser) {
            if ($currentUser['role'] === 'instructor' && (int)$instructor['user_id'] !== (int)$currentUser['id']) {
                throw new \DomainException('Forbidden: You can only view your own instructor profile.', 403);
            }

            if ($currentUser['role'] === 'student') {
                $batchIds = $currentUser['scope']['batches'] ?? [];
                $allowed = false;
                if (!empty($batchIds)) {
                    $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
                    $check = $pdo->prepare("
                        SELECT 1 FROM instructor_assignments
                        WHERE instructor_id = ? AND ends_on IS NULL AND batch_id IN ($placeholders)
                        LIMIT 1
                    ");
                    $check->execute(array_merge([$id], array_values($batchIds)));
                    $allowed = (bool)$check->fetchColumn();
                }
                if (!$allowed) {
                    throw new \DomainException('Forbidden: Instructor is not assigned to your batch.', 403);
                }
            }
        }

        $bStmt = $pdo->prepare('
            SELECT ia.id as assignment_id, ia.batch_id, ia.starts_on, ia.ends_on,
                   b.name as batch_name, b.section as batch_section, b.shift as batch_shift,
                   t.name as trade_name, t.code as trade_code
            FROM instructor_assignments ia
            JOIN batches b ON ia.batch_id = b.id
            JOIN trades t ON b.trade_id = t.id
            WHERE ia.instructor_id = :iid
            ORDER BY ia.starts_on DESC
        ');
        $bStmt->execute(['iid' => $id]);
        $instructor['assigned_batches'] = $bStmt->fetchAll();
        $instructor['active_assignments'] = array_values(array_filter(
            $instructor['assigned_batches'],
            static fn (array $row): bool => empty($row['ends_on'])
        ));

        return $instructor;
    }

    public static function createInstructor(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();

        $instituteId = (int)($data['institute_id'] ?? 1);
        $empCode = trim($data['employee_code'] ?? '');
        $name = trim($data['name'] ?? '');
        $qualification = trim($data['qualification'] ?? '');
        $email = trim($data['email'] ?? strtolower(str_replace(' ', '.', $name)) . '@itiskilltrack.org');
        $username = trim($data['username'] ?? strtolower($empCode));
        $password = $data['password'] ?? 'Password@123';
        $batchId = !empty($data['batch_id']) ? (int)$data['batch_id'] : null;

        if (empty($empCode) || empty($name)) {
            throw new \InvalidArgumentException('Employee code and instructor name are required.');
        }

        // Check unique employee code
        $chk = $pdo->prepare('SELECT id FROM instructors WHERE institute_id = :inst AND employee_code = :code');
        $chk->execute(['inst' => $instituteId, 'code' => $empCode]);
        if ($chk->fetch()) {
            throw new \InvalidArgumentException("Instructor with code '{$empCode}' already exists.", 409);
        }

        $pdo->beginTransaction();

        try {
            // 1. Create user
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $userStmt = $pdo->prepare('
                INSERT INTO users (institute_id, email, username, password_hash, role, status)
                VALUES (:inst, :email, :username, :hash, "instructor", "active")
            ');
            $userStmt->execute([
                'inst' => $instituteId,
                'email' => $email,
                'username' => $username,
                'hash' => $hash
            ]);
            $userId = (int)$pdo->lastInsertId();

            // 2. User role
            $roleStmt = $pdo->prepare('
                INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
                VALUES (:uid, 2, "institute", :inst)
            ');
            $roleStmt->execute(['uid' => $userId, 'inst' => $instituteId]);

            // 3. Create instructor profile
            $instStmt = $pdo->prepare('
                INSERT INTO instructors (user_id, institute_id, employee_code, name, qualification, status)
                VALUES (:uid, :inst, :code, :name, :qual, "active")
            ');
            $instStmt->execute([
                'uid' => $userId,
                'inst' => $instituteId,
                'code' => $empCode,
                'name' => $name,
                'qual' => $qualification
            ]);
            $instructorId = (int)$pdo->lastInsertId();

            // 4. Optional batch assignment
            if ($batchId) {
                $assignStmt = $pdo->prepare('
                    INSERT INTO instructor_assignments (instructor_id, batch_id, starts_on)
                    VALUES (:iid, :bid, :start)
                ');
                $assignStmt->execute([
                    'iid' => $instructorId,
                    'bid' => $batchId,
                    'start' => date('Y-m-d')
                ]);
            }

            $pdo->commit();

            AuthService::logAudit($actorUserId, 'INSTRUCTOR_CREATE', 'instructors', $instructorId, [
                'employee_code' => $empCode,
                'name' => $name,
                'batch_id' => $batchId
            ]);

            return self::getInstructorById($instructorId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function updateInstructor(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getInstructorById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Instructor #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);
        $qual = trim($data['qualification'] ?? $existing['qualification']);

        $stmt = $pdo->prepare('UPDATE instructors SET name = :name, qualification = :qual WHERE id = :id');
        $stmt->execute(['name' => $name, 'qual' => $qual, 'id' => $id]);

        AuthService::logAudit($actorUserId, 'INSTRUCTOR_UPDATE', 'instructors', $id, $data, $existing);
        return self::getInstructorById($id);
    }

    public static function toggleStatus(int $id, string $status, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getInstructorById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Instructor #{$id} not found.", 404);
        }

        $newStatus = ($status === 'active') ? 'active' : 'inactive';

        $stmt = $pdo->prepare('UPDATE instructors SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $newStatus, 'id' => $id]);

        $userStmt = $pdo->prepare('UPDATE users SET status = :status WHERE id = :uid');
        $userStmt->execute(['status' => $newStatus, 'uid' => $existing['user_id']]);

        AuthService::logAudit($actorUserId, 'INSTRUCTOR_STATUS_TOGGLE', 'instructors', $id, ['status' => $newStatus]);
        return self::getInstructorById($id);
    }

    public static function assignBatch(int $instructorId, int $batchId, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();

        $instructor = self::getInstructorById($instructorId);
        if (!$instructor) {
            throw new \InvalidArgumentException("Instructor #{$instructorId} not found.", 404);
        }

        $batchStmt = $pdo->prepare('SELECT id FROM batches WHERE id = :id LIMIT 1');
        $batchStmt->execute(['id' => $batchId]);
        if (!$batchStmt->fetch()) {
            throw new \InvalidArgumentException("Batch #{$batchId} not found.", 404);
        }

        $chk = $pdo->prepare('SELECT id, ends_on FROM instructor_assignments WHERE instructor_id = :iid AND batch_id = :bid');
        $chk->execute(['iid' => $instructorId, 'bid' => $batchId]);
        $existing = $chk->fetch();

        if ($existing && empty($existing['ends_on'])) {
            throw new \InvalidArgumentException('Instructor is already assigned to this batch.', 409);
        }

        if ($existing) {
            $stmt = $pdo->prepare('
                UPDATE instructor_assignments
                SET starts_on = :start, ends_on = NULL
                WHERE id = :id
            ');
            $stmt->execute(['start' => date('Y-m-d'), 'id' => $existing['id']]);
            $assignmentId = (int)$existing['id'];
        } else {
            $stmt = $pdo->prepare('
                INSERT INTO instructor_assignments (instructor_id, batch_id, starts_on)
                VALUES (:iid, :bid, :start)
            ');
            $stmt->execute([
                'iid' => $instructorId,
                'bid' => $batchId,
                'start' => date('Y-m-d')
            ]);
            $assignmentId = (int)$pdo->lastInsertId();
        }

        AuthService::logAudit($actorUserId, 'INSTRUCTOR_BATCH_ASSIGN', 'instructor_assignments', $assignmentId, [
            'instructor_id' => $instructorId,
            'batch_id' => $batchId
        ]);

        return self::getInstructorById($instructorId);
    }

    public static function removeBatchAssignment(int $assignmentId, ?int $actorUserId = null): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM instructor_assignments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $assignmentId]);
        $existing = $stmt->fetch();

        if (!$existing) {
            throw new \InvalidArgumentException("Assignment #{$assignmentId} not found.", 404);
        }

        if (!empty($existing['ends_on'])) {
            throw new \InvalidArgumentException('Assignment is already ended.', 409);
        }

        $stmt = $pdo->prepare('UPDATE instructor_assignments SET ends_on = :ends WHERE id = :id');
        $stmt->execute(['ends' => date('Y-m-d'), 'id' => $assignmentId]);

        AuthService::logAudit($actorUserId, 'INSTRUCTOR_BATCH_UNASSIGN', 'instructor_assignments', $assignmentId, [
            'instructor_id' => $existing['instructor_id'],
            'batch_id' => $existing['batch_id'],
            'ends_on' => date('Y-m-d')
        ]);
    }
}
