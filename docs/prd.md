# Product Requirements Document (PRD)

## 1. Document control

| Field | Value |
|---|---|
| Product | ITI SkillTrack — Digital Skill Training, Attendance and Competency Tracking System |
| Document | Product Requirements Document |
| Version | 1.0 — baseline draft |
| Date | 30 October 2026 |
| Technology | React frontend, PHP REST API, MySQL database |
| Status | Proposed; institute policy validation required |

## 2. Executive summary

ITI SkillTrack is a web-based platform that centralizes vocational training records for ITI students. It connects attendance, scheduled training, practical activities, competency assessments and remedial follow-up to one student record. Students see their own progress; instructors manage training and assessment for assigned batches; administrators configure the institute and review consolidated results.

The product is intended to reduce repeated manual record-keeping, improve data availability and make training gaps visible earlier. It supports human-reviewed assessments and traceable corrections. It does not automatically determine a student's official qualification or replace statutory institute records unless an authorized policy decision permits that use.

## 3. Problem statement

ITI training includes theory and practical work across multiple trades and batches. Attendance, practical records, assessment outcomes and competency progress may be maintained in separate registers or spreadsheets. This creates several problems:

1. Repeated or duplicate manual data entry.
2. Difficulty consolidating practical and competency records across trades and batches.
3. No single operational dashboard for instructors and administrators.
4. Limited student visibility into attendance, completed practicals, assessments and remaining requirements.
5. Slow identification of students who need practice, remediation or follow-up.
6. Manual effort to prepare institutional reports.
7. Inconsistent access to sensitive student information without a defined permission model.

## 4. Product vision

Provide one reliable, understandable and secure digital record of each student's training progress, while keeping institute-specific trade structures, competency rubrics and attendance policies configurable.

## 5. Goals and success measures

### Product goals

- Improve completeness and timeliness of attendance and practical records.
- Make student competency status traceable to specific activities and assessments.
- Help trainers identify students who need follow-up.
- Give students a clear view of their progress and next actions.
- Reduce time spent consolidating routine reports.
- Preserve accountability through role restrictions and audit history.

### Proposed operational measures

Establish a baseline during pilot deployment, then measure:

| Measure | Definition | Proposed target for pilot review |
|---|---|---|
| Attendance capture timeliness | Share of sessions recorded within the institute's agreed entry window | At least 95% |
| Attendance completeness | Sessions with a submitted attendance record / sessions requiring attendance | At least 98% |
| Practical-record coverage | Required practical activities with an attempt or documented pending status | At least 90% |
| Assessment traceability | Assessment results linked to student, activity, assessor and date | 100% |
| Remedial follow-up visibility | Students meeting configured follow-up criteria visible in the instructor queue | 100% of identified cases |
| Report preparation time | Time to produce a standard batch/trade report | Reduce against pilot baseline |
| Unauthorized access incidents | Confirmed access outside assigned role/scope | 0 accepted incidents |

These are proposed pilot targets, not externally mandated standards. Review them with institute leadership and adjust after baseline measurement.

## 6. Users and roles

### 6.1 Student

Needs to:
- Sign in securely.
- View their profile and current enrollment.
- View attendance summary and session-level details.
- View practical activities, attempts and instructor feedback.
- View competency status by module/skill/criterion.
- View assessment history and pending requirements.
- View assigned remedial practice and due dates.
- Receive relevant in-app notifications.

A student must never be able to read another student's private record by changing a URL or API identifier.

### 6.2 Instructor / trainer

Needs to:
- View assigned trades, batches, students and training sessions.
- Create or manage practical activities within authorized scope.
- Mark attendance for an assigned session.
- Submit attendance and request/perform an authorized correction with a reason.
- Record practical attempts, evidence references and observations.
- Assess competency using the configured rubric.
- Assign additional practice or remedial support.
- Review students requiring follow-up.
- Export reports limited to assigned scope, when permitted.

### 6.3 Institute administrator

