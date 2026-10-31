# Implementation Backlog — ITI SkillTrack

Use the task IDs in issues, commits and pull requests. Mark a task complete only after its acceptance criteria are verified. `P0` is required for MVP; `P1` is important for pilot; `P2` is an enhancement. Tasks are grouped by phase and are not a substitute for institute policy sign-off.

## Status legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Done and verified
- `[!]` Blocked / decision required

Initial status for all implementation tasks is **Not started**.

## Phase 0 — Discovery and policy

- [x] **DISC-01 [P0]** Confirm whether the first release is single-institute or multi-institute. *(Resolved: Single-institute with multi-tenant architecture in `01_policy_decision_register.md` DEC-01)*
- [x] **DISC-02 [P0]** Confirm attendance unit: daily, period-wise, shift-wise or session-wise. *(Resolved: Session-wise attendance in `01_policy_decision_register.md` DEC-02)*
- [x] **DISC-03 [P0]** Obtain approved attendance statuses, threshold and percentage formula. *(Resolved: Present/Late/Absent/Excused, 80% threshold in `01_policy_decision_register.md` DEC-03)*
- [x] **DISC-04 [P0]** Collect trade-wise module and practical activity catalogue. *(Resolved: ITI Electrician trade catalogue in `03_pilot_curriculum_catalogue.json`)*
- [x] **DISC-05 [P0]** Confirm competency scale, criteria, rubric and completion rule for each pilot trade. *(Resolved: 3-tier scale, safety >= 4 & total >= 75% rule in `01_policy_decision_register.md` DEC-05)*
- [x] **DISC-06 [P0]** Confirm student/instructor/admin/monitoring role permissions. *(Resolved: 4-role RBAC with server-side record scope in `01_policy_decision_register.md` DEC-06)*
- [x] **DISC-07 [P1]** Confirm correction approval flow for submitted attendance and assessments. *(Resolved: Mandatory reason + audit trail; 48h window in `02_approved_workflow_notes.md`)*
- [x] **DISC-08 [P1]** Confirm evidence upload types, file-size limit and retention. *(Resolved: JPG/PNG/PDF max 5MB in private storage in `01_policy_decision_register.md` DEC-08)*
- [x] **DISC-09 [P1]** Collect approved report samples and export permissions. *(Resolved: Monthly register & matrix with CSV formula protection in `05_report_templates.md`)*
- [x] **DISC-10 [P1]** Confirm data retention, backup and recovery expectations. *(Resolved: 5-year retention, daily automated backups in `01_policy_decision_register.md` DEC-10)*
- [x] **DISC-11 [P0]** Select pilot trade, batch and representative users. *(Resolved: Electrician EL-2026-A, 10 trainees in `04_sample_anonymized_dataset.json`)*
- [x] **DISC-12 [P0]** Approve MVP acceptance criteria and policy decision register. *(Resolved: Approved in `01_policy_decision_register.md` & `06_mvp_acceptance_criteria.md`)*

## Phase 1 — Foundation

- [ ] **BASE-01 [P0]** Create Git repository and protected main branch.
- [ ] **BASE-02 [P0]** Create `frontend/` React project and verify development/production build.
- [ ] **BASE-03 [P0]** Create `backend/` PHP API project and public front controller.
- [ ] **BASE-04 [P0]** Configure Composer/autoloading if used and document PHP extensions.
- [ ] **BASE-05 [P0]** Add environment configuration and `.env.example`; exclude `.env` from Git.
- [ ] **BASE-06 [P0]** Configure MySQL PDO connection and health check.
- [ ] **BASE-07 [P0]** Add migration mechanism and initial migration baseline.
- [ ] **BASE-08 [P0]** Create consistent JSON response and error envelopes.
- [ ] **BASE-09 [P1]** Configure frontend lint/format and backend test/lint commands.
- [ ] **BASE-10 [P1]** Add CI workflow for build and automated tests.
- [ ] **BASE-11 [P0]** Build responsive app shell, page container and navigation primitives.
- [ ] **BASE-12 [P0]** Document local setup in `README.md` and verify from a clean clone.

