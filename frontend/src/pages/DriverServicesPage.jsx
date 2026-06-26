import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Car,
  Clock,
  Fuel,
  Gauge,
  Info,
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

/* ── Tabs (now route-driven) ── */
const TABS = {
  trips: { label: 'Trip Logger', icon: Route, heading: 'Trip Logger', sub: 'Record distances, duration, and routes.' },
  fuel: { label: 'Fuel Fills', icon: Fuel, heading: 'Fuel Fill Logger', sub: 'Record refills to track consumption.' },
  consumption: { label: 'Fuel Economy', icon: Gauge, heading: 'Fuel Economy Trends', sub: 'See your km/litre over time.' },
  maintenance: { label: 'Maintenance', icon: Wrench, heading: 'Maintenance Tracker', sub: 'Log services and set reminders.' },
};

/* ── Empty form states ── */
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

/* ── Helpers ── */
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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

/* ── Reusable components ── */
function HelpBox({ children }) {
  return (
    <div className="service-help">
      <Info size={17} />
      <p>{children}</p>
    </div>
  );
}

function FieldWithUnit({ placeholder, unit, value, onChange, type = 'number', step, min, required, ...rest }) {
  return (
    <div className="field-wrap field-with-unit">
      <input
        className="form-input"
        type={type}
        step={step}
        min={min}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        {...rest}
      />
      <span className="field-unit-badge">{unit}</span>
    </div>
  );
}

function FormLabel({ children }) {
  return <label className="form-label">{children}</label>;
}

function FieldRow({ label, children }) {
  return (
    <div className="field-row">
      {label && <FormLabel>{label}</FormLabel>}
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="service-section-title">{children}</p>
  );
}

/* ── Help text config ── */
const HELP_TEXT = {
  trips: (
    <>
      Log your trips either <strong>manually</strong> by filling in the details below, or
      use <strong>Live Trip</strong> to capture duration and GPS automatically. Your trip history
      helps track total kilometres driven over time.
    </>
  ),
  fuel: (
    <>
      Record each refill to track fuel economy. Make sure to enter the <strong>distance travelled</strong> shown
      on your odometer at each fill. After two or more fills, the Fuel Economy tab shows your consumption trend.
    </>
  ),
  consumption: (
    <>
      Fuel economy is calculated from <strong>consecutive fuel fills</strong>. The system compares distance
      travelled between fills against the fuel you added. Add at least two fills with distance readings to
      see your first data point.
    </>
  ),
  maintenance: (
    <>
      Log completed services and set reminders for upcoming ones. Each reminder can be based on a <strong>date</strong>,
      a <strong>distance</strong> (km), or both. Items nearing their due threshold are highlighted automatically.
    </>
  ),
};

function DriverServicesPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = TABS[tab] ? tab : null; // null => overview

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

  const loadServiceData = useCallback(async (carId) => {
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
  }, []);

  const selectedCar = useMemo(
    () => cars.find((car) => String(car.id) === selectedCarId),
    [cars, selectedCarId],
  );

  /* ── Trip actions ── */
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

  /* ── Fuel actions ── */
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

  /* ── Maintenance actions ── */
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
    ...(summary?.consumption_points || []).map((point) => point.km_per_litre),
  );

  const overviewCards = [
    { id: 'trips', icon: Route, color: 'blue', title: 'Trip Logger', desc: 'Log distances, duration, and routes with live GPS capture.' },
    { id: 'fuel', icon: Fuel, color: 'amber', title: 'Fuel Fills', desc: 'Record each refill to track consumption and cost.' },
    { id: 'consumption', icon: Gauge, color: 'green', title: 'Fuel Economy', desc: 'See your km/litre trend calculated across fills.' },
    { id: 'maintenance', icon: Wrench, color: 'red', title: 'Maintenance', desc: 'Log services and set date or distance reminders.' },
  ];

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>{activeTab ? TABS[activeTab].heading : 'Driver Services'}</h1>
          <p>
            {activeTab
              ? TABS[activeTab].sub
              : 'Trips, fuel economy, and maintenance reminders in one place.'}
          </p>
        </div>
        <div className="topbar-actions">
          {cars.length > 0 && (
            <select
              className="form-select service-car-select"
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value)}
            >
              {cars.map((car) => (
                <option key={car.id} value={car.id}>{car.display_name}</option>
              ))}
            </select>
          )}
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

          {/* Summary stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><Route size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.total_trip_distance_km ?? 0}</div>
                <div className="stat-label">Total Trip (km)</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Fuel size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.average_km_per_litre ?? '--'}</div>
                <div className="stat-label">Average (km/L)</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber"><Gauge size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.average_cost_per_km ?? '--'}</div>
                <div className="stat-label">Avg Cost / km</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><Wrench size={24} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary?.due_maintenance?.length ?? 0}</div>
                <div className="stat-label">Service Reminders</div>
              </div>
            </div>
          </div>

          {/* ── OVERVIEW (no tab) ── */}
          {!activeTab && (
            <div className="service-overview-grid">
              {overviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    className="feature-card service-overview-card"
                    onClick={() => navigate(`/services/${card.id}`)}
                  >
                    <div className={`feature-card-icon ${card.color}`}>
                      <Icon size={26} />
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                    <span className="btn btn-sm btn-ghost">
                      Open
                      <ArrowRight size={15} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── TAB CONTENT ── */}
          {activeTab && (
            <div className="service-panel service-panel-wide">
              {loading ? (
                <div className="empty-state">
                  <div className="spinner" />
                </div>
              ) : (
                <>
                  {/* ── TRIP LOGGER ── */}
                  {activeTab === 'trips' && (
                    <>
                      <div className="service-panel-header">
                        <div>
                          <h3>Trip Logger</h3>
                          <p>Record distances, duration, and routes.</p>
                        </div>
                        <div className="service-hero-actions">
                          {!activeTrip ? (
                            <button className="btn btn-primary btn-sm" onClick={startTrip}>
                              <MapPin size={16} />
                              Live Trip
                            </button>
                          ) : (
                            <button className="btn btn-danger btn-sm" onClick={stopTrip} disabled={saving === 'trip'}>
                              <Clock size={16} />
                              {saving === 'trip' ? 'Saving...' : 'End Trip'}
                            </button>
                          )}
                        </div>
                      </div>

                      <HelpBox>{HELP_TEXT.trips}</HelpBox>

                      {activeTrip && (
                        <div className="active-trip-strip">
                          <MapPin size={17} />
                          <div>
                            <strong>Trip in progress</strong>
                            <span>Started {toLocalDateTimeInput(activeTrip.startedAt).replace('T', ' ')}</span>
                          </div>
                        </div>
                      )}

                      <form onSubmit={addManualTrip} className="service-form compact">
                        <div className="form-row">
                          <FieldRow label="Distance travelled">
                            <FieldWithUnit
                              placeholder="0.0"
                              unit="km"
                              value={tripForm.distance_km}
                              onChange={(e) => setTripForm({ ...tripForm, distance_km: e.target.value })}
                              step="0.1"
                              min="0"
                              required
                            />
                          </FieldRow>
                          <FieldRow label="Duration">
                            <FieldWithUnit
                              placeholder="0"
                              unit="min"
                              value={tripForm.duration_minutes}
                              onChange={(e) => setTripForm({ ...tripForm, duration_minutes: e.target.value })}
                              min="1"
                              required
                            />
                          </FieldRow>
                        </div>
                        <div className="form-row">
                          <FieldRow label="Start location">
                            <input
                              className="form-input"
                              placeholder="City or address"
                              value={tripForm.start_location}
                              onChange={(e) => setTripForm({ ...tripForm, start_location: e.target.value })}
                            />
                          </FieldRow>
                          <FieldRow label="End location">
                            <input
                              className="form-input"
                              placeholder="City or address"
                              value={tripForm.end_location}
                              onChange={(e) => setTripForm({ ...tripForm, end_location: e.target.value })}
                            />
                          </FieldRow>
                        </div>
                        <FieldRow label="Notes (optional)">
                          <input
                            className="form-input"
                            placeholder="e.g. Traffic, weather, purpose"
                            value={tripForm.notes}
                            onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
                          />
                        </FieldRow>
                        <div>
                          <button className="btn btn-secondary btn-sm" disabled={saving === 'manual-trip'}>
                            <Plus size={16} />
                            {saving === 'manual-trip' ? 'Saving...' : 'Add Manual Trip'}
                          </button>
                        </div>
                      </form>

                      {trips.length > 0 && (
                        <div className="service-list">
                          <SectionTitle>Recent Trips</SectionTitle>
                          {trips.slice(0, 8).map((trip) => (
                            <div className="service-list-item" key={trip.id}>
                              <Route size={16} />
                              <div>
                                <strong>{trip.distance_km} km</strong>
                                <span>
                                  {formatMinutes(trip.duration_minutes)}
                                  {trip.start_location ? ` · ${trip.start_location} → ${trip.end_location || '?'}` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {trips.length === 0 && (
                        <p className="service-empty-line">No trips yet. Add a manual trip or start a live trip above.</p>
                      )}
                    </>
                  )}

                  {/* ── FUEL FILLS ── */}
                  {activeTab === 'fuel' && (
                    <>
                      <div className="service-panel-header">
                        <div>
                          <h3>Fuel Fill Logger</h3>
                          <p>Record refills to track consumption.</p>
                        </div>
                      </div>

                      <HelpBox>{HELP_TEXT.fuel}</HelpBox>

                      <form onSubmit={addFuelFill} className="service-form compact">
                        <div className="form-row">
                          <FieldRow label="Date of refill">
                            <input
                              className="form-input"
                              type="date"
                              value={fuelForm.filled_at}
                              onChange={(e) => setFuelForm({ ...fuelForm, filled_at: e.target.value })}
                              required
                            />
                          </FieldRow>
                          <FieldRow label="Fuel volume">
                            <FieldWithUnit
                              placeholder="0.00"
                              unit="Litre"
                              value={fuelForm.litres}
                              onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })}
                              step="0.01"
                              min="0.01"
                              required
                            />
                          </FieldRow>
                        </div>
                        <div className="form-row">
                          <FieldRow label="Total cost">
                            <FieldWithUnit
                              placeholder="0.00"
                              unit="pkr"
                              value={fuelForm.cost}
                              onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
                              step="0.01"
                              min="0"
                              required
                            />
                          </FieldRow>
                          <FieldRow label="Distance travelled at fill">
                            <FieldWithUnit
                              placeholder="0"
                              unit="km"
                              value={fuelForm.odometer_reading}
                              onChange={(e) => setFuelForm({ ...fuelForm, odometer_reading: e.target.value })}
                              min="0"
                              required
                            />
                          </FieldRow>
                        </div>
                        <FieldRow label="Station (optional)">
                          <input
                            className="form-input"
                            placeholder="Station name"
                            value={fuelForm.station}
                            onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })}
                          />
                        </FieldRow>
                        <div>
                          <button className="btn btn-secondary btn-sm" disabled={saving === 'fuel'}>
                            <Plus size={16} />
                            {saving === 'fuel' ? 'Saving...' : 'Add Fuel Fill'}
                          </button>
                        </div>
                      </form>

                      {fuelFills.length > 0 && (
                        <div className="service-list">
                          <SectionTitle>Recent Fills</SectionTitle>
                          {fuelFills.slice(0, 8).map((fill) => (
                            <div className="service-list-item" key={fill.id}>
                              <Fuel size={16} />
                              <div>
                                <strong>{fill.litres} L — ${fill.cost}</strong>
                                <span>{fill.filled_at} · {fill.odometer_reading.toLocaleString()} km</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {fuelFills.length === 0 && (
                        <p className="service-empty-line">No fuel fills recorded yet. Add your first fill above.</p>
                      )}
                    </>
                  )}

                  {/* ── FUEL ECONOMY ── */}
                  {activeTab === 'consumption' && (
                    <>
                      <div className="service-panel-header">
                        <div>
                          <h3>Fuel Economy Trends</h3>
                          <p>See your km/litre over time.</p>
                        </div>
                      </div>

                      <HelpBox>{HELP_TEXT.consumption}</HelpBox>

                      <div className="trend-bars">
                        {(summary?.consumption_points || []).length === 0 ? (
                          <div className="trend-empty">
                            <p>Not enough data yet.</p>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => navigate('/services/fuel')}
                            >
                              <Fuel size={16} />
                              Go to Fuel Fills
                            </button>
                          </div>
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
                    </>
                  )}

                  {/* ── MAINTENANCE ── */}
                  {activeTab === 'maintenance' && (
                    <>
                      <div className="service-panel-header">
                        <div>
                          <h3>Maintenance Tracker</h3>
                          <p>Log services and set reminders.</p>
                        </div>
                      </div>

                      <HelpBox>{HELP_TEXT.maintenance}</HelpBox>

                      <form onSubmit={addMaintenance} className="service-form compact">
                        <FieldRow label="Service description">
                          <input
                            className="form-input"
                            placeholder="e.g. Oil change, Tyre rotation, Brake pads"
                            value={maintenanceForm.title}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                            required
                          />
                        </FieldRow>
                        <div className="form-row">
                          <FieldRow label="Status">
                            <select
                              className="form-select"
                              value={maintenanceForm.status}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                            >
                              <option value="done">Completed</option>
                              <option value="upcoming">Upcoming</option>
                            </select>
                          </FieldRow>
                          <FieldRow label="Service date">
                            <input
                              className="form-input"
                              type="date"
                              value={maintenanceForm.service_date}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_date: e.target.value })}
                            />
                          </FieldRow>
                        </div>
                        <div className="form-row">
                          <FieldRow label="Distance at service">
                            <FieldWithUnit
                              placeholder="0"
                              unit="km"
                              value={maintenanceForm.odometer_reading}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, odometer_reading: e.target.value })}
                              min="0"
                            />
                          </FieldRow>
                          <FieldRow label="Cost">
                            <FieldWithUnit
                              placeholder="0.00"
                              unit="$"
                              value={maintenanceForm.cost}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                              step="0.01"
                              min="0"
                            />
                          </FieldRow>
                        </div>

                        <div className="service-divider">
                          <SectionTitle>Next Service Reminder</SectionTitle>
                          <div className="form-row">
                            <FieldRow label="Due date">
                              <input
                                className="form-input"
                                type="date"
                                value={maintenanceForm.next_due_date}
                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_due_date: e.target.value })}
                              />
                            </FieldRow>
                            <FieldRow label="Due at distance">
                              <FieldWithUnit
                                placeholder="0"
                                unit="km"
                                value={maintenanceForm.next_due_odometer}
                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_due_odometer: e.target.value })}
                                min="0"
                              />
                            </FieldRow>
                          </div>
                        </div>

                        <div>
                          <button className="btn btn-secondary btn-sm" disabled={saving === 'maintenance'}>
                            <CalendarClock size={16} />
                            {saving === 'maintenance' ? 'Saving...' : 'Save Service Record'}
                          </button>
                        </div>
                      </form>

                      {maintenance.length > 0 && (
                        <div className="service-list">
                          <SectionTitle>Service History</SectionTitle>
                          {maintenance.slice(0, 8).map((item) => (
                            <div className={`service-list-item reminder-${item.reminder_state}`} key={item.id}>
                              <Wrench size={16} />
                              <div>
                                <strong>{item.title}</strong>
                                <span>
                                  {item.next_due_odometer
                                    ? `Reminder at ${item.next_due_odometer.toLocaleString()} km`
                                    : item.next_due_date
                                      ? `Reminder by ${item.next_due_date}`
                                      : 'No reminder'}
                                  {item.cost ? ` · $${item.cost}` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {maintenance.length === 0 && (
                        <p className="service-empty-line">No service records yet. Add your first one above.</p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default DriverServicesPage;
