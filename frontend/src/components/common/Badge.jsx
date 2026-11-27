import { statusClass, toTitleCase } from '../../lib/format';

export default function Badge({ children, tone, className = '' }) {
  const toneClass = tone ? `badge-${tone}` : statusClass(children);
  return <span className={`status-badge ${toneClass} ${className} px-2 py-0.5 rounded-full text-xs font-medium`.trim()}>{children ? toTitleCase(String(children)) : '—'}</span>;
}
