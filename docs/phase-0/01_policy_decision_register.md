# Phase 0 Deliverable: Policy Decision Register

**Project:** ITI SkillTrack — Digital Skill Training, Attendance and Competency Tracking System  
**Document ID:** PDR-2026-V1  
**Status:** Signed Off / Approved for Pilot  
**Target Institute:** Government Industrial Training Institute (Model Pilot Institute)  
**Effective Date:** 30 October 2026  

---

## 1. Summary of Decisions

This Policy Decision Register establishes the institutional invariants and operational rules for ITI SkillTrack. These decisions govern data modeling, authorization logic, attendance formulas, competency evaluations, and audit requirements.

| Decision ID | Area | Policy Decision Summary | Status | Task ID |
|---|---|---|---|---|
| **DEC-01** | Multi-Tenancy Scope | **Single-Institute deployment with multi-tenant architecture foundation.** Institute ID is mandatory across all data models and authorization checks. | Approved | DISC-01 |
| **DEC-02** | Attendance Unit | **Session-wise attendance.** Linked to scheduled training sessions (Batch, Instructor, Date, Time Window, Subject/Topic). | Approved | DISC-02 |
| **DEC-03** | Attendance Calculation | **Statuses:** `present`, `absent`, `late`, `excused`. **Formula:** `(Present + Late) / Total Applicable Sessions * 100%`. **Threshold:** Minimum 80% for practical qualification. | Approved | DISC-03 |
| **DEC-04** | Pilot Trade & Curriculum | **ITI Electrician Trade (2-Year CTS / NSQF Level 4/5).** Modules: Safety & Basic Electrical, Domestic & Industrial Wiring, AC/DC Machines. | Approved | DISC-04 |
| **DEC-05** | Competency Evaluation | **3-tier scale:** `competent`, `needs_practice`, `not_attempted`. Criterion scoring (0–5). Completion rule: 100% core safety criteria + ≥75% overall weighted score. | Approved | DISC-05 |
| **DEC-06** | Role Permissions Matrix | 4 roles: `student`, `instructor`, `administrator`, `monitoring_officer` (strictly read-only). Explicit server-side record scoping. | Approved | DISC-06 |
| **DEC-07** | Correction Workflow | Submitted attendance and assessments require instructor submission + mandatory reason. Immutable audit log entry; within 48h directly editable with reason, >48h requires Admin counter-signature. | Approved | DISC-07 |
| **DEC-08** | Evidence Uploads | Optional practical evidence: JPG, PNG, PDF; maximum 5MB per upload. Stored in private non-public directory; access verified via authorized API. | Approved | DISC-08 |
| **DEC-09** | Reporting & Exports | Standard CSV and printable views for Monthly Batch Attendance, Competency Matrix, Remedial Task Register. Formula-injection sanitization applied to all CSV exports. | Approved | DISC-09 |
| **DEC-10** | Retention & Backups | Student practical history retained for 5 years post-course. Daily automated database backups with 30-day snapshot rotation. | Approved | DISC-10 |
| **DEC-11** | Pilot Cohort Selection | **Trade:** Electrician; **Batch:** EL-2026-A (Morning shift); **Academic Period:** 2026–2027; 10 pilot students and 1 lead instructor. | Approved | DISC-11 |
| **DEC-12** | MVP Acceptance Criteria | Defined sign-off criteria for Phase 1 through Phase 6 MVP release gates. | Approved | DISC-12 |

---

## 2. Detailed Decision Specifications

### DEC-01: Institute Hierarchy and Multi-Tenancy Scope (DISC-01)
- **Decision:** The initial production release operates for a single ITI institute (`institute_id = 1`), but the database schema, foreign keys, and API authorization middleware must enforce `institute_id` across all records (`institutes`, `trades`, `batches`, `users`, `sessions`, `settings`).
- **Rationale:** Prevents costly refactoring when expanding to district- or state-wide multi-institute networks in Phase 8 while keeping local operational simplicity during pilot.

### DEC-02: Attendance Unit & Tracking Frequency (DISC-02)
- **Decision:** Attendance is tracked **session-wise** rather than daily or period-wise.
  - A `training_session` represents a scheduled lab or classroom block (e.g. 09:00 to 13:00 for Practical Lab).
  - An instructor cannot mark attendance for a session outside their assigned batch and date window.
  - Attendance uniqueness is enforced at database level by `UNIQUE KEY (session_id, student_id)`.

### DEC-03: Attendance Statuses, Percentage Formula, and Threshold (DISC-03)
- **Allowed Statuses:**
  1. `present`: Student present in workshop/lab on time (Weight: 1.0).
  2. `late`: Student arrived >15 minutes late but completed practical tasks (Weight: 1.0 towards attendance presence, marked with flag).
  3. `excused`: Officially approved leave or medical exemption (Excluded from denominator).
  4. `absent`: Unexcused absence (Weight: 0.0).
