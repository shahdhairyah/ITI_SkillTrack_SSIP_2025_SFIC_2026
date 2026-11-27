import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserX,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../app/providers/ToastProvider';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const TABS = [
  { id: 'attendance', label: 'Attendance & 80% Gate', icon: CalendarDays },
  { id: 'competency', label: 'Competency Mastery Matrix', icon: Award },
  { id: 'aitt', label: 'AITT Eligibility Roster', icon: FileCheck2 },
  { id: 'remedials', label: 'Remedial & Session Trends', icon: TrendingUp },
];

export default function ReportsHubPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('attendance');
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [attendanceData, setAttendanceData] = useState(null);
  const [competencyData, setCompetencyData] = useState(null);
  const [aittData, setAittData] = useState(null);
  const [remedialData, setRemedialData] = useState(null);

  // Filters
  const [attendanceFilter, setAttendanceFilter] = useState('all'); // all | eligible | at_risk
  const [aittFilter, setAittFilter] = useState('all'); // all | qualified | disqualified
  const [searchQuery, setSearchQuery] = useState('');

  // Load batches once on mount
  useEffect(() => {
    let mounted = true;
    async function fetchBatches() {
      try {
        const list = await api.get('/batches');
        if (!mounted) return;
        const arr = Array.isArray(list) ? list : list?.batches || [];
        setBatches(arr);
        if (arr.length > 0) {
          const active = arr.find((b) => b.status === 'active') || arr[0];
          setBatchId(String(active.id));
        } else {
          setBatchId('1');
        }
      } catch (err) {
        if (!mounted) return;
        setBatchId('1');
        console.error('Failed to load batches:', err);
      }
    }
    fetchBatches();
    return () => {
      mounted = false;
    };
  }, []);

  const loadActiveReport = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);

    try {
      const params = { batch_id: batchId };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      if (activeTab === 'attendance') {
        const data = await api.get('/reports/attendance-summary', params);
        setAttendanceData(data);
      } else if (activeTab === 'competency') {
        const data = await api.get('/reports/competency-mastery', { batch_id: batchId });
        setCompetencyData(data);
      } else if (activeTab === 'aitt') {
        const data = await api.get('/reports/aitt-eligibility', { batch_id: batchId });
        setAittData(data);
      } else if (activeTab === 'remedials') {
        const data = await api.get('/reports/remedial-summary', params);
        setRemedialData(data);
      }
    } catch (err) {
      setError(err);
      toast.error(err?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, batchId, fromDate, toDate, toast]);

  useEffect(() => {
    if (batchId) {
      loadActiveReport();
    }
  }, [batchId, loadActiveReport]);

  async function handleExportCsv() {
    if (!batchId) return;
    setExporting(true);
    try {
      const query = new URLSearchParams({ batch_id: batchId });
      if (fromDate) query.set('from', fromDate);
      if (toDate) query.set('to', toDate);

      let endpoint = `/reports/attendance-summary/export?${query.toString()}`;
      let filename = `iti-attendance-summary-batch-${batchId}.csv`;

      if (activeTab === 'competency') {
        endpoint = `/reports/competency-mastery/export?batch_id=${batchId}`;
        filename = `iti-competency-mastery-batch-${batchId}.csv`;
      } else if (activeTab === 'aitt') {
        endpoint = `/reports/aitt-eligibility/export?batch_id=${batchId}`;
        filename = `iti-aitt-eligibility-batch-${batchId}.csv`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Sanitized CSV report downloaded');
    } catch (err) {
      toast.error(err?.message || 'Could not export CSV report');
    } finally {
      setExporting(false);
    }
  }

  const filteredAttendanceStudents = useMemo(() => {
    const list = attendanceData?.students || [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((s) => {
      if (attendanceFilter === 'eligible' && !s.is_eligible) return false;
      if (attendanceFilter === 'at_risk' && s.is_eligible) return false;
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q)
      );
    });
  }, [attendanceData, attendanceFilter, searchQuery]);

  const filteredCompetencyStudents = useMemo(() => {
    const list = competencyData?.students || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q),
    );
  }, [competencyData, searchQuery]);

  const filteredAittRoster = useMemo(() => {
    const list = aittData?.roster || [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((r) => {
      if (aittFilter === 'qualified' && r.aitt_practical_verdict !== 'QUALIFIED') return false;
      if (aittFilter === 'disqualified' && r.aitt_practical_verdict !== 'DISQUALIFIED') return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.roll_number?.toLowerCase().includes(q) ||
        r.admission_number?.toLowerCase().includes(q)
      );
    });
  }, [aittData, aittFilter, searchQuery]);

  const activeBatchInfo =
    attendanceData?.batch || competencyData?.batch || aittData?.batch || remedialData?.batch || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        eyebrow="Phase 6 · Statutory Analytics"
        title="Institutional Reports & Statutory Analytics"
        description="Authoritative CTS Attendance, Practical Competency Mastery, DGT AITT Eligibility Rosters, and Remedial Tracking"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select Batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              {batches.length === 0 ? (
                <option value="1">Default Batch</option>
              ) : (
                batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.trade_name || 'Trade'} {b.section ? `(${b.section})` : ''}
                  </option>
                ))
              )}
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={loadActiveReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold shadow-sm print:hidden"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {/* Active Batch Context & Date Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="font-bold text-slate-900 text-sm">
            {activeBatchInfo ? `${activeBatchInfo.name} · ${activeBatchInfo.trade_name}` : 'Selected Cohort'}
          </span>
          {activeBatchInfo?.trade_code && (
            <Badge tone="info">{activeBatchInfo.trade_code}</Badge>
          )}
          {activeBatchInfo?.period_name && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
              {activeBatchInfo.period_name}
            </span>
          )}
          {activeBatchInfo?.shift && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
              {activeBatchInfo.shift} Shift
            </span>
          )}
        </div>

        {(activeTab === 'attendance' || activeTab === 'remedials') && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Date Range:</span>
            <input
              type="date"
              aria-label="From date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              aria-label="To date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-sm inline-flex flex-wrap gap-1 print:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loader label="Compiling institutional records and evaluating statutory criteria..." />
      ) : error ? (
        <ErrorState error={error} onRetry={loadActiveReport} title="Unable to generate report" />
      ) : (
        <>
          {/* TAB 1: ATTENDANCE SUMMARY */}
          {activeTab === 'attendance' && attendanceData && (
            <div className="space-y-6">
              <div className="stat-grid stat-grid-4">
                <StatCard
                  label="Total Enrolled Trainees"
                  value={attendanceData.total_students}
                  icon={FileSpreadsheet}
                  tone="blue"
                  hint={`${attendanceData.total_sessions} scheduled sessions`}
                />
                <StatCard
                  label="Qualified for Practical Exam"
                  value={attendanceData.summary?.total_eligible ?? 0}
                  icon={CheckCircle2}
                  tone="green"
                  hint="Attendance >= 80.0%"
                />
                <StatCard
                  label="Attendance Shortfall"
                  value={attendanceData.summary?.total_at_risk ?? 0}
                  icon={ShieldAlert}
                  tone="amber"
                  hint="Below statutory 80.0%"
                />
                <StatCard
                  label="Cohort Average Rate"
                  value={`${attendanceData.summary?.cohort_average ?? 0}%`}
                  icon={CalendarDays}
                  tone="blue"
                  hint={`${attendanceData.summary?.total_present_marks ?? 0} present / ${attendanceData.summary?.total_absent_marks ?? 0} absent`}
                />
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
                  <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setAttendanceFilter('all')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                        attendanceFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({attendanceData.students?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceFilter('eligible')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                        attendanceFilter === 'eligible' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Eligible ({attendanceData.summary?.total_eligible || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceFilter('at_risk')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                        attendanceFilter === 'at_risk' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Shortfall ({attendanceData.summary?.total_at_risk || 0})
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search trainee or admission no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Trainee Attendance Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Admission / Roll</th>
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4 text-center">Effective</th>
                        <th className="py-3 px-4 text-center">Present</th>
                        <th className="py-3 px-4 text-center">Late</th>
                        <th className="py-3 px-4 text-center">Excused</th>
                        <th className="py-3 px-4 text-center">Absent</th>
                        <th className="py-3 px-4 text-right">Attendance %</th>
                        <th className="py-3 px-4 text-center">Exam Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAttendanceStudents.length > 0 ? (
                        filteredAttendanceStudents.map((s) => (
                          <tr key={s.student_id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600">
                              {s.admission_number}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{s.name}</div>
                              <div className="text-xs text-slate-400">{s.email}</div>
                            </td>
                            <td className="py-3 px-4 text-center font-medium">{s.effective_sessions}</td>
                            <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{s.present}</td>
                            <td className="py-3 px-4 text-center text-blue-600">{s.late}</td>
                            <td className="py-3 px-4 text-center text-slate-400">{s.excused}</td>
                            <td className="py-3 px-4 text-center text-rose-600 font-semibold">{s.absent}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex flex-col items-end gap-1">
                                <span
                                  className={`font-bold font-mono text-sm ${
                                    s.is_eligible ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {s.attendance_percentage}%
                                </span>
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      s.is_eligible ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${Math.min(100, s.attendance_percentage)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge tone={s.is_eligible ? 'success' : 'warning'}>
                                {s.is_eligible ? 'Qualified (>=80%)' : 'Shortfall (<80%)'}
                              </Badge>
                              {!s.is_eligible && s.sessions_needed_for_80 > 0 && (
                                <div className="text-[10px] text-amber-700 mt-1">
                                  Needs +{s.sessions_needed_for_80} session(s)
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
                            No trainee attendance records match the current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Session-by-Session Breakdown */}
              {attendanceData.sessions?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-800">
                      Training Session Register Summary ({attendanceData.sessions.length} sessions)
                    </h3>
                    <span className="text-xs text-slate-500">Chronological session attendance breakdown</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200/80 uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4">Date & Time</th>
                          <th className="py-2.5 px-4">Topic</th>
                          <th className="py-2.5 px-4">Instructor</th>
                          <th className="py-2.5 px-4 text-center">Present</th>
                          <th className="py-2.5 px-4 text-center">Late</th>
                          <th className="py-2.5 px-4 text-center">Absent</th>
                          <th className="py-2.5 px-4 text-right">Session Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceData.sessions.map((sess) => (
                          <tr key={sess.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{sess.session_date}</div>
                              <div className="text-[10px] text-slate-400">
                                {sess.start_time?.slice(0, 5)} – {sess.end_time?.slice(0, 5)}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-800">{sess.topic}</td>
                            <td className="py-2.5 px-4 text-slate-500">{sess.instructor_name}</td>
                            <td className="py-2.5 px-4 text-center font-semibold text-emerald-600">{sess.present}</td>
                            <td className="py-2.5 px-4 text-center text-blue-600">{sess.late}</td>
                            <td className="py-2.5 px-4 text-center font-semibold text-rose-600">{sess.absent}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                              {sess.attendance_rate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPETENCY MASTERY MATRIX */}
          {activeTab === 'competency' && competencyData && (
            <div className="space-y-6">
              <div className="stat-grid stat-grid-4">
                <StatCard
                  label="Practical Activities"
                  value={competencyData.metrics?.total_activities || 0}
                  icon={Award}
                  tone="blue"
                  hint="Active curriculum practicals"
                />
                <StatCard
                  label="Evaluations Recorded"
                  value={competencyData.metrics?.total_evaluations || 0}
                  icon={FileCheck2}
                  tone="blue"
                  hint="Latest attempts per activity"
                />
                <StatCard
                  label="Cohort Mean Score"
                  value={`${competencyData.metrics?.average_score || 0}%`}
                  icon={TrendingUp}
                  tone="blue"
                  hint="Across evaluated practicals"
                />
                <StatCard
                  label="Competency Clearance Rate"
                  value={`${competencyData.metrics?.competency_clearance_rate || 0}%`}
                  icon={CheckCircle2}
                  tone="green"
                  hint="Criteria >= 75% + 100% Safety"
                />
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-xs text-slate-500">
                  Showing <strong className="text-slate-800">{filteredCompetencyStudents.length}</strong> trainees across{' '}
                  <strong className="text-slate-800">{competencyData.activities?.length || 0}</strong> practical activities
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search trainee or admission no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Competency Matrix Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4 w-28">Admission No</th>
                        <th className="py-3 px-4 min-w-[180px]">Trainee Name</th>
                        <th className="py-3 px-3 text-center">Avg Score</th>
                        <th className="py-3 px-3 text-center">Progress</th>
                        {competencyData.activities?.map((act) => (
                          <th key={act.id} className="py-3 px-3 text-center min-w-[140px]">
                            <div className="font-semibold text-slate-800">{act.activity_number}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[130px] mx-auto" title={act.title}>
                              {act.title}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCompetencyStudents.length > 0 ? (
                        filteredCompetencyStudents.map((stu) => (
                          <tr key={stu.student_id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono text-xs font-medium text-slate-600">{stu.roll_number}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{stu.name}</td>
                            <td className="py-3 px-3 text-center font-mono text-xs font-bold text-slate-700">
                              {stu.summary?.average_score !== null ? `${stu.summary.average_score}%` : '—'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-xs font-semibold text-slate-700">
                                {stu.summary?.competent_count || 0}/{competencyData.activities?.length || 0}
                              </span>
                            </td>
                            {competencyData.activities?.map((act) => {
                              const result = stu.activities[act.id];
                              const status = result?.status || 'not_attempted';
                              return (
                                <td key={act.id} className="py-3 px-3 text-center">
                                  {status === 'competent' && (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Competent
                                      </span>
                                      {result.score_percentage !== null && (
                                        <span className="text-[10px] font-mono text-emerald-700 mt-0.5">
                                          {result.score_percentage}%
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {status === 'needs_practice' && (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                        <ShieldAlert className="w-3 h-3" />
                                        Remedial
                                      </span>
                                      {result.score_percentage !== null && (
                                        <span className="text-[10px] font-mono text-amber-700 mt-0.5">
                                          {result.score_percentage}%
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {status !== 'competent' && status !== 'needs_practice' && (
                                    <span className="inline-block px-2 py-0.5 text-xs text-slate-400 bg-slate-100 rounded-md">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4 + (competencyData.activities?.length || 0)} className="py-10 text-center text-sm text-slate-400">
                            No trainees match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity-wise Bottleneck Summary */}
              {competencyData.activity_summary?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Practical Activity Pass-Rate Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {competencyData.activity_summary.map((act) => (
                      <div key={act.activity_id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-mono font-bold text-blue-700">{act.activity_number}</div>
                            <div className="text-xs font-semibold text-slate-800 line-clamp-1" title={act.title}>
                              {act.title}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-700">{act.pass_rate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, act.pass_rate)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Competent: <strong className="text-emerald-700">{act.competent_count}</strong></span>
                          <span>Remedial: <strong className="text-amber-700">{act.remedial_count}</strong></span>
                          <span>Pending: <strong>{act.pending_count}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AITT STATUTORY PRACTICAL ELIGIBILITY ROSTER */}
          {activeTab === 'aitt' && aittData && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-start gap-3">
                <FileCheck2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-950 text-sm">
                    {aittData.regulatory_body} — All India Trade Test (AITT) Statutory Qualification
                  </h3>
                  <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                    Under statutory Craftsmen Training Scheme rules, a trainee is approved for AITT Practical Hall Ticket
                    issuance only if they maintain <strong>≥ 80.0% practical attendance</strong>, satisfy minimum practical
                    competency clearance, and have <strong>zero open safety or remedial sanctions</strong>.
                  </p>
                </div>
              </div>

              <div className="stat-grid stat-grid-4">
                <StatCard
                  label="Total Candidates Evaluated"
                  value={aittData.total_trainees}
                  icon={FileSpreadsheet}
                  tone="blue"
                />
                <StatCard
                  label="Approved for Hall Ticket"
                  value={aittData.total_qualified}
                  icon={CheckCircle2}
                  tone="green"
                  hint="All statutory gates passed"
                />
                <StatCard
                  label="Hall Ticket Held"
                  value={aittData.total_disqualified}
                  icon={UserX}
                  tone="amber"
                  hint="Attendance or safety deficiency"
                />
                <StatCard
                  label="Cohort Qualification Rate"
                  value={`${aittData.qualification_rate ?? 0}%`}
                  icon={Award}
                  tone="blue"
                  hint={`Generated ${aittData.generated_at}`}
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verdict:</span>
                  <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setAittFilter('all')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                        aittFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      All ({aittData.total_trainees || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAittFilter('qualified')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                        aittFilter === 'qualified' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Qualified ({aittData.total_qualified || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAittFilter('disqualified')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                        aittFilter === 'disqualified' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Held ({aittData.total_disqualified || 0})
                    </button>
                  </div>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search trainee or admission no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Admission No</th>
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4 text-center">Attendance Gate</th>
                        <th className="py-3 px-4 text-center">Practicals</th>
                        <th className="py-3 px-4 text-center">Safety / Remedial</th>
                        <th className="py-3 px-4 text-center">Verdict</th>
                        <th className="py-3 px-4">Audit Justification</th>
                        <th className="py-3 px-4 text-center">Hall Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAittRoster.length > 0 ? (
                        filteredAittRoster.map((r) => (
                          <tr key={r.student_id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-mono text-xs font-medium text-slate-600">{r.roll_number}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{r.name}</div>
                              {r.average_score !== null && (
                                <div className="text-[11px] text-slate-400">Mean Score: {r.average_score}%</div>
                              )}
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
                            <td className="py-3 px-4 text-center font-mono text-xs font-semibold">
                              {r.competent_activities}/{r.total_activities}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge tone={r.safety_clearance === 'CLEARED' ? 'success' : 'warning'}>
                                {r.safety_clearance === 'CLEARED' ? 'Cleared' : `${r.open_remedials} Open`}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge tone={r.aitt_practical_verdict === 'QUALIFIED' ? 'success' : 'danger'}>
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                            No candidates match the current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REMEDIAL & SESSION TRENDS */}
          {activeTab === 'remedials' && remedialData && (
            <div className="space-y-6">
              <div className="stat-grid stat-grid-4">
                <StatCard
                  label="Total Remedial Tasks"
                  value={remedialData.summary?.total_remedials ?? 0}
                  icon={ClipboardList}
                  tone="blue"
                />
                <StatCard
                  label="Open / In Progress"
                  value={(remedialData.summary?.open_assigned ?? 0) + (remedialData.summary?.in_progress ?? 0)}
                  icon={Clock}
                  tone="amber"
                  hint="Awaiting trainee clearance"
                />
                <StatCard
                  label="Overdue Remedials"
                  value={remedialData.summary?.overdue ?? 0}
                  icon={AlertTriangle}
                  tone="amber"
                  hint="Past target due date"
                />
                <StatCard
                  label="Completed & Cleared"
                  value={remedialData.summary?.completed ?? 0}
                  icon={CheckCircle2}
                  tone="green"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Batch Remedial Assignments</h3>
                  <span className="text-xs text-slate-500">Safety & practical skill remediation tracker</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Trainee</th>
                        <th className="py-3 px-4">Practical Activity</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4 text-center">Due Date</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {remedialData.remedials?.length > 0 ? (
                        remedialData.remedials.map((rem) => (
                          <tr key={rem.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{rem.student_name}</div>
                              <div className="text-xs text-slate-400 font-mono">{rem.admission_no}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-xs font-bold text-blue-700">{rem.activity_code}</div>
                              <div className="text-xs text-slate-600">{rem.activity_title}</div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600 max-w-md">{rem.reason}</td>
                            <td className="py-3 px-4 text-center font-mono text-xs">
                              <span className={rem.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                                {rem.due_on || '—'}
                              </span>
                              {rem.is_overdue && (
                                <div className="text-[10px] text-rose-600 font-semibold">Overdue</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge
                                tone={
                                  rem.status === 'completed'
                                    ? 'success'
                                    : rem.is_overdue
                                      ? 'danger'
                                      : 'warning'
                                }
                              >
                                {rem.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                            No remedial assignments recorded for this batch.
                          </td>
                        </tr>
                      )}
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
