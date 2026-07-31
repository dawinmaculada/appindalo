import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Mail, Users, CheckCircle2, AlertTriangle, Send, Eye,
  Edit3, X, Loader, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getPatients, getAppointments } from '../services/storage';
import { supabase } from '../services/supabase';
import { useClinic } from '../contexts/ClinicContext';
import { differenceInDays, isFuture, isPast, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Plantillas ──────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'seguimiento',
    label: 'Seguimiento',
    icon: '🔔',
    description: 'Para pacientes sin cita desde hace más de 3 meses',
    subject: '¿Cómo te encuentras, {{nombre}}?',
    body: `<p>Hola <strong>{{nombre}}</strong>,</p>
<p>Han pasado unos meses desde tu última visita en <strong>{{nombre_clinica}}</strong> y queríamos saber cómo te encuentras.</p>
<p>Si necesitas retomar el tratamiento o tienes alguna molestia, estaremos encantados de atenderte. Puedes contactarnos o reservar tu cita directamente respondiendo a este email.</p>
<p>¡Te esperamos!</p>
<br>
<p>Un saludo,<br><strong>Equipo {{nombre_clinica}}</strong></p>`,
  },
  {
    id: 'bienvenida',
    label: 'Bienvenida',
    icon: '👋',
    description: 'Para pacientes nuevos',
    subject: 'Bienvenido/a a {{nombre_clinica}}, {{nombre}}',
    body: `<p>Hola <strong>{{nombre}}</strong>,</p>
<p>Nos alegra que hayas confiado en nosotros. En <strong>{{nombre_clinica}}</strong> estamos aquí para acompañarte en tu bienestar.</p>
<p>Si tienes cualquier duda sobre tu tratamiento o quieres reservar tu próxima cita, no dudes en contactarnos.</p>
<p>¡Bienvenido/a a la familia Indalo!</p>
<br>
<p>Un saludo,<br><strong>Equipo {{nombre_clinica}}</strong></p>`,
  },
  {
    id: 'recordatorio',
    label: 'Recordatorio de cita',
    icon: '📅',
    description: 'Recuerda a tus pacientes su próxima cita',
    subject: 'Recordatorio: tu cita en {{nombre_clinica}}',
    body: `<p>Hola <strong>{{nombre}}</strong>,</p>
<p>Te recordamos que tienes una cita próximamente en <strong>{{nombre_clinica}}</strong>.</p>
<p>Si necesitas cambiarla o cancelarla, contáctanos con la mayor antelación posible.</p>
<p>¡Hasta pronto!</p>
<br>
<p>Un saludo,<br><strong>Equipo {{nombre_clinica}}</strong></p>`,
  },
  {
    id: 'promocion',
    label: 'Promoción',
    icon: '🎁',
    description: 'Oferta o novedad para tus pacientes',
    subject: 'Novedad en {{nombre_clinica}} para ti, {{nombre}}',
    body: `<p>Hola <strong>{{nombre}}</strong>,</p>
<p>Tenemos novedades en <strong>{{nombre_clinica}}</strong> que creemos que te pueden interesar.</p>
<p><em>Edita aquí el contenido de tu oferta o novedad.</em></p>
<p>Para más información o para reservar cita, responde a este email o llámanos.</p>
<br>
<p>Un saludo,<br><strong>Equipo {{nombre_clinica}}</strong></p>`,
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    icon: '✏️',
    description: 'Escribe tu propio mensaje desde cero',
    subject: '',
    body: '',
  },
];

const FOLLOWUP_SINCE = new Date('2025-01-01');
const FOLLOWUP_DAYS  = 90;

function needsFollowup(patient, appointments) {
  const apts = appointments.filter((a) => a.patientId === patient.id && a.date);
  const past = apts.filter((a) => isPast(parseISO(a.date)));
  const future = apts.filter((a) => isFuture(parseISO(a.date)));
  if (future.length > 0) return false;
  const lastApt = past.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  if (!lastApt) return false;
  const hasFromJan = past.some((a) => parseISO(a.date) >= FOLLOWUP_SINCE);
  return hasFromJan && differenceInDays(new Date(), parseISO(lastApt.date)) > FOLLOWUP_DAYS;
}

function applyVars(text, patient, appointments, clinicName = '') {
  const apts = appointments
    .filter((a) => a.patientId === patient.id && a.date && isFuture(parseISO(a.date)))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const next = apts[0];
  return text
    .replace(/\{\{nombre\}\}/g, patient.name?.split(' ')[0] || patient.name || '')
    .replace(/\{\{nombre_completo\}\}/g, patient.name || '')
    .replace(/\{\{proxima_cita\}\}/g, next
      ? format(parseISO(next.date), "d 'de' MMMM", { locale: es }) + (next.time ? ` a las ${next.time}` : '')
      : 'próximamente')
    .replace(/\{\{nombre_clinica\}\}/g, clinicName || 'Tu clínica');
}

