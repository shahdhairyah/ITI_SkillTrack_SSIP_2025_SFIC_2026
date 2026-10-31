export default function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className = '',
  children,
}) {
  return (
    <div className={`field ${className}`.trim()}>
      {label ? (
        <label htmlFor={htmlFor}>
          {label}
          {required ? <span className="required-mark">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <p className="field-hint">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
