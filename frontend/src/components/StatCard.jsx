const StatCard = ({ title, value, accent = "var(--brand)", subtitle }) => (
  <article className="card stat-card">
    <div className="stat-card__title">{title}</div>
    <div className="stat-card__value" style={{ color: accent }}>
      {value}
    </div>
    {subtitle ? <div className="stat-card__subtitle">{subtitle}</div> : null}
  </article>
);

export default StatCard;
