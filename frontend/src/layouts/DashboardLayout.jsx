const navigation = [
  'Dashboard',
  'Cars',
  'Safety',
  'Voice',
  'Service',
  'Settings',
];

function DashboardLayout({ children }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand-mark">D</div>
          <p className="sidebar-label">Driver-OS</p>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navigation.map((item, index) => (
            <button className={`nav-item ${index === 0 ? 'active' : ''}`} key={item} type="button">
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <p>Foundation phase</p>
          <strong>Quiet by design</strong>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Week 1</p>
            <h3>Foundation</h3>
          </div>

          <div className="status-pill">Auth + car profile scaffold</div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
