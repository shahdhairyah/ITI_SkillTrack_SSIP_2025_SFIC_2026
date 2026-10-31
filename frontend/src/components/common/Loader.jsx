export default function Loader({ label = 'Loading…', fullScreen = false }) {
  return (
    <div className={fullScreen ? 'full-loader' : 'inline-loader'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
