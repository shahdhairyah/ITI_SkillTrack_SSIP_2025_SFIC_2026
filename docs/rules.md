# Product, Business and Engineering Rules — ITI SkillTrack

This file defines invariants that must be respected across the React frontend, PHP API and MySQL database. When an institute policy conflicts with a proposed default, obtain an approved policy decision and update this file before implementing the change.

## 1. Product rules

### 1.1 General

1. The system is a training-record and monitoring platform. It does not replace official examinations, certificates or statutory records unless separately approved.
2. Every record belongs to an institute. If multi-institute deployment is enabled, institute scope must be enforced in every query and authorization policy.
3. Trade, module, activity, assessment scale and attendance rules must be configurable.
4. Do not invent official attendance thresholds, pass marks, competency labels or certification rules.
5. Historical records must remain interpretable if a trade, activity, batch or user is later disabled.
6. Use status/deactivation instead of deleting master data referenced by training history.

### 1.2 Identity and profiles

1. Every person authenticates with an individual account; shared instructor accounts are prohibited.
2. User identity and role assignment are separate records.
3. A person may have multiple roles only if the institute explicitly assigns them.
4. Student access is limited to the authenticated student's own profile and linked training records.
5. Instructor access is limited to assigned batches/trades and valid assignment periods.
6. Administrator access is institute-scoped and must not automatically imply access to another institute.
7. Disabled accounts cannot create new records or obtain protected data, but historical records remain linked to the account identifier.

## 2. Attendance rules

1. Attendance belongs to a specific training session; a session belongs to a batch and an authorized instructor.
2. Only students on the session's eligible roster may receive an attendance record for that session.
3. The database must enforce uniqueness of `(session_id, student_id)`.
4. Attendance status values come from the institute-approved configuration. Suggested examples are `present`, `absent`, `late` and `excused`; these are not mandatory official labels.
5. A register must have a defined lifecycle, at minimum `draft` and `submitted`; optional `closed` or `correction_required` states may be enabled by policy.
6. The system must not silently assume a missing mark means Present. Missing marks must be flagged as incomplete until resolved by an authorized user.
7. Before submission, the instructor must be able to review roster counts by status.
8. Submission records actor and timestamp.
9. After submission, changes require correction permission and a non-empty reason.
10. A correction preserves the old value in audit history and records the new value, actor, timestamp and reason.
11. Attendance percentages must state their calculation basis. Define which statuses count in numerator and denominator with the institute before launch.
12. Exemptions, holidays, cancelled sessions and student transfers must be handled by explicit session/roster rules, not by silently altering attendance totals.
13. Do not permit an instructor to mark attendance for a batch outside their assignment window.

## 3. Practical activity rules

1. Every practical activity is linked to a trade/module or an explicitly approved shared module.
2. Each activity has a stable code, title, instructions, status and, where applicable, expected evidence.
3. Competency criteria belong to a specific activity and rubric version.
4. Changes to an active rubric should not rewrite historical assessments. Create a new version/effective period when needed.
5. A student attempt is traceable by student, activity and attempt number.
6. An instructor can create or update attempts only within assigned scope.
7. Evidence attachments are optional and policy-controlled; they are private and access-checked.
8. Inactive activities remain visible in historical assessment details but are not selectable for new attempts unless explicitly reopened.

## 4. Competency and assessment rules

1. An assessment must identify the student, practical attempt/activity, assessor and assessment time.
2. Criterion-level results must match the active rubric and allowed scale.
3. Required criteria cannot be omitted when an assessment is submitted.
4. Numeric values must be within configured bounds; categorical values must be from the configured vocabulary.
5. The system may calculate an aggregate only when the rubric defines the weighting and aggregation method.
6. A competency label such as `Demonstrated`, `In progress` or `Needs practice` must be derived from an approved rule, not an arbitrary UI heuristic.
7. Assessment records are historical evidence. A new assessment creates a new event; it does not erase the earlier result.
8. If an assessment correction is required, use an authorized correction/revision workflow with audit history.
9. The assessor must not assess outside their assigned trade/batch or approved role scope.
10. Any automated follow-up recommendation must be explainable from a configured criterion or rule and reviewable by the instructor.
11. The system must not make automatic certification or adverse academic decisions based solely on a computed score.

## 5. Remedial support rules

1. A remedial assignment is linked to a student and should reference an activity/competency gap when possible.
2. It must include the reason, instructions, assigning user and target date or an explicit no-deadline value.
3. Suggested statuses: `assigned`, `in_progress`, `submitted_for_review`, `completed`, `cancelled`. The institute may configure labels, but transitions must be controlled.
4. Students may view their remedial items and permitted instructions; they cannot mark an item completed unless the institute explicitly allows student self-reporting.
5. An instructor reviews completion and records an outcome/feedback.
6. Closing or cancelling a remedial assignment requires an authorized actor and may require a note.
7. A remedial assignment does not itself change the source competency assessment.
8. Overdue status is derived from due date and allowed status; it should not be stored as an independently editable truth.

## 6. Dashboard and reporting rules

1. Every dashboard query applies authorization scope before aggregation.
2. Students see only their own data.
3. Instructors see assigned students and batches only.
4. Monitoring roles see only approved aggregate or row-level data within their assigned scope.
5. Report filters and reporting period must be visible in the UI and export.
6. Percentages display numerator, denominator and period in detail views.
7. Compare competency data only where rubric/curriculum comparability is valid.
8. Exports are subject to the same authorization policy as on-screen data.
9. Exporting student-level data should be audited.
10. Avoid exposing sensitive student details in chart labels or notification previews.