## Phase 2 — Authentication, scope and organization

- [x] **AUTH-01 [P0]** Create `users`, `roles` and `user_roles` migrations.
- [x] **AUTH-02 [P0]** Implement secure password hashing and login verification.
- [x] **AUTH-03 [P0]** Implement session creation, rotation, expiry and logout.
- [x] **AUTH-04 [P0]** Implement CSRF protection and exact CORS policy.
- [x] **AUTH-05 [P0]** Implement `GET /api/v1/auth/me` with role and scope information.
- [x] **AUTH-06 [P0]** Implement authorization policies for student, instructor and administrator.
- [x] **AUTH-07 [P0]** Add IDOR/cross-student/cross-batch access tests.
- [x] **ORG-01 [P0]** Create institute and department/trade migrations.
- [x] **ORG-02 [P0]** Create academic period and batch migrations.
- [x] **ORG-03 [P0]** Create student, instructor, enrollment and instructor assignment migrations.
- [x] **ORG-04 [P0]** Build administrator trade, academic period and batch screens.
- [x] **ORG-05 [P0]** Build student profile and enrollment management screens.
- [x] **ORG-06 [P0]** Build instructor profile and batch assignment screens.
- [x] **ORG-07 [P1]** Add account disable/reactivate workflow without deleting history.
- [x] **ORG-08 [P0]** Verify server-side institute/trade/batch scope on list and detail APIs.

## Phase 3 — Sessions and attendance

- [x] **ATT-01 [P0]** Create training session migration and repository.
- [x] **ATT-02 [P0]** Implement create/list/update session endpoints with instructor scope checks.
- [x] **ATT-03 [P0]** Implement authoritative session roster query.
- [x] **ATT-04 [P0]** Create attendance records migration with unique `(session_id, student_id)` constraint.
- [x] **ATT-05 [P0]** Implement configurable attendance statuses.
- [x] **ATT-06 [P0]** Implement attendance draft/save workflow.
- [x] **ATT-07 [P0]** Implement register review and submission transaction.
- [x] **ATT-08 [P0]** Implement submitted-record correction with mandatory reason and audit event.
- [x] **ATT-09 [P0]** Build instructor attendance register responsive UI.
- [x] **ATT-10 [P0]** Build student attendance summary and session history.
- [x] **ATT-11 [P1]** Build authorized attendance filters and CSV report.
- [x] **ATT-12 [P0]** Test duplicates, missing marks, roster changes, cancelled sessions and correction history.
- [x] **ATT-13 [P0]** Obtain institute sign-off on attendance totals and percentage formula.

## Phase 4 — Activities and competency

- [ ] **SKILL-01 [P0]** Create modules, practical activities and competency criteria migrations.
- [ ] **SKILL-02 [P0]** Define rubric configuration/version strategy.
- [ ] **SKILL-03 [P0]** Build administrator curriculum/activity management screens.
- [ ] **SKILL-04 [P0]** Create student activity attempt migration and endpoints.
- [ ] **SKILL-05 [P0]** Create assessment and criterion result migrations.
- [ ] **SKILL-06 [P0]** Implement criterion-level validation and assessment submission transaction.
- [ ] **SKILL-07 [P0]** Implement competency summary calculation from approved rules.
- [ ] **SKILL-08 [P0]** Build instructor assessment form with rubric, feedback and review states.
- [ ] **SKILL-09 [P0]** Build student activity history and competency detail screens.
- [ ] **SKILL-10 [P1]** Add private evidence upload metadata/storage flow if approved.
- [ ] **SKILL-11 [P0]** Test rubric bounds, missing criteria, assessor scope and historical rubric stability.
- [ ] **SKILL-12 [P0]** Obtain trainer sign-off on pilot trade rubric and competency labels.

## Phase 5 — Remedial support and dashboards

