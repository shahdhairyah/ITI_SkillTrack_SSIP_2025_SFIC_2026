# System Architecture — ITI SkillTrack

## 1. Architecture summary

**Selected stack:** React frontend + PHP REST API + MySQL relational database.

Use a modular monolith for the first release: one React application, one PHP API application and one MySQL database. Keep modules separated by domain so the system remains understandable and can scale without introducing microservice complexity prematurely.

```text
┌──────────────────────────────────────────────────────────────┐
│                         Browser                               │
│  React SPA: Student | Instructor | Administrator | Officer   │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS / JSON API
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                       PHP API Layer                           │
│  Router → Authentication → Authorization → Validation        │
│        → Controllers → Domain Services → Repositories         │
│                                                              │
│  Audit | Notifications | Reports | File access               │
└──────────────────────────────┬───────────────────────────────┘
                               │ PDO / prepared statements
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                         MySQL                                 │
│  Identity | Organization | Enrollment | Training             │
│  Attendance | Activities | Competency | Remedial | Audit      │
└──────────────────────────────────────────────────────────────┘
```

Private file storage (if evidence uploads are enabled) sits outside the public web root. The database stores file metadata and a private storage key, not a public filesystem path.

## 2. Architectural principles

1. **Server is authoritative.** React may hide controls for convenience, but PHP enforces authentication, role and record scope.
2. **Deny by default.** Every endpoint requires an explicit permission rule.
3. **Relational integrity.** Use foreign keys, unique constraints, transactions and appropriate indexes.
4. **Traceability.** Important changes create audit events; submitted attendance and assessments are not silently overwritten.
5. **Configurable institute rules.** Attendance statuses, attendance thresholds and competency rubrics must be data/configuration-driven, not scattered hard-coded values.
6. **Modular monolith first.** Separate business domains in code; avoid premature microservices.
7. **Private by design.** Student records and evidence files are never public by default.
8. **API consistency.** Use versioned routes, consistent JSON envelopes and predictable validation errors.

## 3. Logical modules

| Module | Main responsibility |
|---|---|
| Identity & access | Login, logout, sessions, role assignments, account status |
| Organization | Institute, departments, trades, academic periods and batches |
| Enrollment | Student profiles, enrollment history and batch membership |
| Instructor allocation | Trainer profiles and authorized batch/trade assignments |
| Curriculum | Trade modules, practical activities and competency criteria |
| Training sessions | Session schedule, trainer, batch, topic and session status |
| Attendance | Roster, status entry, submission, correction and summaries |
| Practical work | Student attempts, observations and evidence metadata |
| Competency | Rubrics, criterion scores/status, assessment and derived progress |
| Remedial support | Additional practice, due date, status and review |
| Dashboards & reports | Role-scoped KPIs, filters, exports and snapshots |
| Notifications | In-app messages and read/unread state |
| Audit | Actor, action, target record, timestamp and change metadata |

## 4. Suggested code organization

### 4.1 React frontend

```text
frontend/src/
├── app/
│   ├── App.jsx
│   ├── router.jsx
│   └── providers/
├── components/
│   ├── common/             # Button, Modal, Badge, EmptyState, Loader
│   ├── data-display/       # DataTable, StatCard, ProgressBar
│   └── forms/              # FormField, DateField, SelectField
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── students/
│   ├── instructors/
│   ├── organization/
│   ├── attendance/
│   ├── curriculum/
│   ├── activities/
│   ├── competency/
│   ├── remedial/
│   ├── reports/
│   └── notifications/
├── layouts/
├── lib/                    # apiClient, date, number, permission helpers
├── hooks/
├── styles/
└── main.jsx
```

Feature folders should own their pages, API functions, hooks, components and validation schemas where appropriate. Avoid one giant component or one global file containing every API call.

### 4.2 PHP backend

```text
backend/
├── public/
│   └── index.php            # Single API entry point
├── routes/
│   ├── api.php
│   └── api_v1.php
├── src/
│   ├── Controllers/
│   ├── Middleware/          # Auth, role/scope, CSRF, request ID
│   ├── Services/            # Business logic and transactions
│   ├── Repositories/        # PDO queries only
│   ├── Validators/
│   ├── Policies/            # Authorization rules
│   └── Support/             # Response, exceptions, pagination
├── config/
├── database/
│   ├── migrations/
│   └── seeds/
├── storage/
│   ├── private_uploads/
│   └── logs/
├── tests/
├── composer.json
└── .env.example
```

