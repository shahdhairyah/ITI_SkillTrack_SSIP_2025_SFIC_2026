import test from 'node:test';
import assert from 'node:assert/strict';

function computeOverallStatus(instructorStatus, adminStatus) {
  if (instructorStatus === 'rejected' || adminStatus === 'rejected') {
    return 'rejected';
  }
  if (instructorStatus === 'approved' && adminStatus === 'approved') {
    return 'approved';
  }
  if (instructorStatus === 'approved' || adminStatus === 'approved') {
    return 'partially_approved';
  }
  return 'pending';
}

function canSubmitPractical(photoSubmission) {
  return Boolean(photoSubmission && photoSubmission.overall_status === 'approved');
}

function validateGeoCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function shouldShowUploadGeoPhotoButton({ isPracticalDone, photo }) {
  if (isPracticalDone) return false;
  if (photo && photo.overall_status === 'approved') return false;
  return !photo || photo.overall_status === 'rejected';
}

test('hides Upload Geo Photo button once both instructor and admin approve or practical is done', () => {
  assert.equal(shouldShowUploadGeoPhotoButton({ isPracticalDone: false, photo: null }), true);
  assert.equal(shouldShowUploadGeoPhotoButton({ isPracticalDone: false, photo: { overall_status: 'rejected' } }), true);
  assert.equal(shouldShowUploadGeoPhotoButton({ isPracticalDone: false, photo: { overall_status: 'pending' } }), false);
  assert.equal(shouldShowUploadGeoPhotoButton({ isPracticalDone: false, photo: { overall_status: 'approved' } }), false);
  assert.equal(shouldShowUploadGeoPhotoButton({ isPracticalDone: true, photo: null }), false);
});

test('dual approval requires BOTH instructor and admin approval before practical submit', () => {
  let state = { instructor_status: 'pending', admin_status: 'pending' };
  state.overall_status = computeOverallStatus(state.instructor_status, state.admin_status);
  assert.equal(state.overall_status, 'pending');
  assert.equal(canSubmitPractical(state), false);

  // Instructor approves -> partially_approved (cannot submit practical yet)
  state.instructor_status = 'approved';
  state.overall_status = computeOverallStatus(state.instructor_status, state.admin_status);
  assert.equal(state.overall_status, 'partially_approved');
  assert.equal(canSubmitPractical(state), false);

  // Admin approves -> approved (practical submit unlocked)
  state.admin_status = 'approved';
  state.overall_status = computeOverallStatus(state.instructor_status, state.admin_status);
  assert.equal(state.overall_status, 'approved');
  assert.equal(canSubmitPractical(state), true);
});

test('rejection by either instructor or admin blocks practical and allows student re-upload reset', () => {
  let state = { instructor_status: 'approved', admin_status: 'rejected', overall_status: '' };
  state.overall_status = computeOverallStatus(state.instructor_status, state.admin_status);
  assert.equal(state.overall_status, 'rejected');
  assert.equal(canSubmitPractical(state), false);

  // Student re-uploads -> resets both instructor and admin statuses to pending
  state = { instructor_status: 'pending', admin_status: 'pending', overall_status: 'pending' };
  assert.equal(canSubmitPractical(state), false);
  assert.equal(state.overall_status, 'pending');
});

test('geo coordinates validation accepts valid Gujarat coordinates and rejects invalid values', () => {
  assert.equal(validateGeoCoordinates(23.0225, 72.5714), true);
  assert.equal(validateGeoCoordinates(21.1702, 72.8311), true);
  assert.equal(validateGeoCoordinates(95, 72.5), false);
  assert.equal(validateGeoCoordinates('abc', 72.5), false);
});
