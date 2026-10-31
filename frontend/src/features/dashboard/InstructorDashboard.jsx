import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus
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
import { formatDate } from '../../lib/format';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const instructorId = user?.profile?.instructor_id;

  const { data, loading, error, reload } = useApiResource(async () => {
    if (!instructorId) return { profile: null, students: [], batches: [], sessions: [] };
    const [profile, students, batches, sessions] = await Promise.all([
      api.get(`/instructors/${instructorId}`),
      api.get('/students'),
      api.get('/batches'),
      api.get('/sessions'),
    ]);
    return { profile, students, batches, sessions };
  }, [instructorId]);

  if (loading) return <Loader label="Loading your teaching workspace…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const profile = data?.profile;
  const students = data?.students || [];
  const batches = data?.batches || [];
  const sessions = data?.sessions || [];
  const activeBatches = batches.filter((batch) => batch.status === 'active');
  const activeAssignments = profile?.assignments?.filter((row) => !row.ends_on) || [];

  const pendingDrafts = sessions.filter((s) => s.status === 'draft' || s.status === 'scheduled');
  const submittedSessions = sessions.filter((s) => s.status === 'submitted');

  return (
    <div>
      <PageHeader
        eyebrow="Vocational Instructor Workspace"
        title={`Welcome, ${profile?.name || user?.profile?.name || user?.username}`}
        description="Phase 3 Attendance & Practical Training Dashboard. Manage training sessions, record authoritative attendance, and generate batch reports."
        actions={
          <div className="flex gap-2">
            <Link to="/attendance/report" className="btn btn-secondary">
              <FileSpreadsheet size={16} />
              Attendance Report
            </Link>
            <Link to="/sessions" className="btn btn-primary">
              <CalendarDays size={16} />
              Training Sessions & Labs
            </Link>
          </div>
        }
      />

      <div className="stat-grid stat-grid-4 mb-6">
        <StatCard
          label="Assigned Batches"
          value={activeAssignments.length || activeBatches.length}
          hint={`${students.length} trainees in assigned scope`}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Training Sessions"
          value={sessions.length}
          hint="Total practical & theory sessions"
          icon={CalendarDays}
          tone="violet"
        />
        <StatCard
          label="Submitted Registers"
          value={submittedSessions.length}
          hint="Officially locked records"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Pending Registers"
          value={pendingDrafts.length}
          hint="Requires marking / submission"
          icon={AlertCircle}
          tone={pendingDrafts.length > 0 ? 'amber' : 'gray'}
        />
      </div>

      <div className="dashboard-grid">
        {/* Recent Training Sessions */}
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Recent Training Sessions</h2>
              <p>Practical and classroom lab registers for your batches.</p>
            </div>
            <Link to="/sessions" className="text-link">View all sessions</Link>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              title="No training sessions yet"
              message="Schedule your first practical session to start recording attendance."
              action={
                <Link to="/sessions" className="btn btn-primary">
                  <Plus size={16} /> Schedule Session
                </Link>
              }
            />
          ) : (
            <div className="stack-list">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="stack-item">
                  <div className="stack-avatar">
                    <CalendarDays size={18} />
                  </div>
                  <div className="stack-copy">
                    <strong>{session.topic}</strong>
                    <span>
                      {session.batch_name} · {formatDate(session.session_date)} ({session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={session.status === 'submitted' ? 'success' : session.status === 'draft' ? 'warning' : 'info'}>
                      {session.status}
                    </Badge>
                    <Link
                      to={`/sessions/${session.id}/attendance`}
                      className="btn btn-sm btn-ghost text-blue-600 hover:bg-blue-50"
                    >
                      {session.status === 'submitted' ? 'View' : 'Open'} <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assigned Batches */}
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Assigned Cohorts & Batches</h2>
              <p>Cohorts assigned to you for training and attendance authority.</p>
            </div>
            <Link to="/instructor/batches" className="text-link">Open roster</Link>
          </div>

          {activeBatches.length === 0 ? (
            <EmptyState
              title="No batches assigned"
              message="Ask your institute administrator to assign you to a batch."
            />
          ) : (
            <div className="stack-list">
              {activeBatches.map((batch) => (
                <div key={batch.id} className="stack-item">
                  <div className="stack-avatar">{batch.name?.slice(0, 2).toUpperCase()}</div>
                  <div className="stack-copy">
                    <strong>{batch.name} · Section {batch.section}</strong>
                    <span>{batch.trade_name} · {batch.academic_period_name}</span>
                  </div>
                  <Badge>{batch.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
