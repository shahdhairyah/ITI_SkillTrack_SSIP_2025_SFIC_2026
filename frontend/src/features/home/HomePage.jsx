import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  GraduationCap,
  Presentation,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { roleHome } from '../../lib/format';

const FEATURES = [
  {
    icon: CalendarCheck2,
    tone: 'blue',
    title: 'Attendance registers',
    body: 'Session rosters with clear statuses, review-before-submit and scope-aware corrections.',
  },
  {
    icon: ClipboardCheck,
    tone: 'violet',
    title: 'Practical assessments',
    body: 'Criterion-based rubrics, evidence notes and a complete history for every attempt.',
  },
  {
    icon: BadgeCheck,
    tone: 'green',
    title: 'Competency progress',
    body: 'Know what is demonstrated, in progress or needs practice — always backed by evidence.',
  },
  {
    icon: Building2,
    tone: 'amber',
    title: 'Institute administration',
    body: 'Trades, batches, academic periods, users and audit history in one operational view.',
  },
];

const ROLES = [
  {
    icon: GraduationCap,
    tone: 'blue',
    title: 'For students',
    body: 'Follow your own training journey without noise from other records.',
    points: ['Attendance and competency snapshot', 'Assessment feedback and next steps', 'Remedial practice deadlines'],
  },
  {
    icon: Presentation,
    tone: 'violet',
    title: 'For instructors',
    body: 'Run assigned batches with fast attendance entry and practical assessment.',
    points: ['Batch-scoped student rosters', 'Review-before-submit attendance', 'Criterion-level assessment workflow'],
  },
  {
    icon: UserCog,
    tone: 'green',
    title: 'For administrators',
    body: 'Set up the institute, manage access and monitor training quality.',
    points: ['Users, roles and permissions', 'Institute master data', 'Reports and audit history'],
  },
];

const STEPS = [
  {
    title: 'Set up the institute',
    body: 'Configure trades, modules, academic periods and batches for the current session.',
  },
  {
    title: 'Enroll learners and trainers',
    body: 'Create accounts, enroll students and assign instructors to their batches.',
  },
  {
    title: 'Run everyday training',
    body: 'Capture attendance and practical assessments from desktop, tablet or phone.',
  },
  {
    title: 'Review progress',
    body: 'Track competency evidence, follow up remedial work and export training reports.',
  },
];

const PREVIEW_STATS = [
  { label: 'Students', value: '240' },
  { label: 'Batches', value: '08' },
  { label: 'Attendance', value: '92%' },
];

const PREVIEW_ROWS = [
  { initials: 'AK', name: 'Amit Kumar', detail: 'Electrician · EL-2026-A', status: 'Present', tone: 'green' },
  { initials: 'PS', name: 'Priya Singh', detail: 'Electrician · EL-2026-A', status: 'Pending', tone: 'amber' },
  { initials: 'RV', name: 'Rahul Verma', detail: 'Electrician · EL-2026-A', status: 'Present', tone: 'green' },
];

