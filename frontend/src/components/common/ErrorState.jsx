import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ error, onRetry, title = 'Could not load this data' }) {
  return (
    <div className="error-state" role="alert">
      <div className="empty-icon error-icon">
        <AlertTriangle size={22} />
      </div>
      <h3>{title}</h3>
      <p>{error?.message || 'An unexpected error occurred.'}</p>
      {error?.details?.hint ? <p className="field-hint">{error.details.hint}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw size={15} />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
