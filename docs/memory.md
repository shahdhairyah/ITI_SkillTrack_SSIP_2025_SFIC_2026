# Project Memory — ITI SkillTrack

> Persistent context for developers and AI coding agents. Read this file before making broad changes. Keep it concise and update it when an approved decision changes. This file is not a substitute for the full PRD or technical specification.

## 1. Project identity

- **Name:** ITI SkillTrack
- **Full title:** Digital Skill Training, Attendance and Competency Tracking System for ITI Students
- **Purpose:** one role-based platform for student attendance, practical training, competency assessment, remedial follow-up and institutional monitoring.
- **Primary users:** ITI students, instructors/trainers and institute administrators.
- **Secondary user:** optional read-only monitoring officer with explicit scope.

## 2. Fixed technology choices

- Frontend: **React** (Vite is the recommended build tool).
- Backend: **PHP**, exposing a JSON REST-style API.
- Database: **MySQL** using InnoDB and foreign keys.
- Database access: PDO and prepared statements.
- Deployment: HTTPS; Nginx/Apache + PHP runtime + private MySQL are suitable baseline options.

Do not replace React, PHP or MySQL with another primary stack unless the project owner explicitly changes this decision.

## 3. Core product model

The system links:

`Institute → Trade → Module → Practical Activity → Competency Criteria`

and

`Academic Period → Batch → Student Enrollment → Training Session → Attendance`

Student practical progress is represented by activity attempts and assessments. Assessments preserve criterion-level results, assessor and date. Remedial assignments are separate follow-up records; they do not automatically alter assessment outcomes.

## 4. Roles and access boundaries

- **Student:** read own profile, attendance, activities, competency, assessments, remedial tasks and notifications.
- **Instructor:** manage only assigned batches/trades and their eligible students; create sessions, attendance, attempts, assessments and follow-up actions within scope.
- **Administrator:** institute-scoped configuration, users, roles, reports and audit access according to permissions.
- **Monitoring officer:** optional, read-only and explicitly scoped.

The backend is the security boundary. React route guards are not authorization.

## 5. Non-negotiable invariants

1. Do not invent official attendance percentage thresholds or competency pass criteria.
2. Attendance status lists and competency rubrics are institute-configurable.
3. An attendance record is unique for a `(session_id, student_id)` pair.
4. Missing attendance is not automatically Present.
5. Submitted attendance corrections require authorization, reason and audit history.
6. Assessment history is preserved; a new assessment does not erase old results.
7. Competency aggregation follows an approved, documented rubric rule.
8. Remedial assignment does not itself change competency status.
9. Student, instructor and administrator data scope is enforced server-side on every request and export.
10. Student files, environment secrets and logs are private; never commit real student data or `.env`.

## 6. Current implementation baseline

- Build as a modular monolith, not microservices.
- Frontend uses feature-oriented modules (`auth`, `attendance`, `activities`, `competency`, `remedial`, `reports`, etc.).
- Backend separates routes, middleware, controllers, validators, policies, services and repositories.
- Database changes use migrations.
- Sensitive operations write audit events.
- Use secure PHP-managed sessions with HttpOnly/Secure cookies and CSRF protection as the preferred first-party web baseline; use a different token approach only after explicit security design.
- API path begins with `/api/v1` and returns consistent JSON envelopes.
- Use CSV export first; PDF output can follow approved report formats.

## 7. Terminology

| Term | Meaning |
|---|---|
| Trade | Vocational program area, such as a configured ITI trade |
| Batch | Cohort/group of enrolled students for a trade and academic period |
| Module | A trade-linked curriculum unit or training module |
| Practical activity | A defined task or exercise used in practical training |
| Criterion | One measurable part of the activity's competency rubric |
| Attempt | A student's recorded attempt at a practical activity |
| Assessment | An instructor's evaluation of an attempt against criteria |
| Competency status | Derived display based on approved assessment rules |
| Remedial assignment | Additional practice or follow-up assigned to a student |
| Session | A dated training event for a batch |
| Attendance register | Attendance records for the eligible students of a session |

## 8. Confirmed decisions (Phase 0 sign-off)

The discovery decisions are formalized in `docs/phase-0/01_policy_decision_register.md`:

- **Scope:** Single-institute pilot with multi-tenant data architecture (`institute_id` enforced on all tables/queries).
- **Attendance unit:** Session-wise, unique `(session_id, student_id)`.
- **Attendance status & formula:** `present`, `absent`, `late`, `excused`; Formula: `(Present + Late) / (Total - Excused) * 100%`; Minimum threshold: 80%.
- **Pilot trade:** ITI Electrician (`ELE-01`), NSQF Level 4/5, Batch `EL-2026-A`.
- **Competency scale & rule:** 3-tier (`competent`, `needs_practice`, `not_attempted`); derived as `competent` if all safety criteria >= 4/5 and total weighted score >= 75%.
- **Roles:** Student (own data only), Instructor (assigned batch scope), Admin (institute scope), Monitoring Officer (read-only).
- **Correction flow:** Mandatory reason + append-only audit trail; 48-hour instructor edit window.
- **Evidence uploads:** Private storage, max 5MB, JPG/PNG/PDF, authorized proxy download.
- **Reports:** Monthly register, Competency matrix, Remedial log; CSV formula-injection protection required.
- **Retention & Backups:** 5 years practical record retention, daily database backups.

## 9. Document map

- `README.md` — setup, overview and documentation index.
- `prd.md` — requirements, scope and acceptance criteria.
- `architectre.md` — architecture, data model, API and deployment design.
- `desgin.md` — screens, UX behavior and visual system.
- `rules.md` — business, security and engineering invariants.
- `phase.md` — delivery sequence and exit gates.
- `tasks.md` — task backlog and dependencies.
- `docs/phase-0/` — Phase 0 deliverables (policy register, workflows, curriculum, sample data, report templates, acceptance criteria).

## 10. Agent working instructions

Before implementing a feature:
1. Read the relevant requirement in `prd.md`.
2. Check business/security invariants in `rules.md`.
3. Follow data/API patterns in `architectre.md`.
4. Follow screen states and interaction guidance in `desgin.md`.
5. Find the matching task ID in `tasks.md`.
6. Implement backend authorization and validation before relying on frontend behavior.
7. Add/update tests and migrations with the feature.
8. Update task status and this memory file only when a durable decision or implementation state changes.

Do not claim that a feature, endpoint, migration or test exists unless it is present in the repository. These documents describe the intended baseline, not already-completed code.

## 11. Change log

| Date | Change |
|---|---|
| 2026-10-30 | Initial project memory created for React + PHP + MySQL implementation. |
| 2026-10-30 | Phase 0 Discovery & Policy completed: formal policy register, workflows, pilot curriculum, anonymized dataset, report templates, and MVP acceptance criteria delivered. |
