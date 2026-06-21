import DashboardLayout from './layouts/DashboardLayout';
import FeatureCard from './components/FeatureCard';

const overviewCards = [
  {
    title: 'Voice-first control',
    description: 'Reserve a dedicated lane for voice commands, quick actions, and hands-free interaction.',
    tag: 'Phase 2',
  },
  {
    title: 'Drowsiness monitoring',
    description: 'Track live camera or sensor feeds later without changing the dashboard structure.',
    tag: 'Safety',
  },
  {
    title: 'Vehicle profile',
    description: 'Store make, model, year, mileage, and fuel type for each car connected to the account.',
    tag: 'Ready',
  },
  {
    title: 'Service hub',
    description: 'Provide a clean surface for maintenance reminders, service bookings, and trip insights.',
    tag: 'Shell',
  },
];

const quickActions = [
  'Connect vehicle',
  'Pair voice controls',
  'Review service status',
  'Open safety monitor',
];

function App() {
  return (
    <DashboardLayout>
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Driver-OS control center</p>
          <h1>Everything a driver needs, starting with the foundation.</h1>
          <p className="hero-text">
            This shell is intentionally quiet. It gives the product room for login, car setup,
            safety monitoring, and voice control without locking in the later phases too early.
          </p>
        </div>

        <div className="hero-panel">
          <div className="panel-block">
            <span className="panel-label">Auth</span>
            <strong>JWT ready</strong>
          </div>
          <div className="panel-block">
            <span className="panel-label">Database</span>
            <strong>Supabase Postgres</strong>
          </div>
          <div className="panel-block">
            <span className="panel-label">Frontend</span>
            <strong>React shell</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">What’s scaffolded</p>
          <h2>Structured for the next features, not crowded by them.</h2>
        </div>

        <div className="card-grid">
          {overviewCards.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="section-block split-block">
        <div className="section-heading compact">
          <p className="eyebrow">Next actions</p>
          <h2>Navigation points for the foundation work.</h2>
        </div>

        <div className="action-stack">
          {quickActions.map((action) => (
            <div className="action-row" key={action}>
              <span>{action}</span>
              <span className="action-arrow">→</span>
            </div>
          ))}
        </div>
      </section>
    </DashboardLayout>
  );
}

export default App;