## 7. Notifications and audit rules

1. Notifications are informational; authorization is still checked when the linked record is opened.
2. A notification must not contain unnecessary personal or sensitive details.
3. Audit events are append-only from normal application workflows.
4. Audit entries should capture actor, action, target entity, target ID, request ID, timestamp and relevant before/after metadata.
5. Never log passwords, session IDs, CSRF tokens, access tokens or full payment/identity secrets.
6. Access to audit logs is restricted to explicitly authorized roles.
7. System administrators must not edit audit entries through ordinary application screens.

## 8. Security rules

1. Enforce HTTPS in shared, staging and production environments.
2. Hash passwords with PHP's `password_hash()` and verify with `password_verify()`; never encrypt or store plaintext passwords as a substitute.
3. Use PDO prepared statements for all values originating from requests or user-controlled data.
4. Never concatenate raw user input into SQL identifiers, sort clauses or filter fragments. Map allowed sort/filter keys through allowlists.
5. Validate request payloads on the server even when React performs client-side validation.
6. Apply authentication and authorization to every protected API endpoint, including exports and file downloads.
7. Prevent insecure direct object references (IDOR) by verifying the actor's scope for every requested record.
8. Use CSRF protections for cookie-authenticated state-changing requests.
9. Configure exact CORS origins; do not use `*` with credentialed requests.
10. Use HttpOnly and Secure session cookies in production; rotate session IDs after login and privilege changes.
11. Rate-limit login attempts and sensitive endpoints.
12. Encode output and avoid rendering untrusted HTML. If rich text is introduced, sanitize it with an approved library.
13. Keep `.env`, secrets, private uploads and logs out of Git and the public web root.
14. Uploads must be type-checked, size-limited, privately stored and authorized on download.
15. Return generic public errors; log technical details securely with a request ID.
16. Do not expose PHP stack traces, SQL details or filesystem paths in production responses.
17. Review dependencies and run security tests before production release.

## 9. Database and data-integrity rules

1. Use InnoDB and `utf8mb4` for application tables.
2. Use foreign keys for relational integrity.
3. Use unique constraints for duplicate-sensitive data, especially session/student attendance.
4. Use transactions for multi-record workflows.
5. Store timestamps consistently (prefer UTC instants); render them in the institute timezone.
6. Distinguish date-only fields such as academic start date from timestamp fields such as `marked_at`.
7. Use migrations for schema changes; do not rely on undocumented manual production edits.
8. Do not cascade-delete students, assessments or attendance history when a user/batch/activity is deactivated.
9. Seed data must be clearly marked as development/test data and must never create a production default password.
10. Add indexes based on actual query patterns and verify query plans for large reports.

## 10. React frontend rules

1. Organize code by feature and keep API access in shared feature services/API client modules.
2. Do not place database credentials or private secrets in frontend environment variables.
3. Treat frontend route guards as UX only; the backend is the security boundary.
4. Handle loading, empty, error, success and permission-denied states.
5. Keep forms controlled and validate user input for usability; server validation remains authoritative.
6. Prevent duplicate submissions while a write request is pending.
7. Avoid optimistic updates for submitted attendance/assessments unless rollback and conflict handling are designed.
8. Do not store sensitive student records in persistent browser storage without a specific reviewed need.
9. Use semantic elements, accessible labels, keyboard navigation and visible focus.
10. Avoid hard-coded attendance statuses, competency scales, thresholds or trade lists.
11. Format dates and numbers using configured locale/timezone behavior.
12. Reusable components must not contain hidden domain assumptions.

## 11. PHP backend rules

1. Controllers handle HTTP translation; services own business workflows; repositories own SQL.
2. Middleware owns authentication, CSRF, request IDs and broad authorization checks; policies validate target-record scope.
3. Validate request body, query parameters, path IDs and state transitions.
4. Use typed/consistent response envelopes and HTTP status codes.
5. Centralize exception handling; never expose internal exception text in production.
6. Keep database transactions in services around complete domain operations.
7. Record audit events within the same transaction where atomicity is required.
8. Do not trust client-supplied role, institute, trainer, student or batch scope.
9. Use pagination and bounded filters for list/report endpoints.
10. Write tests for policy decisions and state transitions.

## 12. Git and delivery rules

1. Use feature branches and review changes before merging to the main branch.
2. Keep commits focused and describe the change clearly.
3. Never commit `.env`, database dumps containing real student data, passwords, private uploads or production logs.
4. Add migrations and tests in the same change as schema/behavior updates.
5. Update `prd.md`, `architectre.md`, `desgin.md`, `phase.md`, `tasks.md` and `memory.md` when a decision changes the documented baseline.
6. Do not mark a task complete until its acceptance criteria are verified.
7. Do not deploy a migration or release without a backup and rollback/recovery plan appropriate to the change.

## 13. Definition of done

A task is complete when:
- Acceptance criteria pass.
- Server-side validation and authorization are present.
- Database constraints/transactions are correct.
- Loading, empty, error and success UI states are implemented where relevant.
- Audit behavior is implemented for sensitive changes.
- Automated tests or a repeatable manual test record exist.
- No secrets or real student data are committed.
- Documentation and task status are updated.