**Layer responsibilities:**

- **Routes:** map HTTP method/path to a controller and middleware.
- **Middleware:** authenticate, validate CSRF where applicable, enforce rate limits and attach the authenticated principal.
- **Controllers:** translate HTTP input/output; do not contain complex business logic.
- **Validators:** validate shape, type, required fields and allowed values.
- **Policies:** evaluate whether the authenticated actor may act on the target record.
- **Services:** implement domain rules and transactional workflows.
- **Repositories:** perform parameterized SQL and map rows to domain data.

## 5. Request lifecycle

1. Browser sends an HTTPS request to `/api/v1/...`.
2. PHP front controller resolves route and request ID.
3. Authentication middleware validates the session.
4. CSRF middleware validates unsafe methods when cookie-based sessions are used.
5. Authorization policy checks role and record scope.
6. Request validator checks input and allowed state transitions.
7. Controller invokes a service.
8. Service applies domain rules and executes a transaction when needed.
9. Repository uses PDO prepared statements to read/write MySQL.
10. Service records audit events for sensitive operations.
11. API returns a consistent JSON response.
12. React updates the view and presents loading, success or error feedback.

## 6. Authentication and authorization design

### Recommended browser session model

For a first-party React web app and PHP API, prefer a server-managed session using a cookie configured as:

- `HttpOnly` so JavaScript cannot read the session identifier.
- `Secure` in HTTPS environments.
- `SameSite=Lax` or stricter where deployment topology allows.
- Session ID regenerated after successful login and privilege changes.
- Idle and absolute expiration according to institute policy.

Use a CSRF token for state-changing requests when cookie-based authentication is used. Configure CORS to allow only the exact frontend origin(s), with credentials enabled only when required. Do not use wildcard origins with credentialed requests.

A stateless token approach may be used only if the deployment requires it and token storage, expiry, revocation, refresh and XSS risks are explicitly designed. Do not store long-lived bearer tokens in `localStorage` by default.

### Authorization model

Use **RBAC + record scope**:

- **Student:** permitted student profile and linked records only for the authenticated student's own identity.
- **Instructor:** assigned batches/trades and students enrolled in those batches during the relevant period.
- **Administrator:** institute-scoped configuration and reporting privileges.
- **Monitoring officer (optional):** read-only view over explicitly assigned institute/department scopes.

Do not trust `student_id`, `batch_id`, `instructor_id` or `institute_id` submitted by the browser. Resolve and authorize these identifiers on the server.

## 7. Proposed relational data model

Use InnoDB, `utf8mb4`, foreign keys and UTC timestamps for stored event times; present dates/times in the institute's configured timezone. Use an explicit institute-local date for attendance/session business rules where needed.

### 7.1 Core tables

| Table | Important columns | Purpose |
|---|---|---|
| `institutes` | `id`, `name`, `code`, `timezone`, `status` | Institute boundary and settings |
| `departments` | `id`, `institute_id`, `name`, `code` | Optional organizational grouping |
| `trades` | `id`, `department_id`, `name`, `code`, `status` | ITI trade catalogue |
| `academic_periods` | `id`, `institute_id`, `name`, `starts_on`, `ends_on`, `status` | Academic year/term configuration |
| `batches` | `id`, `trade_id`, `academic_period_id`, `name`, `section`, `status` | Cohort/batch records |
| `users` | `id`, `institute_id`, `email_or_username`, `password_hash`, `status`, timestamps | Authentication identity |
| `roles` | `id`, `key`, `label` | Role catalogue |
| `user_roles` | `user_id`, `role_id`, `scope_type`, `scope_id` | Role assignment and optional scope |
| `students` | `id`, `user_id`, `admission_no`, profile fields, `status` | Student profile |
| `instructors` | `id`, `user_id`, staff fields, `status` | Instructor profile |
| `enrollments` | `id`, `student_id`, `batch_id`, `starts_on`, `ends_on`, `status` | Student's batch history |
| `instructor_assignments` | `id`, `instructor_id`, `batch_id`, `starts_on`, `ends_on` | Trainer-to-batch authorization scope |