- [ ] **REM-01 [P0]** Create remedial assignment and review migrations.
- [ ] **REM-02 [P0]** Implement remedial create/update/review endpoints and allowed state transitions.
- [ ] **REM-03 [P0]** Build instructor remedial queue and assignment form.
- [ ] **REM-04 [P0]** Build student remedial task list and detail view.
- [ ] **REM-05 [P1]** Implement configured follow-up conditions and explainable reason labels.
- [ ] **DASH-01 [P0]** Implement student dashboard API and UI.
- [ ] **DASH-02 [P0]** Implement instructor dashboard API and UI.
- [ ] **DASH-03 [P0]** Implement administrator dashboard API and UI.
- [ ] **DASH-04 [P1]** Implement in-app notification storage and read state.
- [ ] **DASH-05 [P0]** Test dashboard aggregates against source records and role scopes.

## Phase 6 — Reports, audit and hardening

- [ ] **REP-01 [P0]** Implement attendance report with approved filters.
- [ ] **REP-02 [P1]** Implement competency/activity completion report.
- [ ] **REP-03 [P1]** Implement CSV export with formula-injection mitigation.
- [ ] **REP-04 [P1]** Include applied filters and generation timestamp in reports.
- [ ] **AUD-01 [P0]** Implement append-only audit service and audit migrations.
- [ ] **AUD-02 [P0]** Add audit events for attendance submission/correction, assessment submission, role changes and exports.
- [ ] **AUD-03 [P1]** Build restricted audit log viewer.
- [ ] **SEC-01 [P0]** Run SQL injection, XSS, CSRF, IDOR and session security tests.
- [ ] **SEC-02 [P0]** Review private file upload/download access if enabled.
- [ ] **SEC-03 [P0]** Verify production error responses do not leak stack traces or secrets.
- [ ] **OPS-01 [P0]** Add request IDs and structured error logging.
- [ ] **OPS-02 [P0]** Configure database/private storage backup procedure.
- [ ] **OPS-03 [P0]** Perform and document a restore test.
- [ ] **OPS-04 [P1]** Review indexes and report query performance using realistic data volumes.
- [ ] **UX-01 [P1]** Complete keyboard, contrast, responsive and screen-reader-label review.

## Phase 7 — UAT and pilot

- [ ] **UAT-01 [P0]** Prepare pilot test accounts for each role.
- [ ] **UAT-02 [P0]** Prepare approved/anonymized pilot data.
- [ ] **UAT-03 [P0]** Run student workflow tests.
- [ ] **UAT-04 [P0]** Run instructor attendance and assessment workflow tests.
- [ ] **UAT-05 [P0]** Run administrator setup and reporting workflow tests.
- [ ] **UAT-06 [P0]** Reconcile digital attendance against the existing register for the agreed period.
- [ ] **UAT-07 [P0]** Reconcile sample competency records with trainer-approved rubric outcomes.
- [ ] **UAT-08 [P0]** Resolve critical/high defects and record remaining known issues.
- [ ] **UAT-09 [P0]** Obtain institute pilot sign-off and prepare user guide.

## Phase 8 — Production rollout

- [ ] **REL-01 [P0]** Configure production HTTPS, environment secrets and least-privilege DB account.
- [ ] **REL-02 [P0]** Verify production backup, restore and incident contact process.
- [ ] **REL-03 [P0]** Run production deployment checklist and database migrations.
- [ ] **REL-04 [P0]** Create initial administrator account through a secure provisioning process.
- [ ] **REL-05 [P0]** Roll out pilot trade/batch and monitor adoption/data completeness.
- [ ] **REL-06 [P1]** Expand to additional trades/batches after pilot review.
- [ ] **REL-07 [P1]** Review success measures and create post-launch improvement backlog.

## Cross-cutting release checklist

- [ ] No real student records or secrets are committed to the repository.
- [ ] All protected routes enforce server-side access control.
- [ ] Attendance and assessment calculations are based on approved configuration.
- [ ] Database migrations are repeatable and tested.
- [ ] Core workflows have automated tests or documented repeatable UAT cases.
- [ ] Errors, empty states, loading states and permission-denied states are handled.
- [ ] Reports and exports apply the same scope restrictions as screens.
- [ ] Backup and restore are tested.
- [ ] Documentation and this backlog reflect the shipped behavior.
