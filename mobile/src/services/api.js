import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 30_000;

// ─── Erreurs typées ───────────────────────────────────────────────────────────

export const ErrorType = {
  NETWORK:      'NETWORK',      // pas de réseau / serveur injoignable
  TIMEOUT:      'TIMEOUT',      // requête trop longue
  UNAUTHORIZED: 'UNAUTHORIZED', // 401 — session expirée
  FORBIDDEN:    'FORBIDDEN',    // 403 — droits insuffisants
  NOT_FOUND:    'NOT_FOUND',    // 404
  SERVER:       'SERVER',       // 5xx
  UNKNOWN:      'UNKNOWN',
};

export class ApiError extends Error {
  constructor(type, message, status) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status ?? null;
  }
}

// ─── Token management ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'techfarm_access_token';

export const tokenStorage = {
  get:   ()      => AsyncStorage.getItem(TOKEN_KEY),
  set:   (token) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: ()      => AsyncStorage.removeItem(TOKEN_KEY),
};

// ─── Gestionnaire d'erreur global (optionnel, branché par le ToastContext) ────

let _onError = null;
export function setGlobalErrorHandler(fn) { _onError = fn; }
function notifyError(err) { if (_onError) _onError(err); }

// ─── Base fetch ───────────────────────────────────────────────────────────────

let _isRefreshing = false;
let _refreshPromise = null;

async function apiFetch(path, options = {}, _retry = true) {
  const token = await tokenStorage.get();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const apiErr = err.name === 'AbortError'
      ? new ApiError(ErrorType.TIMEOUT, 'La requête a expiré (30s)', null)
      : new ApiError(ErrorType.NETWORK, 'Impossible de contacter le serveur', null);
    notifyError(apiErr);
    throw apiErr;
  } finally {
    clearTimeout(timeoutId);
  }

  // ── 401 : tentative de refresh automatique (une seule fois, hors routes auth) ─
  if (res.status === 401 && _retry && !path.startsWith('/api/auth/')) {
    try {
      if (!_isRefreshing) {
        _isRefreshing = true;
        _refreshPromise = auth.refresh().finally(() => { _isRefreshing = false; });
      }
      await _refreshPromise;
      return apiFetch(path, options, false); // retente sans retry
    } catch {
      await tokenStorage.clear();
      const apiErr = new ApiError(ErrorType.UNAUTHORIZED, 'Session expirée, reconnectez-vous', 401);
      notifyError(apiErr);
      throw apiErr;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = body?.error ?? `Erreur ${res.status}`;

    let type;
    if (res.status === 401) type = ErrorType.UNAUTHORIZED;
    else if (res.status === 403) type = ErrorType.FORBIDDEN;
    else if (res.status === 404) type = ErrorType.NOT_FOUND;
    else if (res.status >= 500)  type = ErrorType.SERVER;
    else                          type = ErrorType.UNKNOWN;

    const apiErr = new ApiError(type, message, res.status);
    // Les routes /api/auth/* (login, register…) sont gérées directement par l'écran appelant
    if (!path.startsWith('/api/auth/')) {
      notifyError(apiErr);
    }
    throw apiErr;
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  /**
   * TODO (dev junior) : implémenter le login
   * - POST /api/auth/login avec { email, password }
   * - Stocker le token : await tokenStorage.set(data.accessToken)
   * - Retourner data.user
   */
  /**
   * @param {string} email
   * @param {string} password
   */
  login: async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await tokenStorage.set(data.accessToken);
    return data.user;
  },

  /**
   * @param {{ email, password, first_name, last_name, company_nom, farm_nom, departement, pays }} fields
   */
  register: async (fields) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    await tokenStorage.set(data.accessToken);
    return data.user;
  },

  logout: async () => {
    await tokenStorage.clear();
  },

  /**
   * Rafraîchit l'access token via le cookie refresh_token
   */
  refresh: async () => {
    const data = await apiFetch('/api/auth/refresh', { method: 'POST' }, false);
    await tokenStorage.set(data.accessToken);
    return data.accessToken;
  },
};

