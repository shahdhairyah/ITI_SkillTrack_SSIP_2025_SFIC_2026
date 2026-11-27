<?php

namespace App\Services;

use App\Support\Response;
use PDO;

class PracticalPhotoService
{
    private static bool $schemaChecked = false;

    public static function ensureSchema(PDO $db): void
    {
        if (self::$schemaChecked) {
            return;
        }

        $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $db->exec("
                CREATE TABLE IF NOT EXISTS practical_photo_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    institute_id INTEGER NOT NULL DEFAULT 1,
                    student_id INTEGER NOT NULL,
                    activity_id INTEGER NOT NULL,
                    file_name TEXT NOT NULL,
                    original_name TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    file_size INTEGER NOT NULL DEFAULT 0,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    accuracy_meters REAL NULL,
                    location_label TEXT NULL,
                    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    instructor_status TEXT NOT NULL DEFAULT 'pending',
                    instructor_reviewed_by INTEGER NULL,
                    instructor_reviewed_at DATETIME NULL,
                    instructor_remarks TEXT NULL,
                    admin_status TEXT NOT NULL DEFAULT 'pending',
                    admin_reviewed_by INTEGER NULL,
                    admin_reviewed_at DATETIME NULL,
                    admin_remarks TEXT NULL,
                    overall_status TEXT NOT NULL DEFAULT 'pending',
                    practical_submitted_at DATETIME NULL,
                    practical_notes TEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (student_id, activity_id)
                );
            ");
        } else {
            $db->exec("
                CREATE TABLE IF NOT EXISTS practical_photo_submissions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    institute_id INT NOT NULL DEFAULT 1,
                    student_id INT NOT NULL,
                    activity_id INT NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    original_name VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    mime_type VARCHAR(100) NOT NULL,
                    file_size INT NOT NULL DEFAULT 0,
                    latitude DECIMAL(10, 7) NOT NULL,
                    longitude DECIMAL(10, 7) NOT NULL,
                    accuracy_meters DECIMAL(8, 2) NULL,
                    location_label VARCHAR(255) NULL,
                    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    instructor_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                    instructor_reviewed_by INT NULL,
                    instructor_reviewed_at DATETIME NULL,
                    instructor_remarks TEXT NULL,
                    admin_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                    admin_reviewed_by INT NULL,
                    admin_reviewed_at DATETIME NULL,
                    admin_remarks TEXT NULL,
                    overall_status ENUM('pending','partially_approved','approved','rejected') NOT NULL DEFAULT 'pending',
                    practical_submitted_at DATETIME NULL,
                    practical_notes TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_student_activity_photo (student_id, activity_id),
                    INDEX idx_practical_photos_status (overall_status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ");
        }

        // Ensure columns exist on older tables too
        self::ensurePracticalColumns($db);
        self::$schemaChecked = true;
    }

    private static function ensurePracticalColumns(PDO $db): void
    {
        try {
            $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                $cols = $db->query('PRAGMA table_info(practical_photo_submissions)')->fetchAll(PDO::FETCH_COLUMN, 1);
                if (!in_array('practical_submitted_at', $cols, true)) {
                    $db->exec('ALTER TABLE practical_photo_submissions ADD COLUMN practical_submitted_at DATETIME NULL');
                }
                if (!in_array('practical_notes', $cols, true)) {
                    $db->exec('ALTER TABLE practical_photo_submissions ADD COLUMN practical_notes TEXT NULL');
                }
            } else {
                $cols = $db->query("SHOW COLUMNS FROM practical_photo_submissions")->fetchAll(PDO::FETCH_COLUMN, 0);
                if (!in_array('practical_submitted_at', $cols, true)) {
                    $db->exec('ALTER TABLE practical_photo_submissions ADD COLUMN practical_submitted_at DATETIME NULL AFTER overall_status');
                }
                if (!in_array('practical_notes', $cols, true)) {
                    $db->exec('ALTER TABLE practical_photo_submissions ADD COLUMN practical_notes TEXT NULL AFTER practical_submitted_at');
                }
            }
        } catch (\Throwable $ignored) {}
    }

