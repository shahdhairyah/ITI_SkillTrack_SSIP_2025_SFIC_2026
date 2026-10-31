import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import { formatDate, toTitleCase } from '../../lib/format';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();

  const { data, loading, error, reload } = useApiResource(async () => {
    const requests = [
      api.get('/students'),
      api.get('/instructors'),
      api.get('/trades'),
      api.get('/academic-periods'),
      api.get('/batches'),
      api.get('/departments'),
      api.get('/sessions').catch(() => []),
    ];
    if (isAdmin) requests.push(api.get('/users'));

    const [students, instructors, trades, periods, batches, departments, sessions, users] = await Promise.all(requests);
    return { students, instructors, trades, periods, batches, departments, sessions: sessions || [], users: users || [] };
  }, [isAdmin]);

  if (loading) return <Loader label="Loading institute overview…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const students = data?.students || [];
  const instructors = data?.instructors || [];
  const trades = data?.trades || [];
  const periods = data?.periods || [];
  const batches = data?.batches || [];
  const departments = data?.departments || [];
  const sessions = data?.sessions || [];
  const users = data?.users || [];

  const activeStudents = students.filter((student) => student.status === 'active').length;
  const activeInstructors = instructors.filter((instructor) => instructor.status === 'active').length;
  const activeBatches = batches.filter((batch) => batch.status === 'active').length;
  const submittedSessions = sessions.filter((s) => s.status === 'submitted').length;

  const setupSteps = [
    {
      label: 'Department configured',
      done: departments.length > 0,
      to: '/admin/settings',
      detail: `${departments.length} department${departments.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Trade catalogue configured',
      done: trades.length > 0,
      to: '/admin/trades',
      detail: `${trades.length} trade${trades.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Academic period defined',
      done: periods.length > 0,
      to: '/admin/academic-periods',
      detail: `${periods.length} period${periods.length === 1 ? '' : 's'}`,
    },
    {
      label: 'Batch created',
      done: batches.length > 0,
      to: '/admin/batches',
      detail: `${activeBatches} active`,
    },
    {
      label: 'Instructor onboarded',
      done: instructors.length > 0,
      to: '/admin/instructors',
      detail: `${activeInstructors} active`,
    },
    {
      label: 'Students enrolled',
      done: students.length > 0,
      to: '/admin/students',
      detail: `${activeStudents} active`,
    },
  ];

  const completion = setupSteps.filter((step) => step.done).length;

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? 'Administrator workspace' : 'Monitoring workspace'}
        title={isAdmin ? 'Institute overview & attendance' : 'Read-only institute overview'}
        description={
          isAdmin
            ? 'Phase 3 Training & Attendance Operational Control. Master data, student enrollments, practical sessions, and compliance reports.'
            : 'Monitoring officers receive read-only visibility within their assigned institute scope.'
        }
        actions={
          isAdmin ? (
            <div className="flex gap-2">
              <Link to="/attendance/report" className="btn btn-secondary">
                <FileSpreadsheet size={16} />
                Attendance Report
              </Link>
              <Link to="/sessions" className="btn btn-primary">
                <CalendarDays size={16} />
                Training Sessions
              </Link>
            </div>
          ) : null
        }
      />

      <div className="stat-grid stat-grid-4 mb-6">
        <StatCard
          label="Active Students"
          value={activeStudents}
          hint={`${students.length} enrolled records`}
          icon={GraduationCap}
          tone="blue"
        />
        <StatCard
          label="Training Sessions"
          value={sessions.length}
          hint={`${submittedSessions} submitted registers`}
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="Active Instructors"
          value={activeInstructors}
          hint={`${instructors.length} staff profiles`}
          icon={Users}
          tone="violet"
        />
        <StatCard
          label={isAdmin ? 'User Accounts' : 'Departments'}
          value={isAdmin ? users.length : departments.length}
          hint={isAdmin ? `${users.filter((row) => row.status === 'active').length} active accounts` : `${departments.length} configured`}
          icon={isAdmin ? ShieldCheck : BookOpen}
          tone="violet"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Setup checklist</h2>
              <p>Complete these steps before opening attendance workflows in Phase 3.</p>
            </div>
            <span className="checklist-progress">{completion}/{setupSteps.length}</span>
          </div>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${(completion / setupSteps.length) * 100}%` }} />
          </div>

          <div className="checklist">
            {setupSteps.map((step) => (
              <Link key={step.label} to={step.to} className={`checklist-item ${step.done ? 'done' : ''}`}>
                <span className="checklist-icon">
                  {step.done ? <CheckCircle2 size={17} /> : <span className="checklist-dot" />}
                </span>
                <span className="checklist-copy">
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Recent batches</h2>
              <p>Current cohort configuration across trades and academic periods.</p>
            </div>
            <Link to="/admin/batches" className="text-link">View all</Link>
          </div>

          {batches.length === 0 ? (
            <EmptyState
              title="No batches yet"
              message="Create a trade and academic period, then add the first batch."
            />
          ) : (
            <div className="stack-list">
              {batches.slice(0, 5).map((batch) => (
                <Link key={batch.id} to="/admin/batches" className="stack-item">
                  <div className="stack-avatar">{batch.name?.slice(0, 2).toUpperCase()}</div>
                  <div className="stack-copy">
                    <strong>{batch.name} · Section {batch.section}</strong>
                    <span>{batch.trade_name} · {batch.academic_period_name}</span>
                  </div>
                  <div className="stack-meta">
                    <Badge>{batch.status}</Badge>
                    <span>{batch.student_count} students</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Organization snapshot</h2>
            <p>Master data is configurable without code changes.</p>
          </div>
        </div>
        <div className="org-snapshot-grid">
          <div className="org-snapshot">
            <span className="org-snapshot-icon"><BookOpen size={18} /></span>
            <div>
              <strong>{trades.length} trades</strong>
              <span>{trades.map((trade) => trade.code).join(', ') || 'No trades configured'}</span>
            </div>
          </div>
          <div className="org-snapshot">
            <span className="org-snapshot-icon"><CalendarDays size={18} /></span>
            <div>
              <strong>{periods.length} academic periods</strong>
              <span>{periods[0] ? `${periods[0].name} · ${formatDate(periods[0].starts_on)}` : 'No periods configured'}</span>
            </div>
          </div>
          <div className="org-snapshot">
            <span className="org-snapshot-icon"><ShieldCheck size={18} /></span>
            <div>
              <strong>{user?.role_label}</strong>
              <span>{toTitleCase(user?.role)} · {isAdmin ? 'Full institute scope' : 'Read-only scope'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
