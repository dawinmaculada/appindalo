import { useState } from 'react';
import { Eye, EyeOff, Save, CheckCircle2, AlertCircle, Lock, User } from 'lucide-react';
import { changePassword, changeUsername, getSession } from '../services/auth';

export default function SettingsPage() {
  const session = getSession();

  // ── Cambiar contraseña ──────────────────────────────────────────────
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, next: false });
  const [passMsg, setPassMsg]   = useState(null);

  const handleChangePass = async (e) => {
    e.preventDefault();
    setPassMsg(null);
    if (passForm.next !== passForm.confirm) {
      setPassMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    const result = await changePassword(passForm.current, passForm.next);
    if (result.ok) {
      setPassForm({ current: '', next: '', confirm: '' });
      setPassMsg({ ok: true, text: 'Contraseña actualizada correctamente' });
    } else {
      setPassMsg({ ok: false, text: result.error });
    }
  };

  // ── Cambiar usuario ─────────────────────────────────────────────────
  const [userForm, setUserForm] = useState({ newUsername: '', password: '' });
  const [userMsg, setUserMsg]   = useState(null);

  const handleChangeUser = async (e) => {
    e.preventDefault();
    setUserMsg(null);
    const result = await changeUsername(userForm.newUsername, userForm.password);
    if (result.ok) {
      setUserForm({ newUsername: '', password: '' });
      setUserMsg({ ok: true, text: 'Nombre de usuario actualizado' });
    } else {
      setUserMsg({ ok: false, text: result.error });
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Info sesión */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#00af38] flex items-center justify-center text-white font-bold text-lg">
            {session?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="font-bold text-[#1a2332]">{session?.username || 'admin'}</p>
            <p className="text-xs text-gray-400">Administrador · Clínica Indalo</p>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-[#00af38]" />
          <h3 className="font-bold text-[#1a2332]">Cambiar contraseña</h3>
        </div>
        <form onSubmit={handleChangePass} className="space-y-4">
          <PassField
            label="Contraseña actual"
            value={passForm.current}
            onChange={(v) => setPassForm((f) => ({ ...f, current: v }))}
            show={showPass.current}
            onToggle={() => setShowPass((s) => ({ ...s, current: !s.current }))}
          />
          <PassField
            label="Nueva contraseña"
            value={passForm.next}
            onChange={(v) => setPassForm((f) => ({ ...f, next: v }))}
            show={showPass.next}
            onToggle={() => setShowPass((s) => ({ ...s, next: !s.next }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              required
              value={passForm.confirm}
              onChange={(e) => setPassForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
            />
          </div>
          {passMsg && <Msg data={passMsg} />}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00af38] text-white text-sm font-semibold rounded-xl hover:bg-[#008a2c] transition-colors"
          >
            <Save size={15} /> Guardar contraseña
          </button>
        </form>
      </div>

      {/* Cambiar usuario */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-[#00af38]" />
          <h3 className="font-bold text-[#1a2332]">Cambiar nombre de usuario</h3>
        </div>
        <form onSubmit={handleChangeUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuevo usuario
            </label>
            <input
              type="text"
              required
              value={userForm.newUsername}
              onChange={(e) => setUserForm((f) => ({ ...f, newUsername: e.target.value }))}
              placeholder="nuevo_usuario"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
            />
          </div>
          <PassField
            label="Contraseña actual (confirmación)"
            value={userForm.password}
            onChange={(v) => setUserForm((f) => ({ ...f, password: v }))}
          />
          {userMsg && <Msg data={userMsg} />}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00af38] text-white text-sm font-semibold rounded-xl hover:bg-[#008a2c] transition-colors"
          >
            <Save size={15} /> Guardar usuario
          </button>
        </form>
      </div>
    </div>
  );
}

function PassField({ label, value, onChange, show = false, onToggle }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function Msg({ data }) {
  return (
    <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 ${
      data.ok
        ? 'bg-[#e6f9ed] text-[#00af38]'
        : 'bg-red-50 text-red-600'
    }`}>
      {data.ok
        ? <CheckCircle2 size={15} />
        : <AlertCircle size={15} />}
      {data.text}
    </div>
  );
}