Needs to:
- Configure institute details, departments/trades, academic periods and batches.
- Create, disable and manage users and role assignments.
- Maintain student and instructor profiles.
- Configure modules, practical activities and competency criteria.
- Configure attendance and follow-up rules based on approved policy.
- View institute-level dashboards and reports.
- Review audit history and resolve data-quality issues.
- Control report access and data export permissions.

### 6.4 Monitoring officer (optional, secondary)

Needs read-only, explicitly scoped access to authorized institute/department summaries and approved reports. This role is optional and must be enabled only after the institute defines its scope and privacy requirements.

## 7. Scope

### 7.1 MVP — included

1. Authentication and session management.
2. Role-based authorization and data-scope enforcement.
3. Institute, department/trade, academic period and batch setup.
4. Student and instructor profile management.
5. Student-to-batch enrollment.
6. Training session scheduling/basic session register.
7. Attendance entry, submission, review and controlled correction.
8. Practical activity catalogue linked to trade/module.
9. Student practical attempts and instructor feedback.
10. Configurable competency criteria and assessment records.
11. Student, instructor and administrator dashboards.
12. Follow-up/remedial assignment workflow.
13. Search, filtering and export of approved reports.
14. Audit events for sensitive operations.
15. Basic in-app notifications for important updates.

### 7.2 Later enhancements — not required for first release

- QR-based session check-in with trainer verification.
- Offline-first attendance entry and background synchronization.
- Biometric attendance integration, only after legal, privacy and procurement approval.
- SMS, WhatsApp or email notifications through approved providers.
- Integration with external student-management or government systems.
- Advanced analytics and cohort comparisons.
- Predictive risk scoring. Any such feature must be explainable, reviewed by instructors and never be the sole basis for adverse student decisions.
- Native Android/iOS applications.

### 7.3 Out of scope unless separately approved

- Replacing official examination, certification or qualification systems.
- Automatic pass/fail or certification decisions.
- Payroll, fees, hostel, transport or general ERP functions.
- Public exposure of student profiles or rankings.
- Unreviewed AI grading of practical skills.

## 8. Core user journeys

### Journey A — student checks progress

1. Student signs in.
2. System resolves the student's active enrollment and permitted record scope.
3. Student dashboard shows attendance, completed practicals, competency summary, recent assessment results and pending actions.
4. Student opens an activity to view attempt history and trainer feedback.
5. Student opens a remedial assignment and sees its instructions and due date.

**Outcome:** the student understands current progress and what to do next.

### Journey B — instructor records attendance

1. Instructor signs in and selects an assigned batch and scheduled session.
2. System shows the session roster.
3. Instructor marks each eligible student using the institute-configured attendance statuses.
4. The system validates roster membership and prevents duplicate records for the same student/session.
5. Instructor reviews totals and submits the register.
6. Changes after submission follow the correction workflow and are audited.

**Outcome:** attendance is complete, scoped and traceable.

### Journey C — instructor assesses a practical

1. Instructor opens an assigned student's practical attempt or creates an attempt for an eligible activity.
2. Instructor records observations and evaluates configured criteria.
3. The system validates required criteria, assessor scope and score bounds.
4. Instructor saves and submits the assessment.
5. The competency summary is recalculated from approved assessment records according to the configured competency rule.
6. A follow-up item is created or recommended when a configured criterion is not met.

**Outcome:** competency status is supported by explicit evidence and assessor records.

### Journey D — administrator reviews the institute

1. Administrator selects academic period, trade and batch filters.
2. Dashboard presents attendance, activity completion, assessment coverage and follow-up counts.
3. Administrator opens an exception list or report.
4. Authorized records can be exported with filters and generation metadata.

**Outcome:** monitoring is faster and is based on consistent source records.

## 9. Functional requirements

Priority legend: **P0** = release blocker/MVP essential; **P1** = important MVP capability; **P2** = future enhancement.

