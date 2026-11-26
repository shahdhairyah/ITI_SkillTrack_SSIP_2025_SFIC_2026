import { useEffect, useState } from 'react';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function ReportsHubPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'competency' | 'aitt'
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [batchId, setBatchId] = useState(1);
  const [batches, setBatches] = useState([]);

  // Attendance summary data
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // 'all' | 'eligible' | 'at_risk'
  const [searchQuery, setSearchQuery] = useState('');

  // Competency mastery data
  const [competencyData, setCompetencyData] = useState(null);

  // AITT eligibility data
  const [aittData, setAittData] = useState(null);

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    loadActiveReport();
  }, [activeTab, batchId]);

  async function loadBatches() {
    try {
      const res = await api.get('/batches');
      if (res.status === 'success') {
        setBatches(res.data || []);
      }
    } catch (e) {
      console.error('Failed to load batches', e);
    }
  }

  async function loadActiveReport() {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const res = await api.get(`/reports/attendance-summary?batch_id=${batchId}`);
        if (res.status === 'success') setAttendanceData(res.data);
      } else if (activeTab === 'competency') {
        const res = await api.get(`/reports/competency-mastery?batch_id=${batchId}`);
        if (res.status === 'success') setCompetencyData(res.data);
      } else if (activeTab === 'aitt') {
        const res = await api.get(`/reports/aitt-eligibility?batch_id=${batchId}`);
        if (res.status === 'success') setAittData(res.data);
      }
    } catch (e) {
      showToast(e.message || 'Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      let endpoint = '';
      let filename = 'report.csv';

      if (activeTab === 'attendance') {
        endpoint = `/reports/attendance-summary/export?batch_id=${batchId}`;
        filename = `attendance-summary-batch-${batchId}.csv`;
      } else if (activeTab === 'aitt') {
        endpoint = `/reports/aitt-eligibility/export?batch_id=${batchId}`;
        filename = `aitt-practical-eligibility-batch-${batchId}.csv`;
      } else {
        endpoint = `/attendance/report/export?batch_id=${batchId}`;
        filename = `batch-${batchId}-register.csv`;
      }

      const response = await fetch(`/api/v1${endpoint}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error('Export generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showToast('Sanitized CSV report downloaded successfully', 'success');
    } catch (e) {
      showToast(e.message || 'Export error', 'error');
    } finally {
      setExporting(false);
    }
  }

  const filteredAttendanceStudents = attendanceData?.students?.filter((s) => {
    if (attendanceFilter === 'eligible' && !s.is_eligible) return false;
    if (attendanceFilter === 'at_risk' && s.is_eligible) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.roll_number?.toString().includes(q) ||
        s.admission_number?.toLowerCase().includes(q)
      );
    }
    return true;
  }) || [];

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Institutional Reports & Statutory Analytics"
        subtitle="Phase 6 · Authoritative CTS Attendance, Competency Mastery, and DGT AITT Practical Eligibility Rosters"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={batchId}
              onChange={(e) => setBatchId(Number(e.target.value))}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.trade_name || 'Electrician'})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadActiveReport}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExport}
              disabled={exporting || loading}
            >
              {exporting ? 'Exporting...' : 'Export CSV (Sanitized)'}
            </Button>
          </div>
        }
      />

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Attendance & 80% Statutory Gate
        </button>
        <button
          onClick={() => setActiveTab('competency')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'competency'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Practical Competency Matrix
        </button>
        <button
          onClick={() => setActiveTab('aitt')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'aitt'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          AITT Practical Exam Eligibility Roster
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p>Compiling institutional records and evaluating statutory formulas...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ATTENDANCE SUMMARY */}
          {activeTab === 'attendance' && attendanceData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Enrolled Trainees"
                  value={attendanceData.total_students}
                  icon={FileSpreadsheet}
                  tone="neutral"
                />
                <StatCard
                  title="Qualified for Practical Exam"
                  value={attendanceData.summary?.total_eligible || 0}
                  icon={CheckCircle2}
                  tone="success"
                  note="Attendance >= 80%"
                />
                <StatCard
                  title="Attendance Shortfall"
                  value={attendanceData.summary?.total_at_risk || 0}
                  icon={ShieldAlert}
                  tone="warning"
                  note="Below statutory 80%"
                />
                <StatCard
                  title="Cohort Average Rate"
                  value={`${attendanceData.summary?.cohort_average || 0}%`}
                  icon={CalendarDays}
                  tone="info"
                  note={`${attendanceData.total_sessions} scheduled sessions`}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      onClick={() => setAttendanceFilter('all')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                        attendanceFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      All ({attendanceData.students?.length})
                    </button>
                    <button
                      onClick={() => setAttendanceFilter('eligible')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                        attendanceFilter === 'eligible' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Eligible ({attendanceData.summary?.total_eligible})
                    </button>
                    <button
                      onClick={() => setAttendanceFilter('at_risk')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                        attendanceFilter === 'at_risk' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Shortfall ({attendanceData.summary?.total_at_risk})
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Roll</th>
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4 text-center">Sessions</th>
                        <th className="py-3 px-4 text-center">Present</th>
                        <th className="py-3 px-4 text-center">Late</th>
                        <th className="py-3 px-4 text-center">Excused</th>
                        <th className="py-3 px-4 text-center">Absent</th>
                        <th className="py-3 px-4 text-right">Attendance %</th>
                        <th className="py-3 px-4 text-center">Exam Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendanceStudents.map((s) => (
                        <tr key={s.student_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">{s.roll_number}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{s.admission_number}</div>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{s.total_sessions}</td>
                          <td className="py-3 px-4 text-center text-emerald-600 font-medium">{s.present}</td>
                          <td className="py-3 px-4 text-center text-blue-600">{s.late}</td>
                          <td className="py-3 px-4 text-center text-slate-400">{s.excused}</td>
                          <td className="py-3 px-4 text-center text-rose-600 font-medium">{s.absent}</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`font-semibold font-mono text-base ${
                                s.is_eligible ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {s.attendance_percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge tone={s.is_eligible ? 'success' : 'warning'}>
                              {s.is_eligible ? 'Qualified (>=80%)' : 'Shortfall (<80%)'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPETENCY MASTERY MATRIX */}
          {activeTab === 'competency' && competencyData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Practical Activities"
                  value={competencyData.metrics?.total_activities || 0}
                  icon={Award}
                  tone="info"
                  note="Curriculum syllabus practicals"
                />
                <StatCard
                  title="Evaluations Recorded"
                  value={competencyData.metrics?.total_evaluations || 0}
                  icon={FileCheck2}
                  tone="neutral"
                  note="Across all batch attempts"
                />
                <StatCard
                  title="Competency Clearance Rate"
                  value={`${competencyData.metrics?.competency_clearance_rate || 0}%`}
                  icon={CheckCircle2}
                  tone="success"
                  note="DEC-05 Criteria >= 75% + 100% Safety"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4 w-16">Roll</th>
                        <th className="py-3 px-4 w-52">Trainee Name</th>
                        {competencyData.activities?.map((act) => (
                          <th key={act.id} className="py-3 px-3 text-center min-w-[140px]">
                            <div className="font-semibold text-slate-800">Act {act.activity_number}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[130px] mx-auto">
                              {act.title}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {competencyData.students?.map((stu) => (
                        <tr key={stu.student_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">{stu.roll_number}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{stu.name}</td>
                          {competencyData.activities?.map((act) => {
                            const result = stu.activities[act.id];
                            const status = result?.status || 'not_attempted';
                            return (
                              <td key={act.id} className="py-3 px-3 text-center">
                                {status === 'competent' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Competent
                                  </span>
                                )}
                                {status === 'needs_practice' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Remedial
                                  </span>
                                )}
                                {status === 'not_attempted' && (
                                  <span className="inline-block px-2 py-0.5 text-xs text-slate-400 bg-slate-100 rounded">
                                    Pending
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AITT STATUTORY PRACTICAL ELIGIBILITY ROSTER */}
          {activeTab === 'aitt' && aittData && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <FileCheck2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-950 text-sm">
                    Directorate General of Training (DGT) — All India Trade Test (AITT) Statutory Qualification
                  </h3>
                  <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                    Under statutory Craftsmen Training Scheme rules, a trainee is approved for AITT Practical Hall Ticket
                    issuance only if they maintain <strong>≥ 80.0% practical attendance</strong> and have cleared all
                    <strong>mandatory workshop safety criteria</strong> with no open remedial sanctions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Candidates Evaluated"
                  value={aittData.total_trainees}
                  icon={FileSpreadsheet}
                  tone="neutral"
                />
                <StatCard
                  title="Approved for Hall Ticket"
                  value={aittData.total_qualified}
                  icon={CheckCircle2}
                  tone="success"
                  note="Dual criteria fully satisfied"
                />
                <StatCard
                  title="Hall Ticket Held"
                  value={aittData.total_disqualified}
                  icon={UserX}
                  tone="critical"
                  note="Attendance or safety deficiency"
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Roll</th>
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4 text-center">Attendance Gate</th>
                        <th className="py-3 px-4 text-center">Safety Clearance</th>
                        <th className="py-3 px-4 text-center">AITT Practical Verdict</th>
                        <th className="py-3 px-4">Audit Justification / Deficiencies</th>
                        <th className="py-3 px-4 text-center">Hall Ticket Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aittData.roster?.map((r) => (
                        <tr key={r.student_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">{r.roll_number}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{r.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{r.admission_number}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-semibold font-mono text-sm ${
                                r.attendance_status === 'PASSED' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {r.attendance_percentage}%
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {r.attendance_status === 'PASSED' ? 'Meets 80% Rule' : 'Shortfall'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge tone={r.safety_clearance === 'CLEARED' ? 'success' : 'warning'}>
                              {r.safety_clearance}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge tone={r.aitt_practical_verdict === 'QUALIFIED' ? 'success' : 'critical'}>
                              {r.aitt_practical_verdict}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                            {r.disqualification_reason}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                r.hall_ticket_status === 'APPROVED_FOR_ISSUE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {r.hall_ticket_status === 'APPROVED_FOR_ISSUE' ? 'Issued' : 'Held at Gate'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

