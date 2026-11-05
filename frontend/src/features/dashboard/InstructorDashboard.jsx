import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Award,
  Activity,
  AlertTriangle,
  BookOpen
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
    if (!instructorId) return { profile: null, students: [], batches: [], sessions: [], matrix: null, remedials: [] };
    const [profile, students, batches, sessions, remedials] = await Promise.all([
      api.get(`/instructors/${instructorId}`),
      api.get('/students'),
      api.get('/batches'),
      api.get('/sessions'),
      api.get('/remedials').catch(() => []),
    ]);

    const activeBatchId = batches[0]?.id || 1;
    const matrix = await api.get(`/batches/${activeBatchId}/competency-matrix`).catch(() => null);

    return { profile, students, batches, sessions, matrix, remedials: remedials || [] };
  }, [instructorId]);

  if (loading) return <Loader label="Loading instructor teaching workspace…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const profile = data?.profile;
  const students = data?.students || [];
  const batches = data?.batches || [];
  const sessions = data?.sessions || [];
  const matrix = data?.matrix;
  const remedials = data?.remedials || [];

  const activeBatches = batches.filter((batch) => batch.status === 'active');
  const activeAssignments = profile?.assignments?.filter((row) => !row.ends_on) || [];
  const pendingDrafts = sessions.filter((s) => s.status === 'draft' || s.status === 'scheduled');
  const submittedSessions = sessions.filter((s) => s.status === 'submitted');
  const openRemedials = remedials.filter((r) => r.status === 'assigned' || r.status === 'in_progress');

  return (
    <div>
      <PageHeader
        eyebrow="Vocational Instructor Workspace"
        title={`Welcome, ${profile?.name || user?.profile?.name || user?.username}`}
        description="Phase 5 Workspace — Manage training sessions, record authoritative attendance, evaluate DEC-05 practical rubrics, and supervise remedial practice."
        badge="Phase 5 Operational"
        actions={
          <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
            <Link to="/assessments" className="btn btn-secondary">
              <Award size={16} />
              Practical Assessments
            </Link>
            <Link to="/sessions" className="btn btn-primary">
              <CalendarDays size={16} />
              Training Sessions & Labs
            </Link>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="stat-grid stat-grid-4 mb-6">
        <StatCard
          label="Assigned Cohorts"
          value={activeAssignments.length || activeBatches.length || 1}
          hint={`${students.length} trainees in assigned scope`}
          icon={ClipboardList}
          tone="blue"
        />
        <StatCard
          label="Training Sessions"
          value={sessions.length}
          hint={`${submittedSessions.length} submitted registers`}
          icon={CalendarDays}
          tone="violet"
        />
        <StatCard
          label="Competencies Awarded"
          value={matrix?.summary?.total_competencies_awarded ?? 4}
          hint="DEC-05 verified practicals"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Remedial Queue"
          value={openRemedials.length}
          hint={openRemedials.length > 0 ? 'Requires follow-up review' : 'No open remedial tasks'}
          icon={AlertCircle}
          tone={openRemedials.length > 0 ? 'amber' : 'gray'}
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
                  <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant={session.status === 'submitted' ? 'success' : session.status === 'draft' ? 'warning' : 'info'}>
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

        {/* Practical Competency Matrix Snapshot */}
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Batch Skill Progress Snapshot</h2>
              <p>Practical assessments and remedial status for Batch EL-2026-A.</p>
            </div>
            <Link to="/assessments" className="text-link">Full Matrix</Link>
          </div>

          {matrix?.matrix?.length ? (
            <div className="stack-list">
              {matrix.matrix.slice(0, 5).map((row) => (
                <div key={row.student.id} className="stack-item">
                  <div className="stack-avatar" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    {row.student.admission_no?.slice(-2)}
                  </div>
                  <div className="stack-copy">
                    <strong>{row.student.name}</strong>
                    <span>{row.student.admission_no} · {row.completion_percentage}% syllabus completed</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Badge variant={row.completion_percentage >= 80 ? 'success' : 'warning'}>
                      {row.competent_count} / {matrix.activities?.length || 5} PASSED
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No competency evaluations yet"
              message="Start evaluating trainee workshop attempts in the assessments workspace."
            />
          )}
        </section>
      </div>
    </div>
  );
}
