import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (messageOrOpts, type = 'success') => {
      let message = messageOrOpts;
      let tone = type;
      if (typeof messageOrOpts === 'object' && messageOrOpts !== null) {
        message = messageOrOpts.message || '';
        tone = messageOrOpts.tone || messageOrOpts.type || 'success';
      }
      if (tone === 'danger') tone = 'error';
      const id = nextId++;
      setToasts((current) => [...current, { id, message, type: tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const showToast = useCallback(
    (message, type = 'success') => {
      push(message, type);
    },
    [push],
  );

  const value = useMemo(() => {
    const fn = (messageOrOpts) => push(messageOrOpts);
    fn.success = (message) => push(message, 'success');
    fn.error = (message) => push(message, 'error');
    fn.info = (message) => push(message, 'info');
    fn.showToast = showToast;
    fn.toast = fn;
    return fn;
  }, [push, showToast]);

  const icons = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{icons[toast.type]}</span>
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