export default function HomePage() {
  const { user } = useAuth();
  const dashboardPath = user ? roleHome(user.role) : '/login';
  const primaryLabel = user ? 'Open dashboard' : 'Sign in to workspace';

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="ITI SkillTrack home">
            <span className="logo-badge">ST</span>
            <span className="landing-brand-text">
              <strong>ITI SkillTrack</strong>
              <span>Institute training workspace</span>
            </span>
          </Link>

          <nav className="landing-nav-links" aria-label="Home page sections">
            <a href="#features">Features</a>
            <a href="#roles">Roles</a>
            <a href="#workflow">How it works</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <Link to={dashboardPath} className="btn btn-primary">
                Open dashboard
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-signin-link">
                  Sign in
                </Link>
                <Link to="/login" className="btn btn-primary">
                  Get started
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <span className="landing-kicker">
                <Sparkles size={14} />
                Built for industrial training institutes
              </span>
              <h1>
                Training records that keep every learner <span>on track.</span>
              </h1>
              <p>
                ITI SkillTrack brings attendance, practical activities, competency assessments and
                institute administration into one clear, role-aware workspace.
              </p>

              <div className="landing-hero-actions">
                <Link to={dashboardPath} className="btn btn-primary landing-btn-lg">
                  {primaryLabel}
                  <ArrowRight size={16} />
                </Link>
                <a href="#features" className="btn btn-on-dark landing-btn-lg">
                  Explore features
                </a>
              </div>

              <div className="landing-hero-trust">
                <span>
                  <ShieldCheck size={15} />
                  Server-enforced access
                </span>
                <span>
                  <Database size={15} />
                  SQLite or MySQL
                </span>
                <span>
                  <Smartphone size={15} />
                  Works on mobile
                </span>
              </div>
            </div>

            <div className="landing-preview" aria-hidden="true">
              <div className="preview-window">
                <div className="preview-topbar">
                  <span className="preview-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>Institute overview</span>
                  <span className="preview-live">
                    <span className="status-dot" />
                    Live
                  </span>
                </div>

                <div className="preview-body">
                  <div className="preview-stat-row">
                    {PREVIEW_STATS.map((stat) => (
                      <div className="preview-stat" key={stat.label}>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="preview-progress">
                    <div className="preview-progress-head">
                      <span>Competency progress · Electrician</span>
                      <strong>68%</strong>
                    </div>
                    <div className="preview-line">
                      <span style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div className="preview-list">
                    {PREVIEW_ROWS.map((row) => (
                      <div className="preview-row" key={row.name}>
                        <span className="preview-avatar">{row.initials}</span>
                        <span>
                          <strong>{row.name}</strong>
                          <span>{row.detail}</span>
                        </span>
                        <span className={`preview-chip preview-chip-${row.tone}`}>{row.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="preview-float preview-float-a">
                <Award size={19} />
                <span>
                  <strong>Competency</strong>
                  <span>Demonstrated</span>
                </span>
              </div>
              <div className="preview-float preview-float-b">
                <CalendarCheck2 size={19} />
                <span>
                  <strong>Attendance</strong>
                  <span>92% this week</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-stats" aria-label="Platform at a glance">
          <div className="landing-stats-inner">
            <div className="landing-stat">
              <strong>3</strong>
              <span>role-aware workspaces</span>
            </div>
            <div className="landing-stat">
              <strong>24</strong>
              <span>core data tables</span>
            </div>
            <div className="landing-stat">
              <strong>100%</strong>
              <span>server-enforced scope</span>
            </div>
            <div className="landing-stat">
              <strong>2</strong>
              <span>database options</span>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-head">
            <span className="page-eyebrow">One connected workspace</span>
            <h2>Everything the institute needs, without scattered registers.</h2>
            <p>
              Replace paper attendance sheets and disconnected spreadsheets with a single source of
              truth for training delivery and learner outcomes.
            </p>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="landing-feature" key={feature.title}>
                  <span className={`landing-feature-icon landing-tone-${feature.tone}`}>
                    <Icon size={21} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="landing-band" id="roles">
          <section className="landing-section">
            <div className="landing-section-head">
              <span className="page-eyebrow">Built around people</span>
              <h2>Each role sees exactly what it needs.</h2>
              <p>
                Navigation, records and actions are scoped by role, so students, instructors and
                administrators can work confidently without stepping on each other.
              </p>
            </div>

            <div className="landing-role-grid">
              {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <article className="landing-role-card" key={role.title}>
                    <div className="landing-role-top">
                      <span className={`landing-role-icon landing-tone-${role.tone}`}>
                        <Icon size={22} />
                      </span>
                      <h3>{role.title}</h3>
                    </div>
                    <p>{role.body}</p>
                    <ul className="landing-role-list">
                      {role.points.map((point) => (
                        <li key={point}>
                          <CheckCircle2 size={15} />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <Link to={dashboardPath} className="landing-role-link">
                      {user ? 'Open dashboard' : 'Sign in'}
                      <ChevronRight size={15} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <section id="workflow" className="landing-section">
          <div className="landing-workflow">
            <div className="landing-workflow-copy">
              <div className="landing-section-head">
                <span className="page-eyebrow">From setup to outcomes</span>
                <h2>A simple training workflow.</h2>
                <p>Get the institute operational in four clear steps.</p>
              </div>

              <div className="landing-steps">
                {STEPS.map((step, index) => (
                  <div className="landing-step" key={step.title}>
                    <span className="landing-step-num">{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="landing-cta-card">
              <span className="landing-cta-icon">
                <BarChart3 size={22} />
              </span>
              <h3>Ready to open the workspace?</h3>
              <p>
                Sign in with an administrator, instructor or student account. Demo accounts are
                listed directly on the sign-in page.
              </p>
              <Link to={dashboardPath} className="btn btn-primary">
                {user ? 'Open dashboard' : 'Go to sign in'}
                <ArrowRight size={16} />
              </Link>
              <p className="landing-demo-note">
                <BookOpen size={13} />
                Built for attendance, practicals and competency tracking
              </p>
            </aside>
          </div>
        </section>

        <div className="landing-cta-band">
          <div className="landing-cta-inner">
            <div>
              <h2>Keep every batch, register and competency in one place.</h2>
              <p>Start with the demo institute, then adapt the master data to your own ITI.</p>
            </div>
            <Link to={dashboardPath} className="btn btn-primary landing-btn-lg">
              {primaryLabel}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div className="landing-footer-brand">
              <span className="logo-badge">ST</span>
              <strong>ITI SkillTrack</strong>
            </div>
            <p>Digital attendance, practical assessment and competency records for industrial training institutes.</p>
          </div>

          <nav className="landing-footer-links" aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#roles">Roles</a>
            <a href="#workflow">How it works</a>
            <Link to="/login">Sign in</Link>
          </nav>
        </div>

        <div className="landing-footer-bottom">
          <span>© 2026 ITI SkillTrack</span>
          <span>Model Industrial Training Institute · Pilot deployment</span>
        </div>
      </footer>
    </div>
  );
}
