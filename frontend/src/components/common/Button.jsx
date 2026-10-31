export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="spinner spinner-sm" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