### 9.1 Identity and access

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-01 | P0 | Users can sign in and sign out through a secure authentication flow. |
| FR-AUTH-02 | P0 | Passwords are stored using PHP's supported password hashing and verification APIs; plaintext passwords are never stored. |
| FR-AUTH-03 | P0 | Each protected API request is authenticated and authorized server-side. |
| FR-AUTH-04 | P0 | The system supports student, instructor and administrator roles; optional monitoring access is read-only and scoped. |
| FR-AUTH-05 | P0 | User role and institute/trade/batch scope are checked for every protected record operation. |
| FR-AUTH-06 | P1 | Administrators can disable user access without deleting historical training records. |

### 9.2 Institute structure and enrollment

| ID | Priority | Requirement |
|---|---|---|
| FR-ORG-01 | P0 | Administrators can configure institute, departments/trades and academic periods. |
| FR-ORG-02 | P0 | Administrators can create batches with trade, academic period, intake/section and status. |
| FR-ORG-03 | P0 | Administrators can maintain student profiles and enrollment history. |
| FR-ORG-04 | P0 | Administrators can maintain instructor profiles and authorized trade/batch assignments. |
| FR-ORG-05 | P1 | Historical enrollments and batch transfers remain traceable. |

### 9.3 Attendance

| ID | Priority | Requirement |
|---|---|---|
| FR-ATT-01 | P0 | Authorized instructors can create or open a training session for an assigned batch. |
| FR-ATT-02 | P0 | An instructor can mark attendance for every eligible student in the session roster. |
| FR-ATT-03 | P0 | The system validates attendance status against the institute-configured status list. |
| FR-ATT-04 | P0 | The system prevents more than one active attendance record for a student in the same session. |
| FR-ATT-05 | P0 | The instructor can review totals before submitting attendance. |
| FR-ATT-06 | P0 | A submitted record can be changed only through an authorized correction flow with a reason and audit event. |
| FR-ATT-07 | P1 | Authorized users can filter attendance by date, batch, trade and student. |
| FR-ATT-08 | P1 | Student dashboards show attendance totals and session-level history. |

### 9.4 Practical training and competency

| ID | Priority | Requirement |
|---|---|---|
| FR-SKILL-01 | P0 | Administrators or authorized curriculum managers can configure trade-linked modules and practical activities. |
| FR-SKILL-02 | P0 | Practical activities can have instructions, expected evidence and competency criteria. |
| FR-SKILL-03 | P0 | Instructors can record a student's activity attempt and observation. |
| FR-SKILL-04 | P0 | An assessment records student, activity, assessor, assessment time, criterion-level results and feedback. |
| FR-SKILL-05 | P0 | The system validates criterion scores/statuses against the configured rubric. |
| FR-SKILL-06 | P0 | Competency status is calculated from approved assessment records using a documented, configurable rule. |
| FR-SKILL-07 | P1 | Students can view completed activities, assessment history and competency status. |
| FR-SKILL-08 | P1 | Authorized users can attach evidence metadata or files where institute policy permits it. |

### 9.5 Remedial support and follow-up

| ID | Priority | Requirement |
|---|---|---|
| FR-REM-01 | P0 | An instructor can assign additional practice to an authorized student with a reason, task and target date. |
| FR-REM-02 | P0 | The student can view assigned practice and its status. |
| FR-REM-03 | P1 | The instructor dashboard highlights students meeting configured follow-up conditions. |
| FR-REM-04 | P1 | Authorized instructors can record completion/review notes and close or reopen a follow-up item. |

### 9.6 Dashboards and reports

| ID | Priority | Requirement |
|---|---|---|
| FR-REP-01 | P0 | Students see only their own progress dashboard. |
| FR-REP-02 | P0 | Instructors see dashboards limited to assigned batches/trades. |
| FR-REP-03 | P0 | Administrators see institute-level summaries according to their permissions. |
| FR-REP-04 | P1 | Reports support date, academic period, trade and batch filters. |
| FR-REP-05 | P1 | Authorized users can export approved report data in CSV format. |
| FR-REP-06 | P1 | Report output displays its filters and generation timestamp. |
| FR-REP-07 | P2 | PDF report generation and scheduled reports may be added after the reporting definitions are approved. |

