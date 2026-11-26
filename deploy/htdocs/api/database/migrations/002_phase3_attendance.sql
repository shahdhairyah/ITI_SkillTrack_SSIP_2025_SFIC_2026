-- Phase 3: Training Session and Attendance Register upgrades
-- Target: MySQL 8.x / MariaDB

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE training_sessions
    ADD COLUMN session_type VARCHAR(30) NOT NULL DEFAULT 'practical' AFTER topic,
    ADD COLUMN notes TEXT NULL AFTER session_type,
    ADD COLUMN submitted_at TIMESTAMP NULL AFTER status,
    ADD COLUMN submitted_by INT NULL AFTER submitted_at,
    ADD COLUMN cancelled_at TIMESTAMP NULL AFTER submitted_by,
    ADD COLUMN cancelled_by INT NULL AFTER cancelled_at,
    ADD COLUMN cancellation_reason TEXT NULL AFTER cancelled_by,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
    ADD INDEX idx_sessions_batch_date (batch_id, session_date),
    ADD INDEX idx_sessions_instructor_date (instructor_id, session_date),
    ADD INDEX idx_sessions_status (status);

ALTER TABLE attendance_records
    ADD COLUMN status_note TEXT NULL AFTER status,
    ADD COLUMN correction_count INT NOT NULL DEFAULT 0 AFTER correction_reason,
    ADD COLUMN corrected_by INT NULL AFTER correction_count,
    ADD COLUMN corrected_at TIMESTAMP NULL AFTER corrected_by,
    ADD INDEX idx_attendance_student_status (student_id, status),
    ADD INDEX idx_attendance_session_status (session_id, status);

CREATE TABLE IF NOT EXISTS attendance_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    status_key VARCHAR(30) NOT NULL,
    label VARCHAR(50) NOT NULL,
    counts_as_present TINYINT(1) NOT NULL DEFAULT 0,
    excluded_from_denominator TINYINT(1) NOT NULL DEFAULT 0,
    requires_note TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_attendance_status (institute_id, status_key),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO attendance_statuses
    (institute_id, status_key, label, counts_as_present, excluded_from_denominator, requires_note, sort_order, is_active)
VALUES
    (1, 'present', 'Present', 1, 0, 0, 10, 1),
    (1, 'late', 'Late', 1, 0, 0, 20, 1),
    (1, 'absent', 'Absent', 0, 0, 0, 30, 1),
    (1, 'excused', 'Excused', 0, 1, 0, 40, 1);

INSERT IGNORE INTO system_settings (institute_id, setting_key, setting_value)
VALUES (1, 'attendance_policy', '{"threshold_percentage":80,"correction_window_hours":48,"formula":"(present + late) / (total sessions - excused) * 100","attendance_unit":"session"}');

UPDATE training_sessions
SET submitted_at = COALESCE(submitted_at, created_at)
WHERE status = 'submitted' AND submitted_at IS NULL;

UPDATE training_sessions
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

UPDATE attendance_records ar
JOIN training_sessions ts ON ts.id = ar.session_id
SET ar.submitted_at = COALESCE(ar.submitted_at, ts.submitted_at)
WHERE ts.status = 'submitted' AND ar.submitted_at IS NULL;

UPDATE attendance_records
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
