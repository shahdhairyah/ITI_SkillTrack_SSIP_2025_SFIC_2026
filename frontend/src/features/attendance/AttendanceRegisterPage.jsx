import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Edit3,
  Users,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  History,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import Button from '../../components/common/Button';
import { formatDate, toTitleCase } from '../../lib/format';

export default function AttendanceRegisterPage() {
  const { id } = useParams();
  const sessionId = parseInt(id, 10);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isStaff = user?.role === 'administrator' || user?.role === 'instructor';

  // Marks state: Map of student_id -> { status: string, note: string }
  const [marks, setMarks] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Review & Submit Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Correction Modal state
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctingRecord, setCorrectingRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionNote, setCorrectionNote] = useState('');

  const { data, loading, error, reload } = useApiResource(async () => {
    const register = await api.get(`/sessions/${sessionId}/attendance`);

    // Initialize local marks state from roster
    const initialMarks = {};
    if (register?.roster) {
      register.roster.forEach((row) => {
        initialMarks[row.student_id] = {
          status: row.status || '',
          note: row.status_note || '',
          attendance_id: row.attendance_id || null,
        };
      });
    }
    setMarks(initialMarks);
    setHasUnsavedChanges(false);
    return register;
  }, [sessionId]);

  if (loading) return <Loader label="Loading authoritative session register…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const session = data?.session;
  const roster = data?.roster || [];
  const isSubmitted = session?.status === 'submitted';
  const isCancelled = session?.status === 'cancelled';

  // Real-time calculated counts from current marks state
  const currentCounts = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    unmarked: 0,
  };

  roster.forEach((student) => {
    const mark = marks[student.student_id]?.status;
    if (mark === 'present') currentCounts.present++;
    else if (mark === 'late') currentCounts.late++;
    else if (mark === 'absent') currentCounts.absent++;
    else if (mark === 'excused') currentCounts.excused++;
    else currentCounts.unmarked++;
  });

  const totalRoster = roster.length;
  const applicableSessions = totalRoster - currentCounts.excused;
  const presentOrLate = currentCounts.present + currentCounts.late;
  const calculatedPercentage =
    applicableSessions > 0
      ? Math.round((presentOrLate / applicableSessions) * 100 * 10) / 10
      : 0;

  function handleSetStatus(studentId, status) {
    if (isSubmitted || isCancelled) return;
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        status,
      },
    }));
    setHasUnsavedChanges(true);
  }

  function handleSetNote(studentId, note) {
    if (isSubmitted || isCancelled) return;
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        note,
      },
    }));
    setHasUnsavedChanges(true);
  }

  function handleMarkAllPresent() {
    if (isSubmitted || isCancelled) return;
    const updated = { ...marks };
    roster.forEach((student) => {
      updated[student.student_id] = {
        ...(updated[student.student_id] || {}),
        status: 'present',
      };
    });
    setMarks(updated);
    setHasUnsavedChanges(true);
    toast({ tone: 'info', message: 'All enrolled students marked Present.' });
  }

  function handleResetMarks() {
    if (isSubmitted || isCancelled) return;
    const updated = { ...marks };
    roster.forEach((student) => {
      updated[student.student_id] = {
        ...(updated[student.student_id] || {}),
        status: '',
      };
    });
    setMarks(updated);
    setHasUnsavedChanges(true);
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    try {
      const payloadMarks = Object.entries(marks)
        .filter(([_, val]) => Boolean(val.status))
        .map(([studentId, val]) => ({
          student_id: parseInt(studentId, 10),
          status: val.status,
          status_note: val.note || null,
        }));

      await api.put(`/sessions/${sessionId}/attendance`, { marks: payloadMarks });
      toast({ tone: 'success', message: 'Draft attendance saved successfully.' });
      setHasUnsavedChanges(false);
      reload();
    } catch (err) {
      toast({ tone: 'error', message: err.message || 'Failed to save draft attendance.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinalSubmit() {
    setSubmitting(true);
    try {
      // First persist any unsaved changes
      const payloadMarks = Object.entries(marks)
        .filter(([_, val]) => Boolean(val.status))
        .map(([studentId, val]) => ({
          student_id: parseInt(studentId, 10),
          status: val.status,
          status_note: val.note || null,
        }));

      await api.put(`/sessions/${sessionId}/attendance`, { marks: payloadMarks });
      await api.post(`/sessions/${sessionId}/attendance/submit`);

      toast({
        tone: 'success',
        message: 'Attendance register submitted and officially locked.',
      });
      setReviewModalOpen(false);
      setHasUnsavedChanges(false);
      reload();
    } catch (err) {
      toast({ tone: 'error', message: err.message || 'Failed to submit register.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleControlledCorrection(e) {
    e.preventDefault();
    if (!correctingRecord?.attendance_id) {
      toast({ tone: 'error', message: 'Attendance record ID not found.' });
      return;
    }
    if (correctionReason.trim().length < 10) {
      toast({
        tone: 'error',
        message: 'Mandatory correction reason must be at least 10 characters.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/attendance/records/${correctingRecord.attendance_id}`, {
        status: newStatus,
        correction_reason: correctionReason.trim(),
        status_note: correctionNote.trim() || null,
      });

      toast({
        tone: 'success',
        message: `Attendance mark corrected to ${toTitleCase(newStatus)}. Audit log entry recorded.`,
      });
      setCorrectionModalOpen(false);
      setCorrectingRecord(null);
      setCorrectionReason('');
      setCorrectionNote('');
      reload();
    } catch (err) {
      toast({ tone: 'error', message: err.message || 'Correction failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/sessions" className="btn btn-sm btn-ghost inline-flex items-center gap-1 text-slate-600">
          <ArrowLeft size={14} /> Back to Training Sessions
        </Link>
      </div>

      <PageHeader
        eyebrow={`Session #${session?.id} · ${toTitleCase(session?.session_type || 'Practical')} Lab`}
        title={session?.topic || 'Practical Lab Attendance'}
        description={`${session?.batch_name} (${session?.trade_name}) · ${formatDate(session?.session_date)} · ${session?.start_time?.slice(0, 5)} - ${session?.end_time?.slice(0, 5)} · Trainer: ${session?.instructor_name}`}
        actions={
          <div className="flex items-center gap-2">
            {!isSubmitted && !isCancelled && isStaff && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  icon={Save}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setReviewModalOpen(true)}
                  disabled={submitting}
                  icon={Send}
                >
                  Review & Submit
                </Button>
              </>
            )}

            {isSubmitted && (
              <Badge tone="success" className="px-3 py-1.5 text-sm font-semibold">
                <CheckCircle2 size={16} className="inline mr-1" /> Register Locked & Submitted
              </Badge>
            )}
          </div>
        }
      />

      {/* Workflow Guidance Banner */}
      {isSubmitted ? (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <strong>Register is Locked:</strong> Attendance was submitted on{' '}
            {formatDate(session?.submitted_at || session?.created_at)}. To correct any erroneous mark, click{' '}
            <strong>Correct Mark</strong> next to the trainee. A mandatory explanation is required and will be logged in the immutable audit trail (DEC-07).
          </div>
        </div>
      ) : isCancelled ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <strong>Session Cancelled:</strong> {session?.cancellation_reason || 'This training session was cancelled.'}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm flex-1">
            <strong>Draft Register Mode:</strong> Mark each trainee on the authoritative roster below. Before submitting, review the totals. Unmarked students will block final submission.
            {hasUnsavedChanges && (
              <span className="block mt-1 font-semibold text-amber-900">
                You have unsaved changes. Remember to click "Save Draft" or "Review & Submit".
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Counters */}
      <div className="stat-grid stat-grid-5 mb-6">
        <StatCard
          label="Enrolled Roster"
          value={totalRoster}
          hint="Authoritative batch list"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Present (1.0)"
          value={currentCounts.present}
          hint="On-time practical presence"
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Late (1.0)"
          value={currentCounts.late}
          hint="Arrived late (>15m)"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Absent (0.0)"
          value={currentCounts.absent}
          hint="Unexcused absence"
          icon={AlertCircle}
          tone="red"
        />
        <StatCard
          label="Attendance Rate"
          value={`${calculatedPercentage}%`}
          hint={calculatedPercentage >= 80 ? 'Meets 80% Threshold' : 'Below 80% Threshold'}
          icon={FileSpreadsheet}
          tone={calculatedPercentage >= 80 ? 'green' : 'amber'}
        />
      </div>

      {/* Interactive Marking Toolbar */}
      {!isSubmitted && !isCancelled && isStaff && (
        <div className="card mb-4 bg-slate-50 border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-700">Quick Roster Actions:</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleMarkAllPresent}
              >
                <Sparkles size={14} className="text-emerald-600" /> Mark All Present
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost text-slate-600"
                onClick={handleResetMarks}
              >
                <RotateCcw size={14} /> Clear Marks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authoritative Roster Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Admission No</th>
                <th className="p-3.5">Trainee Name</th>
                <th className="p-3.5">Attendance Status</th>
                <th className="p-3.5">Notes / Slip</th>
                {isSubmitted && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.map((student, idx) => {
                const currentMark = marks[student.student_id]?.status;
                const currentNote = marks[student.student_id]?.note || '';
                const correctionCount = student.correction_count || 0;

                return (
                  <tr
                    key={student.student_id}
                    className={`hover:bg-slate-50 transition-colors ${
                      !currentMark ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="p-3.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="p-3.5 font-mono text-xs font-bold text-slate-800">
                      {student.admission_no}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{student.name}</div>
                      <div className="text-xs text-slate-500">{student.gender || 'General'} · {student.phone || 'No phone'}</div>
                    </td>
                    <td className="p-3.5">
                      {isSubmitted ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              currentMark === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : currentMark === 'late'
                                ? 'bg-amber-100 text-amber-800'
                                : currentMark === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {toTitleCase(currentMark || 'Unmarked')}
                          </span>
                          {correctionCount > 0 && (
                            <span className="text-[11px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded" title="Controlled corrections made">
                              <History size={10} className="inline mr-0.5" />
                              Rev {correctionCount}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 gap-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.student_id, 'present')}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                              currentMark === 'present'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.student_id, 'late')}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                              currentMark === 'late'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.student_id, 'absent')}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                              currentMark === 'absent'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.student_id, 'excused')}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                              currentMark === 'excused'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {isSubmitted ? (
                        <span className="text-xs text-slate-500 italic">
                          {student.correction_reason
                            ? `Reason: ${student.correction_reason}`
                            : student.status_note || '—'}
                        </span>
                      ) : (
                        <input
                          type="text"
                          placeholder="Optional transit / health note…"
                          className="form-input text-xs w-full max-w-xs"
                          value={currentNote}
                          onChange={(e) => handleSetNote(student.student_id, e.target.value)}
                        />
                      )}
                    </td>
                    {isSubmitted && (
                      <td className="p-3.5 text-right">
                        {isStaff && (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost text-blue-600 hover:bg-blue-50 font-medium inline-flex items-center gap-1"
                            onClick={() => {
                              setCorrectingRecord(student);
                              setNewStatus(student.status || 'present');
                              setCorrectionReason('');
                              setCorrectionNote(student.status_note || '');
                              setCorrectionModalOpen(true);
                            }}
                          >
                            <Edit3 size={13} /> Correct
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Submit Confirmation Modal */}
      {reviewModalOpen && (
        <Modal
          title="Review & Submit Attendance Register"
          onClose={() => setReviewModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Please review the attendance summary for <strong>{session?.topic}</strong> (
              {formatDate(session?.session_date)}) before committing to the official record.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Enrolled Trainees:</span>
                <strong className="text-slate-900">{totalRoster}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700 font-medium">Present (On-time):</span>
                <strong className="text-emerald-800">{currentCounts.present}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-700 font-medium">Late (Credited):</span>
                <strong className="text-amber-800">{currentCounts.late}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-rose-700 font-medium">Absent (Unexcused):</span>
                <strong className="text-rose-800">{currentCounts.absent}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Excused (Approved leave):</span>
                <strong className="text-blue-800">{currentCounts.excused}</strong>
              </div>
              <hr className="border-slate-200 my-1" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-slate-800">Effective Attendance Rate:</span>
                <span className={calculatedPercentage >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                  {calculatedPercentage}%
                </span>
              </div>
            </div>

            {currentCounts.unmarked > 0 ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Missing Marks:</strong> You have {currentCounts.unmarked} student(s) without an attendance mark. As per institutional rules, every student on the authoritative roster must be evaluated before submission.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                By submitting, this register will transition to `submitted` status and be locked. Future modifications will require controlled reason logging in accordance with institutional policy DEC-07.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setReviewModalOpen(false)}
                disabled={submitting}
              >
                Go Back & Edit
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleFinalSubmit}
                loading={submitting}
                disabled={currentCounts.unmarked > 0}
              >
                Confirm & Lock Register
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Controlled Correction Modal (ATT-08) */}
      {correctionModalOpen && correctingRecord && (
        <Modal
          title={`Correct Attendance: ${correctingRecord.name}`}
          onClose={() => setCorrectionModalOpen(false)}
        >
          <form onSubmit={handleControlledCorrection} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded text-xs space-y-1 text-slate-600">
              <div><strong>Admission No:</strong> {correctingRecord.admission_no}</div>
              <div><strong>Current Recorded Status:</strong> <Badge>{correctingRecord.status}</Badge></div>
              <div><strong>Session Date:</strong> {formatDate(session?.session_date)}</div>
            </div>

            <Field label="Revised Attendance Status" required>
              <select
                className="form-select w-full"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                required
              >
                <option value="present">Present (On-time in workshop)</option>
                <option value="late">Late (Arrived & completed practical)</option>
                <option value="absent">Absent (Unexcused)</option>
                <option value="excused">Excused (Approved medical/official slip)</option>
              </select>
            </Field>

            <Field
              label="Mandatory Correction Reason"
              required
              hint="Minimum 10 characters required. Explains why the submitted register is being modified."
            >
              <textarea
                className="form-input w-full"
                rows={3}
                placeholder="e.g. Trainee arrived at 09:15 with verified bus breakdown slip signed by hostel warden."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                required
              />
              <div className="text-[11px] text-slate-400 mt-1">
                Character count: {correctionReason.trim().length} / min 10
              </div>
            </Field>

            <Field label="Optional Status Note">
              <input
                type="text"
                className="form-input w-full"
                placeholder="Optional remark for internal records…"
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
              />
            </Field>

            <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded p-2.5 text-xs">
              <strong>Audit Guarantee:</strong> This correction, including your user ID ({user?.username}), previous mark, revised mark, and timestamp will be committed to the tamper-evident audit log.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={submitting}
                disabled={correctionReason.trim().length < 10}
              >
                Apply Correction & Log Audit
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
