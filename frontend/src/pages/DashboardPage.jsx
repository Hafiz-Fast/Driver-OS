import { useState, useEffect } from 'react';
import { getCars, createCar, updateCar, deleteCar } from '../api';
import { useAuth } from '../context/AuthContext';

const FUEL_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cng', label: 'CNG' },
  { value: 'lpg', label: 'LPG' },
];

const currentYear = new Date().getFullYear();

function DashboardPage() {
  const { user } = useAuth();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [carForm, setCarForm] = useState({
    make: '',
    model: '',
    year: currentYear,
    mileage: '',
    fuel_type: 'petrol',
  });

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

  function openAddModal() {
    setEditingCar(null);
    setCarForm({ make: '', model: '', year: currentYear, mileage: '', fuel_type: 'petrol' });
    setFormError('');
    setShowModal(true);
  }

  function openEditModal(car) {
    setEditingCar(car);
    setCarForm({
      make: car.make,
      model: car.model,
      year: car.year,
      mileage: car.mileage,
      fuel_type: car.fuel_type,
    });
    setFormError('');
    setShowModal(true);
  }

  function handleChange(e) {
    setCarForm({ ...carForm, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const payload = {
      ...carForm,
      year: Number(carForm.year),
      mileage: Number(carForm.mileage),
    };

    try {
      if (editingCar) {
        await updateCar(editingCar.id, payload);
      } else {
        await createCar(payload);
      }
      setShowModal(false);
      loadCars();
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : typeof err === 'object'
            ? Object.values(err).flat().join(' ')
            : 'Something went wrong';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      await deleteCar(id);
      loadCars();
    } catch {
      alert('Failed to delete vehicle');
    }
  }

  function formatMileage(m) {
    return Number(m).toLocaleString() + ' km';
  }

  const totalMileage = cars.reduce((sum, c) => sum + (c.mileage || 0), 0);
  const fuelTypes = [...new Set(cars.map((c) => c.fuel_type))];

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Dashboard</h1>
          <p>Welcome back{user ? `, ${user.username}` : ''}. Here's your vehicle overview.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🚗</div>
          <div className="stat-content">
            <div className="stat-value">{cars.length}</div>
            <div className="stat-label">Total Vehicles</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📏</div>
          <div className="stat-content">
            <div className="stat-value">{totalMileage.toLocaleString()}</div>
            <div className="stat-label">Total Mileage (km)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⛽</div>
          <div className="stat-content">
            <div className="stat-value">{fuelTypes.length}</div>
            <div className="stat-label">Fuel Types</div>
          </div>
        </div>
      </div>

      {/* Vehicles section */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">Your Vehicles</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : cars.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🚘</span>
            <h3>No vehicles yet</h3>
            <p>Add your first car to get started with tracking and management.</p>
            <button className="btn btn-primary" onClick={openAddModal}>
              + Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="vehicles-grid">
            {cars.map((car) => (
              <div className="vehicle-card" key={car.id}>
                <div className="vehicle-card-top">
                  <div className="vehicle-icon-wrap">🚗</div>
                  <div className="vehicle-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(car)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(car.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="vehicle-name">{car.make} {car.model}</div>
                <div className="vehicle-year">{car.year}</div>
                <div className="vehicle-details">
                  <div>
                    <div className="vehicle-detail-label">Mileage</div>
                    <div className="vehicle-detail-value">{formatMileage(car.mileage)}</div>
                  </div>
                  <div>
                    <div className="vehicle-detail-label">Fuel</div>
                    <div className="vehicle-detail-value">
                      <span className={`fuel-badge ${car.fuel_type}`}>{car.fuel_type}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}
                    onClick={() => window.location.href = `/drive/${car.id}`}
                  >
                    ▶️ Start Drive Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCar ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>

            {formError && <div className="auth-error-box">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-make">Make</label>
                  <input
                    id="modal-make"
                    className="form-input"
                    type="text"
                    name="make"
                    placeholder="e.g. Toyota"
                    value={carForm.make}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-model">Model</label>
                  <input
                    id="modal-model"
                    className="form-input"
                    type="text"
                    name="model"
                    placeholder="e.g. Corolla"
                    value={carForm.model}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-year">Year</label>
                  <input
                    id="modal-year"
                    className="form-input"
                    type="number"
                    name="year"
                    min="1886"
                    max={currentYear + 1}
                    value={carForm.year}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="modal-mileage">Mileage (km)</label>
                  <input
                    id="modal-mileage"
                    className="form-input"
                    type="number"
                    name="mileage"
                    placeholder="e.g. 45000"
                    min="0"
                    value={carForm.mileage}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="modal-fuel">Fuel Type</label>
                <select
                  id="modal-fuel"
                  className="form-select"
                  name="fuel_type"
                  value={carForm.fuel_type}
                  onChange={handleChange}
                >
                  {FUEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={formLoading}>
                  {formLoading
                    ? 'Saving…'
                    : editingCar
                      ? 'Save Changes'
                      : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardPage;