### 7.2 Training and assessment tables

| Table | Important columns | Purpose |
|---|---|---|
| `modules` | `id`, `trade_id`, `code`, `title`, `sequence_no`, `status` | Trade-wise training modules |
| `practical_activities` | `id`, `module_id`, `code`, `title`, `instructions`, `status` | Practical activity catalogue |
| `competency_criteria` | `id`, `activity_id`, `code`, `description`, `weight`, `scale_config` | Rubric criteria for an activity |
| `training_sessions` | `id`, `batch_id`, `instructor_id`, `session_date`, start/end, topic, status | A teaching/practical session |
| `attendance_records` | `id`, `session_id`, `student_id`, `status`, `marked_by`, `marked_at`, `submitted_at`, `correction_reason` | Student attendance for a session |
| `activity_attempts` | `id`, `student_id`, `activity_id`, `attempt_no`, `started_at`, `status`, `notes` | Student practical attempt |
| `assessments` | `id`, `attempt_id`, `assessor_id`, `assessed_at`, `status`, `feedback` | Assessment event |
| `assessment_criterion_results` | `id`, `assessment_id`, `criterion_id`, `result_value`, `result_status`, `comment` | Criterion-level outcome |
| `remedial_assignments` | `id`, `student_id`, `activity_id`, `assigned_by`, `reason`, `instructions`, `due_on`, `status` | Additional practice/follow-up |
| `remedial_reviews` | `id`, `remedial_assignment_id`, `reviewed_by`, `reviewed_at`, `outcome`, `notes` | Trainer review history |

### 7.3 Operational tables

| Table | Important columns | Purpose |
|---|---|---|
| `attachments` | `id`, `owner_type`, `owner_id`, `storage_key`, `mime_type`, `size_bytes`, `uploaded_by` | Private evidence file metadata |
| `notifications` | `id`, `user_id`, `type`, `title`, `body`, `read_at`, `created_at` | In-app notifications |
| `audit_logs` | `id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `request_id`, `before_json`, `after_json`, `created_at` | Sensitive action history |
| `system_settings` | `id`, `institute_id`, `setting_key`, `setting_value` | Approved institute-level configuration |

### 7.4 Key relationship summary

```text
Institute ──< Departments ──< Trades ──< Modules ──< Practical Activities
     │                         │                         │
     ├──< Academic Periods ──< Batches                    ├──< Criteria
     │                         │                         │
     ├──< Users ──< User Roles                           └──< Activity Attempts >── Students
     │        │                                                │                  │
     │        ├── Student Profile ──< Enrollments >── Batches   └── Assessments    └──< Enrollments
     │        └── Instructor Profile ──< Instructor Assignments       │
     │                                                               └──< Criterion Results
     └──< Audit Logs / Settings                                      

Batches ──< Training Sessions ──< Attendance Records >── Students
Students ──< Remedial Assignments ──< Remedial Reviews
Users ──< Notifications
```

The diagram is conceptual. Confirm cardinalities and optionality during schema design. Use surrogate primary keys consistently; use unique business keys for institute code, admission number, batch code/period combination and session/student attendance.

### 7.5 Database constraints and indexes

- Unique index on normalized login identifier within its intended scope.
- Unique index on `(session_id, student_id)` in `attendance_records`.
- Unique index on `(student_id, activity_id, attempt_no)` in `activity_attempts`.
- Unique index on `(assessment_id, criterion_id)` in `assessment_criterion_results`.
- Index all foreign keys and common filters: institute, trade, batch, academic period, session date, student, status.
- Use transactions for attendance submission/correction, assessment submission, enrollment transfer and any workflow that updates dependent records.
- Use soft deactivation/status fields for master records that are referenced historically. Do not cascade-delete historical training data.
- Store money nowhere in MVP unless a separately approved requirement introduces it.

## 8. API design

### 8.1 Conventions

- Base path: `/api/v1`.
- Request and response bodies: JSON, except controlled file upload endpoints.
- Use standard HTTP methods and status codes.
- Use server-side pagination for lists.
- Validate all query parameters and request bodies.
- Use ISO 8601 dates/timestamps in API payloads. Document whether a field is a date-only value or a timezone-aware instant.
- Do not expose SQL errors, stack traces, filesystem paths or secrets in responses.

### 8.2 Response envelopes

Success example:

```json
{
  "data": {
    "id": 42,
    "status": "submitted"
  },
  "meta": {
    "request_id": "server-generated-id"
  }
}
```

Validation/error example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "fields": {
      "session_date": ["The session date is required."]
    }
  },
  "meta": {
    "request_id": "server-generated-id"
  }
}
```

