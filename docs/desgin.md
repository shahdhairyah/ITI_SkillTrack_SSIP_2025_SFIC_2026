# UI/UX Design Specification — ITI SkillTrack

## 1. Design direction

Create a modern, trustworthy institute-management interface. The product should feel operational and clear rather than promotional. Prioritize scanability, low-friction data entry, visible record status and consistent navigation across student, instructor and administrator roles.

**Visual direction:** clean light workspace, deep navy navigation, blue/cyan action accent, neutral surfaces, restrained amber/orange for attention states and red only for errors or critical risk. Use semantic status text and icons in addition to color. A dark theme can be considered as a later accessibility/preference option; it must not reduce contrast.

## 2. UX principles

1. **Role-first navigation:** each user sees the tasks relevant to their role.
2. **Actionable dashboards:** cards should lead to the underlying list or workflow.
3. **Fast attendance entry:** large touch targets, clear roster, keyboard support and a final review step.
4. **Evidence-backed competency:** show the activity, rubric criteria, assessor and date behind every competency result.
5. **No hidden record changes:** submitted/corrected statuses and audit history are visible to authorized users.
6. **Clear next steps:** students should understand what is complete, pending or needs practice.
7. **Responsive by default:** instructor workflows should work on phones/tablets as well as desktop.
8. **Accessible controls:** visible focus, semantic labels, keyboard operation, contrast and non-color status cues.

## 3. Information architecture

### Common shell

- Top bar: institute/app identity, current academic period where relevant, notifications, profile menu and sign out.
- Side navigation: role-specific modules, collapsible on tablet and replaced by a menu/drawer on mobile.
- Main content: page title, short context line, breadcrumb when useful, primary action, filters and content.
- Feedback layer: inline field errors, toast for completed actions, confirmation dialog for high-impact changes.

### Student navigation

1. Dashboard
2. My Attendance
3. Practical Activities
4. My Competencies
5. Assessments & Feedback
6. Remedial Practice
7. Notifications
8. My Profile

### Instructor navigation

1. Dashboard
2. My Batches
3. Training Sessions
4. Attendance Register
5. Practical Activities
6. Assessments
7. Competency Progress
8. Remedial Follow-up
9. Reports (scope-limited)

### Administrator navigation

1. Institute Dashboard
2. Students
3. Instructors
4. Trades & Modules
5. Academic Periods & Batches
6. Training Sessions
7. Attendance Overview
8. Competency Configuration
9. Reports & Exports
10. User Roles & Access
11. Audit Logs
12. Institute Settings

Optional monitoring officers receive a read-only navigation containing approved overview and reports only.

## 4. Screen specifications

### 4.1 Login

**Purpose:** authenticate a user without exposing whether a particular account exists.

Elements:
- Product mark and institute label.
- Username/email field.
- Password field with show/hide control.
- Sign-in button with loading state.
- Generic authentication error message.
- Optional support/contact instruction supplied by the institute.

Behavior:
- Disable repeated submission while request is pending.
- Preserve username after a recoverable failure, but never preserve password.
- Do not reveal account existence in the error message.
- On success, route according to server-provided role and scope.

### 4.2 Student dashboard

**Header context:** student name, admission identifier (only where appropriate), trade, batch and academic period.

Recommended cards:
- Attendance summary with numerator/denominator and reporting period.
- Practical activities completed / assigned.
- Competency status by module.
- Assessments requiring review or recently completed.
- Remedial practice due and overdue.

Below the cards:
- Attendance trend by week/month.
- Competency progress by module or skill group.
- Recent activity/assessment timeline.
- “Next actions” panel with direct links to pending work.

Do not show a single unexplained percentage as the full representation of competency. Provide a detail view with criterion outcomes.

### 4.3 Attendance register

**Purpose:** let an instructor capture a complete session roster efficiently.

Top section:
- Batch and trade.
- Session date and time.
- Session topic/type.
- Instructor identity.
- Session/register status: Draft, Submitted, Correction required or Closed (exact workflow configurable).