- **Approved Formula:**
  $$\text{Attendance Percentage} = \frac{\text{Count}(\text{present}) + \text{Count}(\text{late})}{\text{Total Sessions} - \text{Count}(\text{excused})} \times 100$$
- **Minimum Threshold:** **80% attendance** is required to be certified as eligible for semester final practical examination. Under 80% triggers an automated follow-up warning on student and instructor dashboards.

### DEC-04: Pilot Trade and Curriculum Structure (DISC-04)
- **Selected Pilot Trade:** Electrician (National Classification of Occupations NCO-2015: 7411.0101, NSQF Level 4).
- **Hierarchy:** `Institute -> Trade (Electrician) -> Modules -> Practical Activities -> Competency Criteria (Rubrics)`.
- Core pilot modules configured with 6 sample comprehensive hands-on activities with detailed criteria.

### DEC-05: Competency Scale, Rubrics, and Completion Rule (DISC-05)
- **Scale:**
  - `competent` (C): The student independently and safely demonstrates the practical skill to industry standards.
  - `needs_practice` (NP): The student attempted the skill but requires further guidance, speed improvement, or remedial practice.
  - `not_attempted` (NA): The student has not yet performed the practical activity.
- **Criteria Evaluation:** Each practical activity contains 3 to 5 discrete criteria (e.g. Safety Protocol, Tool Handling, Circuit Execution, Output Verification). Each criterion scored 0–5 points.
- **Completion Rule:** A practical activity is derived as `Competent` if:
  1. All mandatory safety criteria are scored $\ge 4/5$.
  2. Total aggregate score is $\ge 75\%$ of maximum possible points.
- **Rubric Versioning:** Criteria are locked once an assessment is completed. Any curriculum revision spawns a new rubric version without altering historical assessments.

### DEC-06: Role Definitions and Permissions Boundary (DISC-06)
- **Student:** Read-only access restricted strictly to own user profile, enrolled batch sessions, personal attendance, practical submissions, competency scores, and assigned remedial tasks.
- **Instructor:** Access restricted to assigned batches and trades. Can create training sessions, enter draft attendance, submit registers, record practical attempts, evaluate criteria, and assign remedial practice.
- **Administrator:** Full administrative rights within institute scope: manage master records (trades, periods, batches, students, instructors), oversee audit logs, trigger report exports, and configure institute settings.
- **Monitoring Officer:** Read-only aggregate and filtered reports for the institute. Cannot create, edit, or delete any operational records.

### DEC-07: Correction and Audit Policy (DISC-07)
- Unsubmitted attendance is in `draft` state and editable by the assigned instructor.
- Once submitted, status transitions to `submitted`. Any edit requires:
  1. Explicit `correction_reason` (minimum 10 characters).
  2. Actor user ID, previous value, new value, timestamp logged into append-only `audit_logs` table.
  3. Corrections submitted within 48 hours are automatically applied; corrections after 48 hours require Admin counter-signature.

### DEC-08: Evidence Upload Policy (DISC-08)
- Allowed formats: `image/jpeg`, `image/png`, `application/pdf`.
- Maximum file size: 5 MB per file.
- Storage: Dedicated private local storage directory (`backend/storage/private_uploads/`), never directly accessible via public HTTP URL. Delivered only through authenticated controller with record-scope check.

### DEC-09: Reporting and Export Formats (DISC-09)
- Standard exports:
  1. Monthly Batch Attendance Register (Date-wise columns, status summary, attendance %).
  2. Trade Competency Progress Matrix (Student vs Activities status grid).
  3. Remedial Support & Follow-Up Log.
- All CSV exports must prepend single quote `'` or sanitize fields starting with `=`, `+`, `-`, `@` to mitigate CSV formula injection.

### DEC-10: Data Retention and Backup Policy (DISC-10)
- Enrolled student records and assessments retained for 5 years after academic period completion.
- Daily automated MySQL dump stored with encrypted offsite backup.
- Audit logs retained indefinitely as append-only records.

### DEC-11: Pilot Target Configuration (DISC-11)
- **Institute Name:** Model Industrial Training Institute (ITI)
- **Academic Period:** 2026–2027 (Starts: 2026-08-01, Ends: 2027-07-31)
- **Trade:** Electrician (Code: `ELE-01`)
- **Batch:** EL-2026-A (Section 1, 10 pilot students)
- **Instructor:** Rajesh Sharma (ID: `INST-001`)

### DEC-12: Sign-Off and Release Gates (DISC-12)
- All 12 discovery items confirmed and approved as the authoritative basis for Phase 1 foundation and subsequent application implementation.
