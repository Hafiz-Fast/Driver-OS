import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Car, CheckCircle2 } from 'lucide-react';
import { createCar } from '../api';
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

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [carForm, setCarForm] = useState({
    make: '',
    model: '',
    year: currentYear,
    mileage: '',
    fuel_type: 'petrol',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  function handleChange(e) {
    setCarForm({ ...carForm, [e.target.name]: e.target.value });
  }

  async function handleAddCar(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createCar({
        ...carForm,
        year: Number(carForm.year),
        mileage: Number(carForm.mileage),
      });
      setStep(2);
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : Object.values(err).flat().join(' ');
      setError(msg || 'Failed to add car. Check the details and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    navigate('/dashboard');
  }

  function handleFinish() {
    navigate('/dashboard');
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="step-indicator">
          <div className={`step-dot ${step >= 0 ? (step > 0 ? 'completed' : 'active') : ''}`} />
          <div className={`step-dot ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`} />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <span className="welcome-emoji"><Car size={48} /></span>
            <h1>Welcome{user ? `, ${user.username}` : ''}!</h1>
            <p className="onboarding-subtitle">
              Let's set up your first vehicle so your dashboard is ready to go.
              This only takes 30 seconds.
            </p>
            <div className="onboarding-actions">
              <button className="btn btn-ghost" onClick={handleSkip}>
                Skip for now
              </button>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
                Add my car
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}

        {/* Step 1: Add car form */}
        {step === 1 && (
          <>
            <h1>Add your vehicle</h1>
            <p className="onboarding-subtitle">
              Enter the details of your car below.
            </p>

            {error && <div className="auth-error-box">{error}</div>}

            <form onSubmit={handleAddCar}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="onb-make">Make</label>
                  <input
                    id="onb-make"
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
                  <label className="form-label" htmlFor="onb-model">Model</label>
                  <input
                    id="onb-model"
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
                  <label className="form-label" htmlFor="onb-year">Year</label>
                  <input
                    id="onb-year"
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
                  <label className="form-label" htmlFor="onb-mileage">Mileage (km)</label>
                  <input
                    id="onb-mileage"
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
                <label className="form-label" htmlFor="onb-fuel">Fuel Type</label>
                <select
                  id="onb-fuel"
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

              <div className="onboarding-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
                  <ArrowLeft size={17} />
                  Back
                </button>
                <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 2: Done */}
        {step === 2 && (
          <>
            <span className="welcome-emoji success"><CheckCircle2 size={50} /></span>
            <h1>You're all set!</h1>
            <p className="onboarding-subtitle">
              Your vehicle has been added. Head to your dashboard to see everything in action.
            </p>
            <div className="onboarding-actions">
              <div />
              <button className="btn btn-primary btn-lg" onClick={handleFinish}>
                Go to Dashboard
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OnboardingPage;
