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
