const API_BASE = 'http://localhost:8000/api';

/* ─── token helpers ─── */
export function getTokens() {
  const raw = localStorage.getItem('driver_os_tokens');
  return raw ? JSON.parse(raw) : null;
}

export function saveTokens(tokens) {
  localStorage.setItem('driver_os_tokens', JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem('driver_os_tokens');
}

/* ─── core fetch wrapper ─── */
async function apiFetch(path, opts = {}) {
  const tokens = getTokens();
  const headers = { 'Content-Type': 'application/json', ...opts.headers };

  if (tokens?.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // If 401 and we have a refresh token, try to refresh
  if (res.status === 401 && tokens?.refresh) {
    const refreshRes = await fetch(`${API_BASE}/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (refreshRes.ok) {
      const data = await refreshRes.json();
      saveTokens({ access: data.access, refresh: tokens.refresh });
      headers['Authorization'] = `Bearer ${data.access}`;
      res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    } else {
      clearTokens();
      window.location.href = '/login';
      return null;
    }
  }

  return res;
}

/* ─── auth ─── */
export async function signup({ username, email, password }) {
  const res = await fetch(`${API_BASE}/signup/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function login({ username, password }) {
  const res = await fetch(`${API_BASE}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  saveTokens(data);
  return data;
}

export function logout() {
  clearTokens();
}

export async function getUser() {
  const res = await apiFetch('/user/');
  if (!res || !res.ok) return null;
  return res.json();
}

/* ─── cars ─── */
export async function getCars() {
  const res = await apiFetch('/cars/');
  if (!res || !res.ok) return [];
  return res.json();
}

export async function createCar(carData) {
  const res = await apiFetch('/cars/', {
    method: 'POST',
    body: JSON.stringify(carData),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function updateCar(id, carData) {
  const res = await apiFetch(`/cars/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(carData),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function deleteCar(id) {
  const res = await apiFetch(`/cars/${id}/`, { method: 'DELETE' });
  if (!res || !res.ok) throw new Error('Failed to delete car');
}

/* ─── sessions ─── */
export async function startSession(carId) {
  const res = await apiFetch('/sessions/start/', {
    method: 'POST',
    body: JSON.stringify({ car_id: carId }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function endSession(sessionId) {
  const res = await apiFetch('/sessions/end/', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export async function logSafetyEvent({ sessionId, earValue, eventType = 'drowsiness' }) {
  const res = await apiFetch('/sessions/events/', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      ear_value: earValue,
      event_type: eventType,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/* --- driver services --- */
export async function getDriverServiceSummary(carId = '') {
  const query = carId ? `?car_id=${carId}` : '';
  const res = await apiFetch(`/driver-services/summary/${query}`);
  if (!res || !res.ok) return null;
  return res.json();
}

export async function getTripLogs(carId = '') {
  const query = carId ? `?car_id=${carId}` : '';
  const res = await apiFetch(`/driver-services/trips/${query}`);
  if (!res || !res.ok) return [];
  return res.json();
}

export async function createTripLog(data) {
  const res = await apiFetch('/driver-services/trips/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function getFuelFillLogs(carId = '') {
  const query = carId ? `?car_id=${carId}` : '';
  const res = await apiFetch(`/driver-services/fuel-fills/${query}`);
  if (!res || !res.ok) return [];
  return res.json();
}

export async function createFuelFillLog(data) {
  const res = await apiFetch('/driver-services/fuel-fills/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}

export async function getMaintenanceRecords(carId = '') {
  const query = carId ? `?car_id=${carId}` : '';
  const res = await apiFetch(`/driver-services/maintenance/${query}`);
  if (!res || !res.ok) return [];
  return res.json();
}

export async function createMaintenanceRecord(data) {
  const res = await apiFetch('/driver-services/maintenance/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw body;
  return body;
}
