<?php

namespace App\Services;

use App\Services\Database;
use PDO;

class OrganizationService
{
    // ==========================================
    // INSTITUTE
    // ==========================================

    public static function getInstituteById(int $id): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM institutes WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $institute = $stmt->fetch();

        if (!$institute) {
            return null;
        }

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM departments WHERE institute_id = :id');
        $stmt->execute(['id' => $id]);
        $institute['department_count'] = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM trades WHERE institute_id = :id');
        $stmt->execute(['id' => $id]);
        $institute['trade_count'] = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE institute_id = :id');
        $stmt->execute(['id' => $id]);
        $institute['user_count'] = (int)$stmt->fetchColumn();

        return $institute;
    }

    public static function updateInstitute(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getInstituteById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Institute #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);
        $code = trim($data['code'] ?? $existing['code']);
        $timezone = trim($data['timezone'] ?? $existing['timezone']);
        $status = $data['status'] ?? $existing['status'];

        if ($name === '' || $code === '') {
            throw new \InvalidArgumentException('Institute name and code are required.');
        }

        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new \InvalidArgumentException('Invalid institute status.');
        }

        $stmt = $pdo->prepare('
            UPDATE institutes SET name = :name, code = :code, timezone = :tz, status = :status
            WHERE id = :id
        ');
        $stmt->execute([
            'name' => $name,
            'code' => $code,
            'tz' => $timezone,
            'status' => $status,
            'id' => $id,
        ]);

        AuthService::logAudit($actorUserId, 'INSTITUTE_UPDATE', 'institutes', $id, $data, $existing);
        return self::getInstituteById($id);
    }

    // ==========================================
    // DEPARTMENTS
    // ==========================================

    public static function getDepartments(?int $instituteId = null): array
    {
        $pdo = Database::getConnection();
        $sql = '
            SELECT d.*,
                   (SELECT COUNT(*) FROM trades t WHERE t.department_id = d.id) as trade_count
            FROM departments d
            WHERE 1=1
        ';
        $params = [];

        if ($instituteId !== null) {
            $sql .= ' AND d.institute_id = :inst';
            $params['inst'] = $instituteId;
        }

        $sql .= ' ORDER BY d.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function createDepartment(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $instituteId = (int)($data['institute_id'] ?? 1);
        $name = trim($data['name'] ?? '');
        $code = trim($data['code'] ?? '');

        if ($name === '' || $code === '') {
            throw new \InvalidArgumentException('Department name and code are required.');
        }

        $check = $pdo->prepare('SELECT id FROM departments WHERE institute_id = :inst AND code = :code LIMIT 1');
        $check->execute(['inst' => $instituteId, 'code' => $code]);
        if ($check->fetch()) {
            throw new \InvalidArgumentException("Department with code '{$code}' already exists.", 409);
        }

        $stmt = $pdo->prepare('
            INSERT INTO departments (institute_id, name, code)
            VALUES (:inst, :name, :code)
        ');
        $stmt->execute([
            'inst' => $instituteId,
            'name' => $name,
            'code' => $code,
        ]);

        $departmentId = (int)$pdo->lastInsertId();
        AuthService::logAudit($actorUserId, 'DEPARTMENT_CREATE', 'departments', $departmentId, $data);

        $stmt = $pdo->prepare('SELECT * FROM departments WHERE id = :id');
        $stmt->execute(['id' => $departmentId]);
        return $stmt->fetch();
    }

    public static function updateDepartment(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM departments WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            throw new \InvalidArgumentException("Department #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);

        $stmt = $pdo->prepare('UPDATE departments SET name = :name WHERE id = :id');
        $stmt->execute(['name' => $name, 'id' => $id]);

        AuthService::logAudit($actorUserId, 'DEPARTMENT_UPDATE', 'departments', $id, $data, $existing);

        $stmt = $pdo->prepare('SELECT * FROM departments WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    // ==========================================
    // TRADES
    // ==========================================

    public static function getAllTrades(?string $status = null): array
    {
        $pdo = Database::getConnection();
        $sql = '
            SELECT t.*, d.name as department_name,
                   (SELECT COUNT(*) FROM batches b WHERE b.trade_id = t.id) as batch_count,
                   (SELECT COUNT(*) FROM modules m WHERE m.trade_id = t.id) as module_count
            FROM trades t
            LEFT JOIN departments d ON t.department_id = d.id
        ';
        $params = [];

        if ($status !== null) {
            $sql .= ' WHERE t.status = :status';
            $params['status'] = $status;
        }

        $sql .= ' ORDER BY t.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function getTradeById(int $id): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT t.*, d.name as department_name
            FROM trades t
            LEFT JOIN departments d ON t.department_id = d.id
            WHERE t.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $trade = $stmt->fetch();
        return $trade ?: null;
    }

    public static function createTrade(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();

        $instituteId = (int)($data['institute_id'] ?? 1);
        $name = trim($data['name'] ?? '');
        $code = trim($data['code'] ?? '');
        $nsqf = (int)($data['nsqf_level'] ?? 4);
        $duration = (int)($data['duration_years'] ?? 2);
        $deptId = !empty($data['department_id']) ? (int)$data['department_id'] : null;

        if (empty($name) || empty($code)) {
            throw new \InvalidArgumentException('Trade name and code are required.');
        }

        // Check for duplicate trade code
        $checkStmt = $pdo->prepare('SELECT id FROM trades WHERE institute_id = :inst AND code = :code LIMIT 1');
        $checkStmt->execute(['inst' => $instituteId, 'code' => $code]);
        if ($checkStmt->fetch()) {
            throw new \InvalidArgumentException("Trade with code '{$code}' already exists.", 409);
        }

        $stmt = $pdo->prepare('
            INSERT INTO trades (institute_id, department_id, name, code, nsqf_level, duration_years, status)
            VALUES (:inst, :dept, :name, :code, :nsqf, :duration, "active")
        ');
        $stmt->execute([
            'inst' => $instituteId,
            'dept' => $deptId,
            'name' => $name,
            'code' => $code,
            'nsqf' => $nsqf,
            'duration' => $duration
        ]);

        $tradeId = (int)$pdo->lastInsertId();
        AuthService::logAudit($actorUserId, 'TRADE_CREATE', 'trades', $tradeId, $data);

        return self::getTradeById($tradeId);
    }

    public static function updateTrade(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getTradeById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Trade #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);
        $nsqf = isset($data['nsqf_level']) ? (int)$data['nsqf_level'] : (int)$existing['nsqf_level'];
        $duration = isset($data['duration_years']) ? (int)$data['duration_years'] : (int)$existing['duration_years'];
        $status = $data['status'] ?? $existing['status'];

        $stmt = $pdo->prepare('
            UPDATE trades 
            SET name = :name, nsqf_level = :nsqf, duration_years = :dur, status = :status
            WHERE id = :id
        ');
        $stmt->execute([
            'name' => $name,
            'nsqf' => $nsqf,
            'dur' => $duration,
            'status' => $status,
            'id' => $id
        ]);

        AuthService::logAudit($actorUserId, 'TRADE_UPDATE', 'trades', $id, $data, $existing);
        return self::getTradeById($id);
    }

    // ==========================================
    // ACADEMIC PERIODS
    // ==========================================

    public static function getAllAcademicPeriods(): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query('
            SELECT ap.*,
                   (SELECT COUNT(*) FROM batches b WHERE b.academic_period_id = ap.id) as batch_count
            FROM academic_periods ap
            ORDER BY ap.starts_on DESC
        ');
        return $stmt->fetchAll();
    }

    public static function createAcademicPeriod(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $instituteId = (int)($data['institute_id'] ?? 1);
        $name = trim($data['name'] ?? '');
        $startsOn = trim($data['starts_on'] ?? '');
        $endsOn = trim($data['ends_on'] ?? '');

        if (empty($name) || empty($startsOn) || empty($endsOn)) {
            throw new \InvalidArgumentException('Period name, start date, and end date are required.');
        }

        $stmt = $pdo->prepare('
            INSERT INTO academic_periods (institute_id, name, starts_on, ends_on, status)
            VALUES (:inst, :name, :starts, :ends, "active")
        ');
        $stmt->execute([
            'inst' => $instituteId,
            'name' => $name,
            'starts' => $startsOn,
            'ends' => $endsOn
        ]);

        $periodId = (int)$pdo->lastInsertId();
        AuthService::logAudit($actorUserId, 'ACADEMIC_PERIOD_CREATE', 'academic_periods', $periodId, $data);

        $stmt = $pdo->prepare('SELECT * FROM academic_periods WHERE id = :id');
        $stmt->execute(['id' => $periodId]);
        return $stmt->fetch();
    }

    public static function updateAcademicPeriod(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM academic_periods WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            throw new \InvalidArgumentException("Academic period #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);
        $startsOn = trim($data['starts_on'] ?? $existing['starts_on']);
        $endsOn = trim($data['ends_on'] ?? $existing['ends_on']);
        $status = $data['status'] ?? $existing['status'];

        if ($name === '' || $startsOn === '' || $endsOn === '') {
            throw new \InvalidArgumentException('Period name, start date, and end date are required.');
        }

        if (strtotime($endsOn) < strtotime($startsOn)) {
            throw new \InvalidArgumentException('End date cannot be before start date.');
        }

        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new \InvalidArgumentException('Invalid academic period status.');
        }

        $stmt = $pdo->prepare('
            UPDATE academic_periods
            SET name = :name, starts_on = :starts, ends_on = :ends, status = :status
            WHERE id = :id
        ');
        $stmt->execute([
            'name' => $name,
            'starts' => $startsOn,
            'ends' => $endsOn,
            'status' => $status,
            'id' => $id,
        ]);

        AuthService::logAudit($actorUserId, 'ACADEMIC_PERIOD_UPDATE', 'academic_periods', $id, $data, $existing);

        $stmt = $pdo->prepare('SELECT * FROM academic_periods WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    // ==========================================
    // BATCHES
    // ==========================================

    public static function getBatches(array $filters = [], ?array $currentUser = null): array
    {
        $pdo = Database::getConnection();
        $sql = '
            SELECT b.*, t.name as trade_name, t.code as trade_code,
                   ap.name as academic_period_name,
                   (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id AND e.status = "active") as student_count,
                   (SELECT COUNT(*) FROM instructor_assignments ia WHERE ia.batch_id = b.id) as instructor_count
            FROM batches b
            JOIN trades t ON b.trade_id = t.id
            JOIN academic_periods ap ON b.academic_period_id = ap.id
            WHERE 1=1
        ';
        $params = [];

        // Scope verification
        if ($currentUser && $currentUser['role'] === 'instructor') {
            $allowedBatches = $currentUser['scope']['batches'] ?? [];
            if (empty($allowedBatches)) {
                return [];
            }
            $placeholders = implode(',', array_fill(0, count($allowedBatches), '?'));
            $sql .= " AND b.id IN ($placeholders)";
            $params = array_values($allowedBatches);
        } elseif ($currentUser && $currentUser['role'] === 'student') {
            $allowedBatches = $currentUser['scope']['batches'] ?? [];
            if (empty($allowedBatches)) {
                return [];
            }
            $placeholders = implode(',', array_fill(0, count($allowedBatches), '?'));
            $sql .= " AND b.id IN ($placeholders)";
            $params = array_values($allowedBatches);
        }

        if (!empty($filters['trade_id'])) {
            $sql .= ' AND b.trade_id = ?';
            $params[] = (int)$filters['trade_id'];
        }

        if (!empty($filters['status'])) {
            $sql .= ' AND b.status = ?';
            $params[] = $filters['status'];
        }

        $sql .= ' ORDER BY b.name ASC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function getBatchById(int $id, ?array $currentUser = null): ?array
    {
        $pdo = Database::getConnection();

        // Scope check
        if ($currentUser && $currentUser['role'] === 'instructor') {
            $allowed = $currentUser['scope']['batches'] ?? [];
            if (!in_array($id, $allowed, true)) {
                throw new \DomainException("Forbidden: You do not have permission to access Batch #{$id}.", 403);
            }
        } elseif ($currentUser && $currentUser['role'] === 'student') {
            $allowed = $currentUser['scope']['batches'] ?? [];
            if (!in_array($id, $allowed, true)) {
                throw new \DomainException("Forbidden: You do not have permission to access Batch #{$id}.", 403);
            }
        }

        $stmt = $pdo->prepare('
            SELECT b.*, t.name as trade_name, t.code as trade_code,
                   ap.name as academic_period_name
            FROM batches b
            JOIN trades t ON b.trade_id = t.id
            JOIN academic_periods ap ON b.academic_period_id = ap.id
            WHERE b.id = :id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id]);
        $batch = $stmt->fetch();

        if (!$batch) {
            return null;
        }

        // Fetch enrolled students
        $stuStmt = $pdo->prepare('
            SELECT s.id as student_id, s.admission_no, s.name, s.gender, s.phone, s.status as student_status,
                   e.starts_on, e.status as enrollment_status
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            WHERE e.batch_id = :bid AND e.status = "active"
            ORDER BY s.admission_no ASC
        ');
        $stuStmt->execute(['bid' => $id]);
        $batch['students'] = $stuStmt->fetchAll();

        // Fetch currently assigned instructors
        $instStmt = $pdo->prepare('
            SELECT i.id as instructor_id, i.employee_code, i.name, i.qualification,
                   ia.id as assignment_id, ia.starts_on, ia.ends_on
            FROM instructor_assignments ia
            JOIN instructors i ON ia.instructor_id = i.id
            WHERE ia.batch_id = :bid AND ia.ends_on IS NULL
            ORDER BY i.name ASC
        ');
        $instStmt->execute(['bid' => $id]);
        $batch['instructors'] = $instStmt->fetchAll();
        $batch['student_count'] = count($batch['students']);
        $batch['instructor_count'] = count($batch['instructors']);

        return $batch;
    }

    public static function createBatch(array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();

        $tradeId = (int)($data['trade_id'] ?? 0);
        $periodId = (int)($data['academic_period_id'] ?? 0);
        $name = trim($data['name'] ?? '');
        $section = trim($data['section'] ?? 'A');
        $shift = trim($data['shift'] ?? 'Morning (08:30 - 15:30)');

        if (empty($name) || $tradeId <= 0 || $periodId <= 0) {
            throw new \InvalidArgumentException('Trade, academic period, and batch name are required.');
        }

        $trade = self::getTradeById($tradeId);
        if (!$trade) {
            throw new \InvalidArgumentException('Selected trade does not exist.', 422);
        }

        $periodStmt = $pdo->prepare('SELECT id FROM academic_periods WHERE id = :id LIMIT 1');
        $periodStmt->execute(['id' => $periodId]);
        if (!$periodStmt->fetch()) {
            throw new \InvalidArgumentException('Selected academic period does not exist.', 422);
        }

        $dup = $pdo->prepare('
            SELECT id FROM batches
            WHERE trade_id = :trade AND academic_period_id = :period AND name = :name AND section = :section
            LIMIT 1
        ');
        $dup->execute([
            'trade' => $tradeId,
            'period' => $periodId,
            'name' => $name,
            'section' => $section,
        ]);
        if ($dup->fetch()) {
            throw new \InvalidArgumentException('A batch with the same trade, period, name and section already exists.', 409);
        }

        $stmt = $pdo->prepare('
            INSERT INTO batches (trade_id, academic_period_id, name, section, shift, status)
            VALUES (:trade, :period, :name, :section, :shift, "active")
        ');
        $stmt->execute([
            'trade' => $tradeId,
            'period' => $periodId,
            'name' => $name,
            'section' => $section,
            'shift' => $shift
        ]);

        $batchId = (int)$pdo->lastInsertId();
        AuthService::logAudit($actorUserId, 'BATCH_CREATE', 'batches', $batchId, $data);

        return self::getBatchById($batchId);
    }

    public static function updateBatch(int $id, array $data, ?int $actorUserId = null): array
    {
        $pdo = Database::getConnection();
        $existing = self::getBatchById($id);
        if (!$existing) {
            throw new \InvalidArgumentException("Batch #{$id} not found.", 404);
        }

        $name = trim($data['name'] ?? $existing['name']);
        $section = trim($data['section'] ?? $existing['section']);
        $shift = trim($data['shift'] ?? $existing['shift']);
        $status = $data['status'] ?? $existing['status'];

        $stmt = $pdo->prepare('
            UPDATE batches
            SET name = :name, section = :sec, shift = :shift, status = :status
            WHERE id = :id
        ');
        $stmt->execute([
            'name' => $name,
            'sec' => $section,
            'shift' => $shift,
            'status' => $status,
            'id' => $id
        ]);

        AuthService::logAudit($actorUserId, 'BATCH_UPDATE', 'batches', $id, $data, $existing);
        return self::getBatchById($id);
    }
}
