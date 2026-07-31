import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Loader, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { register } from '../services/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ clinicName: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [success, setSuccess]  = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const result = await register(form.email, form.password, form.clinicName);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    if (result.session) {
      navigate('/');
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
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
          <p className="text-white/50 text-lg">Sistema de gestión de clínica</p>

          <div className="mt-12 space-y-4 text-left max-w-xs mx-auto">
            {[
              'Gestión de pacientes y citas',
              'Calendario con vista semanal',
              'Sincronización con Google Calendar',
              'Facturación integrada',
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

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#fafaf9]">
        <div className="w-full max-w-sm">

          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#c9a227] flex items-center justify-center">
              <Leaf size={20} className="text-white" />
            </div>
            <p className="text-[#c9a227] font-extrabold">NUVIA</p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-extrabold text-[#111827] mb-2">¡Clínica registrada!</h2>
              <p className="text-gray-400 text-sm mb-6">
                Revisa tu email <strong>{form.email}</strong> y confirma tu cuenta para poder acceder.
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-3 bg-[#c9a227] text-white font-semibold rounded-xl hover:bg-[#a8851e] transition-colors text-center"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Crear cuenta</h2>
              <p className="text-gray-400 text-sm mb-8">Registra tu clínica en NUVIA</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre clínica */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre de la clínica <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Building2 size={16} />
                    </div>
                    <input
                      type="text"
                      value={form.clinicName}
                      onChange={set('clinicName')}
                      required
                      autoFocus
                      placeholder="Ej: Clínica Bienestar"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    autoComplete="off"
                    required
                    placeholder="Introduce tu email"
                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] transition-colors"
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="new-password"
                      required
                      placeholder="Introduce tu contraseña"
                      className="w-full px-4 py-3 pr-11 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirmar contraseña <span className="text-red-400">*</span>
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={set('confirm')}
                    autoComplete="new-password"
                    required
                    placeholder="Repite tu contraseña"
                    className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] transition-colors"
                  />
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
                  {loading ? <><Loader size={16} className="animate-spin" /> Creando cuenta...</> : 'Crear cuenta'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-[#c9a227] font-semibold hover:underline">
                  Iniciar sesión
                </Link>
              </p>
            </>
          )}

          <p className="text-center text-xs text-gray-300 mt-8">NUVIA · Gestión de clínica v2.0</p>
        </div>
      </div>
    </div>
  );
}