Roster table/list:
- Student identifier and name.
- Attendance status selector.
- Optional note only when permitted by policy.
- Search/filter and bulk action only if bulk action is safe and followed by review.

Footer:
- Counts by status.
- Save draft.
- Review & submit.

Interaction rules:
- Show unsaved-change indicator.
- Confirm before submitting the register.
- Do not silently default every student to Present.
- Disable editing after submission except through an authorized correction workflow.
- On mobile, show each learner as a stacked card with status controls.

### 4.4 Practical activity catalogue

List columns/cards:
- Activity code and title.
- Trade/module.
- Estimated effort if configured.
- Required criteria count.
- Active/inactive status.
- Available action based on role.

Activity detail:
- Objective and instructions.
- Required tools/materials, if configured.
- Safety note, if relevant and supplied by the institute.
- Expected evidence.
- Competency criteria and rubric version.
- Student attempt history (authorized view only).

### 4.5 Practical attempt and competency assessment

Assessment form sections:
1. Student and batch context.
2. Activity and attempt number.
3. Rubric version and assessment date.
4. Criterion-by-criterion outcome/score.
5. Evidence reference or attachment metadata where enabled.
6. Trainer observation and feedback.
7. Draft / submit action.

Behavior:
- Show valid scale labels and bounds next to each criterion.
- Clearly identify required criteria that are unanswered.
- Calculate only rubric-defined totals; do not invent a pass threshold.
- Show the assessment status and assessor after submission.
- Require confirmation before final submission.

### 4.6 Competency progress

Use a table or grouped cards by module/skill. Each row shows:
- Skill/criterion name.
- Latest status (for example: Not assessed, In progress, Needs practice, Demonstrated — configurable labels).
- Latest assessment date.
- Evidence/assessment detail link.
- Follow-up action if applicable.

A detail drawer or page should show all assessment attempts chronologically. Keep previous outcomes visible rather than replacing history.

### 4.7 Remedial practice

Student view:
- Task title and reason/context.
- Instructions and target date.
- Current state (Assigned, In progress, Submitted for review, Completed, Cancelled — configurable transition policy).
- Trainer feedback and next step.

Instructor view:
- Filters for batch, status and due date.
- Student, activity, reason, assigned date and due date.
- Review action and notes.

### 4.8 Administrator dashboard

KPI cards:
- Active students.
- Active batches/trades.
- Attendance coverage for selected period.
- Practical activity completion.
- Assessment coverage.
- Students requiring follow-up.

Charts/lists:
- Attendance by trade/batch.
- Competency status distribution.
- Activities with high pending counts.
- Remedial assignments by status.
- Data-quality exceptions.

All visualizations must have filter context and a textual/table alternative. Do not expose individual student details to a role that only has aggregate permission.

### 4.9 User and academic setup screens

Use explicit forms for institute, trade, academic period, batch, student and instructor records. Distinguish inactive from deleted. Show the impact of a change (for example, disabling a batch) before saving. Avoid editing historical enrollment dates without a correction reason and audit entry.

### 4.10 Reports

Report workspace should include:
- Report type.
- Academic period or date range.
- Trade and batch filters.
- Search and sorting where appropriate.
- Result count and totals.
- Export button enabled only for authorized roles.
- Export confirmation when student-level data is included.
- Visible selected filters and generated timestamp in output.

## 5. Shared components

- `AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`.
- `PageHeader` with title, description and primary action.
- `StatCard` with label, value, context and optional trend.
- `StatusBadge` with text + icon, not color alone.
- `DataTable` with loading, empty, error and pagination states.
- `SearchInput`, `FilterBar`, `DateRangeFilter`.
- `FormField`, `SelectField`, `DateField`, `TextAreaField`.
- `ConfirmDialog` for submission/correction/disable actions.
- `EmptyState`, `ErrorState`, `SkeletonLoader`.
- `ProgressIndicator` with accessible label and textual value.
- `AuditTimeline` for authorized history views.

