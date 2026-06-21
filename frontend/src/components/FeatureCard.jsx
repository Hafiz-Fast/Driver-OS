function FeatureCard({ title, description, tag }) {
  return (
    <article className="feature-card">
      <span className="card-tag">{tag}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export default FeatureCard;