// ───────────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const { clinicName } = useClinic();
  const [allPatients, setAllPatients]         = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);

  useEffect(() => {
    getPatients().then(setAllPatients);
    getAppointments().then(setAllAppointments);
  }, []);

  // Solo pacientes con email
  const withEmail = useMemo(
    () => allPatients.filter((p) => p.email?.includes('@')),
    [allPatients]
  );

  const followupPatients = useMemo(
    () => withEmail.filter((p) => needsFollowup(p, allAppointments)),
    [withEmail, allAppointments]
  );

  // ── Estado ───────────────────────────────────────────────────────────
  const [templateId,   setTemplateId]   = useState('seguimiento');
  const [subject,      setSubject]      = useState(TEMPLATES[0].subject);
  const [body,         setBody]         = useState(TEMPLATES[0].body);
  const [recipientMode,setRecipientMode]= useState('followup'); // 'all' | 'followup' | 'manual'
  const [selected,     setSelected]     = useState({});  // id → bool (modo manual)
  const [showPreview,  setShowPreview]  = useState(false);
  const [previewPat,   setPreviewPat]   = useState(null);
  const [sending,      setSending]      = useState(false);
  const [progress,     setProgress]     = useState(null); // {current, total, name}
  const [result,       setResult]       = useState(null); // {sent, failed}
  const [showRecipients, setShowRecipients] = useState(false);

  const tpl = TEMPLATES.find((t) => t.id === templateId);

  const handleTemplateChange = (id) => {
    const t = TEMPLATES.find((x) => x.id === id);
    setTemplateId(id);
    if (t.subject) setSubject(t.subject);
    if (t.body)    setBody(t.body);
  };

  // Destinatarios activos según el modo
  const recipients = useMemo(() => {
    if (recipientMode === 'all')      return withEmail;
    if (recipientMode === 'followup') return followupPatients;
    return withEmail.filter((p) => selected[p.id]);
  }, [recipientMode, withEmail, followupPatients, selected]);

  const previewPatient = previewPat || recipients[0] || withEmail[0];

  const toggleSelect = (id) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSend = useCallback(async () => {
    if (recipients.length === 0) return;
    setSending(true);
    setResult(null);
    setProgress({ current: 0, total: recipients.length, name: '' });

    const emails = recipients.map((p) => ({
      to:      p.email,
      subject: applyVars(subject, p, allAppointments, clinicName),
      html:    applyVars(body,    p, allAppointments, clinicName),
    }));

    try {
      const { data, error } = await supabase.functions.invoke('send-marketing', { body: { emails } });
      if (error) throw error;
      setResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
    } catch {
      setResult({ sent: 0, failed: recipients.length });
    }

    setSending(false);
    setProgress(null);
  }, [recipients, subject, body, allAppointments, clinicName]);

  return (
    <div className="space-y-5 max-w-5xl">


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Columna izquierda: configuración ─────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Plantillas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#111827] mb-3 flex items-center gap-2">
              <Edit3 size={15} className="text-[#c9a227]" /> Plantilla
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                    templateId === t.id
                      ? 'border-[#c9a227] bg-[#e6f9ed]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl mb-1">{t.icon}</span>
                  <span className={`text-xs font-bold ${templateId === t.id ? 'text-[#c9a227]' : 'text-[#111827]'}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.description}</span>
                </button>
              ))}
            </div>

            {/* Asunto */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto del email..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227]"
              />
            </div>

            {/* Cuerpo */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Cuerpo del email
                <span className="ml-2 font-normal text-gray-400">
                  Variables: <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{proxima_cita}}'}</code>
                </span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30 focus:border-[#c9a227] resize-y font-mono"
              />
            </div>
          </div>

          {/* Resultado envío */}
          {result && (
            <div className={`rounded-2xl border p-4 ${result.failed.length === 0 ? 'bg-[#e6f9ed] border-[#c9a227]/30' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-[#c9a227]" />
                <p className="font-bold text-[#111827] text-sm">Envío completado</p>
              </div>
              <p className="text-sm text-gray-600">
                ✅ {result.sent.length} enviado{result.sent.length !== 1 ? 's' : ''} correctamente.
                {result.failed.length > 0 && (
                  <span className="text-amber-700 ml-2">
                    ⚠️ {result.failed.length} fallido{result.failed.length !== 1 ? 's' : ''}:{' '}
                    {result.failed.map((f) => f.patient.name).join(', ')}
                  </span>
                )}
              </p>
              <button
                onClick={() => setResult(null)}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* ── Columna derecha: destinatarios + acciones ────────────── */}
        <div className="space-y-4">

          {/* Destinatarios */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-[#111827] mb-3 flex items-center gap-2">
              <Users size={15} className="text-[#c9a227]" /> Destinatarios
            </h3>

            <div className="space-y-2 mb-4">
              {[
                { value: 'followup', label: 'Seguimiento', sublabel: `${followupPatients.length} pacientes`, icon: <AlertTriangle size={13} className="text-amber-500" /> },
                { value: 'all',      label: 'Todos con email', sublabel: `${withEmail.length} pacientes`, icon: <Users size={13} className="text-[#0088cc]" /> },
                { value: 'manual',   label: 'Selección manual', sublabel: `${Object.values(selected).filter(Boolean).length} seleccionados`, icon: <CheckCircle2 size={13} className="text-[#9b59b6]" /> },
              ].map(({ value, label, sublabel, icon }) => (
                <button
                  key={value}
                  onClick={() => setRecipientMode(value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    recipientMode === value
                      ? 'border-[#c9a227] bg-[#e6f9ed]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${recipientMode === value ? 'text-[#c9a227]' : 'text-[#111827]'}`}>{label}</p>
                    <p className="text-[10px] text-gray-400">{sublabel}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Lista manual */}
            {recipientMode === 'manual' && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {withEmail.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Ningún paciente tiene email</p>
                  ) : withEmail.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!selected[p.id]}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-[#c9a227]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#111827] truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen destinatarios */}
            <button
              onClick={() => setShowRecipients((v) => !v)}
              className="mt-3 w-full flex items-center justify-between text-xs text-gray-500 hover:text-[#c9a227] transition-colors"
            >
              <span>{recipients.length} destinatario{recipients.length !== 1 ? 's' : ''} activo{recipients.length !== 1 ? 's' : ''}</span>
              {showRecipients ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showRecipients && recipients.length > 0 && (
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                {recipients.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 rounded-full bg-[#c9a227]/20 flex items-center justify-center text-[10px] font-bold text-[#c9a227] flex-shrink-0">
                      {p.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-[#111827] truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vista previa */}
          <button
            onClick={() => setShowPreview(true)}
            disabled={!subject || !body}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[#c9a227] bg-[#e6f9ed] rounded-xl hover:bg-[#c9a227] hover:text-white transition-colors border-2 border-[#c9a227]/30 disabled:opacity-40"
          >
            <Eye size={15} /> Vista previa
          </button>

          {/* Botón enviar */}
          <button
            onClick={handleSend}
            disabled={sending || recipients.length === 0 || !subject || !body}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-[#c9a227] rounded-xl hover:bg-[#a8851e] transition-colors shadow-lg shadow-[#c9a227]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader size={15} className="animate-spin" />
                {progress
                  ? `Enviando ${progress.current}/${progress.total}…`
                  : 'Preparando…'}
              </>
            ) : (
              <>
                <Send size={15} />
                Enviar a {recipients.length} paciente{recipients.length !== 1 ? 's' : ''}
              </>
            )}
          </button>

        </div>
      </div>

      {/* ── Modal vista previa ──────────────────────────────────────── */}
      {showPreview && previewPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-[#111827]">Vista previa del email</h2>
                <p className="text-xs text-gray-400 mt-0.5">Como lo verá el destinatario</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* Selector de paciente para previsualizar */}
            {recipients.length > 1 && (
              <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
                <label className="text-xs font-medium text-gray-500 mr-2">Previsualizar como:</label>
                <select
                  value={previewPat?.id || recipients[0]?.id}
                  onChange={(e) => setPreviewPat(recipients.find((p) => p.id === e.target.value))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30"
                >
                  {recipients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Email simulado */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Cabecera email */}
                <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-16 text-xs">De:</span>
                    <span className="font-medium text-[#111827]">{clinicName || 'Tu clínica'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-16 text-xs">Para:</span>
                    <span className="font-medium text-[#111827]">{previewPatient?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400 w-16 text-xs">Asunto:</span>
                    <span className="font-medium text-[#111827]">
                      {applyVars(subject, previewPatient, allAppointments, clinicName)}
                    </span>
                  </div>
                </div>

                {/* Cuerpo email */}
                <div
                  className="px-6 py-5 text-sm text-gray-700 leading-relaxed prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: applyVars(body, previewPatient, allAppointments, clinicName),
                  }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cerrar
              </button>
              <button
                onClick={() => { setShowPreview(false); handleSend(); }}
                disabled={sending || recipients.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#c9a227] rounded-xl hover:bg-[#a8851e] transition-colors disabled:opacity-40"
              >
                <Send size={14} /> Enviar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
