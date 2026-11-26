import { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  Search,
  ArrowRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../lib/format';

export default function AttendanceReportPage() {
  const [filterBatch, setFilterBatch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'sessions'

  const { data, loading, error, reload } = useApiResource(async () => {
    const params = {};
    if (filterBatch) params.batch_id = filterBatch;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    const [report, batches] = await Promise.all([
      api.get('/attendance/report', params),
      api.get('/batches'),
    ]);
    return { report, batches };
  }, [filterBatch, fromDate, toDate]);

  if (loading) return <Loader label="Generating batch attendance matrix…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const report = data?.report || {};
  const batches = data?.batches || [];
  const students = report?.students || [];
  const sessions = report?.sessions || [];
  const policy = report?.policy || {};
  const threshold = policy.threshold_percentage || 80.0;

  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name?.toLowerCase().includes(term) || s.admission_no?.toLowerCase().includes(term);
  });

  const eligibleCount = students.filter((s) => s.percentage !== null && s.percentage >= threshold).length;
  const warningCount = students.filter((s) => s.percentage !== null && s.percentage < threshold).length;
  const avgPercentage =
    students.length > 0
      ? Math.round(
          (students.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / students.length) * 10
        ) / 10
      : 0;

  function handleExportCsv() {
    const query = new URLSearchParams();
    if (filterBatch) query.set('batch_id', filterBatch);
    if (fromDate) query.set('from', fromDate);
    if (toDate) query.set('to', toDate);

    const exportUrl = `/api/v1/attendance/report/export?${query.toString()}`;
    window.location.href = exportUrl;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Phase 3 Reporting & Compliance"
        title="Attendance Matrix & Certification Reports"
        description="Comprehensive attendance logs, threshold evaluation (80% minimum practical criteria), and formula-injection-sanitized CSV exports (DEC-03, DEC-09)."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCsv}
          >
            <Download size={16} />
            Export Official CSV Register
          </button>
        }
      />

      <div className="stat-grid stat-grid-4 mb-6">
        <StatCard
          label="Total Practical Sessions"
          value={sessions.length}
          hint="Completed & submitted"
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard
          label="Average Attendance"
          value={`${avgPercentage}%`}
          hint={`Institute Target: ≥${threshold}%`}
          icon={FileSpreadsheet}
          tone="violet"
        />
        <StatCard
          label="Eligible for Exam"
          value={eligibleCount}
          hint={`≥${threshold}% practical attendance`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Attendance Warnings"
          value={warningCount}
          hint={`<${threshold}% requires remedial action`}
          icon={AlertCircle}
          tone="amber"
        />
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Filter student name or adm no…"
                className="form-input pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.trade_name})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>From:</span>
              <input
                type="date"
                className="form-input text-xs"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span>To:</span>
              <input
                type="date"
                className="form-input text-xs"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold rounded ${
                activeTab === 'summary' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
              onClick={() => setActiveTab('summary')}
            >
              Student Summary Matrix
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold rounded ${
                activeTab === 'sessions' ? 'bg-white shadow text-slate-900' : 'text-slate-600'
              }`}
              onClick={() => setActiveTab('sessions')}
            >
              Session History Log
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'summary' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Trainee Name</th>
                  <th className="p-3.5 text-center">Sessions Held</th>
                  <th className="p-3.5 text-center text-emerald-700">Present (1.0)</th>
                  <th className="p-3.5 text-center text-amber-700">Late (1.0)</th>
                  <th className="p-3.5 text-center text-rose-700">Absent (0.0)</th>
                  <th className="p-3.5 text-center text-blue-700">Excused</th>
                  <th className="p-3.5 text-center font-bold">Attendance %</th>
                  <th className="p-3.5 text-right">Certification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-500">
                      No student records found matching active filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stu, index) => {
                    const isEligible = stu.percentage !== null && stu.percentage >= threshold;
                    return (
                      <tr key={stu.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-slate-400 font-mono text-xs">{index + 1}</td>
                        <td className="p-3.5 font-mono text-xs font-bold text-slate-800">
                          {stu.admission_no}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-900">{stu.name}</td>
                        <td className="p-3.5 text-center text-slate-600 font-mono">{stu.total_sessions}</td>
                        <td className="p-3.5 text-center font-mono text-emerald-700 font-semibold">{stu.present_count}</td>
                        <td className="p-3.5 text-center font-mono text-amber-700 font-semibold">{stu.late_count}</td>
                        <td className="p-3.5 text-center font-mono text-rose-700 font-semibold">{stu.absent_count}</td>
                        <td className="p-3.5 text-center font-mono text-blue-700 font-semibold">{stu.excused_count}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isEligible ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {stu.percentage !== null ? `${stu.percentage}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {isEligible ? (
                            <Badge tone="success">
                              <CheckCircle2 size={12} className="inline mr-1" />
                              Eligible (≥{threshold}%)
                            </Badge>
                          ) : (
                            <Badge tone="warning">
                              <AlertCircle size={12} className="inline mr-1" />
                              Warning (&lt;{threshold}%)
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3.5">Session Date</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Batch</th>
                  <th className="p-3.5">Topic / Activity</th>
                  <th className="p-3.5">Trainer</th>
                  <th className="p-3.5 text-center">Marked Count</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No training sessions logged for this period.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-medium text-slate-800">
                        {formatDate(s.session_date)}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-slate-500">
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.batch_name}</td>
                      <td className="p-3.5 text-slate-900 font-medium">{s.topic}</td>
                      <td className="p-3.5 text-slate-600">{s.instructor_name}</td>
                      <td className="p-3.5 text-center">
                        <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                          {s.marked_count || 0} marks
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <a
                          href={`/sessions/${s.id}/attendance`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs inline-flex items-center gap-1"
                        >
                          View Register <ArrowRight size={12} />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
