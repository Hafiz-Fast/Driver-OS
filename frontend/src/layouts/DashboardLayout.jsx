import { NavLink, useNavigate } from 'react-router-dom';
import {
  Car,
  Gauge,
  LayoutDashboard,
  LogOut,
  Mic,
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cars', icon: Car, label: 'My Cars' },
  { path: '/services', icon: Wrench, label: 'Driver Services' },
];

const comingSoon = [
  { icon: ShieldCheck, label: 'Safety' },
  { icon: Mic, label: 'Voice' },
  { icon: Settings, label: 'Settings' },
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
          <div className="brand-icon"><Gauge size={22} strokeWidth={2.4} /></div>
          <span className="brand-name">Driver-OS</span>
        </div>

        {/* Main nav */}
        <p className="sidebar-section-label">Menu</p>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon size={19} strokeWidth={2.2} /></span>
              {item.label}
            </NavLink>
          );
          })}
        </nav>

        {/* Coming soon section */}
        <p className="sidebar-section-label">Coming Soon</p>
        <nav className="sidebar-nav">
          {comingSoon.map((item) => {
            const Icon = item.icon;
            return (
            <button
              key={item.label}
              className="nav-link"
              style={{ opacity: 0.5, cursor: 'default' }}
              disabled
            >
              <span className="nav-icon"><Icon size={19} strokeWidth={2.2} /></span>
              {item.label}
            </button>
          );
          })}
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
            <LogOut className="logout-icon" size={17} strokeWidth={2.2} />
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
