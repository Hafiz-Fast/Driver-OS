import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Car,
  Clock,
  Fuel,
  Gauge,
  MapPin,
  Plus,
  Route,
  Wrench,
} from 'lucide-react';
import {
  createFuelFillLog,
  createMaintenanceRecord,
  createTripLog,
  getCars,
  getDriverServiceSummary,
  getFuelFillLogs,
  getMaintenanceRecords,
  getTripLogs,
} from '../api';

const today = new Date().toISOString().slice(0, 10);

const emptyTrip = {
  distance_km: '',
  duration_minutes: '',
  start_location: '',
  end_location: '',
  notes: '',
};

const emptyFuel = {
  filled_at: today,
  litres: '',
  cost: '',
  odometer_reading: '',
  station: '',
};

const emptyMaintenance = {
  title: '',
  service_date: today,
  odometer_reading: '',
  cost: '',
  next_due_date: '',
  next_due_odometer: '',
  status: 'done',
  notes: '',
};

function toLocalDateTimeInput(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hrs) return `${mins} min`;
  return `${hrs}h ${mins}m`;
}

function haversineKm(start, end) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(end.lat - start.lat);
  const dLng = toRad(end.lng - start.lng);
  const lat1 = toRad(start.lat);
  const lat2 = toRad(end.lat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationLabel(position) {
  const { latitude, longitude } = position.coords;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function getCurrentPositionSafe() {
  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

function DriverServicesPage() {
  const [cars, setCars] = useState([]);
  const [selectedCarId, setSelectedCarId] = useState('');
  const [summary, setSummary] = useState(null);
  const [trips, setTrips] = useState([]);
  const [fuelFills, setFuelFills] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripForm, setTripForm] = useState(emptyTrip);
  const [fuelForm, setFuelForm] = useState(emptyFuel);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenance);

  useEffect(() => {
    async function loadInitial() {
      const carData = await getCars();
      setCars(carData);
      if (carData.length) {
        setSelectedCarId(String(carData[0].id));
      } else {
        setLoading(false);
      }
    }

    loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedCarId) return;
    loadServiceData(selectedCarId);
  }, [selectedCarId]);

  async function loadServiceData(carId) {
    setLoading(true);
    setError('');
    try {
      const [summaryData, tripData, fuelData, maintenanceData] = await Promise.all([
        getDriverServiceSummary(carId),
        getTripLogs(carId),
        getFuelFillLogs(carId),
        getMaintenanceRecords(carId),
      ]);
      setSummary(summaryData);
      setTrips(tripData);
      setFuelFills(fuelData);
      setMaintenance(maintenanceData);
    } catch {
      setError('Could not load driver services. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedCar = useMemo(
    () => cars.find((car) => String(car.id) === selectedCarId),
    [cars, selectedCarId]
  );

  async function startTrip() {
    setError('');
    const position = await getCurrentPositionSafe();
    const now = new Date();
    setActiveTrip({
      startedAt: now,
      startPosition: position
        ? { lat: position.coords.latitude, lng: position.coords.longitude }
        : null,
      startLocation: position ? locationLabel(position) : '',
    });
  }

  async function stopTrip() {
    if (!activeTrip || !selectedCarId) return;
    setSaving('trip');
    setError('');

    const endedAt = new Date();
    const position = await getCurrentPositionSafe();
    const endPosition = position
      ? { lat: position.coords.latitude, lng: position.coords.longitude }
      : null;
    const durationMinutes = Math.max(1, Math.round((endedAt - activeTrip.startedAt) / 60000));
    const distanceKm = activeTrip.startPosition && endPosition
      ? haversineKm(activeTrip.startPosition, endPosition).toFixed(2)
      : tripForm.distance_km;

    try {
      await createTripLog({
        car: selectedCarId,
        started_at: activeTrip.startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        start_location: activeTrip.startLocation || tripForm.start_location,
        end_location: position ? locationLabel(position) : tripForm.end_location,
        distance_km: distanceKm || 0,
        duration_minutes: durationMinutes,
        notes: tripForm.notes,
      });
      setActiveTrip(null);
      setTripForm(emptyTrip);
      loadServiceData(selectedCarId);
    } catch (err) {
      setError(Object.values(err || {}).flat().join(' ') || 'Could not save trip.');
    } finally {
      setSaving('');
    }
  }

  async function addManualTrip(e) {
    e.preventDefault();
    setSaving('manual-trip');
    setError('');
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - Number(tripForm.duration_minutes) * 60000);

    try {
      await createTripLog({
        car: selectedCarId,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        ...tripForm,
        distance_km: Number(tripForm.distance_km),
        duration_minutes: Number(tripForm.duration_minutes),
      });
      setTripForm(emptyTrip);
      loadServiceData(selectedCarId);
    } catch (err) {
      setError(Object.values(err || {}).flat().join(' ') || 'Could not save trip.');
    } finally {
      setSaving('');
    }
  }

  async function addFuelFill(e) {
    e.preventDefault();
    setSaving('fuel');
    setError('');
    try {
      await createFuelFillLog({
        ...fuelForm,
        car: selectedCarId,
        litres: Number(fuelForm.litres),
        cost: Number(fuelForm.cost),
        odometer_reading: Number(fuelForm.odometer_reading),
      });
      setFuelForm(emptyFuel);
      loadServiceData(selectedCarId);
    } catch (err) {
      setError(Object.values(err || {}).flat().join(' ') || 'Could not save fuel fill.');
    } finally {
      setSaving('');
    }
  }

  async function addMaintenance(e) {
    e.preventDefault();
    setSaving('maintenance');
    setError('');
    const payload = {
      ...maintenanceForm,
      car: selectedCarId,
      odometer_reading: maintenanceForm.odometer_reading ? Number(maintenanceForm.odometer_reading) : null,
      cost: maintenanceForm.cost ? Number(maintenanceForm.cost) : null,
      next_due_odometer: maintenanceForm.next_due_odometer ? Number(maintenanceForm.next_due_odometer) : null,
      service_date: maintenanceForm.service_date || null,
      next_due_date: maintenanceForm.next_due_date || null,
    };

    try {
      await createMaintenanceRecord(payload);
      setMaintenanceForm(emptyMaintenance);
      loadServiceData(selectedCarId);
    } catch (err) {
      setError(Object.values(err || {}).flat().join(' ') || 'Could not save maintenance record.');
    } finally {
      setSaving('');
    }
  }

  const maxTrend = Math.max(
    1,
    ...(summary?.consumption_points || []).map((point) => point.km_per_litre)
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Driver Services</h1>
          <p>Trips, fuel economy, and maintenance reminders in one place.</p>
        </div>
        <div className="topbar-actions">
          <select
            className="form-select service-car-select"
            value={selectedCarId}
            onChange={(e) => setSelectedCarId(e.target.value)}
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>{car.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {!cars.length && !loading ? (
        <div className="empty-state service-empty">
          <span className="empty-icon"><Car size={48} /></span>
          <h3>Add a vehicle first</h3>
          <p>Driver services need a car profile so trips, fuel fills, and service records stay organized.</p>
        </div>
      ) : (
        <>
          {error && <div className="auth-error-box">{error}</div>}

          <div className="service-hero">
            <div>
              <span className="service-kicker">{selectedCar?.display_name || 'Selected vehicle'}</span>
              <h2>Daily driving command center</h2>
              <p>Log what happened, see what it costs, and know what needs attention next.</p>
            </div>
            <div className="service-hero-actions">
              {!activeTrip ? (
                <button className="btn btn-primary btn-lg" onClick={startTrip}>
                  <Route size={20} />
                  Start Trip
                </button>
              ) : (
                <button className="btn btn-danger btn-lg" onClick={stopTrip} disabled={saving === 'trip'}>
                  <Clock size={20} />
                  {saving === 'trip' ? 'Saving...' : 'End Trip'}
                </button>
              )}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><Route size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.total_trip_distance_km ?? 0}</div>
                <div className="stat-label">Trip km logged</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Fuel size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.average_km_per_litre ?? '--'}</div>
                <div className="stat-label">Average km/litre</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber"><Gauge size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.average_cost_per_km ?? '--'}</div>
                <div className="stat-label">Average cost per km</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><Wrench size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.due_maintenance?.length ?? 0}</div>
                <div className="stat-label">Service reminders</div>
              </div>
            </div>
          </div>

          <div className="service-grid">
            <section className="service-panel">
              <div className="service-panel-header">
                <div>
                  <h3><Route size={20} /> Trip Logger</h3>
                  <p>Auto duration and GPS coordinates when available.</p>
                </div>
              </div>

              {activeTrip && (
                <div className="active-trip-strip">
                  <MapPin size={18} />
                  <div>
                    <strong>Trip in progress</strong>
                    <span>Started {toLocalDateTimeInput(activeTrip.startedAt).replace('T', ' ')}</span>
                  </div>
                </div>
              )}

              <form onSubmit={addManualTrip} className="service-form">
                <div className="form-row">
                  <input className="form-input" type="number" step="0.1" min="0" placeholder="Distance km" value={tripForm.distance_km} onChange={(e) => setTripForm({ ...tripForm, distance_km: e.target.value })} required />
                  <input className="form-input" type="number" min="1" placeholder="Duration min" value={tripForm.duration_minutes} onChange={(e) => setTripForm({ ...tripForm, duration_minutes: e.target.value })} required />
                </div>
                <div className="form-row">
                  <input className="form-input" placeholder="Start location" value={tripForm.start_location} onChange={(e) => setTripForm({ ...tripForm, start_location: e.target.value })} />
                  <input className="form-input" placeholder="End location" value={tripForm.end_location} onChange={(e) => setTripForm({ ...tripForm, end_location: e.target.value })} />
                </div>
                <input className="form-input" placeholder="Notes" value={tripForm.notes} onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })} />
                <button className="btn btn-secondary" disabled={saving === 'manual-trip'}>
                  <Plus size={17} />
                  {saving === 'manual-trip' ? 'Saving...' : 'Add Manual Trip'}
                </button>
              </form>

              <div className="service-list">
                {trips.slice(0, 4).map((trip) => (
                  <div className="service-list-item" key={trip.id}>
                    <Route size={18} />
                    <div>
                      <strong>{trip.distance_km} km</strong>
                      <span>{formatMinutes(trip.duration_minutes)} · {trip.start_location || 'Start'} to {trip.end_location || 'End'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="service-panel">
              <div className="service-panel-header">
                <div>
                  <h3><Fuel size={20} /> Fuel Fill Logger</h3>
                  <p>Capture litres, cost, station, and odometer.</p>
                </div>
              </div>

              <form onSubmit={addFuelFill} className="service-form">
                <div className="form-row">
                  <input className="form-input" type="date" value={fuelForm.filled_at} onChange={(e) => setFuelForm({ ...fuelForm, filled_at: e.target.value })} required />
                  <input className="form-input" type="number" step="0.01" min="0.01" placeholder="Litres" value={fuelForm.litres} onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })} required />
                </div>
                <div className="form-row">
                  <input className="form-input" type="number" step="0.01" min="0" placeholder="Cost" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} required />
                  <input className="form-input" type="number" min="0" placeholder="Odometer" value={fuelForm.odometer_reading} onChange={(e) => setFuelForm({ ...fuelForm, odometer_reading: e.target.value })} required />
                </div>
                <input className="form-input" placeholder="Station" value={fuelForm.station} onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })} />
                <button className="btn btn-secondary" disabled={saving === 'fuel'}>
                  <Plus size={17} />
                  {saving === 'fuel' ? 'Saving...' : 'Add Fuel Fill'}
                </button>
              </form>

              <div className="service-list">
                {fuelFills.slice(0, 4).map((fill) => (
                  <div className="service-list-item" key={fill.id}>
                    <Fuel size={18} />
                    <div>
                      <strong>{fill.litres} L · {fill.cost}</strong>
                      <span>{fill.filled_at} · {fill.odometer_reading.toLocaleString()} km</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="service-panel">
              <div className="service-panel-header">
                <div>
                  <h3><Gauge size={20} /> Fuel Consumption</h3>
                  <p>Calculated from consecutive fuel odometer readings.</p>
                </div>
              </div>
              <div className="trend-bars">
                {(summary?.consumption_points || []).length === 0 ? (
                  <div className="service-muted">Add at least two fuel fills to see km/litre trends.</div>
                ) : (
                  summary.consumption_points.map((point) => (
                    <div className="trend-bar-row" key={`${point.date}-${point.km}`}>
                      <span>{point.date}</span>
                      <div className="trend-track">
                        <div style={{ width: `${Math.max(8, (point.km_per_litre / maxTrend) * 100)}%` }} />
                      </div>
                      <strong>{point.km_per_litre} km/L</strong>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="service-panel">
              <div className="service-panel-header">
                <div>
                  <h3><Wrench size={20} /> Maintenance Tracker</h3>
                  <p>Log services and set mileage/date reminders.</p>
                </div>
              </div>

              <form onSubmit={addMaintenance} className="service-form">
                <input className="form-input" placeholder="Service title e.g. Oil change" value={maintenanceForm.title} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })} required />
                <div className="form-row">
                  <select className="form-select" value={maintenanceForm.status} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}>
                    <option value="done">Completed</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                  <input className="form-input" type="date" value={maintenanceForm.service_date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_date: e.target.value })} />
                </div>
                <div className="form-row">
                  <input className="form-input" type="number" min="0" placeholder="Service odometer" value={maintenanceForm.odometer_reading} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, odometer_reading: e.target.value })} />
                  <input className="form-input" type="number" step="0.01" min="0" placeholder="Cost" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} />
                </div>
                <div className="form-row">
                  <input className="form-input" type="date" value={maintenanceForm.next_due_date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_due_date: e.target.value })} />
                  <input className="form-input" type="number" min="0" placeholder="Next due km" value={maintenanceForm.next_due_odometer} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_due_odometer: e.target.value })} />
                </div>
                <button className="btn btn-secondary" disabled={saving === 'maintenance'}>
                  <CalendarClock size={17} />
                  {saving === 'maintenance' ? 'Saving...' : 'Save Service'}
                </button>
              </form>

              <div className="service-list">
                {maintenance.slice(0, 4).map((item) => (
                  <div className={`service-list-item reminder-${item.reminder_state}`} key={item.id}>
                    <Wrench size={18} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.next_due_odometer ? `${item.next_due_odometer.toLocaleString()} km` : 'No mileage reminder'} {item.next_due_date ? `· ${item.next_due_date}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}

export default DriverServicesPage;
