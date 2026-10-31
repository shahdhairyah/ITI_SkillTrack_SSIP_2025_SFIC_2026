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
  Sparkles
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
    <div>
      <PageHeader
        eyebrow="Phase 3 Attendance Management"
        title="Training Sessions & Attendance Registers"
        description="Session-wise practical & theoretical training logs. Schedule workshops, generate authoritative rosters, and manage attendance registers."
        actions={
          isStaff && (
            <div className="flex gap-2">
              <Link to="/attendance/report" className="btn btn-secondary">
                <FileText size={16} />
                Attendance Reports
              </Link>
              <button
                type="button"
                className="btn btn-primary"
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

      <div className="stat-grid stat-grid-4 mb-6">
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

      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search topic, batch, trainer…"
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
                  {b.name} ({b.trade_code || b.trade_name})
                </option>
              ))}
            </select>

            <select
              className="form-select"
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

          <div className="text-sm text-slate-500">
            Showing <strong>{filteredSessions.length}</strong> of {sessions.length} sessions
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
        <div className="grid gap-4">
          {filteredSessions.map((session) => {
            const isClosed = session.status === 'cancelled';
            const isSubmitted = session.status === 'submitted';
            const isDraft = session.status === 'draft';

            return (
              <div
                key={session.id}
                className="card border border-slate-200 hover:border-blue-400 transition-all p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(session.status)}
                      <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {toTitleCase(session.session_type || 'practical')}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Session #{session.id}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug">
                      {session.topic}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1 font-medium text-slate-800">
                        <CalendarDays size={14} className="text-blue-600" />
                        {formatDate(session.session_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers size={14} className="text-slate-400" />
                        <strong>{session.batch_name}</strong> ({session.trade_name})
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} className="text-slate-400" />
                        Trainer: {session.instructor_name}
                      </span>
                    </div>

                    {session.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                        Note: {session.notes}
                      </p>
                    )}

                    {session.cancellation_reason && (
                      <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
                        Cancelled: {session.cancellation_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-medium">Attendance Roster</div>
                      <div className="text-sm font-semibold text-slate-800">
                        {session.roster_count || 0} Trainees enrolled
                      </div>
                      {session.marked_count > 0 && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          <span className="text-emerald-600 font-medium">{session.present_count || 0} P</span> ·{' '}
                          <span className="text-amber-600 font-medium">{session.late_count || 0} L</span> ·{' '}
                          <span className="text-rose-600 font-medium">{session.absent_count || 0} A</span>
                          {session.excused_count > 0 && (
                            <span> · <span className="text-blue-600 font-medium">{session.excused_count} E</span></span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isClosed && isStaff && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            setCancelModalSession(session);
                            setCancellationReason('');
                          }}
                          title="Cancel session"
                        >
                          <Ban size={14} />
                        </button>
                      )}

                      {!isClosed && (
                        <Link
                          to={`/sessions/${session.id}/attendance`}
                          className={`btn btn-sm ${
                            isSubmitted
                              ? 'btn-secondary'
                              : isDraft
                              ? 'btn-warning text-amber-950 font-semibold'
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
                className="form-select w-full"
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
                className="form-input w-full"
                value={formData.session_date}
                onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time" required>
                <input
                  type="time"
                  className="form-input w-full"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </Field>
              <Field label="End Time" required>
                <input
                  type="time"
                  className="form-input w-full"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </Field>
            </div>

            <Field label="Session Type" required>
              <select
                className="form-select w-full"
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
                className="form-input w-full"
                placeholder="Enter practical activity or topic name…"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
              />
            </Field>

            <Field label="Notes / Workshop Location" hint="Optional guidance for students or co-instructors">
              <textarea
                className="form-input w-full"
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
                className="form-input w-full"
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
