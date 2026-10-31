import { statusClass, toTitleCase } from '../../lib/format';

export default function Badge({ children, tone, className = '' }) {
  const toneClass = tone ? `badge-${tone}` : statusClass(children);
  return <span className={`status-badge ${toneClass} ${className}`.trim()}>{children ? toTitleCase(String(children)) : '—'}</span>;
}