### 8.3 Initial endpoint catalogue

| Method | Endpoint | Purpose | Typical access |
|---|---|---|---|
| `POST` | `/auth/login` | Start authenticated session | Public with rate limit |
| `POST` | `/auth/logout` | End session | Authenticated |
| `GET` | `/auth/me` | Current user, roles and allowed scope | Authenticated |
| `GET/POST` | `/trades` | List/create trades | Admin; scoped read for others |
| `GET/POST` | `/batches` | List/create batches | Admin; assigned-scope read |
| `GET/POST` | `/students` | List/create student profiles | Admin; instructor scoped read |
| `GET` | `/students/{id}/progress` | Student progress summary | Self, assigned instructor, admin |
| `GET/POST` | `/sessions` | List/create training sessions | Assigned instructor/admin |
| `GET` | `/sessions/{id}/roster` | Eligible students for attendance | Assigned instructor/admin |
| `POST` | `/sessions/{id}/attendance` | Submit attendance register | Assigned instructor/admin |
| `PATCH` | `/attendance/{id}/correction` | Correct submitted attendance | Explicit correction permission |
| `GET/POST` | `/activities` | Practical activity catalogue | Read by scope; write by authorized manager |
| `POST` | `/activity-attempts` | Record practical attempt | Assigned instructor |
| `POST` | `/assessments` | Submit competency assessment | Authorized assessor |
| `GET` | `/students/{id}/competencies` | Student competency summary | Self/assigned instructor/admin |
| `GET/POST` | `/remedial-assignments` | List/create follow-up practice | Scoped instructor/admin; student self-read |
| `PATCH` | `/remedial-assignments/{id}` | Update allowed remedial state | Scoped instructor/admin |
| `GET` | `/dashboards/student` | Student dashboard | Student |
| `GET` | `/dashboards/instructor` | Instructor dashboard | Instructor |
| `GET` | `/dashboards/admin` | Institute dashboard | Admin |
| `GET` | `/reports/attendance` | Attendance report | Scoped and permissioned |
| `GET` | `/reports/competency` | Competency report | Scoped and permissioned |
| `GET` | `/audit-logs` | Audit history | Explicit audit permission |

The endpoint list is a baseline; exact request/response schemas should be documented as each endpoint is implemented.

## 9. Domain service workflows

### 9.1 Attendance submission

1. Load the session and verify it is open for attendance.
2. Verify the acting instructor is assigned to the session's batch or has an explicit admin permission.
3. Load the authoritative roster for the session date.
4. Validate that each submitted student belongs to the eligible roster.
5. Validate every attendance status against the active configuration.
6. Begin transaction; insert/update only permitted draft records; prevent duplicate `(session_id, student_id)` pairs.
7. Mark the register submitted and record actor/time.
8. Write audit event and commit.
9. Return summary counts calculated by the server.

### 9.2 Attendance correction

1. Verify correction permission and target record scope.
2. Require a non-empty correction reason.
3. Preserve the old value in the audit trail.
4. Update the record in a transaction and record actor/time/reason.
5. Return the revised record and an audit reference.

### 9.3 Competency assessment

1. Verify student enrollment and instructor scope.
2. Verify the activity is available for the student's trade/module and the assessment references a valid attempt.
3. Load the rubric version active for that assessment.
4. Validate that all required criteria have a valid outcome/value.
5. Save assessment and criterion outcomes in one transaction.
6. Mark assessment submitted/approved according to the configured workflow.
7. Recalculate the displayed competency summary from source assessment records or a controlled materialized summary.
8. Create a follow-up suggestion/assignment when a configured rule is met; do not silently change a previous assessment.

## 10. Dashboard query design

Dashboards should aggregate from authoritative source records. Apply scope filters before aggregation, not after data is fetched.

**Student dashboard candidates:** attendance percentage (with denominator definition), sessions attended/absent, practicals completed, competency distribution, latest assessment feedback, pending remedial tasks.

