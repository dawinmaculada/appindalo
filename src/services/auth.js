/**
 * Servicio de autenticación local.
 * Las credenciales se almacenan en localStorage como hash SHA-256.
 * La sesión activa se guarda en sessionStorage (se cierra al cerrar el navegador).
 *
 * Credenciales por defecto:
 *   Usuario:    admin
 *   Contraseña: indalo2024
 */

const KEYS = {
  CREDENTIALS: 'indalo_auth_credentials',
  SESSION:     'indalo_session',
};

// ── Hashing con Web Crypto API ────────────────────────────────────────
async function sha256(text) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Credenciales por defecto (se instalan en el primer arranque) ───────
const DEFAULT_USER     = 'admin';
const DEFAULT_PASSWORD = 'indalo2024';

async function installDefaultCredentials() {
  const existing = localStorage.getItem(KEYS.CREDENTIALS);
  if (existing) return;
  const hash = await sha256(DEFAULT_PASSWORD);
  localStorage.setItem(
    KEYS.CREDENTIALS,
    JSON.stringify({ username: DEFAULT_USER, passwordHash: hash })
  );
}

// ── Inicializar (llamar al arrancar la app) ────────────────────────────
export async function initAuth() {
  await installDefaultCredentials();
}

// ── Login ──────────────────────────────────────────────────────────────
export async function login(username, password) {
  const raw = localStorage.getItem(KEYS.CREDENTIALS);
  if (!raw) return { ok: false, error: 'Sin credenciales configuradas' };

  const { username: storedUser, passwordHash } = JSON.parse(raw);
  const inputHash = await sha256(password);

  if (
    username.trim().toLowerCase() !== storedUser.toLowerCase() ||
    inputHash !== passwordHash
  ) {
    return { ok: false, error: 'Usuario o contraseña incorrectos' };
  }

  // Crear sesión con token y expiración (8 horas)
  const session = {
    username: storedUser,
    token: crypto.randomUUID(),
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  };
  sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  return { ok: true, session };
}

// ── Logout ─────────────────────────────────────────────────────────────
export function logout() {
  sessionStorage.removeItem(KEYS.SESSION);
}

// ── Comprobar si hay sesión activa ─────────────────────────────────────
export function getSession() {
  try {
    const raw = sessionStorage.getItem(KEYS.SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(KEYS.SESSION);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return getSession() !== null;
}

// ── Cambiar contraseña ─────────────────────────────────────────────────
export async function changePassword(currentPassword, newPassword) {
  const raw = localStorage.getItem(KEYS.CREDENTIALS);
  if (!raw) return { ok: false, error: 'Sin credenciales' };

  const { username, passwordHash } = JSON.parse(raw);
  const currentHash = await sha256(currentPassword);

  if (currentHash !== passwordHash) {
    return { ok: false, error: 'La contraseña actual es incorrecta' };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' };
  }

  const newHash = await sha256(newPassword);
  localStorage.setItem(
    KEYS.CREDENTIALS,
    JSON.stringify({ username, passwordHash: newHash })
  );
  return { ok: true };
}

// ── Cambiar nombre de usuario ──────────────────────────────────────────
export async function changeUsername(newUsername, password) {
  const raw = localStorage.getItem(KEYS.CREDENTIALS);
  if (!raw) return { ok: false, error: 'Sin credenciales' };

  const { passwordHash } = JSON.parse(raw);
  const inputHash = await sha256(password);

  if (inputHash !== passwordHash) {
    return { ok: false, error: 'Contraseña incorrecta' };
  }

  localStorage.setItem(
    KEYS.CREDENTIALS,
    JSON.stringify({ username: newUsername.trim(), passwordHash })
  );
  return { ok: true };
}
