import { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { api } from '../../lib/api';
import { useApiResource } from '../../hooks/useApiResource';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import Button from '../../components/common/Button';
import GeoMapPreview from '../../components/common/GeoMapPreview';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Plus,
  ShieldAlert,
  HelpCircle,
  FileText,
  Camera,
  XCircle
} from 'lucide-react';

export default function AssessmentWorkspacePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedBatchId, setSelectedBatchId] = useState('1');
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [attemptDetails, setAttemptDetails] = useState(null);

  // Assessment form state
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Geo photo review modal state
  const [reviewModalPhoto, setReviewModalPhoto] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const { data, loading, error, reload } = useApiResource(async () => {
    const [batches, matrix, photos] = await Promise.all([
      api.get('/batches'),
      selectedBatchId ? api.get(`/batches/${selectedBatchId}/competency-matrix`).catch(() => null) : null,
      selectedBatchId ? api.get(`/practical-photos?batch_id=${selectedBatchId}`).catch(() => []) : []
    ]);
    return { batches: batches || [], matrix, photos: Array.isArray(photos) ? photos : [] };
  }, [selectedBatchId]);

  if (loading) return <Loader label="Loading instructor practical assessment workspace…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const batches = data?.batches || [];
  const matrix = data?.matrix;
  const photos = data?.photos || [];
  const batch = matrix?.batch;
  const activities = matrix?.activities || [];
  const students = matrix?.matrix || [];

  async function handlePhotoDecision(decision) {
    if (!reviewModalPhoto) return;
    if (decision === 'rejected' && !reviewRemarks.trim()) {
      toast.show({ type: 'error', message: 'Please enter a rejection reason so the student can re-upload.' });
      return;
    }
    setReviewing(true);
    try {
      await api.post(`/practical-photos/${reviewModalPhoto.id}/review`, {
        decision,
        remarks: reviewRemarks.trim()
      });
      toast.show({
        type: decision === 'approved' ? 'success' : 'warning',
        message: `Practical photo ${decision} (${user?.role === 'administrator' ? 'Admin' : 'Instructor'} stage).`
      });
      setReviewModalPhoto(null);
      setReviewRemarks('');
      await reload();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to record photo review.' });
    } finally {
      setReviewing(false);
    }
  }

  async function openAssessmentForm(student, activity) {
    setSelectedStudent(student);
    try {
      // 1. Fetch full activity with rubrics
      const actDetail = await api.get(`/activities/${activity.activity_id}`);
      setSelectedActivity(actDetail);

      // 2. Initialize attempt or get existing
      const attemptRes = await api.post('/attempts', {
        student_id: student.id,
        activity_id: activity.activity_id,
        notes: `Attempt recorded during batch lab session.`
      });
      setAttemptDetails(attemptRes);

      // 3. Initialize default scores (5 for safety, 4 for others)
      const initialScores = {};
      const initialComments = {};
      actDetail.criteria.forEach((c) => {
        initialScores[c.id] = c.is_safety_critical ? 5 : 4;
        initialComments[c.id] = '';
      });
      setScores(initialScores);
      setComments(initialComments);
      setGeneralFeedback('');
      setAssessmentModalOpen(true);
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Could not start assessment.' });
    }
  }

  // Real-time calculation of score and compliance preview
  function calculatePreview() {
    if (!selectedActivity || !selectedActivity.criteria) return { total: 0, max: 20, pct: 0, safetyPass: true, status: 'competent' };
    let total = 0;
    let max = 0;
    let safetyPass = true;

    selectedActivity.criteria.forEach((c) => {
      const s = parseInt(scores[c.id] ?? 0);
      total += s;
      max += parseInt(c.max_points || 5);
      if (c.is_safety_critical && s < 4) {
        safetyPass = false;
      }
    });

    const pct = max > 0 ? Math.round((total / max) * 100) : 0;
    const isCompetent = safetyPass && pct >= 75;
    return { total, max, pct, safetyPass, status: isCompetent ? 'competent' : 'needs_practice' };
  }

  async function handleSubmitAssessment(e) {
    e.preventDefault();
    if (!attemptDetails?.attempt_id) return;
    setSubmitting(true);

    try {
      const criterionResults = selectedActivity.criteria.map((c) => ({
        criterion_id: c.id,
        score: parseInt(scores[c.id] ?? 0),
        comment: comments[c.id] || ''
      }));

      const res = await api.post('/assessments', {
        attempt_id: attemptDetails.attempt_id,
        feedback: generalFeedback,
        criterion_results: criterionResults
      });

      toast.show({
        type: res.derived_status === 'competent' ? 'success' : 'warning',
        message: res.message
      });

      setAssessmentModalOpen(false);
      reload();
    } catch (err) {
      toast.show({ type: 'error', message: err.message || 'Failed to submit assessment.' });
    } finally {
      setSubmitting(false);
    }
  }

  const preview = calculatePreview();

  return (
    <div className="page-shell">
      <PageHeader
        title="Practical Assessments & Skill Rubrics"
        description="Phase 4 — Evaluate trainees against authoritative safety and precision rubrics (DEC-05 Invariant)"
        badge="Phase 4 Assessments"
      />

      {/* Batch Selector Toolbar */}
      <div className="card toolbar-card mb-6" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="form-select"
            style={{ minWidth: '260px', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.trade_name})
              </option>
            ))}
          </select>
        </div>

        {batch && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Trade:</strong> {batch.trade_name} · <strong>Period:</strong> {batch.period_name}
          </div>
        )}
      </div>

      {/* Summary Stat Cards */}
      {matrix?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trainees Enrolled</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{matrix.summary.total_students}</h3>
          </div>
          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Competencies Awarded</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: '#10b981' }}>{matrix.summary.total_competencies_awarded}</h3>
          </div>
          <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Needs Practice / Remedial</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: '#f59e0b' }}>{matrix.summary.total_remedial_required}</h3>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unattempted Practicals</span>
            <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: 'var(--text-tertiary)' }}>{matrix.summary.total_unattempted}</h3>
          </div>
        </div>
      )}

      {/* Competency Matrix Table */}
      {activities.length === 0 ? (
        <EmptyState
          title="No Practical Activities Configured"
          description="Go to Curriculum & Practical Rubrics to define practical exercises for this trade."
        />
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="data-table" style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #f8fafc)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', minWidth: '180px' }}>Trainee Name</th>
                {activities.map((act) => (
                  <th key={act.id} style={{ padding: '0.75rem', textAlign: 'center', minWidth: '150px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{act.code}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{act.title}</div>
                  </th>
                ))}
                <th style={{ padding: '1rem', textAlign: 'center', minWidth: '130px' }}>Overall Progress</th>
              </tr>
            </thead>
            <tbody>
              {students.map((row) => (
                <tr key={row.student.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.student.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.student.admission_no}</div>
                  </td>

                  {activities.map((act) => {
                    const cell = row.activities[act.id];
                    const isComp = cell?.status === 'competent';
                    const isNP = cell?.status === 'needs_practice';

                    return (
                      <td key={act.id} style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {isComp && (
                          <div
                            onClick={() => openAssessmentForm(row.student, cell)}
                            style={{
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#065f46',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-block'
                            }}
                            title="Click to re-assess"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                              <CheckCircle2 size={14} color="#10b981" /> Competent
                            </div>
                            <div style={{ fontSize: '0.75rem' }}>{cell.percentage}% ({cell.score}/{cell.max_possible})</div>
                          </div>
                        )}

                        {isNP && (
                          <div
                            onClick={() => openAssessmentForm(row.student, cell)}
                            style={{
                              backgroundColor: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#92400e',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-block'
                            }}
                            title="Click to re-assess / verify remedial"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                              <AlertTriangle size={14} color="#f59e0b" /> Needs Practice
                            </div>
                            <div style={{ fontSize: '0.75rem' }}>{cell.percentage}% ({cell.score}/{cell.max_possible})</div>
                          </div>
                        )}

                        {!isComp && !isNP && (() => {
                          const photo = photos.find(
                            (p) => Number(p.student_id) === Number(row.student.id) && Number(p.activity_id) === Number(act.id)
                          );
                          const isPhotoApproved = photo?.overall_status === 'approved';
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                              <Button
                                size="sm"
                                variant={isPhotoApproved ? 'primary' : 'secondary'}
                                onClick={() => openAssessmentForm(row.student, cell)}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                title={isPhotoApproved ? 'Photo approved by Instructor & Admin — Ready to evaluate' : 'Requires Instructor + Admin geo-photo approval before submission'}
                              >
                                Evaluate
                              </Button>
                              {photo ? (
                                <button
                                  type="button"
                                  onClick={() => { setReviewModalPhoto(photo); setReviewRemarks(''); }}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    color: isPhotoApproved ? '#059669' : photo.overall_status === 'rejected' ? '#dc2626' : '#d97706',
                                    fontWeight: 600,
                                  }}
                                >
                                  {isPhotoApproved
                                    ? 'Geo Photo Approved (2/2)'
                                    : photo.overall_status === 'rejected'
                                      ? 'Photo Rejected'
                                      : `Review Photo (${photo.overall_status === 'partially_approved' ? '1/2' : '0/2'})`}
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No Geo Photo</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    );
                  })}

                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: row.completion_percentage >= 80 ? '#10b981' : '#f59e0b' }}>
                      {row.completion_percentage}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {row.competent_count} / {activities.length} passed
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Geo-Tagged Practical Photo Verification Queue (Dual Approval: Instructor + Admin) */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="section-heading">
          <div>
            <h2>Geo-Tagged Practical Photo Verification (Instructor + Admin)</h2>
            <p>Both Instructor and Administrator must approve a student&apos;s geo-tagged practical photo before practical evaluation can be submitted.</p>
          </div>
          <Badge variant="info">{photos.length} Photo{photos.length === 1 ? '' : 's'}</Badge>
        </div>

        {photos.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No practical photos uploaded for this batch yet"
            description="Students upload their geo-tagged practical photo from My Skills & Portfolio before evaluation."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Activity</th>
                  <th>GPS Coordinates</th>
                  <th>Instructor</th>
                  <th>Admin</th>
                  <th>Overall</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {photos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.student_name}</strong>
                      <div className="table-sub">{p.admission_no}</div>
                    </td>
                    <td>
                      <strong>{p.activity_code}</strong>
                      <div className="table-sub">{p.activity_title}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
                        {Number(p.latitude).toFixed(5)}, {Number(p.longitude).toFixed(5)}
                      </span>
                      {p.location_label ? <div className="table-sub">{p.location_label}</div> : null}
                    </td>
                    <td>
                      <Badge variant={p.instructor_status === 'approved' ? 'success' : p.instructor_status === 'rejected' ? 'danger' : 'warning'}>
                        {p.instructor_status}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={p.admin_status === 'approved' ? 'success' : p.admin_status === 'rejected' ? 'danger' : 'warning'}>
                        {p.admin_status}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={p.overall_status === 'approved' ? 'success' : p.overall_status === 'rejected' ? 'danger' : 'warning'}>
                        {p.overall_status.replace('_', ' ')}
                      </Badge>
                      {p.practical_submitted_at ? (
                        <div className="table-sub" style={{ color: '#059669', fontWeight: 600 }}>Practical Submitted</div>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setReviewModalPhoto(p); setReviewRemarks(''); }}
                        >
                          <Camera size={14} /> Inspect &amp; Review
                        </Button>
                        {p.overall_status === 'approved' ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              const stRow = students.find((s) => Number(s.student.id) === Number(p.student_id));
                              const cell = stRow?.activities?.[p.activity_id];
                              if (stRow && cell) {
                                openAssessmentForm(stRow.student, cell);
                              } else {
                                openAssessmentForm({ id: p.student_id, name: p.student_name, admission_no: p.admission_no }, { activity_id: p.activity_id });
                              }
                            }}
                          >
                            <CheckCircle2 size={14} /> Evaluate Practical
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Geo Photo Review Modal */}
      {reviewModalPhoto && (
        <Modal
          open={!!reviewModalPhoto}
          onClose={() => setReviewModalPhoto(null)}
          title={`Practical Photo Verification · ${reviewModalPhoto.student_name}`}
          description={`${reviewModalPhoto.activity_code} — ${reviewModalPhoto.activity_title}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Badge variant={reviewModalPhoto.instructor_status === 'approved' ? 'success' : reviewModalPhoto.instructor_status === 'rejected' ? 'danger' : 'warning'}>
                Instructor: {reviewModalPhoto.instructor_status.toUpperCase()}
              </Badge>
              <Badge variant={reviewModalPhoto.admin_status === 'approved' ? 'success' : reviewModalPhoto.admin_status === 'rejected' ? 'danger' : 'warning'}>
                Admin: {reviewModalPhoto.admin_status.toUpperCase()}
              </Badge>
              <Badge variant={reviewModalPhoto.overall_status === 'approved' ? 'success' : reviewModalPhoto.overall_status === 'rejected' ? 'danger' : 'warning'}>
                Overall: {reviewModalPhoto.overall_status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div style={{ textAlign: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <img
                src={reviewModalPhoto.file_url}
                alt={reviewModalPhoto.original_name}
                style={{ maxHeight: '260px', maxWidth: '100%', borderRadius: '6px' }}
              />
            </div>

            <GeoMapPreview
              latitude={reviewModalPhoto.latitude}
              longitude={reviewModalPhoto.longitude}
              accuracy={reviewModalPhoto.accuracy_meters}
              locationLabel={reviewModalPhoto.location_label}
              capturedAt={reviewModalPhoto.captured_at}
              height={180}
            />

            <Field label={`Review Remarks (${user?.role === 'administrator' ? 'Administrator' : 'Instructor'}) — required if rejecting`}>
              <textarea
                rows={2}
                className="form-input"
                placeholder="Enter verification note or rejection reason for student re-upload..."
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="ghost" onClick={() => setReviewModalPhoto(null)}>
                Close
              </Button>
              <Button
                type="button"
                variant="ghost-danger"
                loading={reviewing}
                disabled={reviewing}
                onClick={() => handlePhotoDecision('rejected')}
              >
                <XCircle size={15} /> Reject (Allow Re-upload)
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={reviewing}
                disabled={reviewing}
                onClick={() => handlePhotoDecision('approved')}
              >
                <CheckCircle2 size={15} /> Approve Photo
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Authoritative Assessment Modal */}
      {assessmentModalOpen && selectedActivity && (
        <Modal
          open={assessmentModalOpen}
          onClose={() => setAssessmentModalOpen(false)}
          title={`Practical Assessment: ${selectedStudent?.name}`}
          size="lg"
        >
          <form onSubmit={handleSubmitAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                {selectedActivity.code} — {selectedActivity.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Trainee:</strong> {selectedStudent?.name} ({selectedStudent?.admission_no}) · <strong>Attempt:</strong> #{attemptDetails?.attempt_no || 1}
              </div>
            </div>

            {/* Rubrics table */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Evaluate Competency Rubric (0 – 5 Points)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedActivity.criteria?.map((cr) => {
                  const currentScore = scores[cr.id] ?? 0;
                  const isFailSafety = cr.is_safety_critical && currentScore < 4;

                  return (
                    <div
                      key={cr.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '6px',
                        border: isFailSafety ? '1px solid #f87171' : '1px solid var(--border-color)',
                        backgroundColor: isFailSafety ? '#fef2f2' : 'var(--bg-surface)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{cr.code}:</span>{' '}
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.description}</span>
                          {cr.is_safety_critical && (
                            <Badge variant="danger" icon={ShieldAlert} style={{ marginLeft: '0.5rem' }}>
                              Mandatory Safety (&ge; 4/5)
                            </Badge>
                          )}
                        </div>

                        {/* Point selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {[0, 1, 2, 3, 4, 5].map((pt) => (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => setScores({ ...scores, [cr.id]: pt })}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: currentScore === pt ? 'var(--brand-primary, #2563eb)' : '#ffffff',
                                color: currentScore === pt ? '#ffffff' : 'var(--text-primary)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              {pt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Optional criterion remark / observation..."
                        value={comments[cr.id] || ''}
                        onChange={(e) => setComments({ ...comments, [cr.id]: e.target.value })}
                        className="form-input"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Field label="Instructor Feedback & Practical Observations">
              <textarea
                rows={2}
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                className="form-input"
                placeholder="Notes on tool handling, speed, precision, or recommendations for improvement..."
              />
            </Field>

            {/* Invariant Summary Indicator */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderRadius: '8px',
                border: preview.status === 'competent' ? '1px solid #86efac' : '1px solid #fde68a',
                backgroundColor: preview.status === 'competent' ? '#f0fdf4' : '#fffbeb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculated Aggregate Score</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {preview.total} / {preview.max} ({preview.pct}%)
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Derived Outcome (DEC-05)</div>
                {preview.status === 'competent' ? (
                  <Badge variant="success" icon={CheckCircle2} style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                    COMPETENT (C)
                  </Badge>
                ) : (
                  <Badge variant="warning" icon={AlertTriangle} style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                    NEEDS PRACTICE (NP)
                  </Badge>
                )}
                {!preview.safetyPass && (
                  <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.25rem' }}>
                    * Failed mandatory safety benchmark (&ge; 4/5)
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="ghost" type="button" onClick={() => setAssessmentModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Submit Assessment Result
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

