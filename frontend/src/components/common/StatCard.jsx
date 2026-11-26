export default function StatCard({ label, value, hint, icon: Icon, tone = 'blue' }) {
  return (
    <div className="card stat-card">
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-val">{value}</div>
        {hint ? <div className="stat-sub">{hint}</div> : null}
      </div>
      {Icon ? (
        <div className={`stat-icon stat-icon-${tone}`}>
          <Icon size={22} />
        </div>
      ) : null}
    </div>
  );
}
