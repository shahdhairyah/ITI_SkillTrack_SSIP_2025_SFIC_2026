import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award
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

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const studentId = user?.profile?.student_id;

  const { data, loading, error, reload } = useApiResource(async () => {
    if (!studentId) return null;
    return api.get(`/students/${studentId}/attendance`);
  }, [studentId]);

  if (loading) return <Loader label="Loading personal attendance record…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const student = data?.student || {};
  const summary = data?.summary || {};
  const sessions = data?.sessions || [];
  const threshold = summary.threshold_percentage || 80.0;
  const percentage = summary.attendance_percentage ?? 0;
  const isEligible = summary.eligible;

  return (
    <div>
      <PageHeader
        eyebrow="Trainee Training Progress"
        title="My Practical Attendance & Exam Eligibility"
        description="Session-wise workshop attendance record calculated using approved institutional policy (DEC-03). Minimum 80% practical attendance is required for semester exam certification."
      />

      {/* Threshold Status Banner */}
      {isEligible ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h3 className="font-bold text-base text-emerald-950">
                Eligible for Practical Certification ({percentage}%)
              </h3>
              <p className="text-sm text-emerald-700 mt-0.5">
                Your practical workshop attendance exceeds the mandatory {threshold}% threshold. Keep up the consistent presence!
              </p>
            </div>
          </div>
          <Badge tone="success" className="px-3 py-1 text-sm font-semibold whitespace-nowrap">
            Exam Cleared
          </Badge>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle size={26} />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-950">
                Attendance Warning: Below {threshold}% Threshold ({percentage}%)
              </h3>
              <p className="text-sm text-amber-700 mt-0.5">
                Your practical attendance is currently below the {threshold}% minimum certification mark. Contact your vocational instructor to complete make-up practical sessions.
              </p>
            </div>
          </div>
          <Badge tone="warning" className="px-3 py-1 text-sm font-semibold whitespace-nowrap">
            Remedial Required
          </Badge>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stat-grid stat-grid-5 mb-6">
        <StatCard
          label="Attendance Rate"
          value={`${percentage}%`}
          hint={`Minimum Target: ${threshold}%`}
          icon={Award}
          tone={isEligible ? 'green' : 'amber'}
        />
        <StatCard
          label="Total Practical Sessions"
          value={summary.total_sessions || 0}
          hint={`${summary.applicable_sessions || 0} applicable count`}
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard
          label="Present (1.0)"
          value={summary.present_count || 0}
          hint="On-time lab presence"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Late (1.0)"
          value={summary.late_count || 0}
          hint="Credited with warning"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Absent / Excused"
          value={`${summary.absent_count || 0} / ${summary.excused_count || 0}`}
          hint="Unexcused / Approved leave"
          icon={AlertCircle}
          tone="red"
        />
      </div>

      {/* Policy Explanation Note */}
      <div className="card mb-6 bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex items-center justify-between">
        <div>
          <strong>Official Formula (DEC-03):</strong> Attendance % = (Present + Late) / (Total Applicable Sessions − Excused) × 100.
        </div>
        <div className="text-slate-500 font-mono">
          Batch: {student.batch_name} ({student.trade_name}) · Adm: {student.admission_no}
        </div>
      </div>

      {/* Session History Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Practical Lab History</h2>
            <p className="text-xs text-slate-500">Every practical workshop session recorded and locked by your vocational trainer.</p>
          </div>
          <div className="text-xs font-semibold text-slate-600">
            {sessions.length} logged sessions
          </div>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            title="No session records logged yet"
            message="Your instructor will log and submit your practical session attendance here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3.5">Session Date</th>
                  <th className="p-3.5">Time Window</th>
                  <th className="p-3.5">Practical Topic</th>
                  <th className="p-3.5">Vocational Trainer</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => {
                  const status = s.status || 'unmarked';
                  return (
                    <tr key={s.session_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-medium text-slate-800">
                        {formatDate(s.session_date)}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-slate-500">
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900">
                        {s.topic}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {s.instructor_name}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : status === 'absent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {toTitleCase(status)}
                        </span>
                      </td>
                      <td className="p-3.5 text-right text-xs text-slate-500 italic">
                        {s.correction_reason
                          ? `Corrected: ${s.correction_reason}`
                          : s.status_note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