// ─── Companies ────────────────────────────────────────────────────────────────

export const companies = {
  list: () => apiFetch('/api/companies'),
  get: (id) => apiFetch(`/api/companies/${id}`),
  create: (body) => apiFetch('/api/companies', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiFetch(`/api/companies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/api/companies/${id}`, { method: 'DELETE' }),
};

// ─── Farms ────────────────────────────────────────────────────────────────────

export const farms = {
  list: (companyId) =>
    apiFetch(`/api/farms${companyId ? `?company_id=${companyId}` : ''}`),
  get: (id) => apiFetch(`/api/farms/${id}`),
  create: (body) => apiFetch('/api/farms', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiFetch(`/api/farms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/api/farms/${id}`, { method: 'DELETE' }),
};

// ─── Parcelles ────────────────────────────────────────────────────────────────

export const parcelles = {
  list: (farmId) =>
    apiFetch(`/api/parcelles${farmId ? `?farm_id=${farmId}` : ''}`),
  get: (id) => apiFetch(`/api/parcelles/${id}`),
  create: (body) => apiFetch('/api/parcelles', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiFetch(`/api/parcelles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/api/parcelles/${id}`, { method: 'DELETE' }),
  photos: (id) => apiFetch(`/api/parcelles/${id}/photos`),
};

// ─── Kits ─────────────────────────────────────────────────────────────────────

export const kits = {
  list: (parcelleId) =>
    apiFetch(`/api/kits${parcelleId ? `?parcelle_id=${parcelleId}` : ''}`),
  get: (id) => apiFetch(`/api/kits/${id}`),
};

// ─── Mesures ──────────────────────────────────────────────────────────────────

export const mesures = {
  /**
   * @param {number} kitId
   * @param {{ mode?: 'raw'|'graph', from?: string, to?: string, interval?: string, capteurId?: number }} opts
   */
  list: (kitId, opts = {}) => {
    const params = new URLSearchParams();
    if (opts.mode) params.set('mode', opts.mode);
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    if (opts.interval) params.set('interval', opts.interval);
    if (opts.capteurId) params.set('capteur_id', String(opts.capteurId));
    return apiFetch(`/api/kits/${kitId}/mesures?${params.toString()}`);
  },
};

// ─── Météo ────────────────────────────────────────────────────────────────────

export const meteo = {
  /**
   * @param {number} lat
   * @param {number} lng
   * @param {'daily'|'hourly'} mode
   */
  get: (lat, lng, mode = 'daily') =>
    apiFetch(`/api/meteo?lat=${lat}&lng=${lng}&mode=${mode}`),
};

// ─── Alertes (MongoDB) ────────────────────────────────────────────────────────

export const alertes = {
  /**
   * @param {{ limit?: number, severite?: string, lu?: boolean, parcelleId?: number }} opts
   */
  list: (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.limit)      params.set('limit', String(opts.limit));
    if (opts.severite)   params.set('severite', opts.severite);
    if (opts.lu !== undefined) params.set('lu', String(opts.lu));
    if (opts.parcelleId) params.set('parcelle_id', String(opts.parcelleId));
    return apiFetch(`/api/alertes?${params.toString()}`);
  },
};

// ─── Roles ───────────────────────────────────────────────────

export const roles = {
  list:   ()          => apiFetch('/api/roles'),
  create: (body)      => apiFetch('/api/roles', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body)  => apiFetch(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id)        => apiFetch(`/api/roles/${id}`, { method: 'DELETE' }),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  list: () => apiFetch('/api/users'),
  get: (id) => apiFetch(`/api/users/${id}`),
  update: (id, body) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  me: () => apiFetch('/api/users/me'),
  updateMe: (body) => apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body) => apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  invite: (body) => apiFetch('/api/auth/register/employee', { method: 'POST', body: JSON.stringify(body) }),
};
