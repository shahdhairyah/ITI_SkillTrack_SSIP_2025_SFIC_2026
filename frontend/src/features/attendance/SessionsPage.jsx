import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Plus,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Ban,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  MapPin,
  X
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

export default function SessionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isStaff = user?.role === 'administrator' || user?.role === 'instructor';

  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [cancelModalSession, setCancelModalSession] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state for scheduling
  const [formData, setFormData] = useState({
    batch_id: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '13:00',
    topic: '',
    session_type: 'practical',
    notes: '',
  });

  const { data, loading, error, reload } = useApiResource(async () => {
    const params = {};
    if (filterBatch) params.batch_id = filterBatch;
    if (filterStatus) params.status = filterStatus;

    const [sessions, batches] = await Promise.all([
      api.get('/sessions', params),
      api.get('/batches'),
    ]);
    return { sessions, batches };
  }, [filterBatch, filterStatus]);

  if (loading) return <Loader label="Loading training sessions…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const sessions = data?.sessions || [];
  const batches = data?.batches || [];

  const filteredSessions = sessions.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.topic?.toLowerCase().includes(term) ||
      s.batch_name?.toLowerCase().includes(term) ||
      s.trade_name?.toLowerCase().includes(term) ||
      s.instructor_name?.toLowerCase().includes(term)
    );
  });

  const totalScheduled = sessions.filter((s) => s.status === 'scheduled').length;
  const totalDraft = sessions.filter((s) => s.status === 'draft').length;
  const totalSubmitted = sessions.filter((s) => s.status === 'submitted').length;

  async function handleCreateSession(e) {
    e.preventDefault();
    if (!formData.batch_id) {
      toast({ tone: 'error', message: 'Please select a batch.' });
      return;
    }
    if (!formData.topic.trim()) {
      toast({ tone: 'error', message: 'Session topic or practical title is required.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/sessions', {
        ...formData,
        batch_id: parseInt(formData.batch_id, 10),
      });
      toast({ tone: 'success', message: 'Training session scheduled successfully.' });
      setCreateModalOpen(false);
      setFormData({
        batch_id: batches[0]?.id || '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '13:00',
        topic: '',
        session_type: 'practical',
        notes: '',
      });
      reload();
    } catch (err) {
      toast({ tone: 'error', message: err.message || 'Failed to schedule session.' });
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

  function getStatusBadge(status) {
    switch (status) {
      case 'submitted':
        return <Badge tone="success"><CheckCircle2 size={12} className="inline mr-1" />Submitted</Badge>;
      case 'draft':
        return <Badge tone="warning"><AlertCircle size={12} className="inline mr-1" />Draft In Progress</Badge>;
      case 'cancelled':
        return <Badge tone="danger"><Ban size={12} className="inline mr-1" />Cancelled</Badge>;
      default:
        return <Badge tone="info"><Clock size={12} className="inline mr-1" />Scheduled</Badge>;
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <PageHeader
        eyebrow="Phase 3 Attendance Management"
        title="Training Sessions & Attendance Registers"
        description="Session-wise practical & theoretical training logs. Schedule workshops, generate authoritative rosters, and manage attendance registers."
        actions={
          isStaff && (
            <div className="flex items-center gap-2">
              <Link to="/attendance/report" className="btn btn-secondary inline-flex items-center gap-2">
                <FileText size={16} />
                Attendance Reports
              </Link>
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 shadow-sm"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    batch_id: batches[0]?.id ? String(batches[0].id) : '',
                  }));
                  setCreateModalOpen(true);
                }}
              >
                <Plus size={16} />
                Schedule Session
              </button>
            </div>
          )
        }
      />

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
          value={totalSubmitted}
          hint="Attendance locked & certified"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Drafts Pending"
          value={totalDraft}
          hint="Requires submission review"
          icon={AlertCircle}
          tone="amber"
        />
        <StatCard
          label="Scheduled Upcoming"
          value={totalScheduled}
          hint="Ready for roster marking"
          icon={Clock}
          tone="violet"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search topic, batch, trainer…"
                className="form-input pl-10 w-full rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                className="form-select text-sm rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
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

              <select
                className="form-select text-sm rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg self-start lg:self-center">
            Showing <strong className="text-slate-800">{filteredSessions.length}</strong> of {sessions.length} sessions
          </div>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <EmptyState
          title="No training sessions found"
          message={
            searchTerm || filterBatch || filterStatus
              ? 'Try adjusting your search criteria or batch filter.'
              : 'Schedule your first practical lab or training session to begin tracking attendance.'
          }
          action={
            isStaff && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus size={16} /> Schedule Session
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-3.5">
          {filteredSessions.map((session) => {
            const isClosed = session.status === 'cancelled';
            const isSubmitted = session.status === 'submitted';
            const isDraft = session.status === 'draft';

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

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pl-1.5">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(session.status)}
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        {toTitleCase(session.session_type || 'practical')}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        #{session.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {session.topic}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <CalendarDays size={14} className="text-blue-600" />
                        {formatDate(session.session_date)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <Layers size={14} className="text-slate-400" />
                        <strong className="font-semibold text-slate-900">{session.batch_name}</strong> 
                        <span className="text-slate-400">({session.trade_name})</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Users size={14} className="text-slate-400" />
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
                        <span><strong>Cancellation Reason:</strong> {session.cancellation_reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                    <div className="lg:text-right">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Roster Overview</div>
                      <div className="text-sm font-bold text-slate-900">
                        {session.roster_count || 0} <span className="font-normal text-slate-500 text-xs">Trainees</span>
                      </div>
                      {session.marked_count > 0 ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium mt-1">
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{session.present_count || 0} P</span>
                          <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">{session.late_count || 0} L</span>
                          <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100">{session.absent_count || 0} A</span>
                          {session.excused_count > 0 && (
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{session.excused_count} E</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unmarked</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isClosed && isStaff && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                          onClick={() => {
                            setCancelModalSession(session);
                            setCancellationReason('');
                          }}
                          title="Cancel session"
                        >
                          <Ban size={15} />
                        </button>
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

      {/* Schedule Session Modal */}
      {createModalOpen && (
        <Modal
          title="Schedule Training Session"
          onClose={() => setCreateModalOpen(false)}
        >
          <form onSubmit={handleCreateSession} className="space-y-4">
            <Field label="Target Batch" required>
              <select
                className="form-select w-full rounded-xl"
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
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

            <Field label="Session Date" required>
              <input
                type="date"
                className="form-input w-full rounded-xl"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
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
              <Button
                variant="ghost"
                type="button"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Schedule & Open Roster
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Session Modal */}
      {cancelModalSession && (
        <Modal
          title={`Cancel Session #${cancelModalSession.id}`}
          onClose={() => setCancelModalSession(null)}
        >
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
              <Button
                variant="ghost"
                type="button"
                onClick={() => setCancelModalSession(null)}
                disabled={submitting}
              >
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
