import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { login } from '../services/auth';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) setError(result.error);
    // Si ok, supabase.auth.onAuthStateChange en App.jsx redirige automáticamente
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel izquierdo (decorativo) ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#111827] to-[#243347] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#c9a227]/10" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#c9a227]/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#c9a227]/5" />

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-3xl bg-[#c9a227] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#c9a227]/30">
            <Leaf size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">
            <span className="text-[#c9a227]">NUVIA</span>
          </h1>
          <p className="text-white/50 text-lg">
            Sistema de gestión de clínica
          </p>

          <div className="mt-12 space-y-4 text-left max-w-xs mx-auto">
            {[
              'Gestión de pacientes y citas',
              'Calendario con vista semanal',
              'Sincronización con Google Calendar',
              'Control de profesionales',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#c9a227]/20 border border-[#c9a227]/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#c9a227]" />
                </div>
                <span className="text-white/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fafaf9]">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#c9a227] flex items-center justify-center">
              <Leaf size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[#c9a227] font-extrabold leading-tight">NUVIA</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-[#111827] mb-1">
            Bienvenido de nuevo
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            Introduce tus credenciales para acceder
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="clinica@ejemplo.com"
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#c9a227] text-white font-semibold rounded-xl hover:bg-[#a8851e] active:scale-[0.98] transition-all shadow-lg shadow-[#c9a227]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                'Acceder'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[#c9a227] font-semibold hover:underline">
              Crear cuenta
            </Link>
          </p>

          <p className="text-center text-xs text-gray-300 mt-4">
            NUVIA · Gestión de clínica v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
