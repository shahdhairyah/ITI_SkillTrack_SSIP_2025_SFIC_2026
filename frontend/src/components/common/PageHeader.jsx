export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <span className="page-eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
