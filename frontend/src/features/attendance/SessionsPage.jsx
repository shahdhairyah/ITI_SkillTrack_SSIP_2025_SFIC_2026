import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import Button from '../../components/common/Button';
import { formatDate, toTitleCase } from '../../lib/format';

const EMPTY_FORM = () => ({
  batch_id: '',
  instructor_id: '',
  session_date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '13:00',
  topic: '',
  session_type: 'practical',
  notes: '',
});

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'cancelled', label: 'Cancelled' },
];

function formatDateChip(dateStr) {
  if (!dateStr) return { day: '--', month: '---', weekday: '' };
  const dt = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return { day: '--', month: '---', weekday: '' };
  return {
    day: String(dt.getDate()).padStart(2, '0'),
    month: dt.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    weekday: dt.toLocaleDateString('en-IN', { weekday: 'short' }),
  };
}

export default function SessionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'administrator';
  const isStaff = isAdmin || user?.role === 'instructor';

  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [formModalMode, setFormModalMode] = useState(null); // null | 'create' | 'edit'
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [cancelModalSession, setCancelModalSession] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data, loading, error, reload } = useApiResource(async () => {
    const params = {};
    if (filterBatch) params.batch_id = filterBatch;
    if (fromDate) params.from = fromDate;
    if (toDate) params.to = toDate;

    const requests = [api.get('/sessions', params), api.get('/batches')];
    if (isAdmin) {
      requests.push(api.get('/instructors'));
    }

    const [sessions, batches, instructors = []] = await Promise.all(requests);
    return {
      sessions: Array.isArray(sessions) ? sessions : [],
      batches: Array.isArray(batches) ? batches : [],
      instructors: Array.isArray(instructors) ? instructors : [],
    };
  }, [filterBatch, fromDate, toDate, isAdmin]);

  const sessions = data?.sessions || [];
  const batches = data?.batches || [];
  const instructors = data?.instructors || [];

  const statusCounts = useMemo(() => {
    const counts = { '': sessions.length, scheduled: 0, draft: 0, submitted: 0, cancelled: 0 };
    sessions.forEach((s) => {
      if (counts[s.status] !== undefined) counts[s.status] += 1;
    });
    return counts;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sessions.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (!term) return true;
      return (
        s.topic?.toLowerCase().includes(term) ||
        s.batch_name?.toLowerCase().includes(term) ||
        s.trade_name?.toLowerCase().includes(term) ||
        s.instructor_name?.toLowerCase().includes(term)
      );
    });
  }, [sessions, filterStatus, searchTerm]);

  if (loading) return <Loader label="Loading training sessions…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  function openCreateModal() {
    setEditingSessionId(null);
    setFormData({
      ...EMPTY_FORM(),
      batch_id: batches[0]?.id ? String(batches[0].id) : '',
      instructor_id: instructors[0]?.id ? String(instructors[0].id) : '',
    });
    setFormModalMode('create');
  }

  function openEditModal(session) {
    setEditingSessionId(session.id);
    setFormData({
      batch_id: String(session.batch_id || ''),
      instructor_id: String(session.instructor_id || ''),
      session_date: session.session_date || new Date().toISOString().split('T')[0],
      start_time: session.start_time?.slice(0, 5) || '09:00',
      end_time: session.end_time?.slice(0, 5) || '13:00',
      topic: session.topic || '',
      session_type: session.session_type || 'practical',
      notes: session.notes || '',
    });
    setFormModalMode('edit');
  }

  async function handleSubmitSession(e) {
    e.preventDefault();
    if (!formData.batch_id) {
      toast({ tone: 'error', message: 'Please select a batch.' });
      return;
    }
    if (isAdmin && !formData.instructor_id) {
      toast({ tone: 'error', message: 'Please select an instructor.' });
      return;
    }
    if (!formData.topic.trim()) {
      toast({ tone: 'error', message: 'Session topic or practical title is required.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        batch_id: parseInt(formData.batch_id, 10),
        ...(isAdmin ? { instructor_id: parseInt(formData.instructor_id, 10) } : {}),
      };

      if (formModalMode === 'edit' && editingSessionId) {
        await api.put(`/sessions/${editingSessionId}`, payload);
        toast({ tone: 'success', message: 'Training session updated successfully.' });
      } else {
        await api.post('/sessions', payload);
        toast({ tone: 'success', message: 'Training session scheduled successfully.' });
      }
      setFormModalMode(null);
      setEditingSessionId(null);
      reload();
    } catch (err) {
      toast({ tone: 'error', message: err.message || 'Failed to save session.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSession(e) {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      toast({ tone: 'error', message: 'Cancellation reason is required.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/sessions/${cancelModalSession.id}/cancel`, {
        cancellation_reason: cancellationReason.trim(),
      });
      toast({ tone: 'success', message: 'Training session cancelled.' });
      setCancelModalSession(null);
      setCancellationReason('');
      reload();
    } catch (err) {
      toast({ tone: 'error', message: err.message || 'Failed to cancel session.' });
    } finally {
      setSubmitting(false);
    }
  }

  function applyTodayFilter() {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
  }

  function resetAllFilters() {
    setFilterBatch('');
    setFilterStatus('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'submitted':
        return (
          <Badge tone="success">
            <CheckCircle2 size={12} className="inline mr-1" />
            Submitted
          </Badge>
        );
      case 'draft':
        return (
          <Badge tone="warning">
            <AlertCircle size={12} className="inline mr-1" />
            Draft In Progress
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge tone="danger">
            <Ban size={12} className="inline mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge tone="info">
            <Clock size={12} className="inline mr-1" />
            Scheduled
          </Badge>
        );
    }
  }

  const hasActiveFilters = Boolean(filterBatch || filterStatus || fromDate || toDate || searchTerm);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        eyebrow="Phase 3 Attendance Management"
        title="Training Sessions & Attendance Registers"
        description="Schedule practical & theoretical classes, edit upcoming sessions, and launch authoritative attendance registers."
        actions={
          isStaff && (
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/reports" className="btn btn-secondary inline-flex items-center gap-2 rounded-xl text-xs font-semibold">
                <FileText size={15} />
                Reports Hub
              </Link>
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 rounded-xl shadow-sm text-xs font-semibold"
                onClick={openCreateModal}
              >
                <Plus size={15} />
                Schedule Session
              </button>
            </div>
          )
        }
      />

      {/* KPI Summary */}
      <div className="stat-grid stat-grid-4">
        <StatCard
          label="Total Sessions"
          value={sessions.length}
          hint="In configured scope"
          icon={CalendarDays}
          tone="blue"
        />
        <StatCard
          label="Submitted Registers"
          value={statusCounts.submitted}
          hint="Attendance locked & certified"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Drafts Pending"
          value={statusCounts.draft}
          hint="Requires submission review"
          icon={AlertCircle}
          tone="amber"
        />
        <StatCard
          label="Scheduled Upcoming"
          value={statusCounts.scheduled}
          hint="Ready for roster marking"
          icon={Clock}
          tone="violet"
        />
      </div>

      {/* Filter & Status Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search topic, batch, trade, or trainer…"
              className="form-input pl-10 pr-9 w-full rounded-xl bg-slate-50/70 border-slate-200 focus:bg-white transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by Batch"
              className="form-select text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white py-2"
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.trade_code || b.trade_name})
                </option>
              ))}
            </select>

            <input
              type="date"
              aria-label="From date"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              aria-label="To date"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            <button
              type="button"
              onClick={applyTodayFilter}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
            >
              Today
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 transition"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = filterStatus === tab.key;
              return (
                <button
                  key={tab.key || 'all'}
                  type="button"
                  onClick={() => setFilterStatus(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {statusCounts[tab.key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing <strong className="text-slate-800">{filteredSessions.length}</strong> of {sessions.length} sessions
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          title="No training sessions found"
          message={
            hasActiveFilters
              ? 'Try adjusting your search criteria, date range, or status filter.'
              : 'Schedule your first practical lab or training session to begin tracking attendance.'
          }
          action={
            isStaff && (
              <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={16} /> Schedule Session
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-4">
          {filteredSessions.map((session) => {
            const isClosed = session.status === 'cancelled';
            const isSubmitted = session.status === 'submitted';
            const isDraft = session.status === 'draft';
            const dateChip = formatDateChip(session.session_date);
            const rosterCount = Number(session.roster_count || 0);
            const markedCount = Number(session.marked_count || 0);
            const presentOrLate = Number(session.present_count || 0) + Number(session.late_count || 0);
            const progressPct = rosterCount > 0 ? Math.min(100, Math.round((markedCount / rosterCount) * 100)) : 0;
            const attendanceRate = markedCount > 0 ? Math.round((presentOrLate / markedCount) * 100) : null;

            return (
              <div
                key={session.id}
                className="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 p-5 overflow-hidden"
              >
                {/* Left Accent Bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isSubmitted
                      ? 'bg-emerald-500'
                      : isDraft
                        ? 'bg-amber-500'
                        : isClosed
                          ? 'bg-rose-400'
                          : 'bg-blue-500'
                  }`}
                />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pl-2">
                  {/* Left: Calendar Chip + Details */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div
                      className={`hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-2xl border shrink-0 ${
                        isSubmitted
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                          : isDraft
                            ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                            : isClosed
                              ? 'bg-rose-50/70 border-rose-200 text-rose-700'
                              : 'bg-blue-50/70 border-blue-200 text-blue-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold tracking-wider uppercase">{dateChip.month}</span>
                      <span className="text-xl font-extrabold leading-none my-0.5">{dateChip.day}</span>
                      <span className="text-[10px] font-medium opacity-75">{dateChip.weekday}</span>
                    </div>

                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(session.status)}
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {toTitleCase(session.session_type || 'practical')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">#{session.id}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {session.topic}
                      </h3>

                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600">
                        <span className="sm:hidden inline-flex items-center gap-1.5 font-medium text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <CalendarDays size={13} className="text-blue-600" />
                          {formatDate(session.session_date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <Clock size={13} className="text-slate-400" />
                          {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Layers size={13} className="text-slate-400" />
                          <strong className="font-semibold text-slate-900">{session.batch_name}</strong>
                          <span className="text-slate-400">({session.trade_name})</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Users size={13} className="text-slate-400" />
                          Trainer: <strong className="font-medium text-slate-800">{session.instructor_name}</strong>
                        </span>
                      </div>

                      {session.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50/80 border border-slate-100 p-2.5 rounded-xl flex items-start gap-2">
                          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{session.notes}</span>
                        </div>
                      )}

                      {session.cancellation_reason && (
                        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-2">
                          <Ban size={14} className="text-rose-500 shrink-0 mt-0.5" />
                          <span>
                            <strong>Cancellation Reason:</strong> {session.cancellation_reason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Roster Progress + Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0 lg:min-w-[230px]">
                    <div className="lg:text-right w-full sm:w-auto">
                      <div className="flex items-center lg:justify-end gap-2">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                          Roster
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {markedCount}/{rosterCount} marked
                        </span>
                        {attendanceRate !== null && (
                          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {attendanceRate}%
                          </span>
                        )}
                      </div>

                      <div className="w-full lg:w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 lg:ml-auto">
                        <div
                          className={`h-full rounded-full ${
                            isSubmitted ? 'bg-emerald-500' : isDraft ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {markedCount > 0 ? (
                        <div className="flex items-center lg:justify-end gap-1.5 text-[11px] font-medium mt-2">
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                            {session.present_count || 0} P
                          </span>
                          <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                            {session.late_count || 0} L
                          </span>
                          <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100">
                            {session.absent_count || 0} A
                          </span>
                          {session.excused_count > 0 && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                              {session.excused_count} E
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic mt-1.5">Awaiting attendance marks</div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      {!isClosed && !isSubmitted && isStaff && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                            onClick={() => openEditModal(session)}
                            title="Edit session"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                            onClick={() => {
                              setCancelModalSession(session);
                              setCancellationReason('');
                            }}
                            title="Cancel session"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      )}

                      {!isClosed && (
                        <Link
                          to={`/sessions/${session.id}/attendance`}
                          className={`btn btn-sm inline-flex items-center gap-1.5 rounded-xl shadow-sm text-xs font-semibold ${
                            isSubmitted
                              ? 'btn-secondary text-slate-700'
                              : isDraft
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'btn-primary'
                          }`}
                        >
                          {isSubmitted ? (
                            <>
                              <FileText size={14} /> View Register
                            </>
                          ) : isDraft ? (
                            <>
                              <AlertCircle size={14} /> Resume Register
                            </>
                          ) : (
                            <>
                              <Users size={14} /> Mark Attendance
                            </>
                          )}
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Session Modal */}
      {formModalMode && (
        <Modal
          title={formModalMode === 'edit' ? `Edit Session #${editingSessionId}` : 'Schedule Training Session'}
          onClose={() => setFormModalMode(null)}
        >
          <form onSubmit={handleSubmitSession} className="space-y-4">
            <Field label="Target Batch" required>
              <select
                className="form-select w-full rounded-xl"
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                disabled={formModalMode === 'edit'}
                required
              >
                <option value="">Select an enrolled batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.trade_name} (Section {b.section}, {b.shift})
                  </option>
                ))}
              </select>
            </Field>

            {isAdmin && (
              <Field label="Assigned Instructor" required>
                <select
                  className="form-select w-full rounded-xl"
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                  required
                >
                  <option value="">Select responsible instructor…</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.employee_code})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Session Date" required>
                <input
                  type="date"
                  className="form-input w-full rounded-xl"
                  value={formData.session_date}
                  onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Start Time" required>
                <input
                  type="time"
                  className="form-input w-full rounded-xl"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </Field>
              <Field label="End Time" required>
                <input
                  type="time"
                  className="form-input w-full rounded-xl"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field label="Session Type" required>
              <select
                className="form-select w-full rounded-xl"
                value={formData.session_type}
                onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                required
              >
                <option value="practical">Practical Workshop Lab</option>
                <option value="theory">Trade Theory Class</option>
                <option value="demonstration">Instructor Demonstration</option>
                <option value="assessment">Practical Assessment</option>
              </select>
            </Field>

            <Field
              label="Session Topic / Practical Title"
              required
              hint="e.g. Demonstration & Wiring of Staircase Lighting Circuit"
            >
              <input
                type="text"
                className="form-input w-full rounded-xl"
                placeholder="Enter practical activity or topic name…"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
              />
            </Field>

            <Field label="Notes / Workshop Location" hint="Optional guidance for students or co-instructors">
              <textarea
                className="form-input w-full rounded-xl"
                rows={2}
                placeholder="e.g. Electrical Lab 1 - Wiring Board Set A. Bring PPE and multimeters."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setFormModalMode(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                {formModalMode === 'edit' ? 'Save Changes' : 'Schedule & Open Roster'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Session Modal */}
      {cancelModalSession && (
        <Modal title={`Cancel Session #${cancelModalSession.id}`} onClose={() => setCancelModalSession(null)}>
          <form onSubmit={handleCancelSession} className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel the session <strong>{cancelModalSession.topic}</strong> scheduled for{' '}
              <strong>{formatDate(cancelModalSession.session_date)}</strong>?
            </p>

            <Field label="Reason for Cancellation" required hint="Mandatory institutional reason for audit trail">
              <textarea
                className="form-input w-full rounded-xl"
                rows={3}
                placeholder="e.g. Workshop maintenance, official holiday, or scheduled power shutdown."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setCancelModalSession(null)} disabled={submitting}>
                Go Back
              </Button>
              <Button variant="danger" type="submit" loading={submitting}>
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
