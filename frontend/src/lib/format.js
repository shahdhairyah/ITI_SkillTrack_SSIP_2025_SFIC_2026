export function toTitleCase(value) {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function initials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value.endsWith?.('Z') ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortId(prefix, id) {
  return `${prefix}-${String(id).padStart(3, '0')}`;
}

export function roleHome(role) {
  if (role === 'administrator' || role === 'monitoring_officer') return '/admin/dashboard';
  if (role === 'instructor') return '/instructor/dashboard';
  return '/student/dashboard';
}

export function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (['active', 'present', 'submitted', 'competent', 'completed', 'eligible'].includes(value)) {
    return 'badge-success';
  }
  if (['inactive', 'absent', 'disabled', 'cancelled', 'not_attempted'].includes(value)) {
    return 'badge-danger';
  }
  if (['late', 'draft', 'needs_practice', 'pending', 'warning', 'in_progress'].includes(value)) {
    return 'badge-warning';
  }
  return 'badge-info';
}
