import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/cars', icon: '🚗', label: 'My Cars' },
];

const comingSoon = [
  { icon: '🛡️', label: 'Safety' },
  { icon: '🎙️', label: 'Voice' },
  { icon: '🔧', label: 'Service' },
  { icon: '⚙️', label: 'Settings' },
];

function DashboardLayout({ children }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logoutUser();
    navigate('/login');
  }

  const initials = user
    ? user.username.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="shell">
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">D</div>
          <span className="brand-name">Driver-OS</span>
        </div>

        {/* Main nav */}
        <p className="sidebar-section-label">Menu</p>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Coming soon section */}
        <p className="sidebar-section-label">Coming Soon</p>
        <nav className="sidebar-nav">
          {comingSoon.map((item) => (
            <button
              key={item.label}
              className="nav-link"
              style={{ opacity: 0.5, cursor: 'default' }}
              disabled
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        {/* User footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.username || 'User'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="content-area">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
