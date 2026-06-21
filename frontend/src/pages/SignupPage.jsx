import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup as apiSignup } from '../api';

function SignupPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear field error on change
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');
    setLoading(true);

    try {
      await apiSignup(form);
      // Redirect to login after successful signup
      navigate('/login');
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setGlobalError('Network error. Please check if the server is running.');
      } else if (err instanceof Error) {
        setGlobalError(err.message || 'Something went wrong. Please try again.');
      } else if (typeof err === 'object' && !err.detail && !err.non_field_errors) {
        setErrors(err);
      } else {
        setGlobalError(err?.detail || err?.non_field_errors?.[0] || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function getFieldError(field) {
    const e = errors[field];
    if (!e) return null;
    return Array.isArray(e) ? e[0] : e;
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-logo">D</div>
          <h2>Join Driver-OS</h2>
          <p>
            Set up your account and start tracking your vehicles in under a minute.
            We'll walk you through adding your first car.
          </p>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <h1>Create your account</h1>
          <p className="auth-subtitle">Start managing your vehicles today</p>

          {globalError && <div className="auth-error-box">{globalError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-username">
                Username
              </label>
              <input
                id="signup-username"
                className="form-input"
                type="text"
                name="username"
                placeholder="Choose a username"
                value={form.username}
                onChange={handleChange}
                required
                autoFocus
              />
              {getFieldError('username') && (
                <p className="form-error">{getFieldError('username')}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                className="form-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
              {getFieldError('email') && <p className="form-error">{getFieldError('email')}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                className="form-input"
                type="password"
                name="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
              />
              {getFieldError('password') && (
                <p className="form-error">{getFieldError('password')}</p>
              )}
            </div>

            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
