-- ITI SkillTrack: Initial Database Baseline Schema
-- Target: MySQL 8.x / MariaDB (InnoDB, UTF-8 MB4)

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS institutes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    department_id INT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    nsqf_level INT NOT NULL DEFAULT 4,
    duration_years INT NOT NULL DEFAULT 2,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_trade_code (institute_id, code),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS academic_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trade_id INT NOT NULL,
    academic_period_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(20) NOT NULL DEFAULT 'A',
    shift VARCHAR(50) NOT NULL DEFAULT 'Morning',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE RESTRICT,
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    email VARCHAR(191) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users_email (institute_id, email),
    UNIQUE KEY uk_users_username (institute_id, username),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    scope_type VARCHAR(50) NOT NULL DEFAULT 'institute',
    scope_id INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    institute_id INT NOT NULL,
    admission_no VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    gender VARCHAR(20) NOT NULL DEFAULT 'other',
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    phone VARCHAR(30) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_admission_no (institute_id, admission_no),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS instructors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    institute_id INT NOT NULL,
    employee_code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    qualification VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_employee_code (institute_id, employee_code),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_enrollment (student_id, batch_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS instructor_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT NOT NULL,
    batch_id INT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_instructor_assignment (instructor_id, batch_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trade_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_module_code (trade_id, code),
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS practical_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_activity_code (module_id, code),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS competency_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_safety_critical TINYINT(1) NOT NULL DEFAULT 0,
    weight INT NOT NULL DEFAULT 25,
    max_points INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_criteria_code (activity_id, code),
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    instructor_id INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    marked_by INT NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    correction_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_session_student (session_id, student_id),
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    activity_id INT NOT NULL,
    attempt_no INT NOT NULL DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_activity_attempt (student_id, activity_id, attempt_no),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    assessor_id INT NOT NULL,
    total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    max_possible DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    derived_status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    feedback TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES activity_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (assessor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_criterion_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    criterion_id INT NOT NULL,
    result_value INT NOT NULL,
    result_status VARCHAR(30) NOT NULL DEFAULT 'assessed',
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (criterion_id) REFERENCES competency_criteria(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remedial_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    activity_id INT NOT NULL,
    assigned_by INT NOT NULL,
    reason TEXT NOT NULL,
    instructions TEXT NOT NULL,
    due_on DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS remedial_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remedial_assignment_id INT NOT NULL,
    reviewed_by INT NOT NULL,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    outcome VARCHAR(50) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (remedial_assignment_id) REFERENCES remedial_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NOT NULL,
    request_id VARCHAR(100) NOT NULL,
    before_json JSON NULL,
    after_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_settings (institute_id, setting_key),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
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
-- ITI SkillTrack: Pilot Seed Data for Electrician Trade Batch EL-2026-A
-- Password for all seed demo users is: Password@123
-- Hash: $2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO institutes (id, name, code, timezone, status)
VALUES (1, 'Model Industrial Training Institute', 'ITI-MODEL-01', 'Asia/Kolkata', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO departments (id, institute_id, name, code)
VALUES (1, 1, 'Electrical Engineering Trades', 'DEPT-ELE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO trades (id, institute_id, department_id, name, code, nsqf_level, duration_years, status)
VALUES (1, 1, 1, 'Electrician', 'ELE-01', 4, 2, 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO academic_periods (id, institute_id, name, starts_on, ends_on, status)
VALUES (1, 1, '2026-2027 Academic Session', '2026-08-01', '2027-07-31', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO batches (id, trade_id, academic_period_id, name, section, shift, status)
VALUES (1, 1, 1, 'EL-2026-A', 'A', 'Morning (08:30 - 15:30)', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO roles (id, `key`, label, description) VALUES
(1, 'administrator', 'Institute Administrator', 'Manage institute configuration, batches, staff, reports, and security.'),
(2, 'instructor', 'Vocational Instructor', 'Manage practical labs, record attendance, assess competency rubrics.'),
(3, 'student', 'Enrolled Trainee', 'View personal attendance, completed practicals, and remedial tasks.'),
(4, 'monitoring_officer', 'Monitoring Officer', 'Read-only aggregate oversight across institute trades.')
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- Users
-- Password is Password@123 (hashed)
INSERT INTO users (id, institute_id, email, username, password_hash, role, status) VALUES
(1, 1, 'admin@itiskilltrack.org', 'admin', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'administrator', 'active'),
(2, 1, 'rajesh.sharma@itiskilltrack.org', 'instructor', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'instructor', 'active'),
(101, 1, 'amit.kumar@student.iti.org', 'student', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'student', 'active'),
(102, 1, 'priya.verma@student.iti.org', 'priya', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'student', 'active'),
(103, 1, 'rahul.singh@student.iti.org', 'rahul', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'student', 'active')
ON DUPLICATE KEY UPDATE username=VALUES(username);

INSERT INTO instructors (id, user_id, institute_id, employee_code, name, qualification, status)
VALUES (1, 2, 1, 'EMP-ITI-042', 'Rajesh Sharma', 'Diploma in Electrical Engg + CITS', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO instructor_assignments (id, instructor_id, batch_id, starts_on)
VALUES (1, 1, 1, '2026-08-01')
ON DUPLICATE KEY UPDATE starts_on=VALUES(starts_on);

INSERT INTO students (id, user_id, institute_id, admission_no, name, gender, category, phone, status) VALUES
(1, 101, 1, 'ADM-2026-001', 'Amit Kumar', 'male', 'General', '9876543201', 'active'),
(2, 102, 1, 'ADM-2026-002', 'Priya Verma', 'female', 'OBC', '9876543202', 'active'),
(3, 103, 1, 'ADM-2026-003', 'Rahul Singh', 'male', 'SC', '9876543203', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO enrollments (id, student_id, batch_id, starts_on, status) VALUES
(1, 1, 1, '2026-08-01', 'active'),
(2, 2, 1, '2026-08-01', 'active'),
(3, 3, 1, '2026-08-01', 'active')
ON DUPLICATE KEY UPDATE starts_on=VALUES(starts_on);

-- Modules
INSERT INTO modules (id, trade_id, code, title, sequence_no, status) VALUES
(1, 1, 'MOD-ELE-01', 'Workshop Safety and Basic Electrical Tools', 1, 'active'),
(2, 1, 'MOD-ELE-02', 'Domestic Wiring and Electrical Circuits', 2, 'active'),
(3, 1, 'MOD-ELE-03', 'AC Machines and Motor Starters', 3, 'active')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Practical Activities
INSERT INTO practical_activities (id, module_id, code, title, instructions, status) VALUES
(1, 1, 'ACT-ELE-101', 'Identification and Handling of Electrical Hand Tools & PPE', 'Demonstrate safe tool inspection and PPE adherence.', 'active'),
(2, 1, 'ACT-ELE-102', 'Making Western Union and Married Joints in Copper Conductors', 'Twist, solder, and insulate single-strand copper cables.', 'active'),
(3, 2, 'ACT-ELE-201', 'Staircase Wiring Circuit with Two-Way Switches', 'Wire two-way lighting circuit and test insulation resistance.', 'active'),
(4, 2, 'ACT-ELE-202', 'Installation and Testing of MCB and RCCB', 'Mount and test DIN-rail MCB and measure earth-leakage trip time.', 'active'),
(5, 3, 'ACT-ELE-301', 'DOL Starter Wiring for 3-Phase Induction Motor', 'Connect DOL contactor, calibrate overload relay, and test motor rotation.', 'active')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Competency Criteria for ACT-ELE-101
INSERT INTO competency_criteria (id, activity_id, code, description, is_safety_critical, weight, max_points) VALUES
(1, 1, 'CRIT-101-1', 'PPE inspection and wearing adherence', 1, 25, 5),
(2, 1, 'CRIT-101-2', 'Correct tool selection and insulation check', 0, 25, 5),
(3, 1, 'CRIT-101-3', 'Wire stripping technique without nicking core', 0, 25, 5),
(4, 1, 'CRIT-101-4', 'Workshop safety and tool storage protocol', 1, 25, 5)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Training Sessions
INSERT INTO training_sessions
    (id, batch_id, instructor_id, session_date, start_time, end_time, topic, session_type, notes, status, submitted_at, submitted_by, updated_at)
VALUES
(1, 1, 1, '2026-10-27', '09:00:00', '13:00:00', 'Practical Lab: Hand Tool Inspection & PPE Safety', 'practical', 'Pilot lab session.', 'submitted', '2026-10-27 13:15:00', 2, '2026-10-27 13:15:00'),
(2, 1, 1, '2026-10-28', '09:00:00', '13:00:00', 'Practical Lab: Western Union Wire Jointing', 'practical', 'Pilot lab session.', 'submitted', '2026-10-28 13:10:00', 2, '2026-10-28 13:10:00'),
(3, 1, 1, '2026-10-29', '09:00:00', '13:00:00', 'Practical Lab: Staircase Wiring Installation', 'practical', 'In progress.', 'draft', NULL, NULL, '2026-10-29 09:00:00')
ON DUPLICATE KEY UPDATE topic=VALUES(topic), status=VALUES(status), submitted_at=VALUES(submitted_at), updated_at=VALUES(updated_at);

-- Attendance Records
INSERT INTO attendance_records
    (id, session_id, student_id, status, marked_by, marked_at, submitted_at, updated_at)
VALUES
(1, 1, 1, 'present', 2, '2026-10-27 09:05:00', '2026-10-27 13:15:00', '2026-10-27 13:15:00'),
(2, 1, 2, 'present', 2, '2026-10-27 09:05:00', '2026-10-27 13:15:00', '2026-10-27 13:15:00'),
(3, 1, 3, 'late', 2, '2026-10-27 09:25:00', '2026-10-27 13:15:00', '2026-10-27 13:15:00'),
(4, 2, 1, 'present', 2, '2026-10-28 09:05:00', '2026-10-28 13:10:00', '2026-10-28 13:10:00'),
(5, 2, 2, 'present', 2, '2026-10-28 09:05:00', '2026-10-28 13:10:00', '2026-10-28 13:10:00'),
(6, 2, 3, 'present', 2, '2026-10-28 09:05:00', '2026-10-28 13:10:00', '2026-10-28 13:10:00'),
(7, 3, 1, 'present', 2, '2026-10-29 09:05:00', NULL, '2026-10-29 09:05:00'),
(8, 3, 2, 'absent', 2, '2026-10-29 09:05:00', NULL, '2026-10-29 09:05:00')
ON DUPLICATE KEY UPDATE status=VALUES(status), updated_at=VALUES(updated_at);

SET FOREIGN_KEY_CHECKS = 1;
-- Phase 4 & Phase 5: Practical Competency, Assessments, Remedial & Evidence Hardening
-- Target: MySQL 8.x / MariaDB

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Upgrade practical_activities: add rubric_version, expected_duration_minutes, max_score
ALTER TABLE practical_activities
    ADD COLUMN rubric_version INT NOT NULL DEFAULT 1 AFTER instructions,
    ADD COLUMN expected_duration_minutes INT NOT NULL DEFAULT 120 AFTER rubric_version,
    ADD COLUMN max_score DECIMAL(5,2) NOT NULL DEFAULT 20.00 AFTER expected_duration_minutes,
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status,
    ADD INDEX idx_activities_module (module_id, status);

-- 2. Upgrade competency_criteria: add min_pass_score, sort_order
ALTER TABLE competency_criteria
    ADD COLUMN min_pass_score INT NOT NULL DEFAULT 3 AFTER max_points,
    ADD COLUMN sort_order INT NOT NULL DEFAULT 1 AFTER min_pass_score,
    ADD INDEX idx_criteria_activity (activity_id);

-- 3. Upgrade activity_attempts: add assessor_id, completed_at
ALTER TABLE activity_attempts
    ADD COLUMN completed_at TIMESTAMP NULL AFTER started_at,
    ADD COLUMN batch_id INT NULL AFTER activity_id,
    ADD INDEX idx_attempts_student (student_id, activity_id),
    ADD INDEX idx_attempts_status (status);

-- 4. Upgrade assessments: add correction_reason, corrected_at, corrected_by
ALTER TABLE assessments
    ADD COLUMN passed_safety TINYINT(1) NOT NULL DEFAULT 0 AFTER percentage,
    ADD COLUMN correction_reason TEXT NULL AFTER feedback,
    ADD COLUMN corrected_by INT NULL AFTER correction_reason,
    ADD COLUMN corrected_at TIMESTAMP NULL AFTER corrected_by,
    ADD INDEX idx_assessments_attempt (attempt_id),
    ADD INDEX idx_assessments_assessor (assessor_id),
    ADD INDEX idx_assessments_status (derived_status);

-- 5. Upgrade remedial_assignments: add follow_up_reason, completed_at, resolved_by
ALTER TABLE remedial_assignments
    ADD COLUMN batch_id INT NULL AFTER activity_id,
    ADD COLUMN follow_up_type VARCHAR(50) NOT NULL DEFAULT 'safety_gap' AFTER reason,
    ADD COLUMN completed_at TIMESTAMP NULL AFTER due_on,
    ADD COLUMN resolved_by INT NULL AFTER completed_at,
    ADD INDEX idx_remedial_student (student_id, status),
    ADD INDEX idx_remedial_activity (activity_id);

-- 6. Evidence uploads table for DEC-08
CREATE TABLE IF NOT EXISTS evidence_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    attempt_id INT NULL,
    assessment_id INT NULL,
    uploaded_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (attempt_id) REFERENCES activity_attempts(id) ON DELETE SET NULL,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Add Competency policy setting to system_settings
INSERT INTO system_settings (institute_id, setting_key, setting_value)
VALUES (1, 'competency_policy', '{"safety_min_score":4,"min_passing_percentage":75.0,"scale":["competent","needs_practice","not_attempted"],"rubric_scale_max":5,"remedial_trigger_on_fail":true}')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- 8. Populate complete Competency Criteria for all 5 Pilot Practical Activities
INSERT INTO competency_criteria (id, activity_id, code, description, is_safety_critical, weight, max_points, min_pass_score, sort_order)
VALUES
    -- ACT-ELE-101 (Already has 1-4, update / expand)
    (1, 1, 'CRIT-101-1', 'Inspection and proper wearing of Personal Protective Equipment (PPE)', 1, 25, 5, 4, 1),
    (2, 1, 'CRIT-101-2', 'Correct tool selection and insulation rating check (1000V rated tools)', 0, 25, 5, 3, 2),
    (3, 1, 'CRIT-101-3', 'Wire stripping technique without nicking conductor strands', 0, 25, 5, 3, 3),
    (4, 1, 'CRIT-101-4', 'Workshop housekeeping, tool return and lockout awareness', 1, 25, 5, 4, 4),
    -- ACT-ELE-102
    (5, 2, 'CRIT-102-1', 'Cable strand preparation and cleaning of oxidation layer', 0, 25, 5, 3, 1),
    (6, 2, 'CRIT-102-2', 'Tight, uniform twist turns per specifications without gaps', 0, 25, 5, 3, 2),
    (7, 2, 'CRIT-102-3', 'Proper soldering technique, heat control and flux application', 1, 25, 5, 4, 3),
    (8, 2, 'CRIT-102-4', 'Insulation taping with proper overlap and moisture seal', 0, 25, 5, 3, 4),
    -- ACT-ELE-201
    (9, 3, 'CRIT-201-1', 'Circuit layout schematic interpretation and component marking', 0, 25, 5, 3, 1),
    (10, 3, 'CRIT-201-2', 'De-energized condition verification before circuit wiring', 1, 25, 5, 4, 2),
    (11, 3, 'CRIT-201-3', 'Correct polarity of phase wire connected through two-way switches', 1, 25, 5, 4, 3),
    (12, 3, 'CRIT-201-4', 'Functional testing of independent 2-point lamp switching', 0, 25, 5, 3, 4),
    -- ACT-ELE-202
    (13, 4, 'CRIT-202-1', 'DIN rail mounting and secure physical fastening of MCB/RCCB', 0, 25, 5, 3, 1),
    (14, 4, 'CRIT-202-2', 'Strict observation of Line (In) and Load (Out) terminal markings', 1, 25, 5, 4, 2),
    (15, 4, 'CRIT-202-3', 'Earth leakage sensitivity test with test push-button under load', 1, 25, 5, 4, 3),
    (16, 4, 'CRIT-202-4', 'Insulation resistance measurement between live conductors and earth', 0, 25, 5, 3, 4),
    -- ACT-ELE-301
    (17, 5, 'CRIT-301-1', 'De-energized verification, Lockout/Tagout (LOTO) key adherence', 1, 25, 5, 4, 1),
    (18, 5, 'CRIT-301-2', 'Control circuit wiring: NO start, NC stop push-buttons & holding contact', 0, 25, 5, 3, 2),
    (19, 5, 'CRIT-301-3', 'Thermal Overload Relay (O/L) calibration based on motor full-load current', 1, 25, 5, 4, 3),
    (20, 5, 'CRIT-301-4', 'Power circuit wiring and motor rotational direction check', 0, 25, 5, 3, 4)
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    is_safety_critical = VALUES(is_safety_critical),
    weight = VALUES(weight),
    max_points = VALUES(max_points),
    min_pass_score = VALUES(min_pass_score),
    sort_order = VALUES(sort_order);

-- 9. Seed realistic initial Activity Attempts and Assessments for Pilot Students
-- Amit Kumar (student_id = 1) attempts ACT-ELE-101 and passes (Competent)
INSERT INTO activity_attempts (id, student_id, activity_id, batch_id, attempt_no, started_at, completed_at, status, notes)
VALUES
    (1, 1, 1, 1, 1, '2026-10-27 09:30:00', '2026-10-27 11:30:00', 'assessed', 'First lab practical attempt completed smoothly.'),
    (2, 2, 1, 1, 1, '2026-10-27 09:30:00', '2026-10-27 11:45:00', 'assessed', 'Completed with good PPE awareness.'),
    (3, 3, 1, 1, 1, '2026-10-27 09:30:00', '2026-10-27 12:00:00', 'assessed', 'Struggled with safety glove protocol; needs remedial practice.'),
    (4, 1, 2, 1, 1, '2026-10-28 09:30:00', '2026-10-28 12:15:00', 'assessed', 'Excellent joint soldering.')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Assessments (DEC-05: safety >= 4/5 AND score >= 75% -> competent)
INSERT INTO assessments (id, attempt_id, assessor_id, total_score, max_possible, percentage, passed_safety, derived_status, assessed_at, status, feedback)
VALUES
    -- Amit: Score 18/20 = 90%, Safety both 5/5 -> competent
    (1, 1, 2, 18.00, 20.00, 90.00, 1, 'competent', '2026-10-27 12:00:00', 'submitted', 'Demonstrated exceptional safety compliance and precise tool handling.'),
    -- Priya: Score 16/20 = 80%, Safety 4/5 & 4/5 -> competent
    (2, 2, 2, 16.00, 20.00, 80.00, 1, 'competent', '2026-10-27 12:15:00', 'submitted', 'Good hand coordination and safe workshop practice.'),
    -- Rahul: Score 11/20 = 55%, Safety CRIT-101-1 is 2/5 (Failed Safety) -> needs_practice
    (3, 3, 2, 11.00, 20.00, 55.00, 0, 'needs_practice', '2026-10-27 12:30:00', 'submitted', 'Failed mandatory PPE compliance during wire cutting. Remedial practice assigned.'),
    -- Amit ACT-ELE-102: Score 17/20 = 85%, Safety 4/5 -> competent
    (4, 4, 2, 17.00, 20.00, 85.00, 1, 'competent', '2026-10-28 12:30:00', 'submitted', 'Clean solder finish, uniform mechanical twist.')
ON DUPLICATE KEY UPDATE total_score=VALUES(total_score), percentage=VALUES(percentage), derived_status=VALUES(derived_status);

-- Assessment Criterion Results
INSERT INTO assessment_criterion_results (id, assessment_id, criterion_id, result_value, result_status, comment)
VALUES
    -- Assessment 1 (Amit)
    (1, 1, 1, 5, 'assessed', '100% compliant with safety helmet & insulated gloves'),
    (2, 1, 2, 4, 'assessed', 'Correct tool choice; insulation intact'),
    (3, 1, 3, 4, 'assessed', 'Clean strip, zero conductor score marks'),
    (4, 1, 4, 5, 'assessed', 'Cleaned bench and returned tools properly'),
    -- Assessment 2 (Priya)
    (5, 2, 1, 4, 'assessed', 'Satisfactory PPE adherence'),
    (6, 2, 2, 4, 'assessed', 'Good tool handling'),
    (7, 2, 3, 4, 'assessed', 'Minor nick on insulation but acceptable'),
    (8, 2, 4, 4, 'assessed', 'Tool bench left clean'),
    -- Assessment 3 (Rahul - Failed safety)
    (9, 3, 1, 2, 'assessed', 'Removed safety goggles and gloves without instructor permission'),
    (10, 3, 2, 3, 'assessed', 'Used uninsulated cutter initially'),
    (11, 3, 3, 3, 'assessed', 'Strand nicked during stripping'),
    (12, 3, 4, 3, 'assessed', 'Left scraps on floor'),
    -- Assessment 4 (Amit ACT-ELE-102)
    (13, 4, 5, 4, 'assessed', 'Thorough deoxidization'),
    (14, 4, 6, 4, 'assessed', 'Uniform twist turns'),
    (15, 4, 7, 5, 'assessed', 'Perfect solder wetting and heat balance'),
    (16, 4, 8, 4, 'assessed', 'Double tape wrap completed')
ON DUPLICATE KEY UPDATE result_value=VALUES(result_value);

-- 10. Remedial Assignment for Rahul Singh (Triggered by needs_practice)
INSERT INTO remedial_assignments (id, student_id, activity_id, batch_id, assigned_by, reason, instructions, follow_up_type, due_on, status)
VALUES
    (1, 3, 1, 1, 2, 'Failed mandatory PPE compliance (scored 2/5 on CRIT-101-1) and wire stripping nicked conductor core.', 'Review ITI Electrician Safety Manual Chapter 1. Re-demonstrate 10 consecutive wire cuts wearing full insulated PPE in presence of instructor.', 'safety_gap', '2026-11-10', 'assigned')
ON DUPLICATE KEY UPDATE reason=VALUES(reason), status=VALUES(status);

SET FOREIGN_KEY_CHECKS = 1;
