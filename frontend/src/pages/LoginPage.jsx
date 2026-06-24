import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge } from 'lucide-react';
import { login as apiLogin, getUser } from '../api';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiLogin(form);
      const user = await getUser();
      loginUser(user);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Network error. Please check if the server is running.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        const msg =
          err?.detail || err?.non_field_errors?.[0] || 'Invalid credentials. Please try again.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-logo"><Gauge size={31} strokeWidth={2.4} /></div>
          <h2>Driver-OS</h2>
          <p>
            Your personal vehicle management hub. Track your cars, monitor maintenance,
            and stay on top of your driving life.
          </p>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-container">
          <h1>Welcome back</h1>
          <p className="auth-subtitle">Sign in to access your dashboard</p>

          {error && <div className="auth-error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                className="form-input"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={form.username}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
