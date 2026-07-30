import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, CheckCircle2, AlertCircle, Lock, Mail, Calendar, ExternalLink, Key, Copy } from 'lucide-react';
import { changePassword } from '../services/auth';
import { supabase } from '../services/supabase';
import { useClinic } from '../contexts/ClinicContext';
import { saveGoogleConfig } from '../services/storage';

export default function SettingsPage() {
  const { clinicName, googleConfig, reloadGoogleConfig } = useClinic();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  const [passForm, setPassForm]   = useState({ current: '', next: '', confirm: '' });
  const [gcForm, setGcForm]       = useState({ clientId: '', apiKey: '' });
  const [showApiKey, setShowKey]  = useState(false);
  const [gcMsg, setGcMsg]         = useState(null);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (googleConfig) setGcForm({ clientId: googleConfig.clientId || '', apiKey: googleConfig.apiKey || '' });
  }, [googleConfig]);

  const redirectUri = window.location.origin;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveGc = async (e) => {
    e.preventDefault();
    setGcMsg(null);
    try {
      await saveGoogleConfig(gcForm);
      reloadGoogleConfig();
      setGcMsg({ ok: true, text: 'Configuración guardada. Reconecta Google Calendar para aplicarla.' });
    } catch {
      setGcMsg({ ok: false, text: 'Error al guardar la configuración.' });
    }
  };
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

  return (
    <div className="max-w-lg space-y-6">
      {/* Info sesión */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#c9a227] flex items-center justify-center text-white font-bold text-lg">
            {userEmail[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <p className="font-bold text-[#111827]">{userEmail || '—'}</p>
            <p className="text-xs text-gray-400">Administrador · {clinicName}</p>
          </div>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-[#c9a227]" />
          <h3 className="font-bold text-[#111827]">Cambiar contraseña</h3>
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
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
            />
          </div>
          {passMsg && <Msg data={passMsg} />}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#c9a227] text-white text-sm font-semibold rounded-xl hover:bg-[#a8851e] transition-colors"
          >
            <Save size={15} /> Guardar contraseña
          </button>
        </form>
      </div>

      {/* Info cuenta */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-[#c9a227]" />
          <h3 className="font-bold text-[#111827]">Cuenta</h3>
        </div>
        <p className="text-sm text-gray-500 mb-1">Email de acceso</p>
        <p className="text-sm font-medium text-[#111827]">{userEmail || '—'}</p>
        <p className="text-xs text-gray-400 mt-3">
          Para cambiar el email contacta con el administrador del sistema.
        </p>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-[#111827] to-[#1c2432] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar size={20} className="text-[#c9a227]" />
            </div>
            <div>
              <h3 className="font-bold text-white">Google Calendar</h3>
              <p className="text-white/50 text-xs">Sincronización de citas</p>
            </div>
          </div>
          {gcForm.clientId && gcForm.apiKey ? (
            <span className="flex items-center gap-1.5 text-xs font-medium bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
              <CheckCircle2 size={12} /> Configurado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium bg-white/10 text-white/40 px-3 py-1 rounded-full">
              Sin configurar
            </span>
          )}
        </div>

        <div className="p-6">
          {/* Instrucciones */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <p className="font-semibold mb-1">¿Cómo obtener las credenciales?</p>
            <ol className="list-decimal list-inside space-y-1 text-amber-700 text-xs">
              <li>Ve a <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-medium">Google Cloud Console</a></li>
              <li>Crea un proyecto o selecciona uno existente</li>
              <li>Activa las APIs: <strong>Google Calendar API</strong> y <strong>Gmail API</strong></li>
              <li>Crea credenciales → <strong>ID de cliente OAuth 2.0</strong> (tipo: Aplicación web)</li>
              <li>Añade la URI de redirección que aparece abajo como origen autorizado</li>
              <li>Crea también una <strong>Clave de API</strong></li>
            </ol>
          </div>

          <form onSubmit={handleSaveGc} className="space-y-4">
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Client ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={gcForm.clientId}
                onChange={(e) => setGcForm((f) => ({ ...f, clientId: e.target.value }))}
                placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">ID de cliente obtenido de Google Cloud Console</p>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Key <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Key size={15} />
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={gcForm.apiKey}
                  onChange={(e) => setGcForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder="AIzaSy..."
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] font-mono"
                />
                <button type="button" onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Clave de API para acceso al calendario</p>
            </div>

            {/* Redirect URI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URI de redirección <span className="text-gray-400 font-normal">(añádela en Google Cloud)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-mono truncate">
                  {redirectUri}
                </div>
                <button type="button" onClick={handleCopyUri}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 flex-shrink-0">
                  {copied ? <CheckCircle2 size={15} className="text-green-500" /> : <Copy size={15} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {gcMsg && <Msg data={gcMsg} />}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#c9a227] text-white text-sm font-semibold rounded-xl hover:bg-[#a8851e] transition-colors shadow-sm">
                <Save size={15} /> Guardar configuración
              </button>
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                <ExternalLink size={14} /> Google Cloud Console
              </a>
            </div>
          </form>
        </div>
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
          className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
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
        ? 'bg-[#e6f9ed] text-[#c9a227]'
        : 'bg-red-50 text-red-600'
    }`}>
      {data.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {data.text}
    </div>
  );
}
