# ITI SkillTrack
Digital Skill Training, Attendance and Competency Tracking System for ITI Students

## Documentation & Architecture
Full architecture, design specifications, requirements, and policy documents are located in [`docs/`](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/README.md):
- [Product Requirements Document (PRD)](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/prd.md)
- [System Architecture](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/architectre.md)
- [UI/UX Design Specification](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/desgin.md)
- [Product, Business & Engineering Rules](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/rules.md)
- [Implementation Phases & Delivery Gates](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/phase.md)
- [Implementation Backlog Tasks](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/tasks.md)
- [Project Memory & Core Invariants](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/docs/memory.md)

---

## Current Status: Phase 3 Completed & Verified (Native React + PHP + MySQL)
*Zero Docker dependencies required.*

### Phase 1: Foundation & Project Setup (Done)
- React 19 SPA + PHP 8.3 REST API + MySQL / SQLite PDO abstraction.
- API envelope (`status`, `data`, `meta`), CORS, error handling, health checks.

### Phase 2: Authentication, Roles & Institute Master Data (Done)
- Role-Based Access Control (RBAC): `administrator`, `instructor`, `student`, `monitoring_officer`.
- HTTP-only session cookies, CSRF protection, Bcrypt hashing.
- Server-side record scope and IDOR prevention.
- Management of Trades, Academic Periods, Batches, Students, and Instructors.

### Phase 3: Training Sessions & Attendance Tracking (Done & Verified)
- **Session Scheduling (ATT-01/02):** Schedule practical labs, theory classes, workshops with batch, date, topic, time.
- **Authoritative Roster (ATT-03):** Dynamic enrollment queries as of session date.
- **Draft & Submission Workflow (ATT-05/06/07):** Live draft saving with partial marks, missing marks validation, register locking with timestamp upon submit.
- **Controlled Corrections (ATT-08):** Modifying submitted registers mandates reasons ($\ge 10$ chars), logs to append-only `audit_logs` table.
- **Attendance Percentage Formula (ATT-10/DEC-03):**
  $$\text{Attendance } \% = \frac{\text{Count}(\text{present}) + \text{Count}(\text{late})}{\text{Total Applicable Sessions} - \text{Count}(\text{excused})} \times 100$$
- **Statutory 80% Threshold:** Automatic eligibility badge (`ELIGIBLE FOR EXAM` vs `ATTENDANCE WARNING (<80%)`).
- **Reports & Export (ATT-11/DEC-09):** Batch matrix report with formula-injection-sanitized CSV export.

---

## Production Deployment Package (`deploy/` & `iti_skilltrack_deploy.zip`)

A complete production deployment bundle is generated in [`deploy/`](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/deploy/README.md) and packaged as `iti_skilltrack_deploy.zip`:

- **`deploy/htdocs/`**: Production frontend assets (`index.html`, `assets/`) and backend REST API (`api/`) ready to upload directly into the server's web root (`htdocs` or `public_html`).
- **`deploy/htdocs/.htaccess` & `api/.htaccess`**: Automatic SPA fallback for React Router and secure routing for `/api/...`.
- **Zero-Config Instant Launch**: Includes a pre-seeded SQLite database (`htdocs/api/database/iti_skilltrack.sqlite`), allowing instant login upon upload without immediate database configuration.
- **Production MySQL Dump**: [`deploy/database/iti_skilltrack_full.sql`](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/deploy/database/iti_skilltrack_full.sql) contains all 26 tables, Phase 3 columns, and pilot seed accounts for 1-click phpMyAdmin import.
- **Server Blocks**: Includes [`deploy/nginx.conf.example`](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/deploy/nginx.conf.example) and [`deploy/apache.vhost.example`](file:///home/shahdhairyah/Downloads/ITI%20SkillTrack%20SSIP-2026/deploy/apache.vhost.example).

---

## Quick Start (No Docker Required)

### 1. Database Setup & Migration
Runs against local MySQL/MariaDB or local development database:
```bash
# Apply schema baseline, Phase 3 migrations, and pilot seed data
php backend/database/migrate.php
```

### 2. Start PHP Backend API
```bash
# Starts built-in PHP server on port 8000
php -S 127.0.0.1:8000 -t backend/public
```

### 3. Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open **http://127.0.0.1:5173** in your browser.

To produce a production build:
```bash
cd frontend
npm run build
```

---

## Automated Test Suites (44 Tests, 100% Passing)

Run the full suite of automated unit, integration, security, and policy tests:
```bash
# 1. Health & Architecture Test
php backend/tests/HealthTest.php

# 2. Phase 2 Auth, Role & Scope Test (IDOR, Cross-batch denial)
php backend/tests/AuthAndScopeTest.php

# 3. Phase 3 Sessions, Attendance & Policy Formula Test
php backend/tests/AttendanceTest.php
```

---

## Seed Demo User Accounts
All pilot test accounts have password: **`Password@123`**

| Role | Username / Identity | Email | Scope |
|---|---|---|---|
| **Administrator** | `admin` | `admin@itiskilltrack.org` | Full Institute Access |
| **Instructor** | `instructor` | `rajesh.sharma@itiskilltrack.org` | Assigned Batch: `EL-2026-A` |
| **Student (Trainee 1)** | `student` | `amit.kumar@student.iti.org` | Personal Record (Eligible, 100%) |
| **Student (Trainee 2)** | `priya` | `priya.verma@student.iti.org` | Personal Record |
| **Student (Trainee 3)** | `rahul` | `rahul.singh@student.iti.org` | Personal Record (Attendance Warning) |
# ITI_SkillTrack_SSIP_2025_SFIC_2026
