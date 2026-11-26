<?php

namespace App\Services;

use App\Services\Database;
use App\Services\AuthService;
use PDO;

class StudentService
{
    public static function getStudents(array $filters = [], ?array $currentUser = null): array
    {
        $pdo = Database::getConnection();

        $sql = '
            SELECT s.id, s.user_id, s.institute_id, s.admission_no, s.name, s.gender, s.category, s.phone, s.status, s.created_at,
                   u.email, u.username, u.status as user_status,
                   e.batch_id, e.status as enrollment_status, e.starts_on as enrollment_start,
                   b.name as batch_name, b.section as batch_section, b.shift as batch_shift,
                   t.id as trade_id, t.name as trade_name, t.code as trade_code
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = "active"
            LEFT JOIN batches b ON b.id = e.batch_id
            LEFT JOIN trades t ON t.id = b.trade_id
            WHERE 1=1
        ';
        $params = [];

        // Enforce Server-Side Scopes
        if ($currentUser && $currentUser['role'] === 'student') {
            $studentId = $currentUser['profile']['student_id'] ?? 0;
            $sql .= ' AND s.id = ?';
            $params[] = $studentId;
        } elseif ($currentUser && $currentUser['role'] === 'instructor') {
            $assignedBatches = $currentUser['scope']['batches'] ?? [];
            if (empty($assignedBatches)) {
                return [];
            }
            $placeholders = implode(',', array_fill(0, count($assignedBatches), '?'));
            $sql .= " AND e.batch_id IN ($placeholders)";
            $params = array_values($assignedBatches);
        }

        if (!empty($filters['batch_id'])) {
            $sql .= ' AND e.batch_id = ?';
            $params[] = (int)$filters['batch_id'];
        }

        if (!empty($filters['status'])) {
            $sql .= ' AND s.status = ?';
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $sql .= ' AND (s.name LIKE ? OR s.admission_no LIKE ? OR u.email LIKE ?)';
            $term = '%' . trim($filters['search']) . '%';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $sql .= ' ORDER BY s.admission_no ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function getStudentById(int $id, ?array $currentUser = null): ?array
    {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('
            SELECT s.id, s.user_id, s.institute_id, s.admission_no, s.name, s.gender, s.category, s.phone, s.status, s.created_at,
                   u.email, u.username, u.status as user_status,
                   e.batch_id, e.status as enrollment_status, e.starts_on as enrollment_start,
                   b.name as batch_name, b.section as batch_section, b.shift as batch_shift,
                   t.id as trade_id, t.name as trade_name, t.code as trade_code
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN enrollments e ON e.student_id = s.id AND e.status = "active"
            LEFT JOIN batches b ON b.id = e.batch_id
            LEFT JOIN trades t ON t.id = b.trade_id
            WHERE s.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $student = $stmt->fetch();

        if (!$student) {
            return null;
        }

        // Scope verification (IDOR protection)
        if ($currentUser) {
            if ($currentUser['role'] === 'student') {
                $myStudentId = (int)($currentUser['profile']['student_id'] ?? 0);
                if ($myStudentId !== $id) {
                    throw new \DomainException("Forbidden: You cannot access profile of another student.", 403);
                }
            } elseif ($currentUser['role'] === 'instructor') {
                $assignedBatches = $currentUser['scope']['batches'] ?? [];
                $studentBatchId = (int)($student['batch_id'] ?? 0);
                if (!in_array($studentBatchId, $assignedBatches, true)) {
                    throw new \DomainException("Forbidden: Student is not enrolled in any of your assigned batches.", 403);
                }
            }
        }

        $historyStmt = $pdo->prepare('
            SELECT e.id, e.batch_id, e.starts_on, e.ends_on, e.status,
                   b.name as batch_name, b.section as batch_section, b.shift as batch_shift,
                   t.name as trade_name, t.code as trade_code
            FROM enrollments e
            JOIN batches b ON e.batch_id = b.id
            JOIN trades t ON b.trade_id = t.id
            WHERE e.student_id = :sid
            ORDER BY e.starts_on DESC, e.id DESC
        ');
        $historyStmt->execute(['sid' => $id]);
        $student['enrollments'] = $historyStmt->fetchAll();

        return $student;
    }

    public static function createStudent(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();

        $instituteId = (int)($data['institute_id'] ?? 1);
        $admissionNo = trim($data['admission_no'] ?? '');
        $name = trim($data['name'] ?? '');
        $gender = trim($data['gender'] ?? 'male');
        $category = trim($data['category'] ?? 'General');
        $phone = trim($data['phone'] ?? '');
        $batchId = (int)($data['batch_id'] ?? 0);
        $email = trim($data['email'] ?? strtolower($admissionNo) . '@student.iti.org');
        $username = trim($data['username'] ?? $admissionNo);
        $password = $data['password'] ?? 'Password@123';

        if (empty($admissionNo) || empty($name) || $batchId <= 0) {
            throw new \InvalidArgumentException('Admission number, student name, and batch assignment are required.');
        }

        $batchStmt = $pdo->prepare('SELECT id FROM batches WHERE id = :id LIMIT 1');
        $batchStmt->execute(['id' => $batchId]);
        if (!$batchStmt->fetch()) {
            throw new \InvalidArgumentException('Selected batch does not exist.', 422);
        }

        // Check unique admission number
        $chk = $pdo->prepare('SELECT id FROM students WHERE institute_id = :inst AND admission_no = :adm');
        $chk->execute(['inst' => $instituteId, 'adm' => $admissionNo]);
        if ($chk->fetch()) {
            throw new \InvalidArgumentException("Student with admission number '{$admissionNo}' already exists.", 409);
        }

        $userCheck = $pdo->prepare('
            SELECT id FROM users
            WHERE institute_id = :inst AND (email = :email OR username = :username)
            LIMIT 1
        ');
        $userCheck->execute(['inst' => $instituteId, 'email' => $email, 'username' => $username]);
        if ($userCheck->fetch()) {
            throw new \InvalidArgumentException('A user with the same email or username already exists.', 409);
        }

        // Begin transaction
        $pdo->beginTransaction();

        try {
            // 1. Create user
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $userStmt = $pdo->prepare('
                INSERT INTO users (institute_id, email, username, password_hash, role, status)
                VALUES (:inst, :email, :username, :hash, "student", "active")
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
                VALUES (:uid, 3, "batch", :bid)
            ');
            $roleStmt->execute(['uid' => $userId, 'bid' => $batchId]);

            // 3. Create student profile
            $stuStmt = $pdo->prepare('
                INSERT INTO students (user_id, institute_id, admission_no, name, gender, category, phone, status)
                VALUES (:uid, :inst, :adm, :name, :gender, :cat, :phone, "active")
            ');
            $stuStmt->execute([
                'uid' => $userId,
                'inst' => $instituteId,
                'adm' => $admissionNo,
                'name' => $name,
                'gender' => $gender,
                'cat' => $category,
                'phone' => $phone
            ]);
            $studentId = (int)$pdo->lastInsertId();

            // 4. Enroll in batch
            $enrollStmt = $pdo->prepare('
                INSERT INTO enrollments (student_id, batch_id, starts_on, status)
                VALUES (:sid, :bid, :start, "active")
            ');
            $enrollStmt->execute([
                'sid' => $studentId,
                'bid' => $batchId,
                'start' => date('Y-m-d')
            ]);

            $pdo->commit();

            AuthService::logAudit($actorUserId, 'STUDENT_CREATE', 'students', $studentId, [
                'admission_no' => $admissionNo,
                'name' => $name,
                'batch_id' => $batchId
            ]);

            return self::getStudentById($studentId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function updateStudent(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getStudentById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Student #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);
        $gender = trim($data['gender'] ?? $existing['gender']);
        $category = trim($data['category'] ?? $existing['category']);
        $phone = trim($data['phone'] ?? $existing['phone']);

        $stmt = $pdo->prepare('
            UPDATE students
            SET name = :name, gender = :gender, category = :cat, phone = :phone
            WHERE id = :id
        ');
        $stmt->execute([
            'name' => $name,
            'gender' => $gender,
            'cat' => $category,
            'phone' => $phone,
            'id' => $id
        ]);

        AuthService::logAudit($actorUserId, 'STUDENT_UPDATE', 'students', $id, $data, $existing);
        return self::getStudentById($id);
    }

    public static function toggleStatus(int $id, string $status, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getStudentById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Student #{$id} not found.", 404);
        }

        $newStatus = ($status === 'active') ? 'active' : 'inactive';

        // Update student profile and linked user account
        $stmt = $pdo->prepare('UPDATE students SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $newStatus, 'id' => $id]);

        $userStmt = $pdo->prepare('UPDATE users SET status = :status WHERE id = :uid');
        $userStmt->execute(['status' => $newStatus, 'uid' => $existing['user_id']]);

        AuthService::logAudit($actorUserId, 'STUDENT_STATUS_TOGGLE', 'students', $id, ['status' => $newStatus], ['status' => $existing['status']]);
        return self::getStudentById($id);
    }

    public static function enrollBatch(int $studentId, int $batchId, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getStudentById($studentId);
        if (!$existing) {
            throw new \InvalidArgumentException("Student #{$studentId} not found.", 404);
        }

        $batchStmt = $pdo->prepare('SELECT id FROM batches WHERE id = :id LIMIT 1');
        $batchStmt->execute(['id' => $batchId]);
        if (!$batchStmt->fetch()) {
            throw new \InvalidArgumentException("Batch #{$batchId} not found.", 404);
        }

        $pdo->beginTransaction();

        try {
            $previousBatchIds = array_values(array_filter(array_map(
                static fn (array $row): int => (int)$row['batch_id'],
                array_filter($existing['enrollments'] ?? [], static fn (array $row): bool => $row['status'] === 'active')
            )));

            // End previous active enrollments (never delete history)
            $deact = $pdo->prepare('UPDATE enrollments SET status = "transferred", ends_on = :ends WHERE student_id = :sid AND status = "active"');
            $deact->execute(['ends' => date('Y-m-d'), 'sid' => $studentId]);

            // Re-use an existing enrollment row if the student returns to the same batch
            $chk = $pdo->prepare('SELECT id FROM enrollments WHERE student_id = :sid AND batch_id = :bid LIMIT 1');
            $chk->execute(['sid' => $studentId, 'bid' => $batchId]);
            $existingEnrollment = $chk->fetch();

            if ($existingEnrollment) {
                $upd = $pdo->prepare('
                    UPDATE enrollments SET starts_on = :start, ends_on = NULL, status = "active"
                    WHERE id = :id
                ');
                $upd->execute(['start' => date('Y-m-d'), 'id' => $existingEnrollment['id']]);
                $enrollmentId = (int)$existingEnrollment['id'];
            } else {
                $ins = $pdo->prepare('
                    INSERT INTO enrollments (student_id, batch_id, starts_on, status)
                    VALUES (:sid, :bid, :start, "active")
                ');
                $ins->execute([
                    'sid' => $studentId,
                    'bid' => $batchId,
                    'start' => date('Y-m-d')
                ]);
                $enrollmentId = (int)$pdo->lastInsertId();
            }

            // Keep the user's role scope aligned with the active batch
            $pdo->prepare('DELETE FROM user_roles WHERE user_id = :uid AND role_id = 3')
                ->execute(['uid' => $existing['user_id']]);
            $pdo->prepare('
                INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
                VALUES (:uid, 3, "batch", :bid)
            ')->execute(['uid' => $existing['user_id'], 'bid' => $batchId]);

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        AuthService::logAudit($actorUserId, 'STUDENT_ENROLLMENT', 'enrollments', $enrollmentId, [
            'student_id' => $studentId,
            'batch_id' => $batchId,
            'previous_batch_ids' => $previousBatchIds,
        ]);
        return self::getStudentById($studentId);
    }
}