### 9.7 Audit and notifications

| ID | Priority | Requirement |
|---|---|---|
| FR-AUD-01 | P0 | Sensitive create, update, correction, submission and permission-change events are logged. |
| FR-AUD-02 | P0 | Audit entries identify actor, action, entity, timestamp and relevant change metadata. |
| FR-NOT-01 | P1 | In-app notifications inform students about new remedial assignments and important assessment updates. |
| FR-NOT-02 | P1 | In-app notifications inform instructors about follow-up items within their scope. |

## 10. Business rules summary

1. A student may have multiple historical enrollments but only the institute-approved active enrollment for the selected period is used for current dashboards.
2. Attendance is recorded against a specific training session and an eligible roster member.
3. A unique constraint must prevent duplicate student/session attendance records.
4. Attendance status vocabulary and any attendance threshold are configurable; do not hard-code an assumed official threshold.
5. Submitted attendance is not silently overwritten. A correction requires permission, a reason and an audit event.
6. Competency is assessed against a configured activity/rubric; a numeric score alone must not be treated as competency unless the rubric defines that interpretation.
7. Assessment records must preserve assessor identity, assessment date, activity and criterion-level outcomes.
8. Remedial status is distinct from competency status. Assigning practice does not automatically change a competency result.
9. A student can view only their own record. Instructors are limited to assigned scope. Admin access is limited to the configured institute.
10. Reports must respect the same authorization filters as interactive screens.

See `rules.md` for the complete operational and engineering rules.

## 11. Non-functional requirements

| ID | Area | Requirement / proposed acceptance |
|---|---|---|
| NFR-SEC-01 | Security | HTTPS is mandatory outside local development. Passwords are securely hashed. Prepared statements are used for database access. |
| NFR-SEC-02 | Authorization | Server-side role and record-scope checks apply to every protected API operation. |
| NFR-SEC-03 | Session security | Use secure, HttpOnly, appropriately SameSite session cookies and CSRF protection for cookie-authenticated state-changing requests. |
| NFR-SEC-04 | Privacy | Return only fields needed by the requesting role; private student data is not exposed in public endpoints. |
| NFR-REL-01 | Integrity | Attendance and assessment writes use database transactions where multiple records must remain consistent. |
| NFR-REL-02 | Auditability | Sensitive changes are traceable; audit records are not editable by ordinary users. |
| NFR-PERF-01 | Performance | Common dashboard and list requests should be tested with realistic institute-sized data; establish p95 targets during pilot. |
| NFR-UX-01 | Usability | Forms provide clear validation, save state, error messages and confirmation for destructive/high-impact actions. |
| NFR-UX-02 | Responsive | Core student and instructor workflows work on mobile, tablet and desktop browser widths. |
| NFR-ACC-01 | Accessibility | Keyboard navigation, visible focus, labels, sufficient contrast and semantic HTML are required. Target WCAG 2.2 AA where practical. |
| NFR-MNT-01 | Maintainability | Separate controllers, services, repositories, validators and feature-based React modules. |
| NFR-BACKUP-01 | Recovery | Configure database backup and test restore before production launch. |
| NFR-OBS-01 | Monitoring | Record application errors and key operational events without logging secrets or unnecessary student personal data. |

## 12. Required data domains

- Organization: institute, department, trade, academic period, batch.
- Identity: user, role, role assignment, student profile, instructor profile.
- Enrollment: student enrollment, instructor assignment.
- Training: module, practical activity, training session.
- Attendance: attendance register and per-student attendance record.
- Competency: activity attempt, competency criterion, assessment and criterion result.
- Support: remedial assignment, status and review notes.
- Operations: notification, audit event, attachment metadata.

The detailed proposed relational model is in `architectre.md`.

## 13. Key screens

### Student
- Login and account recovery entry point.
- Student dashboard.
- Attendance summary and history.
- Practical activity list and activity detail.
- Competency progress by trade/module.
- Assessment history and feedback.
- Remedial tasks and notifications.

