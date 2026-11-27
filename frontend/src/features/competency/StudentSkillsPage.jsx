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
import Button from '../../components/common/Button';
import GeoMapPreview from '../../components/common/GeoMapPreview';
import {
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPin,
  Upload,
  Eye,
} from 'lucide-react';
import { formatDate } from '../../lib/format';

function photoStatusBadge(photo) {
  if (!photo) return { label: 'Photo Not Uploaded', variant: 'neutral' };
  if (photo.overall_status === 'approved') return { label: 'Photo Approved (Instructor + Admin)', variant: 'success' };
  if (photo.overall_status === 'rejected') return { label: 'Photo Rejected — Re-upload Required', variant: 'danger' };
  if (photo.overall_status === 'partially_approved') return { label: '1/2 Approved (Awaiting 2nd Approval)', variant: 'warning' };
  return { label: 'Pending Instructor & Admin Approval', variant: 'warning' };
}

export default function StudentSkillsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const studentId = user?.profile?.student_id;

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [photoModalActivity, setPhotoModalActivity] = useState(null);
  const [submitPracticalPhoto, setSubmitPracticalPhoto] = useState(null);
  const [practicalNotes, setPracticalNotes] = useState('');
  const [submittingPractical, setSubmittingPractical] = useState(false);
  const [viewPhotoRecord, setViewPhotoRecord] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data, loading, error, reload } = useApiResource(async () => {
    if (!studentId) return null;
    const [competency, photos] = await Promise.all([
      api.get(`/students/${studentId}/competency`),
      api.get('/practical-photos').catch(() => []),
    ]);
    return { ...competency, photos: Array.isArray(photos) ? photos : [] };
  }, [studentId]);

  if (loading) return <Loader label="Loading your practical skills progress…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <EmptyState title="Student profile not linked" />;

  const student = data?.student;
  const summary = data?.summary;
  const activities = data?.activities || [];
  const attempts = data?.attempts || [];
  const remedials = data?.remedials || [];
  const photos = data?.photos || [];

  function openUploadModal(act) {
    setPhotoModalActivity(act);
    setSelectedFile(null);
    setPreviewUrl('');
    setLatitude('');
    setLongitude('');
    setAccuracy('');
    setLocationLabel('');
  }

  function handleCaptureGps() {
    if (!navigator.geolocation) {
      showToast('Browser geolocation is not supported. Please enter coordinates manually.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude.toFixed(6)));
        setLongitude(String(pos.coords.longitude.toFixed(6)));
        setAccuracy(pos.coords.accuracy ? String(Math.round(pos.coords.accuracy)) : '');
        setLocating(false);
        showToast('GPS location captured!', 'success');
      },
      (err) => {
        setLocating(false);
        showToast(err.message || 'Could not read GPS location. Enter coordinates manually if needed.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    if (!photoModalActivity || !selectedFile) {
      showToast('Please select a practical photo file.', 'error');
      return;
    }
    if (!latitude || !longitude) {
      showToast('Please capture GPS coordinates or enter latitude and longitude.', 'error');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('activity_id', String(photoModalActivity.id));
      fd.append('latitude', String(latitude));
      fd.append('longitude', String(longitude));
      if (accuracy) fd.append('accuracy_meters', String(accuracy));
      if (locationLabel.trim()) fd.append('location_label', locationLabel.trim());
      fd.append('file', selectedFile);

      await api.upload('/practical-photos', fd);
      showToast('Geo-tagged practical photo uploaded! Awaiting Instructor & Admin approval.', 'success');
      setPhotoModalActivity(null);
      await reload();
    } catch (err) {
      showToast(err.message || 'Failed to upload geo-tagged photo.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitPractical(e) {
    e.preventDefault();
    if (!submitPracticalPhoto) return;
    setSubmittingPractical(true);
    try {
      await api.post(`/practical-photos/${submitPracticalPhoto.id}/submit-practical`, {
        notes: practicalNotes.trim(),
      });
      showToast('Practical submitted successfully! Your instructor can now complete grading.', 'success');
      setSubmitPracticalPhoto(null);
      setPracticalNotes('');
      await reload();
    } catch (err) {
      showToast(err.message || 'Could not submit practical.', 'error');
    } finally {
      setSubmittingPractical(false);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="My Practical Skills & Competencies"
        description="Phase 4 & 5 — Your verified trade competencies, workshop practical attempts, and remedial tasks"
        badge="Phase 4 & 5 Portfolio"
      />

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Competencies Mastered</span>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', color: '#10b981' }}>
            {summary?.competent_count} / {summary?.total_activities}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            {summary?.completion_percentage}% of trade syllabus
          </span>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Practicals Evaluated</span>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', color: '#2563eb' }}>
            {summary?.assessed_count}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Across all modules</span>
        </div>

        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Remedials</span>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.6rem', color: '#f59e0b' }}>
            {summary?.active_remedials_count}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Follow-up practice tasks</span>
        </div>
      </div>

      {/* Active Remedial Alerts */}
      {remedials.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
            <AlertTriangle size={18} /> Assigned Remedial Follow-Ups
          </h4>
          {remedials
            .filter((r) => r.status === 'assigned' || r.status === 'in_progress')
            .map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#92400e' }}>
                    {r.activity_code} — {r.activity_title}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#78350f', marginTop: '0.25rem' }}>
                    <strong>Prescribed Practice:</strong> {r.instructions}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge variant="warning">{r.status.toUpperCase()}</Badge>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.25rem' }}>
                    Due: {r.due_on || 'By next lab'}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Practical Activities & Status List */}
      <div className="card mb-6" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Practical Curriculum Progression</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {student?.trade_name} ({student?.trade_code})
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.map((act) => {
            const attempt = attempts.find((a) => a.activity_id === act.id);
            const photo = photos.find((p) => Number(p.activity_id) === Number(act.id));
            const isCompetent = attempt?.derived_status === 'competent';
            const isNP = attempt?.derived_status === 'needs_practice';
            const isPracticalDone = isCompetent || isNP;
            const isBothAccepted = photo?.overall_status === 'approved';
            const pBadge = photoStatusBadge(photo);

            return (
              <div
                key={act.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  backgroundColor: isCompetent ? '#f0fdf4' : 'inherit'
                }}
              >
                <div style={{ maxWidth: '60%', minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <Badge variant={isCompetent ? 'success' : isNP ? 'warning' : 'neutral'}>
                      {act.code}
                    </Badge>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{act.module_title}</span>
                    {!isPracticalDone || photo ? (
                      <Badge variant={pBadge.variant}>{pBadge.label}</Badge>
                    ) : null}
                    {isBothAccepted && photo?.practical_submitted_at && !isPracticalDone ? (
                      <Badge variant="success" icon={CheckCircle2}>Practical Submitted</Badge>
                    ) : null}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{act.title}</h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {act.instructions}
                  </p>
                  {photo ? (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span>Instructor: <strong>{photo.instructor_status}</strong></span>
                      <span>Admin: <strong>{photo.admin_status}</strong></span>
                      {photo.overall_status === 'rejected' && (photo.instructor_remarks || photo.admin_remarks) ? (
                        <span style={{ color: '#b91c1c' }}>
                          Reason: {photo.instructor_remarks || photo.admin_remarks}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {photo ? (
                    <Button size="sm" variant="secondary" onClick={() => setViewPhotoRecord(photo)}>
                      <Eye size={14} /> View Geo Photo
                    </Button>
                  ) : null}

                  {/* Hide Upload Geo Photo whenever both Instructor & Admin approved OR practical is already evaluated */}
                  {!isPracticalDone && !isBothAccepted && (!photo || photo.overall_status === 'rejected') ? (
                    <Button size="sm" variant="primary" onClick={() => openUploadModal(act)}>
                      <Camera size={14} /> {photo?.overall_status === 'rejected' ? 'Re-upload Geo Photo' : 'Upload Geo Photo'}
                    </Button>
                  ) : null}

                  {/* When BOTH Instructor and Admin accept, unlock Submit Practical */}
                  {isBothAccepted && !isPracticalDone && !photo?.practical_submitted_at ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => { setSubmitPracticalPhoto(photo); setPracticalNotes(''); }}
                    >
                      <CheckCircle2 size={14} /> Submit Practical
                    </Button>
                  ) : null}

                  {isCompetent && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="success" icon={CheckCircle2}>
                        COMPETENT ({attempt.percentage}%)
                      </Badge>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        Evaluated {formatDate(attempt.assessed_at)}
                      </div>
                    </div>
                  )}

                  {isNP && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="warning" icon={AlertTriangle}>
                        NEEDS PRACTICE ({attempt.percentage}%)
                      </Badge>
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.2rem' }}>
                        Remedial Assigned
                      </div>
                    </div>
                  )}

                  {!attempt && (
                    <Badge variant="neutral">NOT ATTEMPTED</Badge>
                  )}

                  {attempt && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAttempt(attempt)}>
                      View Rubric &rarr;
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attempt / Assessment Breakdown Modal */}
      {selectedAttempt && (
        <Modal
          open={!!selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          title={`Practical Evaluation Details — Attempt #${selectedAttempt.attempt_no}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Score:</strong> {selectedAttempt.total_score} / {selectedAttempt.max_possible} ({selectedAttempt.percentage}%)
                </div>
                <div>
                  <Badge variant={selectedAttempt.derived_status === 'competent' ? 'success' : 'warning'}>
                    {selectedAttempt.derived_status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              {selectedAttempt.feedback && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Instructor Feedback:</strong> {selectedAttempt.feedback}
                </div>
              )}
            </div>

            <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>Criterion-Level Rubric Breakdown</h4>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)' }}>
                    <th>Criterion</th>
                    <th>Score Awarded</th>
                    <th>Type</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAttempt.criterion_results?.map((cr) => (
                    <tr key={cr.id}>
                      <td>
                        <strong>{cr.criteria_code}</strong>: {cr.criteria_desc}
                      </td>
                      <td style={{ fontWeight: 600 }}>{cr.result_value} / 5</td>
                      <td>
                        {cr.is_safety_critical ? (
                          <Badge variant="danger">Safety Mandatory (&ge; 4)</Badge>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>Standard</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{cr.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button onClick={() => setSelectedAttempt(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload / Re-upload Geo-Tagged Practical Photo Modal */}
      {photoModalActivity && (
        <Modal
          open={!!photoModalActivity}
          onClose={() => setPhotoModalActivity(null)}
          title={`Upload Geo-Tagged Practical Photo · ${photoModalActivity.code}`}
          description="Capture your workshop GPS location and upload a practical photo. Both Instructor and Admin must approve before practical evaluation."
          size="lg"
        >
          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" size="sm" onClick={handleCaptureGps} loading={locating}>
                <MapPin size={14} /> {locating ? 'Capturing GPS…' : 'Capture Current GPS Location'}
              </Button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Allowed: JPG, PNG, WEBP (max 5 MB)
              </span>
            </div>

            <div className="quiz-meta-grid">
              <div className="quiz-field">
                <label htmlFor="geo-lat">Latitude *</label>
                <input
                  id="geo-lat"
                  type="number"
                  step="any"
                  placeholder="e.g. 23.0225"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="quiz-field">
                <label htmlFor="geo-lng">Longitude *</label>
                <input
                  id="geo-lng"
                  type="number"
                  step="any"
                  placeholder="e.g. 72.5714"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
              <div className="quiz-field">
                <label htmlFor="geo-label">Workshop / City Label</label>
                <input
                  id="geo-label"
                  type="text"
                  placeholder="e.g. Electrician Lab, Ahmedabad"
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                />
              </div>
              <div className="quiz-field">
                <label htmlFor="geo-file">Practical Photo *</label>
                <input
                  id="geo-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handleFileChange}
                  required
                />
              </div>
            </div>

            <GeoMapPreview
              latitude={latitude}
              longitude={longitude}
              accuracy={accuracy}
              locationLabel={locationLabel}
              height={160}
            />

            {previewUrl ? (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center', background: '#f8fafc' }}>
                <img src={previewUrl} alt="Practical preview" style={{ maxHeight: '220px', maxWidth: '100%', borderRadius: '6px' }} />
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="ghost" onClick={() => setPhotoModalActivity(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={uploading} disabled={uploading}>
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Submit Geo Photo for Approval'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Uploaded Geo Photo & Approval Status Modal */}
      {viewPhotoRecord && (
        <Modal
          open={!!viewPhotoRecord}
          onClose={() => setViewPhotoRecord(null)}
          title={`Practical Geo Photo · ${viewPhotoRecord.activity_code}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Badge variant={viewPhotoRecord.instructor_status === 'approved' ? 'success' : viewPhotoRecord.instructor_status === 'rejected' ? 'danger' : 'warning'}>
                Instructor: {viewPhotoRecord.instructor_status.toUpperCase()}
              </Badge>
              <Badge variant={viewPhotoRecord.admin_status === 'approved' ? 'success' : viewPhotoRecord.admin_status === 'rejected' ? 'danger' : 'warning'}>
                Admin: {viewPhotoRecord.admin_status.toUpperCase()}
              </Badge>
              <Badge variant={photoStatusBadge(viewPhotoRecord).variant}>
                {photoStatusBadge(viewPhotoRecord).label}
              </Badge>
            </div>

            {(viewPhotoRecord.instructor_remarks || viewPhotoRecord.admin_remarks) ? (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.85rem', color: '#991b1b' }}>
                {viewPhotoRecord.instructor_remarks ? <div><strong>Instructor Remarks:</strong> {viewPhotoRecord.instructor_remarks}</div> : null}
                {viewPhotoRecord.admin_remarks ? <div><strong>Admin Remarks:</strong> {viewPhotoRecord.admin_remarks}</div> : null}
              </div>
            ) : null}

            <div style={{ textAlign: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <img
                src={viewPhotoRecord.file_url}
                alt={viewPhotoRecord.original_name}
                style={{ maxHeight: '260px', maxWidth: '100%', borderRadius: '6px' }}
              />
            </div>

            <GeoMapPreview
              latitude={viewPhotoRecord.latitude}
              longitude={viewPhotoRecord.longitude}
              accuracy={viewPhotoRecord.accuracy_meters}
              locationLabel={viewPhotoRecord.location_label}
              capturedAt={viewPhotoRecord.captured_at}
              height={180}
            />
          </div>
        </Modal>
      )}

      {/* Submit Practical Modal (Shown only after BOTH Instructor & Admin accept geo photo) */}
      {submitPracticalPhoto && (
        <Modal
          open={!!submitPracticalPhoto}
          onClose={() => setSubmitPracticalPhoto(null)}
          title={`Submit Practical · ${submitPracticalPhoto.activity_code}`}
          description="Your geo-tagged photo is approved by BOTH Instructor and Admin. Submit your practical for final rubric grading."
          size="lg"
        >
          <form onSubmit={handleSubmitPractical} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Badge variant="success" icon={CheckCircle2}>Instructor: APPROVED</Badge>
              <Badge variant="success" icon={CheckCircle2}>Admin: APPROVED</Badge>
            </div>

            <div style={{ textAlign: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <img
                src={submitPracticalPhoto.file_url}
                alt={submitPracticalPhoto.original_name}
                style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '6px' }}
              />
            </div>

            <div className="quiz-field">
              <label htmlFor="practical-notes">Practical Work Summary / Notes (Optional)</label>
              <textarea
                id="practical-notes"
                rows={3}
                placeholder="Describe tools used, readings observed, or completion summary..."
                value={practicalNotes}
                onChange={(e) => setPracticalNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button type="button" variant="ghost" onClick={() => setSubmitPracticalPhoto(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingPractical} disabled={submittingPractical}>
                <CheckCircle2 size={15} /> {submittingPractical ? 'Submitting Practical…' : 'Confirm & Submit Practical'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

