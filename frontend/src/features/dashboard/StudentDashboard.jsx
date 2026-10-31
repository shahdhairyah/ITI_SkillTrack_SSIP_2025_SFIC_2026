import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Mail,
  Phone,
  UserRound,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, toTitleCase } from '../../lib/format';

export default function StudentDashboard() {
  const { user } = useAuth();
  const studentId = user?.profile?.student_id;

  const { data, loading, error, reload } = useApiResource(async () => {
    if (!studentId) return { student: null, batch: null, attendance: null };
    const [student, attendance] = await Promise.all([
      api.get(`/students/${studentId}`),
      api.get(`/students/${studentId}/attendance`).catch(() => null),
    ]);
    const batch = student?.batch_id ? await api.get(`/batches/${student.batch_id}`).catch(() => null) : null;
    return { student, batch, attendance };
  }, [studentId]);

  if (loading) return <Loader label="Loading your trainee profile…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const student = data?.student;
  const batch = data?.batch;
  const attendance = data?.attendance;
  const attSummary = attendance?.summary;
  const percentage = attSummary?.attendance_percentage ?? null;
  const isEligible = attSummary?.eligible;
  const threshold = attSummary?.threshold_percentage || 80.0;
  const activeEnrollment = student?.enrollments?.find((row) => row.status === 'active');

  return (
    <div>
      <PageHeader
        eyebrow="Trainee Workspace"
        title={`Welcome, ${student?.name || user?.profile?.name || user?.username}`}
        description="Phase 3 Attendance & Practical Training Dashboard. Track personal session logs, verify exam clearance, and review workshop attendance."
        actions={
          <div className="flex gap-2">
            <Link to="/profile" className="btn btn-secondary">
              <UserRound size={16} />
              Account Details
            </Link>
            <Link to="/student/attendance" className="btn btn-primary">
              <Award size={16} />
              My Attendance & Eligibility
            </Link>
          </div>
        }
      />

      <div className="stat-grid stat-grid-4 mb-6">
        <StatCard
          label="Practical Attendance"
          value={percentage !== null ? `${percentage}%` : 'N/A'}
          hint={isEligible ? `Cleared (≥${threshold}%)` : `Under ${threshold}% Target`}
          icon={Award}
          tone={isEligible ? 'green' : percentage !== null ? 'amber' : 'blue'}
        />
        <StatCard
          label="Enrollment Status"
          value={toTitleCase(activeEnrollment?.status || student?.enrollment_status || 'Active')}
          hint={activeEnrollment ? `Since ${formatDate(activeEnrollment.starts_on)}` : 'Active Trainee'}
          icon={ClipboardList}
          tone="green"
        />
        <StatCard
          label="Assigned Batch"
          value={student?.batch_name || '—'}
          hint={student?.batch_name ? `Section ${student.batch_section} · ${toTitleCase(student.batch_shift)} shift` : 'Awaiting batch allocation'}
          icon={BookOpen}
          tone="blue"
        />
        <StatCard
          label="Vocational Trade"
          value={student?.trade_name || '—'}
          hint={student?.trade_code || 'Not assigned'}
          icon={CalendarDays}
          tone="violet"
        />
      </div>

      {/* Attendance Status Callout */}
      {percentage !== null && (
        <div className={`p-4 rounded-xl border mb-6 flex items-center justify-between ${
          isEligible ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            {isEligible ? (
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={24} className="text-amber-600 shrink-0" />
            )}
            <div>
              <strong className="block text-sm">
                {isEligible
                  ? `Practical Exam Eligibility Confirmed (${percentage}%)`
                  : `Practical Attendance Warning (${percentage}% < ${threshold}%)`}
              </strong>
              <span className="text-xs">
                {isEligible
                  ? 'Your attendance meets the statutory threshold. You are qualified for semester practical exams.'
                  : 'Your practical attendance is currently below the mandatory 80% mark. Speak with your instructor.'}
              </span>
            </div>
          </div>
          <Link to="/student/attendance" className="btn btn-sm btn-ghost inline-flex items-center gap-1 font-semibold">
            View Details <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Recent Workshop Sessions</h2>
              <p>Practical sessions logged for your batch.</p>
            </div>
            <Link to="/student/attendance" className="text-link">Full history</Link>
          </div>

          {attendance?.sessions?.length ? (
            <div className="stack-list">
              {attendance.sessions.slice(0, 4).map((s) => (
                <div key={s.session_id} className="stack-item">
                  <div className="stack-avatar">
                    <CalendarDays size={18} />
                  </div>
                  <div className="stack-copy">
                    <strong>{s.topic}</strong>
                    <span>{formatDate(s.session_date)} · Trainer: {s.instructor_name}</span>
                  </div>
                  <Badge tone={s.status === 'present' ? 'success' : s.status === 'late' ? 'warning' : 'danger'}>
                    {toTitleCase(s.status || 'Unmarked')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No session logs yet" message="Your instructor will log practical session registers here." />
          )}
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Trainee Details</h2>
              <p>Your official admission identity in the institute registry.</p>
            </div>
            <Link to="/profile" className="text-link">View profile</Link>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div className="bg-slate-50 p-3 rounded">
              <span className="text-xs text-slate-500 block">Admission Number</span>
              <strong className="font-mono text-slate-900">{student?.admission_no}</strong>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="text-xs text-slate-500 block">Trainee Category</span>
              <strong className="text-slate-900">{student?.category || 'General'}</strong>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="text-xs text-slate-500 block">Contact Phone</span>
              <strong className="text-slate-900">{student?.phone || 'Not provided'}</strong>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="text-xs text-slate-500 block">System Username</span>
              <strong className="font-mono text-slate-900">{student?.username}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
