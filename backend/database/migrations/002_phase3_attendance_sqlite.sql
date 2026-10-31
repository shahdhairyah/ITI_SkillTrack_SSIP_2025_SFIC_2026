-- Phase 3: Training Session and Attendance Register upgrades
-- Target: SQLite development / fallback database

PRAGMA foreign_keys = OFF;

ALTER TABLE training_sessions ADD COLUMN session_type TEXT NOT NULL DEFAULT 'practical';
ALTER TABLE training_sessions ADD COLUMN notes TEXT NULL;
ALTER TABLE training_sessions ADD COLUMN submitted_at DATETIME NULL;
ALTER TABLE training_sessions ADD COLUMN submitted_by INTEGER NULL;
ALTER TABLE training_sessions ADD COLUMN cancelled_at DATETIME NULL;
ALTER TABLE training_sessions ADD COLUMN cancelled_by INTEGER NULL;
ALTER TABLE training_sessions ADD COLUMN cancellation_reason TEXT NULL;
ALTER TABLE training_sessions ADD COLUMN updated_at DATETIME NULL;

ALTER TABLE attendance_records ADD COLUMN status_note TEXT NULL;
ALTER TABLE attendance_records ADD COLUMN correction_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN corrected_by INTEGER NULL;
ALTER TABLE attendance_records ADD COLUMN corrected_at DATETIME NULL;
ALTER TABLE attendance_records ADD COLUMN updated_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS attendance_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    status_key TEXT NOT NULL,
    label TEXT NOT NULL,
    counts_as_present INTEGER NOT NULL DEFAULT 0,
    excluded_from_denominator INTEGER NOT NULL DEFAULT 0,
    requires_note INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institute_id, status_key),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_batch_date ON training_sessions (batch_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_instructor_date ON training_sessions (instructor_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON training_sessions (status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_status ON attendance_records (student_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_session_status ON attendance_records (session_id, status);

INSERT OR IGNORE INTO attendance_statuses
    (institute_id, status_key, label, counts_as_present, excluded_from_denominator, requires_note, sort_order, is_active)
VALUES
    (1, 'present', 'Present', 1, 0, 0, 10, 1),
    (1, 'late', 'Late', 1, 0, 0, 20, 1),
    (1, 'absent', 'Absent', 0, 0, 0, 30, 1),
    (1, 'excused', 'Excused', 0, 1, 0, 40, 1);

INSERT OR IGNORE INTO system_settings (institute_id, setting_key, setting_value)
VALUES (1, 'attendance_policy', '{"threshold_percentage":80,"correction_window_hours":48,"formula":"(present + late) / (total sessions - excused) * 100","attendance_unit":"session"}');

UPDATE training_sessions
SET submitted_at = COALESCE(submitted_at, created_at)
WHERE status = 'submitted' AND submitted_at IS NULL;

UPDATE training_sessions
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

UPDATE attendance_records
SET submitted_at = (
    SELECT ts.submitted_at
    FROM training_sessions ts
    WHERE ts.id = attendance_records.session_id
)
WHERE submitted_at IS NULL
  AND session_id IN (SELECT id FROM training_sessions WHERE status = 'submitted');

UPDATE attendance_records
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

PRAGMA foreign_keys = ON;
