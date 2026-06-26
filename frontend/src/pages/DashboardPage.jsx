import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Car,
  Fuel,
  Gauge,
  Mic,
  Route,
  Wrench,
} from 'lucide-react';
import { getCars } from '../api';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: Car,
    color: 'blue',
    title: 'My Vehicles',
    description: 'Manage your car profiles — add, edit, or remove vehicles from your fleet.',
    action: 'Manage Vehicles',
    link: '/cars',
  },
  {
    icon: Route,
    color: 'green',
    title: 'Trip Logger',
    description: 'Log trips with distance, duration, and GPS coordinates. Track where you\'ve been.',
    action: 'Log a Trip',
    link: '/services/trips',
  },
  {
    icon: Fuel,
    color: 'amber',
    title: 'Fuel Tracker',
    description: 'Record fuel fills and calculate your vehicle\'s fuel economy over time.',
    action: 'Track Fuel',
    link: '/services/fuel',
  },
  {
    icon: Wrench,
    color: 'red',
    title: 'Maintenance Tracker',
    description: 'Keep on top of services with mileage and date-based reminders for each vehicle.',
    action: 'View Services',
    link: '/services/maintenance',
  },
  {
    icon: Activity,
    color: 'purple',
    title: 'Drive Sessions',
    description: 'Real-time drowsiness detection using your webcam with audio alerts for safety.',
    action: 'Start Driving',
    link: '/cars',
  },
  {
    icon: Mic,
    color: 'teal',
    title: 'Voice Control',
    description: 'Control Driver OS hands-free with voice commands while on the road.',
    action: 'Coming Soon',
    link: null,
    disabled: true,
  },
];

function formatMileage(m) {
  return Number(m).toLocaleString() + ' km';
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCars();
  }, []);

  async function loadCars() {
    setLoading(true);
    try {
      const data = await getCars();
      setCars(data);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  }

  const totalMileage = cars.reduce((sum, c) => sum + (c.mileage || 0), 0);
  const fuelTypes = [...new Set(cars.map((c) => c.fuel_type))];

  return (
    <>
      {/* Welcome banner */}
      <div className="welcome-banner">
        <div>
          <h2>Welcome back{user ? `, ${user.username}` : ''} 👋</h2>
          <p>
            Your driving command centre. Manage vehicles, track trips, monitor fuel economy,
            and stay safe with drowsiness detection.
          </p>
        </div>
        <div className="welcome-banner-actions">
          <button className="btn btn-primary" onClick={() => navigate('/cars')}>
            <Car size={18} />
            My Vehicles
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Car size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{cars.length}</div>
            <div className="stat-label">Total Vehicles</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Gauge size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{totalMileage.toLocaleString()}</div>
            <div className="stat-label">Total Mileage (km)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Fuel size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{fuelTypes.length}</div>
            <div className="stat-label">Fuel Types</div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="feature-grid">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              className="feature-card"
              key={feature.title}
              onClick={() => {
                if (!feature.disabled && feature.link) {
                  navigate(feature.link);
                }
              }}
              style={feature.disabled ? { cursor: 'default', opacity: 0.6 } : {}}
            >
              <div className={`feature-card-icon ${feature.color}`}>
                <Icon size={26} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.disabled ? (
                <span className="btn btn-sm btn-secondary" style={{ pointerEvents: 'none' }}>
                  Coming Soon
                </span>
              ) : (
                <span className="btn btn-sm btn-ghost">
                  {feature.action}
                  <ArrowRight size={15} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent vehicles */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {loading ? 'Vehicles' : `Vehicles (${cars.length})`}
          </span>
          {cars.length > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('/cars')}>
              View All
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Car size={48} /></span>
            <h3>No vehicles yet</h3>
            <p>Add your first car to get started with tracking and management.</p>
            <button className="btn btn-primary" onClick={() => navigate('/cars')}>
              <Car size={18} />
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="quick-vehicles-list">
            {cars.slice(0, 5).map((car) => (
              <div className="quick-vehicle-item" key={car.id}>
                <div className="quick-vehicle-left">
                  <div className={`quick-vehicle-dot ${car.fuel_type}`} />
                  <div>
                    <div className="quick-vehicle-name">
                      {car.make} {car.model} ({car.year})
                    </div>
                    <div className="quick-vehicle-mileage">
                      {formatMileage(car.mileage)} · {car.fuel_type}
                    </div>
                  </div>
                </div>
                <div className="quick-vehicle-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/drive/${car.id}`)}
                  >
                    Drive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default DashboardPage;