Keep business logic out of presentational components. Reuse components but do not force every screen into the same layout if the workflow differs.

## 6. Visual tokens (starting point)

These are design tokens to implement centrally and refine after user testing.

| Token | Suggested value | Use |
|---|---|---|
| `--color-brand-900` | `#10243A` | Sidebar, main headings |
| `--color-brand-700` | `#174A70` | Primary navigation and emphasis |
| `--color-accent-500` | `#0EA5C6` | Primary action, links, focus accent |
| `--color-surface` | `#FFFFFF` | Main cards and panels |
| `--color-page` | `#F4F7FA` | Page background |
| `--color-text` | `#172433` | Primary text |
| `--color-muted` | `#617386` | Secondary text |
| `--color-border` | `#DCE4EC` | Dividers and controls |
| `--color-warning` | `#B86A12` | Warning/needs attention |
| `--color-danger` | `#B42318` | Error/critical |
| `--color-success` | `#18794E` | Completed/valid |

Use spacing increments of 4/8 px, a consistent radius scale and a restrained shadow system. Do not rely on shadows to communicate hierarchy. Verify color contrast; the proposed values are starting tokens, not a verified accessibility certification.

## 7. Typography and layout

- Use a highly legible sans-serif system font or a licensed web font approved by the project.
- Page title: 24–30 px desktop; scale down on mobile.
- Section title: 18–22 px.
- Body: 14–16 px; dense table text should not fall below a comfortable readable size.
- Use consistent line height and avoid long full-width paragraphs in dashboards.
- Desktop: constrained content width with a 12-column grid where useful.
- Tablet: collapse side navigation and reduce chart columns.
- Mobile: stack cards, convert wide tables to cards or allow controlled horizontal scrolling, and preserve primary actions.

## 8. Interaction and state requirements

Every data-driven screen must cover:

- Initial loading state.
- Empty state with a useful next action.
- Success state after save/submit.
- Field-level validation errors.
- Server/network error with retry guidance.
- Permission-denied state.
- Expired session state.
- Unsaved changes warning where relevant.

Avoid optimistic updates for high-impact records such as submitted attendance and competency assessments unless rollback behavior is explicit. On conflict (record changed by another user), show the latest server state and ask the user to review before retrying.

## 9. Accessibility checklist

- All controls have visible labels or accessible names.
- All forms are keyboard operable and focus order is logical.
- Focus indicator is visible against all surfaces.
- Color is not the only way to distinguish status.
- Error messages are connected to their fields and announced appropriately.
- Charts have a textual summary or data table.
- Touch targets are comfortably sized.
- Tables use proper headers and accessible row/column relationships.
- Motion is restrained and respects reduced-motion preferences.

## 10. Frontend route suggestions

```text
/login
/student/dashboard
/student/attendance
/student/activities
/student/competencies
/student/remedial
/instructor/dashboard
/instructor/batches
/instructor/sessions
/instructor/sessions/:sessionId/attendance
/instructor/assessments
/instructor/remedial
/admin/dashboard
/admin/students
/admin/instructors
/admin/trades
/admin/modules
/admin/batches
/admin/academic-periods
/admin/competency-config
/admin/reports
/admin/users
/admin/audit-logs
```

Route guards improve navigation but are not a security boundary; the API must independently authorize every request.

## 11. UX validation plan

Test the following tasks with at least one representative student, instructor and administrator before pilot:

1. Student finds current attendance and understands the denominator/period.
2. Student finds a practical task requiring additional practice.
3. Instructor completes and submits attendance for a batch without accidental omissions.
4. Instructor corrects a submitted attendance entry and understands the audit reason requirement.
5. Instructor assesses an activity using the configured rubric.
6. Administrator creates a batch and assigns an instructor.
7. Administrator filters and exports a report without exposing data outside scope.

Observe task completion, error rate, time on task and user confusion; revise the interface based on evidence.
