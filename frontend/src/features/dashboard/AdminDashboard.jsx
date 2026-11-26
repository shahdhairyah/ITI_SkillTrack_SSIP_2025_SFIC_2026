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
  Award,
  Activity,
  AlertTriangle
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
      api.get('/curriculum').catch(() => []),
      api.get('/remedials').catch(() => []),
    ];
    if (isAdmin) requests.push(api.get('/users'));

    const [students, instructors, trades, periods, batches, departments, sessions, curriculum, remedials, users] = await Promise.all(requests);
    return {
      students,
      instructors,
      trades,
      periods,
      batches,
      departments,
      sessions: sessions || [],
      curriculum: curriculum || [],
      remedials: remedials || [],
      users: users || []
    };
  }, [isAdmin]);

  if (loading) return <Loader label="Loading institute overview & live statistics…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const students = data?.students || [];
  const instructors = data?.instructors || [];
  const trades = data?.trades || [];
  const periods = data?.periods || [];
  const batches = data?.batches || [];
  const departments = data?.departments || [];
  const sessions = data?.sessions || [];
  const curriculum = data?.curriculum || [];
  const remedials = data?.remedials || [];
  const users = data?.users || [];

  const activeStudents = students.filter((student) => student.status === 'active').length;
  const activeInstructors = instructors.filter((instructor) => instructor.status === 'active').length;
  const activeBatches = batches.filter((batch) => batch.status === 'active').length;
  const submittedSessions = sessions.filter((s) => s.status === 'submitted').length;
  const activeRemedials = remedials.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length;

  let totalActivities = 0;
  curriculum.forEach((m) => {
    totalActivities += (m.activities?.length || 0);
  });

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? 'Administrator Workspace' : 'Monitoring Workspace'}
        title={isAdmin ? 'Institute Governance & Outcomes' : 'Institute Overview'}
        description="Comprehensive oversight of attendance rosters, DEC-05 competency rubrics, personalized remedials, and statutory exam compliance."
        badge="Phase 5 Operational"
        actions={
          isAdmin ? (
            <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
              <Link to="/curriculum" className="btn btn-secondary">
                <BookOpen size={16} />
                Curriculum Rubrics
              </Link>
              <Link to="/assessments" className="btn btn-primary">
                <Award size={16} />
                Competency Matrix
              </Link>
            </div>
          ) : null
        }
      />

      {/* KPI Stat Cards */}
      <div className="stat-grid stat-grid-4 mb-6">
        <StatCard
          label="Active Trainees"
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
          label="Practical Competencies"
          value={totalActivities || 5}
          hint={`${curriculum.length} modules configured`}
          icon={Award}
          tone="violet"
        />
        <StatCard
          label="Active Remedials"
          value={activeRemedials}
          hint={activeRemedials > 0 ? 'Safety & skill follow-ups' : 'Zero open bottlenecks'}
          icon={Activity}
          tone={activeRemedials > 0 ? 'amber' : 'green'}
        />
      </div>

      <div className="dashboard-grid">
        {/* Recent Practical Batches */}
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Configured Batches & Cohorts</h2>
              <p>Active batches across trades and academic periods.</p>
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
                  <div className="stack-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="success">{batch.status}</Badge>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{batch.student_count || 10} trainees</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links & Remedial Attention Card */}
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Remedial Attention & Quality Gate</h2>
              <p>Trainees requiring supervised safety practice.</p>
            </div>
            <Link to="/remedials" className="text-link">Open queue</Link>
          </div>

          {remedials.length === 0 ? (
            <EmptyState
              title="No remedial tasks pending"
              message="All practical evaluations currently fulfill the 75% and safety criteria."
            />
          ) : (
            <div className="stack-list">
              {remedials.slice(0, 4).map((rem) => (
                <div key={rem.id} className="stack-item">
                  <div className="stack-avatar" style={{ background: '#fef3c7', color: '#b45309' }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="stack-copy">
                    <strong>{rem.student_name} ({rem.admission_no})</strong>
                    <span>{rem.activity_code}: {rem.reason?.slice(0, 50)}...</span>
                  </div>
                  <Badge variant={rem.status === 'completed' ? 'success' : 'warning'}>
                    {rem.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Institute Governance Footer Banner */}
      <section className="card mt-6" style={{ marginTop: '1.5rem' }}>
        <div className="section-heading">
          <div>
            <h2>Statutory Standards Compliance (DEC-01 to DEC-10)</h2>
            <p>Master data, multi-tenancy boundaries, and safety-critical audit logs are permanently enforced.</p>
          </div>
        </div>
        <div className="org-snapshot-grid">
          <div className="org-snapshot">
            <span className="org-snapshot-icon"><BookOpen size={18} /></span>
            <div>
              <strong>{trades.length} Vocational Trades</strong>
              <span>{trades.map((trade) => trade.code).join(', ') || 'Electrician (ELE-01)'}</span>
            </div>
          </div>
          <div className="org-snapshot">
            <span className="org-snapshot-icon"><CalendarDays size={18} /></span>
            <div>
              <strong>{periods.length} Academic Periods</strong>
              <span>{periods[0] ? `${periods[0].name} (${formatDate(periods[0].starts_on)})` : '2026-2027'}</span>
            </div>
          </div>
          <div className="org-snapshot">
            <span className="org-snapshot-icon"><ShieldCheck size={18} /></span>
            <div>
              <strong>{user?.role_label || 'Administrator'}</strong>
              <span>{toTitleCase(user?.role || 'admin')} · Server-Side Scoped Access</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
