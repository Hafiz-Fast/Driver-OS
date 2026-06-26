import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Mic,
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/cars', icon: Car, label: 'My Cars' },
];

/* Driver Services is a grouped nav — overview + children, each its own route */
const serviceChildren = [
  { path: 'trips', label: 'Trip Logger' },
  { path: 'fuel', label: 'Fuel Fills' },
  { path: 'consumption', label: 'Fuel Economy' },
  { path: 'maintenance', label: 'Maintenance' },
];

const comingSoon = [
  { icon: ShieldCheck, label: 'Safety' },
  { icon: Mic, label: 'Voice' },
  { icon: Settings, label: 'Settings' },
];

function DashboardLayout({ children }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-expand the Driver Services group while the user is on any service route
  const servicesActive = location.pathname.startsWith('/services');
  const [servicesOpen, setServicesOpen] = useState(servicesActive);

  function handleLogout() {
    logoutUser();
    navigate('/login');
  }

  const initials = user ? user.username.slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="shell">
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon"><Logo size={22} /></div>
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

          {/* Driver Services group */}
          <div className="nav-group">
            <NavLink
              to="/services"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setServicesOpen(true)}
            >
              <span className="nav-icon"><Wrench size={19} strokeWidth={2.2} /></span>
              Driver Services
              <ChevronDown
                size={16}
                strokeWidth={2.4}
                style={{
                  marginLeft: 'auto',
                  transition: 'transform 200ms ease',
                  transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  opacity: 0.7,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setServicesOpen((open) => !open);
                }}
              />
            </NavLink>

            {servicesOpen && (
              <div className="nav-group-children">
                {serviceChildren.map((item) => (
                  <NavLink
                    key={item.path}
                    to={`/services/${item.path}`}
                    className={({ isActive }) => `nav-link child ${isActive ? 'active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
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