    public static function computeOverallStatus(string $instructorStatus, string $adminStatus): string
    {
        if ($instructorStatus === 'rejected' || $adminStatus === 'rejected') {
            return 'rejected';
        }
        if ($instructorStatus === 'approved' && $adminStatus === 'approved') {
            return 'approved';
        }
        if ($instructorStatus === 'approved' || $adminStatus === 'approved') {
            return 'partially_approved';
        }
        return 'pending';
    }

    public static function isApprovedForPractical(PDO $db, int $studentId, int $activityId): bool
    {
        self::ensureSchema($db);
        $stmt = $db->prepare('SELECT overall_status FROM practical_photo_submissions WHERE student_id = :sid AND activity_id = :aid LIMIT 1');
        $stmt->execute([':sid' => $studentId, ':aid' => $activityId]);
        $status = $stmt->fetchColumn();
        return $status === 'approved';
    }

    public static function uploadPhoto(array $file, array $meta, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $activityId = (int)($meta['activity_id'] ?? 0);
        if ($activityId <= 0) {
            Response::error('Practical activity_id is required.', 'VALIDATION_ERROR', [], 422);
        }

        if ($role === 'student') {
            $stStmt = $db->prepare('SELECT id FROM students WHERE user_id = :uid LIMIT 1');
            $stStmt->execute([':uid' => $userId]);
            $studentId = (int)$stStmt->fetchColumn();
        } else {
            $studentId = (int)($meta['student_id'] ?? 0);
        }

        if ($studentId <= 0) {
            Response::error('Valid student profile not found.', 'STUDENT_NOT_FOUND', [], 404);
        }

        $latRaw = $meta['latitude'] ?? null;
        $lngRaw = $meta['longitude'] ?? null;
        if ($latRaw === null || $lngRaw === null || !is_numeric($latRaw) || !is_numeric($lngRaw)) {
            Response::error('Valid GPS latitude and longitude are required for geo-tagged practical photo upload.', 'GEO_REQUIRED', [], 422);
        }
        $latitude = (float)$latRaw;
        $longitude = (float)$lngRaw;
        if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
            Response::error('GPS coordinates are out of valid range.', 'INVALID_GEO', [], 422);
        }

