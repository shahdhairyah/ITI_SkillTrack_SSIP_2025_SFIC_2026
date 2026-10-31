import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Inbox size={24} />
      </div>
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  );
}
