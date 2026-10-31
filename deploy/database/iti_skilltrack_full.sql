-- ==============================================================================
-- ITI SkillTrack: Full Production Database Schema & Pilot Seed Data
-- Target Database: MySQL 8.x / MariaDB (InnoDB, UTF-8 MB4)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Institutes
CREATE TABLE IF NOT EXISTS institutes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Trades
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_trade_code (institute_id, code),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Academic Periods
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

-- 5. Batches
CREATE TABLE IF NOT EXISTS batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trade_id INT NOT NULL,
    academic_period_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(20) NOT NULL DEFAULT 'A',
    shift VARCHAR(50) NOT NULL DEFAULT 'Morning',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE RESTRICT,
    FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    description TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. User Roles Mapping
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    institute_id INT NOT NULL,
    admission_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    phone VARCHAR(20) NULL,
    emergency_contact VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Instructors
CREATE TABLE IF NOT EXISTS instructors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    institute_id INT NOT NULL,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL DEFAULT 'Vocational Instructor',
    phone VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Student Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    roll_no VARCHAR(50) NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_batch (student_id, batch_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Instructor Assignments
CREATE TABLE IF NOT EXISTS instructor_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT NOT NULL,
    batch_id INT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'primary_instructor',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_instructor_batch (instructor_id, batch_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Modules
CREATE TABLE IF NOT EXISTS modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trade_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_module_code (trade_id, code),
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Practical Activities
CREATE TABLE IF NOT EXISTS practical_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT NULL,
    safety_guidelines TEXT NULL,
    estimated_minutes INT NOT NULL DEFAULT 120,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_activity_code (module_id, code),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Competency Criteria
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

-- 16. Training Sessions (Phase 3 Upgrade)
CREATE TABLE IF NOT EXISTS training_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    instructor_id INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(255) NOT NULL,
    session_type VARCHAR(30) NOT NULL DEFAULT 'practical',
    notes TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    submitted_at TIMESTAMP NULL,
    submitted_by INT NULL,
    cancelled_at TIMESTAMP NULL,
    cancelled_by INT NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sessions_batch_date (batch_id, session_date),
    INDEX idx_sessions_instructor_date (instructor_id, session_date),
    INDEX idx_sessions_status (status),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Attendance Records (Phase 3 Upgrade)
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    status_note TEXT NULL,
    marked_by INT NOT NULL,
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    correction_reason TEXT NULL,
    correction_count INT NOT NULL DEFAULT 0,
    corrected_by INT NULL,
    corrected_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_session_student (session_id, student_id),
    INDEX idx_attendance_student_status (student_id, status),
    INDEX idx_attendance_session_status (session_id, status),
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Attendance Statuses (Phase 3)
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

-- 19. Practical Activity Attempts
CREATE TABLE IF NOT EXISTS activity_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    activity_id INT NOT NULL,
    attempt_no INT NOT NULL DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    UNIQUE KEY uk_student_activity_attempt (student_id, activity_id, attempt_no),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Assessments
CREATE TABLE IF NOT EXISTS assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL UNIQUE,
    assessor_id INT NOT NULL,
    total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'submitted',
    verdict VARCHAR(30) NOT NULL DEFAULT 'pending',
    safety_passed TINYINT(1) NOT NULL DEFAULT 0,
    feedback TEXT NULL,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES activity_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (assessor_id) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Assessment Criterion Results
CREATE TABLE IF NOT EXISTS assessment_criterion_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    criterion_id INT NOT NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    UNIQUE KEY uk_assessment_criterion (assessment_id, criterion_id),
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (criterion_id) REFERENCES competency_criteria(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Remedial Assignments
CREATE TABLE IF NOT EXISTS remedial_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    activity_id INT NOT NULL,
    instructor_id INT NOT NULL,
    reason TEXT NOT NULL,
    target_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'assigned',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES practical_activities(id) ON DELETE RESTRICT,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Remedial Reviews
CREATE TABLE IF NOT EXISTS remedial_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remedial_assignment_id INT NOT NULL UNIQUE,
    reviewed_by INT NOT NULL,
    verdict VARCHAR(30) NOT NULL,
    notes TEXT NULL,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (remedial_assignment_id) REFERENCES remedial_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    institute_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    institute_id INT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_institute_setting (institute_id, setting_key),
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Migration Tracking
CREATE TABLE IF NOT EXISTS _migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- PILOT SEED DATA
-- Default Demo Password: Password@123
-- Hash: $2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i
-- ==============================================================================

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

-- Users (All use Password@123)
INSERT INTO users (id, institute_id, email, username, password_hash, role, status) VALUES
(1, 1, 'admin@itiskilltrack.org', 'admin', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'administrator', 'active'),
(2, 1, 'rajesh.sharma@itiskilltrack.org', 'instructor', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'instructor', 'active'),
(101, 1, 'amit.kumar@student.iti.org', 'student', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'student', 'active'),
(102, 1, 'priya.verma@student.iti.org', 'priya', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'student', 'active'),
(103, 1, 'rahul.singh@student.iti.org', 'rahul', '$2y$10$SffSxzyHI2Iskr/LlZ2Y4upGl6mXdWrc0PuZrvMlotTI7UT4mOC2i', 'student', 'active')
ON DUPLICATE KEY UPDATE email=VALUES(email), password_hash=VALUES(password_hash);

-- Role Assignments
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1),
(2, 2),
(101, 3),
(102, 3),
(103, 3)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- Instructors
INSERT INTO instructors (id, user_id, institute_id, employee_code, name, designation, phone, status) VALUES
(1, 2, 1, 'EMP-ELE-01', 'Rajesh Sharma', 'Senior Vocational Instructor', '9876543210', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Instructor Batch Assignment
INSERT INTO instructor_assignments (id, instructor_id, batch_id, role, status) VALUES
(1, 1, 1, 'primary_instructor', 'active')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Students
INSERT INTO students (id, user_id, institute_id, admission_no, name, gender, category, phone, status) VALUES
(1, 101, 1, 'ADM-2026-001', 'Amit Kumar', 'male', 'General', '9876543201', 'active'),
(2, 102, 1, 'ADM-2026-002', 'Priya Verma', 'female', 'OBC', '9876543202', 'active'),
(3, 103, 1, 'ADM-2026-003', 'Rahul Singh', 'male', 'SC', '9876543203', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Enrollments
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

-- Competency Criteria
INSERT INTO competency_criteria (id, activity_id, code, description, is_safety_critical, weight, max_points) VALUES
(1, 1, 'CRIT-101-1', 'PPE inspection and wearing adherence', 1, 25, 5),
(2, 1, 'CRIT-101-2', 'Correct tool selection and insulation check', 0, 25, 5),
(3, 1, 'CRIT-101-3', 'Wire stripping technique without nicking core', 0, 25, 5),
(4, 1, 'CRIT-101-4', 'Workshop safety and tool storage protocol', 1, 25, 5)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Attendance Statuses (Phase 3)
INSERT INTO attendance_statuses
    (id, institute_id, status_key, label, counts_as_present, excluded_from_denominator, requires_note, sort_order, is_active)
VALUES
    (1, 1, 'present', 'Present', 1, 0, 0, 10, 1),
    (2, 1, 'late', 'Late', 1, 0, 0, 20, 1),
    (3, 1, 'absent', 'Absent', 0, 0, 0, 30, 1),
    (4, 1, 'excused', 'Excused', 0, 1, 0, 40, 1)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- System Settings
INSERT INTO system_settings (id, institute_id, setting_key, setting_value)
VALUES (1, 1, 'attendance_policy', '{"threshold_percentage":80,"correction_window_hours":48,"formula":"(present + late) / (total sessions - excused) * 100","attendance_unit":"session"}')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- Training Sessions
INSERT INTO training_sessions
    (id, batch_id, instructor_id, session_date, start_time, end_time, topic, session_type, notes, status, submitted_at, submitted_by, created_at, updated_at)
VALUES
(1, 1, 1, '2026-10-27', '09:00:00', '13:00:00', 'Practical Lab: Hand Tool Inspection & PPE Safety', 'practical', 'Pilot lab session.', 'submitted', '2026-10-27 13:15:00', 2, '2026-10-27 09:00:00', '2026-10-27 13:15:00'),
(2, 1, 1, '2026-10-28', '09:00:00', '13:00:00', 'Practical Lab: Western Union Wire Jointing', 'practical', 'Pilot lab session.', 'submitted', '2026-10-28 13:10:00', 2, '2026-10-28 09:00:00', '2026-10-28 13:10:00'),
(3, 1, 1, '2026-10-29', '09:00:00', '13:00:00', 'Practical Lab: Staircase Wiring Installation', 'practical', 'In progress.', 'draft', NULL, NULL, '2026-10-29 09:00:00', '2026-10-29 09:00:00')
ON DUPLICATE KEY UPDATE topic=VALUES(topic), status=VALUES(status), submitted_at=VALUES(submitted_at);

-- Attendance Records
INSERT INTO attendance_records
    (id, session_id, student_id, status, status_note, marked_by, marked_at, submitted_at, created_at, updated_at)
VALUES
(1, 1, 1, 'present', NULL, 2, '2026-10-27 09:05:00', '2026-10-27 13:15:00', '2026-10-27 09:05:00', '2026-10-27 13:15:00'),
(2, 1, 2, 'present', NULL, 2, '2026-10-27 09:05:00', '2026-10-27 13:15:00', '2026-10-27 09:05:00', '2026-10-27 13:15:00'),
(3, 1, 3, 'late', 'Bus delay reported', 2, '2026-10-27 09:25:00', '2026-10-27 13:15:00', '2026-10-27 09:25:00', '2026-10-27 13:15:00'),
(4, 2, 1, 'present', NULL, 2, '2026-10-28 09:05:00', '2026-10-28 13:10:00', '2026-10-28 09:05:00', '2026-10-28 13:10:00'),
(5, 2, 2, 'present', NULL, 2, '2026-10-28 09:05:00', '2026-10-28 13:10:00', '2026-10-28 09:05:00', '2026-10-28 13:10:00'),
(6, 2, 3, 'present', NULL, 2, '2026-10-28 09:05:00', '2026-10-28 13:10:00', '2026-10-28 09:05:00', '2026-10-28 13:10:00'),
(7, 3, 1, 'present', NULL, 2, '2026-10-29 09:05:00', NULL, '2026-10-29 09:05:00', '2026-10-29 09:05:00'),
(8, 3, 2, 'absent', NULL, 2, '2026-10-29 09:05:00', NULL, '2026-10-29 09:05:00', '2026-10-29 09:05:00')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Migrations Executed
INSERT INTO _migrations (id, migration, executed_at) VALUES
(1, '001_initial_schema.sql', CURRENT_TIMESTAMP),
(2, '002_phase3_attendance.sql', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE executed_at=VALUES(executed_at);

SET FOREIGN_KEY_CHECKS = 1;

