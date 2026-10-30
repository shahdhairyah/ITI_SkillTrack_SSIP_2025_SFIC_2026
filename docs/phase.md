# Implementation Phases — ITI SkillTrack

## Delivery approach

Build a secure, usable modular monolith in React + PHP + MySQL. Deliver a thin end-to-end slice early, then add attendance, practical assessment, student progress and reporting. Pilot with one trade/batch before expanding. Do not begin with advanced analytics or integrations before core data quality and institute policies are settled.

## Phase 0 — Discovery and policy confirmation

**Goal:** remove ambiguity in institutional workflows before coding business rules.

Activities:
- Confirm institute structure and whether one or multiple institutes are supported.
- Confirm attendance unit, statuses, submission/correction process and percentage formula.
- Collect trade-wise curriculum/module/practical list.
- Confirm competency criteria, scales, pass/competency labels and rubric versioning.
- Confirm role definitions, instructor allocation and monitoring access.
- Confirm reports, data retention, backup and evidence-upload policies.
- Identify pilot trade, batch and stakeholder representatives.

Deliverables:
- Approved workflow notes.
- Signed-off policy decision register.
- MVP scope and acceptance criteria.
- Sample anonymized data set and report templates.

Exit gate: institute representatives approve all policy decisions that affect calculations, permissions and historical record handling.

## Phase 1 — Foundation and project setup

**Goal:** create reliable frontend, backend and database foundations.

Activities:
- Initialize Git repository and folder structure.
- Create React app and PHP API skeleton.
- Configure environment management and database connection.
- Add API routing, response envelope and global exception handling.
- Add migration system and initial schema.
- Configure formatting, linting and test commands.
- Build base application shell and responsive layout.
- Configure development/staging environments and safe seed data.

Deliverables:
- Working frontend/backend health check.
- Initial database migration.
- `.env.example` and developer setup guide.
- CI checks or documented local checks.

Exit gate: a developer can clone the repository, configure local services and run the app without sharing secrets.

## Phase 2 — Authentication, roles and institute setup

**Goal:** establish the security boundary and organizational master data.

Activities:
- Implement login/logout/current-user endpoints.
- Implement secure session and CSRF strategy.
- Implement roles, role assignments and scope policies.
- Add institute, department/trade, academic period and batch management.
- Add student and instructor profiles.
- Add enrollment and instructor assignment history.
- Add role-aware frontend routes and navigation.
- Test IDOR and cross-batch access denial.

Deliverables:
- Working student, instructor and administrator accounts.
- Institute/trade/batch/user setup screens.
- Authorization policy tests.

Exit gate: all role accounts see only permitted screens and API data; organization records can be configured without code changes.

## Phase 3 — Training sessions and attendance

**Goal:** digitize the core attendance workflow.

Activities:
- Implement training sessions and authoritative roster generation.
- Implement attendance draft entry and status configuration.
- Enforce unique session/student attendance records.
- Implement review and submission workflow.
- Implement controlled correction with reason and audit event.
- Build instructor attendance register and student attendance history.
- Add attendance summary calculation using approved policy.
- Add tests for holidays, roster changes, duplicate submissions and corrections.

Deliverables:
- End-to-end session-to-attendance workflow.
- Student attendance view.
- Attendance report for assigned scope.

Exit gate: attendance records reconcile with a controlled sample register; percentage logic is approved and test-covered.

## Phase 4 — Practical activities and competency assessments

**Goal:** track practical work and evidence-backed competency.

Activities:
- Implement modules, practical activities and criteria/rubric configuration.
- Add rubric versioning/effective date behavior where required.
- Implement student activity attempts.
- Implement criterion-level assessment forms and validation.
- Store assessor, assessment date, feedback and evidence metadata.
- Implement competency summary calculation.
- Build student and instructor competency views.

Deliverables:
- Trade/module/activity catalogue.
- Assessment workflow with history.
- Competency summary and detail view.

Exit gate: trainer validates the rubric and sample assessments; old results remain unchanged after a new rubric version is introduced.

## Phase 5 — Remedial support and role dashboards

**Goal:** convert records into actionable follow-up.

Activities:
- Implement remedial assignment and review lifecycle.
- Build student dashboard with attendance, practicals, competency and pending tasks.
- Build instructor dashboard with attendance actions, assessments and follow-up queue.
- Build administrator dashboard with trade/batch summaries.
- Add in-app notifications for important changes.
- Validate that dashboard aggregates respect role scope.

Deliverables:
- Student, instructor and administrator dashboards.
- Remedial workflow and follow-up reports.

Exit gate: an instructor can identify a student requiring support, assign practice and review completion; student sees the correct next action.

## Phase 6 — Reports, exports, audit and operational hardening

**Goal:** support institutional review and production readiness.

Activities:
- Implement filtered attendance and competency reports.
- Implement CSV export with formula-injection protection.
- Add report filters and generation metadata.
- Complete audit log coverage for sensitive operations and exports.
- Review indexes and slow queries using realistic data.
- Add error logging, request IDs and backup/restore procedure.
- Run security tests and accessibility checks.

Deliverables:
- Approved report set.
- Audit viewer with restricted access.
- Security and performance test report.
- Backup and restore runbook.

Exit gate: institute confirms report output; restore test succeeds; critical security findings are resolved.

## Phase 7 — User acceptance testing and pilot

**Goal:** verify the system with real workflows before institute-wide use.

Activities:
- Load anonymized or approved pilot data.
- Train student, trainer and administrator representatives.
- Run parallel comparison with existing registers for an agreed period.
- Capture defects, usability issues and data mismatches.
- Reconcile historical/current data and obtain sign-off.
- Finalize support process and release notes.

Deliverables:
- UAT checklist and sign-off.
- Pilot issue log and resolutions.
- User guidance and support ownership.

Exit gate: no unresolved critical defects; attendance and competency records reconcile; users approve core workflows.

## Phase 8 — Production rollout and controlled enhancement

**Goal:** expand safely and learn from operational use.

Activities:
- Deploy production environment with HTTPS and production secrets.
- Configure least-privilege accounts and backups.
- Roll out additional trades/batches in waves.
- Monitor adoption, record completeness, error rate and report time.
- Review the product metrics after the first reporting cycle.
- Prioritize later integrations or offline capabilities using evidence.

Deliverables:
- Production release.
- Operational monitoring and recovery process.
- Post-pilot improvement backlog.

Exit gate: production owner accepts the system, support and backup processes are active, and monitoring is reviewed on a defined cadence.

## Suggested dependency sequence

```text
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
                                 │            │
                                 └────────────┴→ Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Attendance and competency share identity, enrollment, batch and scope foundations. Do not start either feature before the relevant organization and authorization model is stable.

## Release gates (must pass)

- **Security gate:** role/scope tests, session protection, CSRF, SQL injection and IDOR tests pass.
- **Data gate:** constraints, migrations, backup and restore verified.
- **Policy gate:** attendance and competency definitions approved by institute.
- **UX gate:** representative users complete core tasks on desktop and mobile.
- **Operational gate:** logs, support owner, backup cadence and recovery procedures documented.
