import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 10_000;

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
      ? new ApiError(ErrorType.TIMEOUT, 'La requête a expiré (10s)', null)
      : new ApiError(ErrorType.NETWORK, 'Impossible de contacter le serveur', null);
    notifyError(apiErr);
    throw apiErr;
  } finally {
    clearTimeout(timeoutId);
  }

  // ── 401 : tentative de refresh automatique (une seule fois) ─────────────────
  if (res.status === 401 && _retry) {
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
    notifyError(apiErr);
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
   * TODO (dev junior) : implémenter le login
   * - POST /api/auth/login avec { email, password }
   * - Stocker le token : await tokenStorage.set(data.accessToken)
   * - Retourner data.user
   */
  login: async (_email, _password) => {
    // TODO: implémenter
    throw new ApiError(ErrorType.UNKNOWN, 'Login non implémenté', null);
  },

  register: async (email, password, firstName, lastName) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    });
    await tokenStorage.set(data.accessToken);
    return data.user;
  },

  logout: async () => {
    await tokenStorage.clear();
  },

  /**
   * TODO (dev junior) : implémenter le refresh token
   * - POST /api/auth/refresh (cookie envoyé automatiquement)
   * - Stocker le nouveau token : await tokenStorage.set(data.accessToken)
   */
  refresh: async () => {
    // TODO: implémenter
    throw new ApiError(ErrorType.UNAUTHORIZED, 'Refresh non implémenté', 401);
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

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  list: () => apiFetch('/api/users'),
  get: (id) => apiFetch(`/api/users/${id}`),
  update: (id, body) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
};