### Instructor
- Instructor dashboard.
- Assigned batches and student roster.
- Session creation and attendance register.
- Practical activity catalogue.
- Activity attempt and assessment form.
- Student competency detail.
- Remedial queue and follow-up review.
- Batch progress report.

### Administrator
- Institute dashboard.
- User and role management.
- Trade, module, academic period and batch setup.
- Student enrollment and instructor assignment.
- Attendance/competency configuration.
- Reports and export history.
- Audit log viewer.

See `desgin.md` for layout and interaction details.

## 14. Acceptance criteria for MVP

The MVP is acceptable when all of the following can be demonstrated in a test environment:

- A student can authenticate and cannot access another student's records through UI manipulation or direct API calls.
- An instructor can access only assigned batches and record attendance for a valid session roster.
- Duplicate attendance for the same student/session is blocked at both application and database levels.
- Submitted attendance can only be corrected by an authorized user, with reason and audit entry.
- An administrator can configure at least one trade, batch, academic period, module, practical activity and competency rubric without code changes.
- An instructor can submit a criterion-based assessment linked to a student and activity.
- A student can see their own attendance, practical history, competency and remedial assignments.
- A trainer can identify configured follow-up cases for assigned students.
- Reports apply role and scope restrictions and show selected filters.
- Critical workflows have automated or documented repeatable tests.
- Production deployment has HTTPS, secure configuration, database backup and a tested restore procedure.

## 15. Assumptions and decisions requiring institute confirmation

| Topic | Baseline assumption | Confirmation required |
|---|---|---|
| Attendance status | Configurable statuses (for example: Present, Absent, Late, Excused) | Which statuses are officially used? |
| Attendance threshold | Not hard-coded | Is there an official minimum and how is it calculated? |
| Attendance unit | Session-based record | Is attendance daily, period-wise, shift-wise or session-wise? |
| Competency scale | Configurable criteria and rubric | Which trade-wise competency framework and rating scale apply? |
| Competency completion | Derived from approved assessment outcomes | What constitutes competent / needs practice / not assessed? |
| Practical evidence | Metadata and optional private file uploads | Which evidence types are accepted and for how long retained? |
| Monitoring access | Optional read-only role | Which officers can view which institute/trade data? |
| Reports | CSV first; PDF after format approval | Which institutional formats are mandatory? |
| Notifications | In-app first | Are SMS, email or messaging integrations required? |
| Data retention | Configurable policy | Retention, archival and deletion requirements? |

## 16. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Incorrect source data during migration | Misleading dashboards | Data cleansing, import preview, reconciliation and sign-off |
| Unclear attendance policy | Incorrect percentage/status logic | Obtain written policy and make rules configurable |
| Inconsistent trade rubrics | Invalid competency comparisons | Version rubrics by trade/module and effective period |
| Shared instructor accounts | Weak accountability | Individual accounts; prohibit shared credentials |
| Excessive data access | Privacy incident | Deny-by-default permissions, scope checks and access tests |
| Poor connectivity | Delayed data entry | Responsive low-bandwidth interface; consider offline mode only as a later phase |
| File upload risk | Malware or data exposure | Type/size allowlist, random filenames, private storage and authorization on download |
| Low adoption | Parallel paper and digital records | Pilot training, clear ownership and reconciliation period |

## 17. Release strategy

1. Validate policy and workflows with institute stakeholders.
2. Build a working MVP for one pilot trade and batch.
3. Verify records against the institute's existing register during a controlled parallel run.
4. Fix usability and data-quality issues.
5. Expand to more trades/batches after sign-off.
6. Add integrations and advanced analytics only when their value, data quality and governance are established.

## 18. Definition of done

A feature is done only when its requirements are implemented, validation and authorization are enforced server-side, empty/loading/error/success states are designed, relevant tests pass, audit events are present where required, documentation is updated and the feature is verified using the relevant role accounts.
