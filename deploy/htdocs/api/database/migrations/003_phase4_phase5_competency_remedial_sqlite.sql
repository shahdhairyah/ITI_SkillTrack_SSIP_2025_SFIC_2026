-- Phase 4 & Phase 5: Practical Competency, Assessments, Remedial & Evidence Hardening (SQLite version)

-- 1. Evidence uploads table for DEC-08
CREATE TABLE IF NOT EXISTS evidence_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institute_id INTEGER NOT NULL,
    attempt_id INTEGER NULL,
    assessment_id INTEGER NULL,
    uploaded_by INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institute_id) REFERENCES institutes(id) ON DELETE CASCADE,
    FOREIGN KEY (attempt_id) REFERENCES activity_attempts(id) ON DELETE SET NULL,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 2. Competency Policy Setting
INSERT OR REPLACE INTO system_settings (institute_id, setting_key, setting_value)
VALUES (1, 'competency_policy', '{"safety_min_score":4,"min_passing_percentage":75.0,"scale":["competent","needs_practice","not_attempted"],"rubric_scale_max":5,"remedial_trigger_on_fail":true}');

-- 3. Populate complete Competency Criteria for all 5 Pilot Practical Activities
INSERT OR REPLACE INTO competency_criteria (id, activity_id, code, description, is_safety_critical, weight, max_points)
VALUES
    (1, 1, 'CRIT-101-1', 'Inspection and proper wearing of Personal Protective Equipment (PPE)', 1, 25, 5),
    (2, 1, 'CRIT-101-2', 'Correct tool selection and insulation rating check (1000V rated tools)', 0, 25, 5),
    (3, 1, 'CRIT-101-3', 'Wire stripping technique without nicking conductor strands', 0, 25, 5),
    (4, 1, 'CRIT-101-4', 'Workshop housekeeping, tool return and lockout awareness', 1, 25, 5),
    (5, 2, 'CRIT-102-1', 'Cable strand preparation and cleaning of oxidation layer', 0, 25, 5),
    (6, 2, 'CRIT-102-2', 'Tight, uniform twist turns per specifications without gaps', 0, 25, 5),
    (7, 2, 'CRIT-102-3', 'Proper soldering technique, heat control and flux application', 1, 25, 5),
    (8, 2, 'CRIT-102-4', 'Insulation taping with proper overlap and moisture seal', 0, 25, 5),
    (9, 3, 'CRIT-201-1', 'Circuit layout schematic interpretation and component marking', 0, 25, 5),
    (10, 3, 'CRIT-201-2', 'De-energized condition verification before circuit wiring', 1, 25, 5),
    (11, 3, 'CRIT-201-3', 'Correct polarity of phase wire connected through two-way switches', 1, 25, 5),
    (12, 3, 'CRIT-201-4', 'Functional testing of independent 2-point lamp switching', 0, 25, 5),
    (13, 4, 'CRIT-202-1', 'DIN rail mounting and secure physical fastening of MCB/RCCB', 0, 25, 5),
    (14, 4, 'CRIT-202-2', 'Strict observation of Line (In) and Load (Out) terminal markings', 1, 25, 5),
    (15, 4, 'CRIT-202-3', 'Earth leakage sensitivity test with test push-button under load', 1, 25, 5),
    (16, 4, 'CRIT-202-4', 'Insulation resistance measurement between live conductors and earth', 0, 25, 5),
    (17, 5, 'CRIT-301-1', 'De-energized verification, Lockout/Tagout (LOTO) key adherence', 1, 25, 5),
    (18, 5, 'CRIT-301-2', 'Control circuit wiring: NO start, NC stop push-buttons & holding contact', 0, 25, 5),
    (19, 5, 'CRIT-301-3', 'Thermal Overload Relay (O/L) calibration based on motor full-load current', 1, 25, 5),
    (20, 5, 'CRIT-301-4', 'Power circuit wiring and motor rotational direction check', 0, 25, 5);

-- 4. Seed initial Activity Attempts and Assessments
INSERT OR REPLACE INTO activity_attempts (id, student_id, activity_id, attempt_no, started_at, status, notes)
VALUES
    (1, 1, 1, 1, '2026-10-27 09:30:00', 'assessed', 'First lab practical attempt completed smoothly.'),
    (2, 2, 1, 1, '2026-10-27 09:30:00', 'assessed', 'Completed with good PPE awareness.'),
    (3, 3, 1, 1, '2026-10-27 09:30:00', 'assessed', 'Struggled with safety glove protocol; needs remedial practice.'),
    (4, 1, 2, 1, '2026-10-28 09:30:00', 'assessed', 'Excellent joint soldering.');

INSERT OR REPLACE INTO assessments (id, attempt_id, assessor_id, total_score, max_possible, percentage, derived_status, assessed_at, status, feedback)
VALUES
    (1, 1, 2, 18.00, 20.00, 90.00, 'competent', '2026-10-27 12:00:00', 'submitted', 'Demonstrated exceptional safety compliance and precise tool handling.'),
    (2, 2, 2, 16.00, 20.00, 80.00, 'competent', '2026-10-27 12:15:00', 'submitted', 'Good hand coordination and safe workshop practice.'),
    (3, 3, 2, 11.00, 20.00, 55.00, 'needs_practice', '2026-10-27 12:30:00', 'submitted', 'Failed mandatory PPE compliance during wire cutting. Remedial practice assigned.'),
    (4, 4, 2, 17.00, 20.00, 85.00, 'competent', '2026-10-28 12:30:00', 'submitted', 'Clean solder finish, uniform mechanical twist.');

INSERT OR REPLACE INTO assessment_criterion_results (id, assessment_id, criterion_id, result_value, result_status, comment)
VALUES
    (1, 1, 1, 5, 'assessed', '100% compliant with safety helmet & insulated gloves'),
    (2, 1, 2, 4, 'assessed', 'Correct tool choice; insulation intact'),
    (3, 1, 3, 4, 'assessed', 'Clean strip, zero conductor score marks'),
    (4, 1, 4, 5, 'assessed', 'Cleaned bench and returned tools properly'),
    (5, 2, 1, 4, 'assessed', 'Satisfactory PPE adherence'),
    (6, 2, 2, 4, 'assessed', 'Good tool handling'),
    (7, 2, 3, 4, 'assessed', 'Minor nick on insulation but acceptable'),
    (8, 2, 4, 4, 'assessed', 'Tool bench left clean'),
    (9, 3, 1, 2, 'assessed', 'Removed safety goggles and gloves without instructor permission'),
    (10, 3, 2, 3, 'assessed', 'Used uninsulated cutter initially'),
    (11, 3, 3, 3, 'assessed', 'Strand nicked during stripping'),
    (12, 3, 4, 3, 'assessed', 'Left scraps on floor'),
    (13, 4, 5, 4, 'assessed', 'Thorough deoxidization'),
    (14, 4, 6, 4, 'assessed', 'Uniform twist turns'),
    (15, 4, 7, 5, 'assessed', 'Perfect solder wetting and heat balance'),
    (16, 4, 8, 4, 'assessed', 'Double tape wrap completed');

INSERT OR REPLACE INTO remedial_assignments (id, student_id, activity_id, assigned_by, reason, instructions, due_on, status)
VALUES
    (1, 3, 1, 2, 'Failed mandatory PPE compliance (scored 2/5 on CRIT-101-1) and wire stripping nicked conductor core.', 'Review ITI Electrician Safety Manual Chapter 1. Re-demonstrate 10 consecutive wire cuts wearing full insulated PPE in presence of instructor.', '2026-11-10', 'assigned');

