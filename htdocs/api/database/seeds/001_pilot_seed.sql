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