        $accuracy = isset($meta['accuracy_meters']) && is_numeric($meta['accuracy_meters'])
            ? (float)$meta['accuracy_meters']
            : null;
        $locationLabel = trim((string)($meta['location_label'] ?? ''));

        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('No valid practical photo uploaded.', 'UPLOAD_FAILED', [], 422);
        }

        $maxBytes = 5 * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxBytes) {
            Response::error('Photo size exceeds the 5MB limit.', 'FILE_TOO_LARGE', [], 422);
        }

        $allowedTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);
        if (!isset($allowedTypes[$mime])) {
            Response::error('Invalid photo format. Only JPG, PNG, and WEBP images are allowed.', 'INVALID_FORMAT', [], 422);
        }

        // Check existing submission for this student + activity
        $existingStmt = $db->prepare('SELECT * FROM practical_photo_submissions WHERE student_id = :sid AND activity_id = :aid LIMIT 1');
        $existingStmt->execute([':sid' => $studentId, ':aid' => $activityId]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing && $existing['overall_status'] === 'approved') {
            Response::error('This practical photo is already approved by both Instructor and Admin.', 'ALREADY_APPROVED', [], 422);
        }

        $storageDir = __DIR__ . '/../../storage/practical_photos';
        if (!is_dir($storageDir)) {
            @mkdir($storageDir, 0775, true);
        }

        $ext = $allowedTypes[$mime];
        $storedName = 'practical_' . $studentId . '_' . $activityId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $targetPath = $storageDir . '/' . $storedName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            Response::error('Failed to store practical photo on server.', 'SAVE_FAILED', [], 500);
        }

        if ($existing) {
            if (!empty($existing['file_path']) && file_exists($existing['file_path'])) {
                @unlink($existing['file_path']);
            }
            $upd = $db->prepare("
                UPDATE practical_photo_submissions
                SET file_name = :fname,
                    original_name = :oname,
                    file_path = :fpath,
                    mime_type = :mime,
                    file_size = :fsize,
                    latitude = :lat,
                    longitude = :lng,
                    accuracy_meters = :acc,
                    location_label = :lbl,
                    captured_at = CURRENT_TIMESTAMP,
                    instructor_status = 'pending',
                    instructor_reviewed_by = NULL,
                    instructor_reviewed_at = NULL,
                    instructor_remarks = NULL,
                    admin_status = 'pending',
                    admin_reviewed_by = NULL,
                    admin_reviewed_at = NULL,
                    admin_remarks = NULL,
                    overall_status = 'pending',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $upd->execute([
                ':fname' => $storedName,
                ':oname' => basename((string)$file['name']),
                ':fpath' => $targetPath,
                ':mime' => $mime,
                ':fsize' => (int)$file['size'],
                ':lat' => $latitude,
                ':lng' => $longitude,
                ':acc' => $accuracy,
                ':lbl' => $locationLabel ?: null,
                ':id' => (int)$existing['id'],
            ]);
            $submissionId = (int)$existing['id'];
        } else {
            $ins = $db->prepare("
                INSERT INTO practical_photo_submissions (
                    institute_id, student_id, activity_id, file_name, original_name, file_path,
                    mime_type, file_size, latitude, longitude, accuracy_meters, location_label,
                    instructor_status, admin_status, overall_status
                ) VALUES (
                    :inst, :sid, :aid, :fname, :oname, :fpath,
                    :mime, :fsize, :lat, :lng, :acc, :lbl,
                    'pending', 'pending', 'pending'
                )
            ");
            $ins->execute([
                ':inst' => $instId,
                ':sid' => $studentId,
                ':aid' => $activityId,
                ':fname' => $storedName,
                ':oname' => basename((string)$file['name']),
                ':fpath' => $targetPath,
                ':mime' => $mime,
                ':fsize' => (int)$file['size'],
                ':lat' => $latitude,
                ':lng' => $longitude,
                ':acc' => $accuracy,
                ':lbl' => $locationLabel ?: null,
            ]);
            $submissionId = (int)$db->lastInsertId();
        }

        AuditService::log(
            $userId,
            $existing ? 'PRACTICAL_PHOTO_REUPLOADED' : 'PRACTICAL_PHOTO_UPLOADED',
            'practical_photo',
            $submissionId,
            null,
            ['student_id' => $studentId, 'activity_id' => $activityId, 'latitude' => $latitude, 'longitude' => $longitude]
        );

        return self::getById($db, $submissionId);
    }

    private static function getById(PDO $db, int $id): array
    {
        $stmt = $db->prepare("
            SELECT p.*,
                   s.name AS student_name,
                   s.admission_no,
                   pa.code AS activity_code,
                   pa.title AS activity_title,
                   iu.username AS instructor_reviewer_name,
                   au.username AS admin_reviewer_name
            FROM practical_photo_submissions p
            JOIN students s ON s.id = p.student_id
            JOIN practical_activities pa ON pa.id = p.activity_id
            LEFT JOIN users iu ON iu.id = p.instructor_reviewed_by
            LEFT JOIN users au ON au.id = p.admin_reviewed_by
            WHERE p.id = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        if ($row) {
            $row['file_url'] = '/api/v1/practical-photos/' . $row['id'] . '/file';
        }
        return $row;
    }

    public static function listSubmissions(array $filters, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $sql = "
            SELECT p.*,
                   s.name AS student_name,
                   s.admission_no,
                   pa.code AS activity_code,
                   pa.title AS activity_title,
                   iu.username AS instructor_reviewer_name,
                   au.username AS admin_reviewer_name
            FROM practical_photo_submissions p
            JOIN students s ON s.id = p.student_id
            JOIN practical_activities pa ON pa.id = p.activity_id
            LEFT JOIN users iu ON iu.id = p.instructor_reviewed_by
            LEFT JOIN users au ON au.id = p.admin_reviewed_by
            WHERE p.institute_id = :inst_id
        ";
        $params = [':inst_id' => $instId];

        if ($role === 'student') {
            $stStmt = $db->prepare('SELECT id FROM students WHERE user_id = :uid LIMIT 1');
            $stStmt->execute([':uid' => $userId]);
            $sid = (int)$stStmt->fetchColumn();
            $sql .= " AND p.student_id = :my_sid";
            $params[':my_sid'] = $sid;
        } elseif ($role === 'instructor') {
            $sql .= " AND p.student_id IN (
                SELECT e.student_id
                FROM enrollments e
                JOIN instructor_assignments ia ON ia.batch_id = e.batch_id AND ia.ends_on IS NULL
                JOIN instructors i ON i.id = ia.instructor_id
                WHERE i.user_id = :inst_uid AND e.status = 'active'
            )";
            $params[':inst_uid'] = $userId;
        }

        if (!empty($filters['student_id'])) {
            $sql .= " AND p.student_id = :f_sid";
            $params[':f_sid'] = (int)$filters['student_id'];
        }
        if (!empty($filters['activity_id'])) {
            $sql .= " AND p.activity_id = :f_aid";
            $params[':f_aid'] = (int)$filters['activity_id'];
        }
        if (!empty($filters['batch_id'])) {
            $sql .= " AND p.student_id IN (SELECT student_id FROM enrollments WHERE batch_id = :f_bid AND status = 'active')";
            $params[':f_bid'] = (int)$filters['batch_id'];
        }
        if (!empty($filters['overall_status'])) {
            $sql .= " AND p.overall_status = :f_status";
            $params[':f_status'] = $filters['overall_status'];
        }

        $sql .= " ORDER BY p.updated_at DESC, p.id DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['file_url'] = '/api/v1/practical-photos/' . $row['id'] . '/file';
        }
        return $rows;
    }

    public static function reviewSubmission(int $id, string $decision, string $remarks, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        if (!in_array($role, ['instructor', 'administrator'], true)) {
            Response::error('Only instructors and administrators can review practical photos.', 'FORBIDDEN', [], 403);
        }
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            Response::error('Decision must be approved or rejected.', 'VALIDATION_ERROR', [], 422);
        }
        if ($decision === 'rejected' && trim($remarks) === '') {
            Response::error('Please provide a rejection reason so the student knows what to re-upload.', 'VALIDATION_ERROR', [], 422);
        }

        $stmt = $db->prepare('SELECT * FROM practical_photo_submissions WHERE id = :id AND institute_id = :inst_id LIMIT 1');
        $stmt->execute([':id' => $id, ':inst_id' => $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Practical photo submission not found.', 'NOT_FOUND', [], 404);
        }

        if ($role === 'instructor') {
            $ownStmt = $db->prepare("
                SELECT 1
                FROM enrollments e
                JOIN instructor_assignments ia ON ia.batch_id = e.batch_id AND ia.ends_on IS NULL
                JOIN instructors i ON i.id = ia.instructor_id
                WHERE e.student_id = :sid AND i.user_id = :uid AND e.status = 'active'
                LIMIT 1
            ");
            $ownStmt->execute([':sid' => (int)$row['student_id'], ':uid' => $userId]);
            if (!$ownStmt->fetchColumn()) {
                Response::error('Forbidden: You are not assigned to this student\'s batch.', 'FORBIDDEN', [], 403);
            }
            $instructorStatus = $decision;
            $adminStatus = $row['admin_status'];
            $overall = self::computeOverallStatus($instructorStatus, $adminStatus);

            $upd = $db->prepare("
                UPDATE practical_photo_submissions
                SET instructor_status = :ist,
                    instructor_reviewed_by = :iby,
                    instructor_reviewed_at = CURRENT_TIMESTAMP,
                    instructor_remarks = :irem,
                    overall_status = :ovr,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $upd->execute([
                ':ist' => $instructorStatus,
                ':iby' => $userId,
                ':irem' => trim($remarks) ?: null,
                ':ovr' => $overall,
                ':id' => $id,
            ]);
        } else {
            $instructorStatus = $row['instructor_status'];
            $adminStatus = $decision;
            $overall = self::computeOverallStatus($instructorStatus, $adminStatus);

            $upd = $db->prepare("
                UPDATE practical_photo_submissions
                SET admin_status = :ast,
                    admin_reviewed_by = :aby,
                    admin_reviewed_at = CURRENT_TIMESTAMP,
                    admin_remarks = :arem,
                    overall_status = :ovr,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id
            ");
            $upd->execute([
                ':ast' => $adminStatus,
                ':aby' => $userId,
                ':arem' => trim($remarks) ?: null,
                ':ovr' => $overall,
                ':id' => $id,
            ]);
        }

        AuditService::log(
            $userId,
            'PRACTICAL_PHOTO_' . strtoupper($decision),
            'practical_photo',
            $id,
            ['overall_status' => $row['overall_status']],
            ['role' => $role, 'decision' => $decision, 'overall_status' => $overall, 'remarks' => trim($remarks)]
        );

        return self::getById($db, $id);
    }

    public static function submitPractical(int $id, string $notes, array $currentUser): array
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $stmt = $db->prepare('SELECT * FROM practical_photo_submissions WHERE id = :id AND institute_id = :inst_id LIMIT 1');
        $stmt->execute([':id' => $id, ':inst_id' => $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Practical photo record not found.', 'NOT_FOUND', [], 404);
        }

        if ($role === 'student') {
            $stStmt = $db->prepare('SELECT id FROM students WHERE user_id = :uid LIMIT 1');
            $stStmt->execute([':uid' => $userId]);
            if ((int)$stStmt->fetchColumn() !== (int)$row['student_id']) {
                Response::error('Forbidden.', 'FORBIDDEN', [], 403);
            }
        }

        if ($row['overall_status'] !== 'approved') {
            Response::error(
                'Both Instructor and Admin must accept your geo-tagged practical photo before submitting this practical.',
                'PHOTO_APPROVAL_REQUIRED',
                [],
                422
            );
        }

        $upd = $db->prepare("
            UPDATE practical_photo_submissions
            SET practical_submitted_at = CURRENT_TIMESTAMP,
                practical_notes = :notes,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");
        $upd->execute([':notes' => trim($notes) ?: null, ':id' => $id]);

        // Also initialize an in_progress practical attempt if none is open yet
        $studentId = (int)$row['student_id'];
        $activityId = (int)$row['activity_id'];
        $openStmt = $db->prepare("SELECT id FROM activity_attempts WHERE student_id = :sid AND activity_id = :aid AND assessed_at IS NULL LIMIT 1");
        $openStmt->execute([':sid' => $studentId, ':aid' => $activityId]);
        if (!$openStmt->fetchColumn()) {
            $maxStmt = $db->prepare("SELECT MAX(attempt_no) FROM activity_attempts WHERE student_id = :sid AND activity_id = :aid");
            $maxStmt->execute([':sid' => $studentId, ':aid' => $activityId]);
            $nextAttempt = ((int)$maxStmt->fetchColumn()) + 1;
            $insAtt = $db->prepare("
                INSERT INTO activity_attempts (student_id, activity_id, attempt_no, started_at, status, notes)
                VALUES (:sid, :aid, :att_no, CURRENT_TIMESTAMP, 'in_progress', :notes)
            ");
            $insAtt->execute([
                ':sid' => $studentId,
                ':aid' => $activityId,
                ':att_no' => $nextAttempt,
                ':notes' => trim($notes) !== '' ? trim($notes) : 'Student submitted practical after Instructor + Admin geo-photo approval.',
            ]);
        }

        AuditService::log(
            $userId,
            'PRACTICAL_SUBMITTED_BY_STUDENT',
            'practical_photo',
            $id,
            null,
            ['student_id' => $studentId, 'activity_id' => $activityId, 'notes' => trim($notes)]
        );

        return self::getById($db, $id);
    }

    public static function streamPhoto(int $id, array $currentUser): void
    {
        $db = Database::getConnection();
        self::ensureSchema($db);

        $role = $currentUser['role'] ?? '';
        $userId = (int)($currentUser['id'] ?? 0);
        $instId = (int)($currentUser['institute_id'] ?? 1);

        $stmt = $db->prepare('SELECT * FROM practical_photo_submissions WHERE id = :id AND institute_id = :inst_id LIMIT 1');
        $stmt->execute([':id' => $id, ':inst_id' => $instId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            Response::error('Practical photo not found.', 'NOT_FOUND', [], 404);
            return;
        }

        if ($role === 'student') {
            $stStmt = $db->prepare('SELECT id FROM students WHERE user_id = :uid LIMIT 1');
            $stStmt->execute([':uid' => $userId]);
            if ((int)$stStmt->fetchColumn() !== (int)$row['student_id']) {
                Response::error('Forbidden.', 'FORBIDDEN', [], 403);
                return;
            }
        }

        $path = $row['file_path'];
        if (!file_exists($path)) {
            Response::error('Photo file not found in storage.', 'FILE_MISSING', [], 404);
            return;
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        header('Content-Type: ' . $row['mime_type']);
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="' . addslashes($row['original_name']) . '"');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, max-age=3600');

        readfile($path);
        exit;
    }
}