**Instructor dashboard candidates:** assigned batches, sessions needing attendance submission, attendance completion, students needing follow-up, practical assessments pending, remedial tasks due/overdue.

**Administrator dashboard candidates:** active student count, trade/batch counts, attendance by batch/trade, practical completion, competency status distribution, outstanding follow-up, data completeness.

For any percentage, show numerator, denominator and reporting period in the detail view. Avoid comparing batches with different curricula or assessment rules without clear normalization.

## 11. Reporting and export

- Build report queries through authorized services/repositories, not ad-hoc frontend aggregation.
- Require explicit filters: date range or academic period, plus trade/batch as appropriate.
- Limit export rows and use server-side streaming for large data sets.
- Protect against spreadsheet formula injection by escaping cells beginning with `=`, `+`, `-` or `@` in CSV exports.
- Include report name, filters and generation timestamp in exported output.
- Log export events where they expose student-level personal or performance data.
- PDF output may be added after institute report templates are approved.

## 12. Evidence uploads

Uploads are optional for MVP and must be explicitly enabled by an administrator. If enabled:

- Allowlist required file extensions and verify MIME/content server-side.
- Enforce size limits and randomized storage names.
- Store files outside public web root or in private object storage.
- Store only metadata and storage key in MySQL.
- Authorize every upload and download against the linked student/activity and actor scope.
- Do not expose permanent public URLs.
- Consider malware scanning before files are made available to other users.
- Record upload/download events where policy requires.

## 13. Security controls

- Password hashing using `password_hash()` and verification using `password_verify()`.
- Prepared statements for all user-influenced SQL values.
- Output encoding in React-rendered content; sanitize rich text if rich text is ever allowed.
- CSRF protection for cookie-authenticated state-changing methods.
- Exact CORS allowlist.
- Login rate limiting and generic login failure messages.
- Session rotation after authentication and privilege changes.
- Server-side role/scope policy on every endpoint.
- Input validation and strict allowlists for status transitions.
- Audit sensitive changes; do not log passwords, cookies, access tokens or full sensitive payloads.
- Secure headers and TLS in deployment.
- Backup encryption/access control and restore testing.
- Dependency updates and security review before production releases.

## 14. Deployment architecture

A simple initial deployment may use:

- Nginx or Apache serving the built React files and proxying `/api` to PHP.
- PHP-FPM or the approved PHP runtime.
- MySQL on a private network or localhost, not exposed publicly.
- Private persistent storage for evidence uploads and application logs.
- HTTPS certificate and automatic renewal process.
- Environment-specific secrets outside the repository.
- Scheduled database backups with retention defined by the institute.

For a same-origin deployment, serve React and API through one domain to simplify cookie and CORS behavior. For separate frontend/API origins, configure exact allowed origins, credentialed requests and CSRF protections carefully.

## 15. Observability, backup and recovery

- Generate a request ID for each API request and include it in logs/error metadata.
- Log unexpected errors with enough context for debugging but no credentials or unnecessary sensitive content.
- Monitor API error rate, response time, failed logins, database availability and backup completion.
- Back up database and private evidence storage as a coordinated recovery set.
- Define recovery point and recovery time objectives with the institute; do not invent them in code.
- Test restore to a separate environment before launch and periodically thereafter.

## 16. Testing strategy

- Unit tests: validation, status transitions, percentage calculations, competency aggregation and authorization policy functions.
- Integration tests: PDO repositories, transactions, unique constraints and audit writes.
- API tests: authentication, role scope, payload validation, status codes and error envelopes.
- UI tests: login, dashboard, attendance workflow, assessment workflow, remedial visibility and responsive layouts.
- Security tests: IDOR checks, CSRF, SQL injection resistance, XSS, session behavior, file upload/download access and export filtering.
- UAT: real institute users verify policy, terminology, reports and usability.

## 17. Decisions to confirm

1. Whether institute or multi-institute tenancy is required in the first release.
2. Whether attendance is daily, period-based or session-based.
3. Official attendance status vocabulary and threshold calculations.
4. Trade-wise curriculum source and rubric versioning requirements.
5. Whether student evidence uploads are required.
6. Whether administrator approval is needed for assessment or attendance corrections.
7. Official report templates and retention requirements.
8. Whether the deployment is same-origin or separate-origin.
