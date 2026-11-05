# ITI SkillTrack: Institutional Practical Training, Attendance & Competency Tracking Platform
> **Authoritative Digital Record System for Industrial Training Institutes (ITIs)**  
> *Craftsmen Training Scheme (CTS) · Directorate General of Training (DGT) · National Skills Qualification Framework (NSQF Level 4/5)*  
> *Student Startup and Innovation Policy (SSIP 2025) · Smart Future Innovation Challenge (SFIC 2026)*

[![Stack](https://img.shields.io/badge/Stack-React_19_+_PHP_8.3_+_MySQL_8-blue.svg)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Phases Completed](https://img.shields.io/badge/Delivery_Status-Phases_0_to_5_Verified-success.svg)](docs/tasks.md)
[![Zero Docker](https://img.shields.io/badge/Dependencies-Zero_Docker_Required-brightgreen.svg)](#-zero-docker-local-development-setup)
[![Database](https://img.shields.io/badge/Dual_Engine-MySQL_8.x_+_SQLite_3_PDO-orange.svg)](#-database-schema--data-dictionary)
[![Security](https://img.shields.io/badge/Security-IDOR_Scoping_+_CSRF_+_Formula_Sanitized-red.svg)](#-security-hardening--compliance-framework)

---

## 📑 Table of Contents
1. [Visual Interface Gallery](#-visual-interface-gallery)
2. [Executive Summary & Institutional Problem Statement](#-executive-summary--institutional-problem-statement)
3. [Key System Invariants & Statutory Rules](#-key-system-invariants--statutory-rules)
4. [System Architecture & Technical Topology](#-system-architecture--technical-topology)
5. [Statutory Policy Decision Register (DEC-01 to DEC-12)](#-statutory-policy-decision-register-dec-01-to-dec-12)
6. [Phase-by-Phase Engineering Implementation Register](#-phase-by-phase-engineering-implementation-register)
7. [Comprehensive Database Schema & Data Dictionary](#-comprehensive-database-schema--data-dictionary)
8. [Complete REST API Endpoint Reference](#-complete-rest-api-endpoint-reference)
9. [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
10. [Pre-Seeded Pilot Accounts & Evaluation Scenarios](#-pre-seeded-pilot-accounts--evaluation-scenarios)
11. [Zero-Docker Local Development Setup](#-zero-docker-local-development-setup)
12. [Production Deployment Guide (Apache, Nginx & cPanel)](#-production-deployment-guide-apache-nginx--cpanel)
13. [Security Hardening & Compliance Framework](#-security-hardening--compliance-framework)
14. [Testing, Quality Assurance & Verification Matrix](#-testing-quality-assurance--verification-matrix)
15. [Project Directory Structure](#-project-directory-structure)
16. [Strategic Roadmap (Phases 6–8)](#-strategic-roadmap-phases-68)
17. [Governance, SSIP 2025 / SFIC 2026 Initiative & License](#-governance-ssip-2025--sfic-2026-initiative--license)

---

## 📸 Visual Interface Gallery

### 1. Institutional Portal & Practical Registry Overview
![ITI SkillTrack Home Page](docs/screenshots/home_page.png)
*Figure 1: Clean institutional portal showcasing verified statutory attendance rates, DEC-05 competency rubrics, training lifecycle progression, and rapid access cards for all pre-seeded role workspaces.*

### 2. Zero-Scroll Authentication Card & Instant Role Testing
![ITI SkillTrack Login Page](docs/screenshots/login_page.png)
*Figure 2: Strict single-viewport (100vh) login interface eliminating viewport scrolling, complete with one-click test credentials for Administrator, Vocational Instructor, and Student Trainees.*

### 3. Vocational Training Dashboard & Competency Overview
![ITI SkillTrack Dashboard](docs/screenshots/dashboard_preview.png)
*Figure 3: Role-scoped instructor workspace exhibiting live session rosters, real-time calculation against the statutory 80% practical exam gate, and active remedial task review queues.*

---

## 🎯 Executive Summary & Institutional Problem Statement

Across thousands of **Industrial Training Institutes (ITIs)** operating under the **Craftsmen Training Scheme (CTS)** and the **Directorate General of Training (DGT)**, practical workshop training accounts for over **60% to 70%** of total instructional hours. However, the operational administration of this training has historically suffered from acute structural deficiencies:

1. **Disconnected Paper Attendance Registers:** Daily attendance is recorded in fragile physical logbooks that offer no correlation to individual workshop practical sessions or specific machinery operations.
2. **Untracked Statutory Thresholds:** DGT regulations mandate a **minimum 80% practical attendance** threshold for trainees to qualify for the All India Trade Test (AITT). In paper workflows, attendance shortfalls are typically discovered weeks after exam registration deadlines.
3. **Subjective Competency Evaluations:** Hands-on workshop activities (e.g., stator winding, high-voltage panel wiring, lathe machine turning) are traditionally graded using arbitrary letter grades rather than criterion-based, safety-audited rubrics.
4. **Lack of Supervised Remedial Loops:** Trainees who fail safety procedures or measure out-of-tolerance dimensions often fall through the cracks without structured, supervised re-skilling tasks.
5. **Data Tampering & Non-Existent Audit Trails:** Physical registers are vulnerable to retrospective mark manipulation, backdated attendance entries, and unrecorded grade alterations.

**ITI SkillTrack** addresses these systemic challenges by providing an institutional single source of truth. Built to strict institutional standards, it digitizes the complete lifecycle of vocational education: from session scheduling and roster generation to 0–5 criterion rubric grading, mandatory safety checks, automated remedial routing, and tamper-resistant audit logging.

---

## ⚖️ Key System Invariants & Statutory Rules

The system implements five non-negotiable core invariants enforced at both the database engine level and the application domain layer:

* **Invariant 1: Uniqueness of Session Attendance (`UNIQUE (session_id, student_id)`):** A trainee can possess at most one authoritative attendance status per scheduled session block. Duplicate or conflicting marks within the same session are structurally impossible.
* **Invariant 2: Missing Marks Preclude Official Submission:** A session attendance register cannot be submitted with missing marks. Blank fields are strictly rejected by validation middleware.
* **Invariant 3: Statutory 80% Exam Qualification Gate:** Trainees must achieve at least 80% attendance across applicable sessions to be marked eligible for semester practical examinations:
  $$\text{Attendance } \% = \frac{\text{Present} + \text{Late}}{\text{Total Sessions} - \text{Excused}} \times 100$$
* **Invariant 4: DEC-05 Safety-Critical Competency Gating:** A practical evaluation can **never** receive a `Competent` designation if **any** mandatory safety criterion (e.g., PPE compliance, lockout/tagout, insulation resistance check) is scored below **4 out of 5**, regardless of aggregate percentage.
* **Invariant 5: Immutable Audit Logging & Controlled Corrections:** Once an attendance register or assessment attempt is submitted, it is locked. Any alteration requires an explicit justification ($\ge 10$ characters), records prior and revised values, and is committed to an append-only audit trail.

---

## 🏗️ System Architecture & Technical Topology

ITI SkillTrack is architected as a **high-performance modular monolith** designed to run effortlessly on commodity Linux hosting (Apache/Nginx/cPanel) with **zero Docker or container dependencies**.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|                                                                                   |
|    React 19 SPA (Vite)  ·  React Router v7  ·  Lucide Icons  ·  Pure CSS Tokens    |
|    - Single-Viewport Zero-Scroll Login Card                                       |
|    - Dynamic Attendance Register with Draft/Submit Workflows                      |
|    - 0-5 Criterion Practical Rubric Workspace                                     |
|    - Real-Time Batch Competency Matrix Grid & Student Portfolio                   |
+------------------------------------------+----------------------------------------+
                                           |
                                           | JSON REST API / HTTPS
                                           | (CSRF Header + HttpOnly Cookie)
                                           v
+-----------------------------------------------------------------------------------+
|                             APPLICATION SERVICES TIER                             |
|                                                                                   |
|    PHP 8.3 REST Engine  ·  PSR-4 Autoloading  ·  Clean Modular Architecture       |
|    +-------------------------------------------------------------------------+    |
|    | Middleware: RequestID · CORS · SessionGuard · CSRFToken · ScopeEnforcer |    |
|    +-------------------------------------------------------------------------+    |
|    | Domain Services:                                                        |    |
|    |  * AttendanceService (Roster generation, 80% gate, corrections)         |    |
|    |  * CompetencyService (DEC-05 safety gating, rubric aggregation)         |    |
|    |  * RemedialService   (Auto-task creation, outcome reviews)              |    |
|    |  * AuditService      (Append-only mutation journal, change diffs)       |    |
|    +-------------------------------------------------------------------------+    |
+------------------------------------------+----------------------------------------+
                                           |
                                           | PDO Prepared Statements
                                           | Dual-Driver Abstraction
                                           v
+-----------------------------------------------------------------------------------+
|                              PERSISTENCE & STORAGE TIER                           |
|                                                                                   |
|    Production: MySQL 8.x / MariaDB 10.x     | Zero-Config: SQLite 3 Engine         |
|    - InnoDB Engine, Strict Foreign Keys    | - Fallback Driver for Dev & Testing  |
|    - 26 Normalized Tables, utf8mb4         | - Self-Contained Zero-Setup DB       |
|                                                                                   |
|    File Storage: Dedicated Private Directory (`backend/storage/private_uploads/`)  |
|    - Non-public directory for practical evidence & rubric photos                  |
|    - Streamed exclusively through authenticated, role-scoped controllers          |
+-----------------------------------------------------------------------------------+
```

### Architectural Principles
1. **Zero External Runtime Daemon:** Eliminates Docker, Redis, and message broker prerequisites, ensuring seamless hosting on government college servers and low-cost cPanel shared hosting.
2. **Dual-Driver Persistence Engine:** Developers can launch the system instantly using the built-in SQLite 3 engine without installing MySQL, while production environments seamlessly target MySQL 8.x with identical schemas and business logic.
3. **Strict Server-Side Record Scoping:** Instructors cannot read or alter batches outside their explicit institutional assignments; trainees can never view peers' grades (complete IDOR mitigation).
4. **Stateless JSON Envelopes:** All API endpoints return a standardized JSON structure:
   ```json
   {
     "status": "success",
     "data": { ... },
     "meta": { "timestamp": "2026-11-05T15:30:00Z", "request_id": "req_abc123" }
   }
   ```

---

## 📜 Statutory Policy Decision Register (DEC-01 to DEC-12)

Every architectural and operational decision in ITI SkillTrack is grounded in institutional requirements established in Phase 0:

| Policy ID | Area | Institutional Policy Specification | Enforcement Level |
|---|---|---|---|
| **DEC-01** | Multi-Tenancy Scope | **Single-Institute deployment with multi-tenant data architecture.** All database tables and authorization middleware enforce `institute_id` scoping to enable future multi-institute federation. | DB Foreign Keys & Middleware |
| **DEC-02** | Attendance Unit | **Session-wise tracking.** Attendance is recorded per scheduled laboratory or workshop session (Batch, Instructor, Date, Time Block, Subject/Activity) rather than generic daily tallies. | DB Unique Constraints |
| **DEC-03** | Attendance Calculation | **Statutory 80% Practical Gate.** Statuses: `present`, `absent`, `late`, `excused`. Excused absences are excluded from the denominator. Falling below 80% triggers automated alerts and disqualification flags. | `AttendanceService.php` |
| **DEC-04** | Pilot Curriculum | **Electrician Trade (2-Year CTS / NSQF Level 4/5).** Curriculum organized as: `Trade -> Modules -> Practical Activities -> Competency Criteria (Rubrics)`. | `001_initial_schema.sql` |
| **DEC-05** | Practical Rubrics | **0–5 Criterion Scale & Mandatory Safety Gate.** A trainee is derived as `Competent` if and only if **100% of core safety criteria** are scored $\ge 4/5$ **and** total aggregate score is $\ge 75\%$. | `CompetencyService.php` |
| **DEC-06** | Role Permissions | **4 Strict Roles:** `administrator`, `instructor`, `student`, `monitoring_officer`. Monitoring officers have strictly read-only access. Server-side scoping prevents privilege escalation. | `RoleMiddleware.php` |
| **DEC-07** | Correction Windows | **48-Hour Correction Window with Reason.** Attendance alterations after submission require a mandatory justification ($\ge 10$ chars), logged to an immutable audit table. After 48 hours, changes require Admin approval. | `AttendanceController.php` |
| **DEC-08** | Evidence Uploads | **Non-Public Private Storage.** Maximum 5MB per upload (JPEG, PNG, PDF). Files stored in `backend/storage/private_uploads/` outside the web root, served only via authenticated streaming controllers. | File System & Controller |
| **DEC-09** | Export Sanitization | **CSV Formula Injection Mitigation.** All exported CSV cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prepended with an apostrophe `'` to prevent spreadsheet code execution. | CSV Export Utilities |
| **DEC-10** | Data Retention | **5-Year Trainee Record Retention.** Historical practical logs, rubric scores, and audit records are preserved for 5 years post-graduation to support external verification and employment audits. | Data Retention Policy |
| **DEC-11** | Pilot Cohort | **Model Pilot Configuration:** Trade: Electrician (`ELE-01`), Batch: `EL-2026-A`, Academic Period: 2026–2027, Lead Instructor: Rajesh Sharma (`INST-001`), 10 Trainees. | Database Seed Files |
| **DEC-12** | Quality Gates | **Acceptance Verification Gates.** Zero critical vulnerabilities, 100% route verification, zero-scroll login layout, zero Docker runtime dependency. | Build & Release Pipeline |

---

## 🚀 Phase-by-Phase Engineering Implementation Register

The platform was engineered in six distinct, rigorously tested phases:

### Phase 0: Discovery, Regulatory Mapping & Policy Formulation
- Formulated and documented decisions `DEC-01` through `DEC-12` in formal policy register.
- Mapped DGT Craftsmen Training Scheme (CTS) practical curriculum requirements for Electrician Trade.
- Defined the statutory 80% attendance calculation formula and rubric competency boundaries.
- Authored initial System Architecture Document and Project Requirements Document (PRD).

### Phase 1: Core Foundation & Persistence Architecture
- Initialized React 19 single-page application (Vite) with responsive pure-CSS design tokens.
- Implemented PHP 8.3 REST API framework with PSR-4 autoloading and fast micro-router.
- Created `Database.php` dual-engine connection manager with automatic MySQL/SQLite fallback.
- Structured unified JSON response envelopes and global exception handlers (`Handler.php`).
- Established base migrations: `001_initial_schema.sql` (24 core tables).

### Phase 2: Authentication, RBAC & Institute Hierarchy
- Built secure session management with Bcrypt password hashing and CSRF token verification.
- Developed institutional management modules: Institutes, Departments, Trades, Batches, and Academic Periods.
- Implemented User and Role management for Administrator, Vocational Instructor, and Student Trainees.
- Added server-side IDOR scoping to ensure instructors and students access only authorized records.

### Phase 3: Workshop Sessions & Attendance Tracking
- Built training session scheduling supporting batch, instructor, date, room, and time block allocation.
- Created dynamic session roster generation capturing active enrollments as of the session date.
- Implemented attendance marking interface with real-time draft saving and missing-mark validation.
- Engineered official register submission locking and DEC-07 controlled correction workflows.
- Implemented statutory 80% attendance percentage calculation engine.
- Created batch attendance matrix report with CSV export protected against formula injection.

### Phase 4: Practical Activities & Competency Rubrics
- Built trade curriculum hierarchy: Modules, Learning Outcomes, Practical Activities, and Rubric Criteria.
- Implemented 0–5 criterion rubric scoring with support for multiple attempts (`attempt_no`).
- Programmed the **DEC-05 Competency Invariant Engine**:
  - Validates mandatory safety criteria ($\ge 4/5$ required).
  - Calculates aggregate weighted percentage ($\ge 75\%$ required).
  - Automatically derives status: `competent`, `needs_practice`, or `not_attempted`.
- Created the live Batch Competency Matrix grid showing student progress across all practical activities.

### Phase 5: Remedial Workflows & Role Dashboards
- Automated remedial task generation whenever a trainee fails safety criteria or falls below the 75% benchmark.
- Developed the Instructor Remedial Review Modal for recording observation notes, practice hours, and resolution outcomes (`assigned`, `in_progress`, `completed`, `cancelled`).
- Implemented the Trainee Skills & Competency Portfolio (`/student/skills`) detailing verified competencies.
- Redesigned role-specific dashboards for **Administrators**, **Instructors**, and **Students**.
- Redesigned `LoginPage.jsx` into a zero-scroll (100vh) card with 1-click test user presets.
- Packaged complete production bundle into `iti_skilltrack_deploy.zip` for instant deployment.

---

## 🗄️ Comprehensive Database Schema & Data Dictionary

The persistence layer comprises **26 normalized tables** enforcing relational integrity, foreign key cascades, and check constraints:

```
                                 ┌───────────────┐
                                 │  institutes   │
                                 └───────┬───────┘
                                         │ 1:N
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
            ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
            │  departments  │    │ academic_pers │    │     users     │
            └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
                    │ 1:N                │ 1:N                │ 1:N
                    ▼                    │            ┌───────┴───────┐
            ┌───────────────┐            │            ▼               ▼
            │    trades     │            │      ┌───────────┐   ┌───────────┐
            └───────┬───────┘            │      │instructors│   │ students  │
                    │ 1:N                │      └─────┬─────┘   └─────┬─────┘
                    ▼                    ▼            │               │
            ┌────────────────────────────────────┐    │               │
            │              batches               │◄───┘               │
            └─────────────────┬──────────────────┘                    │
                              │ 1:N                                   │
              ┌───────────────┴───────────────┐                       │
              ▼                               ▼                       ▼
      ┌───────────────┐               ┌───────────────┐       ┌───────────────┐
      │training_sess  │               │    modules    │       │  enrollments  │
      └───────┬───────┘               └───────┬───────┘       └───────────────┘
              │ 1:N                           │ 1:N
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │attend_records │               │pract_activit  │
      └───────────────┘               └───────┬───────┘
                                              │ 1:N
                                              ▼
                                      ┌───────────────┐
                                      │assessments    │◄───(remedial_assignments)
                                      └───────┬───────┘
                                              │ 1:N
                                              ▼
                                      ┌───────────────┐
                                      │crit_results   │
                                      └───────────────┘
```

### Complete Table Dictionary

#### 1. Core Institutional & User Tables
* **`institutes`**: Master institute entity (`id`, `name`, `code`, `address`, `phone`, `email`, `created_at`).
* **`departments`**: Academic/vocational departments (`id`, `institute_id`, `name`, `code`, `status`).
* **`trades`**: Vocational CTS trades (`id`, `institute_id`, `department_id`, `name`, `code`, `duration_years`, `nsqf_level`).
* **`academic_periods`**: Academic calendar years/semesters (`id`, `institute_id`, `name`, `start_date`, `end_date`, `is_current`).
* **`batches`**: Cohorts of trainees (`id`, `institute_id`, `trade_id`, `academic_period_id`, `name`, `shift`, `capacity`, `status`).
* **`users`**: Central authentication identity table (`id`, `institute_id`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `status`, `last_login_at`).
* **`roles`**: Standard authorization definitions (`id`, `name`, `description`). Values: `administrator`, `instructor`, `student`, `monitoring_officer`.
* **`user_roles`**: Many-to-many role mappings (`user_id`, `role_id`, `assigned_at`).
* **`instructors`**: Vocational instructor profiles (`id`, `user_id`, `institute_id`, `employee_code`, `qualification`, `specialization`).
* **`students`**: Trainee profiles (`id`, `user_id`, `institute_id`, `registration_number`, `admission_date`, `guardian_name`, `status`).
* **`enrollments`**: Trainee batch assignments (`id`, `student_id`, `batch_id`, `roll_number`, `enrollment_status`, `enrolled_at`).
* **`instructor_assignments`**: Instructor batch allocations (`id`, `instructor_id`, `batch_id`, `assigned_at`, `is_primary`).

#### 2. Training Sessions & Attendance Tables
* **`training_sessions`**: Scheduled lab/class blocks (`id`, `institute_id`, `batch_id`, `instructor_id`, `session_date`, `start_time`, `end_time`, `session_type`, `topic`, `status`).
  - `session_type` ENUM: `'practical'`, `'theory'`, `'workshop'`, `'remedial'`.
  - `status` ENUM: `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'`.
* **`attendance_statuses`**: Lookup dictionary of attendance codes (`code`, `label`, `is_present_weight`, `is_excused`).
* **`attendance_records`**: Session attendance entries (`id`, `session_id`, `student_id`, `status`, `remarks`, `marked_by`, `marked_at`).
  - Constraint: `UNIQUE KEY (session_id, student_id)`.
  - `status` ENUM: `'present'`, `'absent'`, `'late'`, `'excused'`.

#### 3. Practical Curriculum & Rubric Competency Tables
* **`modules`**: Curriculum units (`id`, `trade_id`, `module_number`, `title`, `description`, `nominal_hours`).
* **`practical_activities`**: Individual hands-on workshop exercises (`id`, `module_id`, `activity_number`, `title`, `description`, `safety_guidelines`, `passing_percentage`).
* **`competency_criteria`**: 0–5 criterion rubrics (`id`, `practical_activity_id`, `criterion_name`, `description`, `max_score`, `is_safety_critical`, `weight`).
* **`activity_attempts`**: Workshop execution attempts (`id`, `practical_activity_id`, `student_id`, `attempt_number`, `attempt_date`, `status`).
* **`assessments`**: Formal instructor evaluations (`id`, `attempt_id`, `practical_activity_id`, `student_id`, `instructor_id`, `total_score`, `max_possible`, `percentage`, `derived_status`, `assessed_at`).
  - `derived_status` ENUM: `'competent'`, `'needs_practice'`, `'not_attempted'`.
* **`assessment_criterion_results`**: Discrete criterion scores (`id`, `assessment_id`, `criterion_id`, `score`, `instructor_feedback`).
  - Constraint: `score` between `0` and `5`.
* **`evidence_uploads`**: DEC-08 upload metadata (`id`, `assessment_id`, `file_name`, `original_name`, `file_path`, `mime_type`, `file_size`, `uploaded_by`).

#### 4. Remedial Support & Governance Tables
* **`remedial_assignments`**: Targeted intervention tasks (`id`, `student_id`, `practical_activity_id`, `assessment_id`, `instructor_id`, `deficiency_summary`, `target_date`, `status`, `assigned_at`).
  - `status` ENUM: `'assigned'`, `'in_progress'`, `'completed'`, `'cancelled'`.
* **`remedial_reviews`**: Instructor resolution notes (`id`, `remedial_assignment_id`, `reviewer_id`, `review_date`, `outcome`, `instructor_notes`, `hours_spent`).
* **`audit_logs`**: Tamper-resistant mutation log (`id`, `institute_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`).
* **`system_settings`**: Configurable institute parameters (`id`, `institute_id`, `setting_key`, `setting_value`, `updated_at`).

---

## 🔌 Complete REST API Endpoint Reference

All endpoints reside under the `/api/v1` namespace. Requests and responses use `application/json`.

### 1. System, Health & Session Management
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | System status, database latency, and storage availability check |
| `GET` | `/api/v1/config` | Public | Public institute configuration and client runtime flags |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials, issues HttpOnly session cookie |
| `POST` | `/api/v1/auth/logout` | Authenticated | Terminates active session and invalidates cookie |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns current authenticated user profile, roles, and scopes |
| `GET` | `/api/v1/auth/csrf` | Public | Generates or returns active CSRF token for request validation |

### 2. Institutional Master Data
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/v1/institute` | Authenticated | Retrieves current institute profile |
| `PUT` | `/api/v1/institute` | Administrator | Updates institute profile and statutory registration data |
| `GET` | `/api/v1/departments` | Authenticated | Lists all vocational departments |
| `POST` | `/api/v1/departments` | Administrator | Creates a new academic department |
| `GET` | `/api/v1/trades` | Authenticated | Lists vocational trades (e.g. Electrician, Fitter) |
| `POST` | `/api/v1/trades` | Administrator | Creates a new CTS trade definition |
| `GET` | `/api/v1/academic-periods`| Authenticated | Lists academic periods and semesters |
| `POST` | `/api/v1/academic-periods`| Administrator | Creates a new academic calendar period |
| `GET` | `/api/v1/batches` | Authenticated | Lists batches (filtered by instructor scope when applicable) |
| `POST` | `/api/v1/batches` | Administrator | Provisions a new trainee cohort batch |
| `GET` | `/api/v1/students` | Authenticated | Trainee directory with pagination and batch filters |
| `POST` | `/api/v1/students` | Administrator | Enrolls a new trainee profile |
| `GET` | `/api/v1/instructors` | Authenticated | Vocational instructor directory |
| `POST` | `/api/v1/instructor-assignments` | Administrator | Binds an instructor to a specific batch |

### 3. Training Sessions & Attendance Tracking
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/v1/sessions` | Authenticated | Lists scheduled lab sessions with batch and date filters |
| `POST` | `/api/v1/sessions` | Staff (Admin/Inst)| Schedules a new laboratory or classroom training block |
| `GET` | `/api/v1/sessions/{id}` | Authenticated | Retrieves session details and metadata |
| `GET` | `/api/v1/sessions/{id}/roster` | Authenticated | Generates dynamic roster of enrolled trainees as of session date |
| `GET` | `/api/v1/sessions/{id}/attendance`| Authenticated | Retrieves saved attendance register (draft or submitted) |
| `PUT` | `/api/v1/sessions/{id}/attendance`| Staff | Saves draft attendance entries with partial marks allowed |
| `POST` | `/api/v1/sessions/{id}/attendance/submit` | Staff | Validates missing marks, locks register, and records submission |
| `GET` | `/api/v1/attendance/report` | Authenticated | Batch attendance matrix report with 80% gate qualification |
| `GET` | `/api/v1/attendance/report/export` | Authenticated | Exports attendance register to formula-sanitized CSV |
| `GET` | `/api/v1/students/{id}/attendance`| Authenticated (Scoped) | Trainee-specific session attendance history |

### 4. Curriculum & Practical Competency Evaluations
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/v1/curriculum` | Authenticated | Complete curriculum tree: Modules, Activities, and Rubrics |
| `GET` | `/api/v1/activities/{id}` | Authenticated | Fetches activity details, safety rules, and rubric criteria |
| `POST` | `/api/v1/modules` | Administrator | Creates a new curriculum module |
| `POST` | `/api/v1/activities` | Administrator | Adds a practical workshop activity to a module |
| `POST` | `/api/v1/attempts` | Staff | Initializes a practical evaluation attempt for a student |
| `POST` | `/api/v1/assessments` | Staff | Submits 0–5 criterion scores, executes DEC-05 safety gating |
| `GET` | `/api/v1/batches/{id}/competency-matrix` | Authenticated | Live matrix grid comparing all batch trainees against practicals |
| `GET` | `/api/v1/students/{id}/competency` | Authenticated (Scoped) | Verified trainee practical portfolio with attempt history |

### 5. Remedial Pipeline & Dashboard Analytics
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/v1/remedials` | Authenticated | Lists remedial tasks (filtered by student or instructor scope) |
| `POST` | `/api/v1/remedials` | Staff | Manually creates a targeted remedial intervention task |
| `POST` | `/api/v1/remedials/{id}/review` | Staff | Records instructor resolution outcome, notes, and extra hours |
| `GET` | `/api/v1/dashboard/stats` | Authenticated | Aggregates role-specific metrics (attendance %, remedial backlog) |

---

## 👥 Role-Based Access Control (RBAC) Matrix

| System Capability | Administrator | Vocational Instructor | Student Trainee | Monitoring Officer |
|---|:---:|:---:|:---:|:---:|
| **Institute Settings & Master Data** | Full Access | No Access | No Access | Read-Only |
| **Manage Trades, Batches, Periods** | Full Access | No Access | No Access | Read-Only |
| **Manage Users & Role Assignment** | Full Access | No Access | No Access | No Access |
| **Schedule Training Sessions** | Full Access | Assigned Batches | No Access | Read-Only |
| **Mark & Submit Attendance** | Full Access | Assigned Batches | No Access | No Access |
| **Submit Attendance Corrections** | Within 48h / Approval | Within 48h (Reason) | No Access | No Access |
| **View Batch Attendance Reports** | Full Access | Assigned Batches | No Access | Full Access |
| **Curriculum & Rubric Definition** | Full Access | Read-Only | Read-Only | Read-Only |
| **Record Practical Evaluations** | Full Access | Assigned Batches | No Access | No Access |
| **Review & Resolve Remedials** | Full Access | Assigned Batches | No Access | Read-Only |
| **View Personal Attendance & Rubrics** | N/A | N/A | Own Records Only | N/A |
| **View Append-Only Audit Trail** | Full Access | No Access | No Access | Full Access |

---

## 🔑 Pre-Seeded Pilot Accounts & Evaluation Scenarios

The database is pre-seeded with model data for the **Electrician Trade (ELE-01)**, Batch **EL-2026-A** (Morning Shift, Academic Period 2026–2027):

| Role | Email Address | Password | Pre-Configured Test Persona & Evaluation Scenario |
|---|---|---|---|
| **Administrator** | `admin@itiskilltrack.org` | `Password@123` | **Full Governance:** Inspects institute master data, audit logs, and monitors system-wide attendance across all trades. |
| **Instructor** | `rajesh.sharma@itiskilltrack.org` | `Password@123` | **Senior Vocational Trainer (Rajesh Sharma):** Assigned to Batch `EL-2026-A`. Can schedule practical sessions, record rubrics, and resolve remedial tasks. |
| **Student 1 (Passed)** | `amit.kumar@student.iti.org` | `Password@123` | **Top Performer (Amit Kumar):** 92.5% attendance rate (certified exam eligible). Competent in all safety rubrics. |
| **Student 2 (Remedial)**| `rahul.singh@student.iti.org` | `Password@123` | **Remedial Candidate (Rahul Singh):** Has an active remedial task for *Activity 1.1: Wire Stripping & PPE Safety Gap* after scoring 2/5 on safety criterion. |

> [!TIP]
> On the redesigned login screen (`/login`), click any of the **Quick Test Accounts** chips to instantly populate credentials and sign in with zero typing.

---

## ⚡ Zero-Docker Local Development Setup

You can run ITI SkillTrack locally on any Linux, macOS, or Windows machine without installing Docker.

### System Requirements
* **Node.js** (v18.0 or newer) and **npm**
* **PHP** (v8.1 or newer, PHP 8.3 recommended) with `pdo_sqlite` and `pdo_mysql` extensions enabled.
* *(Optional)* MySQL 8.x (if testing against MySQL rather than the built-in SQLite engine).

### Step 1: Clone Repository & Install Frontend
```bash
git clone https://github.com/shahdhairyah/ITI_SkillTrack_SSIP_2025_SFIC_2026.git
cd ITI_SkillTrack_SSIP_2025_SFIC_2026

# Install React dependencies
cd frontend
npm install
```

### Step 2: Initialize Backend Database (Zero-Config SQLite)
If running with SQLite (zero setup required):
```bash
cd ../backend

# Verify or initialize SQLite database
php -r "new PDO('sqlite:database/iti_skilltrack.sqlite');"
```
The repository includes a pre-seeded SQLite database at `backend/database/iti_skilltrack.sqlite` with all 26 tables and pilot accounts.

### Step 3: Launch Local Development Servers
Run the backend and frontend in two terminal windows:

**Terminal 1: Start PHP REST API Server**
```bash
cd backend
php -S 127.0.0.1:8000 public/index.php
```

**Terminal 2: Start React Vite Development Server**
```bash
cd frontend
npm run dev
```

Navigate to **`http://localhost:5173`** in your browser. The frontend Vite proxy is configured to automatically route `/api/` calls to `http://127.0.0.1:8000`.

---

## 📦 Production Deployment Guide (Apache, Nginx & cPanel)

A complete, self-contained production bundle is pre-built in [`deploy/`](deploy/README.md) and packaged as **`iti_skilltrack_deploy.zip`**.

### Deployment Bundle Structure
```
deploy/
├── htdocs/                          # Production Web Document Root
│   ├── index.html                   # Compiled React 19 Single Page App
│   ├── assets/                      # Bundled CSS, JS, and SVG assets
│   ├── .htaccess                    # Apache SPA fallback & security rules
│   └── api/                         # Backend REST API directory
│       ├── index.php                # Front controller entry point
│       ├── .htaccess                # API rewrite rules
│       ├── config/                  # App configuration
│       ├── src/                     # Core PHP controllers, services, middleware
│       ├── storage/                 # Private uploads directory
│       └── database/
│           └── iti_skilltrack.sqlite# Pre-seeded zero-config database
├── database/
│   └── iti_skilltrack_full.sql      # Production MySQL 8.x schema + seed dump
├── apache.vhost.example             # Example Apache VirtualHost config
└── nginx.conf.example               # Example Nginx server block config
```

### 1-Click Installation on Apache / cPanel
1. Upload and extract **`iti_skilltrack_deploy.zip`** into your web root (e.g. `public_html` or `/var/www/html`).
2. Verify directory permissions:
   ```bash
   chmod -R 755 public_html/
   chmod -R 775 public_html/api/storage/
   ```
3. The application is immediately operational using the bundled SQLite database.
4. *(Optional MySQL upgrade)*:
   - Create a MySQL database (e.g., `iti_skilltrack`).
   - Import `deploy/database/iti_skilltrack_full.sql` via phpMyAdmin or MySQL CLI:
     ```bash
     mysql -u iti_user -p iti_skilltrack < deploy/database/iti_skilltrack_full.sql
     ```
   - Update `api/.env`:
     ```ini
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=iti_skilltrack
     DB_USERNAME=iti_user
     DB_PASSWORD=your_secure_password
     ```

### Nginx Server Configuration Example
```nginx
server {
    listen 80;
    server_name itiskilltrack.edu.in;
    root /var/www/iti_skilltrack/htdocs;
    index index.html index.php;

    # Protect private uploads directory
    location ^~ /api/storage/ {
        deny all;
        return 403;
    }

    # Route API requests to PHP front controller
    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
    }

    # Pass PHP scripts to FastCGI
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # React Router SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔒 Security Hardening & Compliance Framework

ITI SkillTrack incorporates enterprise-grade security controls aligned with OWASP Top 10 guidelines:

1. **Strict Insecure Direct Object Reference (IDOR) Mitigation:**
   - Every read and write query enforces institute boundaries (`institute_id`).
   - Instructors can only query sessions and enter rubrics for batches linked in `instructor_assignments`.
   - Trainees querying `/api/v1/students/{id}/attendance` or `/competency` are restricted strictly to their own ID; queries for other trainees return `403 Forbidden`.
2. **Cross-Site Request Forgery (CSRF) Prevention:**
   - State-modifying requests (`POST`, `PUT`, `DELETE`) require a valid `X-CSRF-Token` header validated against the active session token.
3. **Session Security & HttpOnly Cookies:**
   - Authentication tokens are maintained in `HttpOnly`, `SameSite=Lax` cookies, preventing token theft via XSS.
4. **CSV Formula Injection Mitigation (DEC-09):**
   - Prior to generating CSV attendance exports, all text cells are sanitized: characters `=`, `+`, `-`, `@`, `\t`, and `\r` are prepended with an apostrophe `'` to neutralize formula execution in Microsoft Excel and LibreOffice Calc.
5. **Private Uploads & Arbitrary File Upload Protection (DEC-08):**
   - Uploaded files are stored in `storage/private_uploads/` located outside the public HTTP web root.
   - Files are validated against strict MIME types (`image/jpeg`, `image/png`, `application/pdf`) with a 5MB limit.
   - Files are served solely through an authenticated streaming controller that verifies trainee/instructor access permissions.
6. **Append-Only Immutable Audit Trail (DEC-07):**
   - All mutations to submitted attendance registers or assessment rubrics generate permanent records in `audit_logs` storing the actor ID, target entity, timestamp, IP address, and JSON diff of prior vs updated values.

---

## 🧪 Testing, Quality Assurance & Verification Matrix

The platform underwent comprehensive functional, integration, and security verification:

```
[PASS] Phase 0 Policy Rules Signed Off (DEC-01 to DEC-12)
[PASS] Database Migrations (001 -> 002 -> 003) executed cleanly on MySQL 8.x and SQLite 3
[PASS] Authentication flow: Bcrypt verification & CSRF token negotiation
[PASS] Session Roster Generator: Accurate student filtering as of session date
[PASS] Attendance 80% Gate: Amit Kumar (92.5% - Pass) vs Low Attendance alerts
[PASS] Controlled Correction Workflow: 48-hour enforcement & mandatory reason (>10 chars)
[PASS] DEC-05 Competency Engine:
       - Scenario A: Safety criteria 5/5, 5/5, 4/5 + Total 85% -> DERIVED: COMPETENT
       - Scenario B: Safety criterion 2/5 (Fail) + Total 80%   -> DERIVED: NEEDS_PRACTICE
       - Scenario C: Safety criteria 5/5 + Total 68% (<75%)    -> DERIVED: NEEDS_PRACTICE
[PASS] Remedial Task Engine: Automatic task creation upon failing safety criterion
[PASS] CSV Export Sanitization: Mitigates `=CMD|' /C calc'!A0` formula injections
[PASS] Single-Viewport UI Verification: Zero-scroll (100vh) login interface confirmed
[PASS] Production Deployment Bundle: `iti_skilltrack_deploy.zip` built and verified
```

---

## 📂 Project Directory Structure

```
ITI_SkillTrack_SSIP_2025_SFIC_2026/
├── backend/
│   ├── config/                     # Application configurations (app.php, database.php)
│   ├── database/
│   │   ├── migrations/             # SQL schema migrations (001_initial, 002_attendance, 003_competency)
│   │   ├── seeds/                  # Pilot seed datasets for Electrician Trade
│   │   ├── iti_skilltrack.sqlite   # Pre-seeded zero-config local database
│   │   └── iti_skilltrack_full.sql # Unified MySQL 8.x schema & seed dump
│   ├── public/
│   │   ├── index.php               # Front controller & REST API router entry
│   │   └── .htaccess               # Apache routing directives
│   ├── src/
│   │   ├── Controllers/            # Auth, Attendance, Competency, Remedial, Org controllers
│   │   ├── Middleware/             # Auth, Role, CSRF, CORS, Request ID middleware
│   │   ├── Services/               # Core domain logic (AttendanceService, CompetencyService)
│   │   └── Support/                # Router, Request, Response JSON envelope
│   └── storage/
│       └── private_uploads/        # DEC-08 access-checked practical evidence files
├── frontend/
│   ├── public/                     # Favicons, manifest, static SVGs
│   ├── src/
│   │   ├── components/             # Reusable UI primitives (Button, Modal, StatCard, Badge)
│   │   ├── features/
│   │   │   ├── attendance/         # SessionsPage, AttendanceRegister, ReportMatrix
│   │   │   ├── auth/               # LoginPage (Zero-scroll institutional card)
│   │   │   ├── competency/         # CurriculumPage, AssessmentWorkspace, StudentSkills
│   │   │   ├── dashboard/          # AdminDashboard, InstructorDashboard, StudentDashboard
│   │   │   ├── home/               # HomePage (Institutional portal layout)
│   │   │   ├── organization/       # Trades, Periods, Batches, Settings
│   │   │   └── remedial/           # RemedialSupportPage (Task queue & review modal)
│   │   ├── lib/                    # API client, date & string utilities
│   │   ├── App.jsx                 # Routing configuration
│   │   └── main.jsx                # Application root entry
│   ├── package.json                # React 19 dependencies & scripts
│   └── vite.config.js              # Vite configuration & dev API proxy
├── deploy/                         # Production web root bundle
│   ├── htdocs/                     # Production web root with compiled frontend + backend
│   ├── database/                   # Production MySQL dumps
│   ├── apache.vhost.example        # Apache VirtualHost config template
│   ├── nginx.conf.example          # Nginx server block template
│   └── README.md                   # Dedicated deployment guide
├── docs/                           # Architecture, PRD, tasks, policy registers
│   ├── phase-0/                    # Policy decision register (DEC-01 to DEC-12)
│   ├── screenshots/                # Embedded system UI screenshots
│   └── tasks.md                    # Detailed task tracking register
├── iti_skilltrack_deploy.zip       # Pre-packaged production deployment zip
└── README.md                       # Master technical documentation
```

---

## 🔮 Strategic Roadmap (Phases 6–8)

Following the successful verification of Phases 0 through 5, the forward development roadmap encompasses:

* **Phase 6: AITT Hall Ticket & Eligibility Integration:**
  - Automated generation of All India Trade Test (AITT) practical eligibility lists based on the DEC-03 statutory 80% attendance gate and DEC-05 competency clearance.
  - Digital trainee sign-off and hall ticket barcode issuance.
* **Phase 7: Biometric Workshop Hardware Integration:**
  - Bridge module connecting optical/capacitive fingerprint scanners and RFID trainee cards directly to the `/api/v1/sessions/{id}/attendance` endpoint.
  - Offline-first syncing for workshops with intermittent internet connectivity.
* **Phase 8: State DGT Central Federation & Multi-Institute Analytics:**
  - Multi-tenant cloud synchronization allowing State Directorate of Technical Education officers to monitor real-time practical attendance, machinery utilization, and competency pass rates across all regional ITIs.

---

## 🏛️ Governance, SSIP 2025 / SFIC 2026 Initiative & License

**ITI SkillTrack** is developed under the auspices of the **Student Startup and Innovation Policy (SSIP 2025)** and the **Smart Future Innovation Challenge (SFIC 2026)** to drive digital transformation across technical vocational education.

* **Primary Trade Reference:** ITI Electrician (CTS / NCO-2015: 7411.0101, NSQF Level 4/5)
* **Institutional Regulatory Framework:** Directorate General of Training (DGT), Ministry of Skill Development and Entrepreneurship (MSDE), Government of India.
* **Licensing:** Released under the [MIT License](LICENSE). Open-source software designed for public and private vocational institutions.
