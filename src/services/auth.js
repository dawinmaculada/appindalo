import { supabase, clearClinicIdCache } from './supabase';

export async function register(email, password, clinicName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { clinic_name: clinicName } },
  });
  if (error) {
    if (error.message.includes('already registered')) return { ok: false, error: 'Este email ya está registrado' };
    return { ok: false, error: error.message };
  }
  return { ok: true, session: data.session };
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: 'Email o contraseña incorrectos' };
  return { ok: true, session: data.session };
}

export async function logout() {
  clearClinicIdCache();
  await supabase.auth.signOut();
}

export async function changePassword(currentPassword, newPassword) {
  if (newPassword.length < 6) return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No hay sesión activa' };
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return { ok: false, error: 'La contraseña actual es incorrecta' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
