const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUVIA Citas <onboarding@resend.dev>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function dtString(date: string, time: string) {
  const [y, m, d] = date.split('-')
  const [h, min] = time.split(':')
  const pad = (n: string) => n.padStart(2, '0')
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`
}

function addMinutes(date: string, time: string, minutes: number) {
  const base = new Date(`${date}T${time}:00`)
  base.setMinutes(base.getMinutes() + minutes)
  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const d = String(base.getDate()).padStart(2, '0')
  const h = String(base.getHours()).padStart(2, '0')
  const min = String(base.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}T${h}${min}00`
}

// ── Generador de ICS ──────────────────────────────────────────────────────────

function generateICS(p: {
  summary: string
  description: string
  date: string
  time: string
  duration: number
}) {
  const start = dtString(p.date, p.time)
  const end = addMinutes(p.date, p.time, p.duration)
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const uid = `${start}-${Date.now()}@nuvia.app`
  const desc = p.description.replace(/\n/g, '\\n').replace(/,/g, '\\,')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NUVIA Gestión de Clínica//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Europe/Madrid:${start}`,
    `DTEND;TZID=Europe/Madrid:${end}`,
    `DTSTAMP:${now}`,
    `UID:${uid}`,
    `SUMMARY:${p.summary}`,
    `DESCRIPTION:${desc}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Recordatorio: ${p.summary}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// ── Generador de URL Google Calendar ─────────────────────────────────────────

function googleCalendarUrl(p: {
  summary: string
  description: string
  date: string
  time: string
  duration: number
}) {
  const start = dtString(p.date, p.time)
  const end = addMinutes(p.date, p.time, p.duration)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: p.summary,
    dates: `${start}/${end}`,
    details: p.description,
    ctz: 'Europe/Madrid',
  })
  return `https://calendar.google.com/calendar/render?${q}`
}

// ── Plantillas HTML ───────────────────────────────────────────────────────────

function patientHtml(p: {
  patientName: string
  treatmentName?: string
  workerName?: string
  date: string
  time: string
  notes?: string
  isEdit: boolean
  clinicName?: string
}) {
  const dateStr = new Date(p.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = p.time.slice(0, 5)
  const clinic  = p.clinicName || 'Tu clínica'
  const title   = p.isEdit ? 'Tu cita ha sido modificada' : 'Cita confirmada'
  const intro   = p.isEdit ? 'Los datos de tu cita han sido actualizados:' : 'Tu cita ha sido confirmada con los siguientes datos:'

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:#111827;border-radius:10px 10px 0 0;padding:20px 24px">
        <p style="color:#c9a227;font-size:12px;margin:0 0 4px;font-weight:600;letter-spacing:1px">${clinic}</p>
        <h1 style="color:#fff;margin:0;font-size:20px">${title}</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:24px">
        <p style="margin:0 0 16px">Hola <strong>${p.patientName}</strong>,</p>
        <p style="margin:0 0 16px">${intro}</p>
        <div style="background:#f4f6f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:6px 0">📅 <strong>${dateStr}</strong></p>
          <p style="margin:6px 0">🕐 <strong>${timeStr}</strong></p>
          ${p.treatmentName ? `<p style="margin:6px 0">💆 <strong>${p.treatmentName}</strong></p>` : ''}
          ${p.workerName    ? `<p style="margin:6px 0">👨‍⚕️ <strong>${p.workerName}</strong></p>`    : ''}
          ${p.notes         ? `<p style="margin:6px 0">📝 ${p.notes}</p>`                           : ''}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          Si necesitas cancelar o modificar tu cita, por favor contáctanos con antelación.
        </p>
      </div>
    </div>
  `
}

function workerHtml(p: {
  workerName: string
  patientName: string
  treatmentName?: string
  date: string
  time: string
  duration: number
  notes?: string
  isEdit: boolean
  clinicName?: string
}) {
  const dateStr = new Date(p.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = p.time.slice(0, 5)
  const clinic  = p.clinicName || 'Tu clínica'
  const title   = p.isEdit ? 'Cita modificada en tu agenda' : 'Nueva cita asignada'

  const gcDesc = [
    `Paciente: ${p.patientName}`,
    p.treatmentName ? `Tratamiento: ${p.treatmentName}` : '',
    p.notes ? `Notas: ${p.notes}` : '',
  ].filter(Boolean).join('\n')

  const gcUrl = googleCalendarUrl({
    summary: `Cita con ${p.patientName}${p.treatmentName ? ` · ${p.treatmentName}` : ''}`,
    description: gcDesc,
    date: p.date,
    time: p.time,
    duration: p.duration,
  })

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:#111827;border-radius:10px 10px 0 0;padding:20px 24px">
        <p style="color:#c9a227;font-size:12px;margin:0 0 4px;font-weight:600;letter-spacing:1px">${clinic}</p>
        <h1 style="color:#fff;margin:0;font-size:20px">${title}</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:24px">
        <p style="margin:0 0 16px">Hola <strong>${p.workerName}</strong>,</p>
        <p style="margin:0 0 16px">Se te ha ${p.isEdit ? 'modificado' : 'asignado'} una cita:</p>
        <div style="background:#f4f6f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:6px 0">📅 <strong>${dateStr}</strong></p>
          <p style="margin:6px 0">🕐 <strong>${timeStr}</strong></p>
          <p style="margin:6px 0">👤 <strong>${p.patientName}</strong></p>
          ${p.treatmentName ? `<p style="margin:6px 0">💆 <strong>${p.treatmentName}</strong></p>` : ''}
          ${p.notes         ? `<p style="margin:6px 0">📝 ${p.notes}</p>`                          : ''}
        </div>
        <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">
          <a href="${gcUrl}"
            style="display:inline-block;background:#4285f4;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;text-align:center">
            📅 Añadir a Google Calendar
          </a>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0">
            O abre el archivo .ics adjunto para añadirlo a Apple Calendar, Outlook u otro.
          </p>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:20px 0 0">
          Este es un aviso automático de ${clinic}.
        </p>
      </div>
    </div>
  `
}

// ── Envío de email ────────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: string }>,
) {
  const body: Record<string, unknown> = { from: FROM_EMAIL, to, subject, html }
  if (attachments?.length) body.attachments = attachments

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(JSON.stringify(err))
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const body = await req.json()
  const {
    to, patientName, treatmentName, workerName, workerEmail,
    date, time, duration = 60, notes, isEdit, clinicName,
  } = body

  if (!to || !patientName || !date || !time) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400, headers: CORS })
  }

  const dateShort = new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  const timeShort = time.slice(0, 5)

  try {
    // Email al paciente
    await sendEmail(
      to,
      isEdit
        ? `Tu cita ha sido modificada — ${dateShort} a las ${timeShort}`
        : `Cita confirmada — ${treatmentName ?? 'Consulta'} el ${dateShort}`,
      patientHtml({ patientName, treatmentName, workerName, date, time, notes, isEdit, clinicName }),
    )

    // Email al trabajador con botón de calendario y adjunto .ics
    if (workerEmail && workerName) {
      const icsContent = generateICS({
        summary: `Cita con ${patientName}${treatmentName ? ` · ${treatmentName}` : ''}`,
        description: [
          `Paciente: ${patientName}`,
          treatmentName ? `Tratamiento: ${treatmentName}` : '',
          notes ? `Notas: ${notes}` : '',
          `Clínica: ${clinicName || 'NUVIA'}`,
        ].filter(Boolean).join('\n'),
        date,
        time,
        duration,
      })

      // Codificar ICS en base64
      const encoder = new TextEncoder()
      const icsBytes = encoder.encode(icsContent)
      const icsBase64 = btoa(String.fromCharCode(...icsBytes))

      await sendEmail(
        workerEmail,
        isEdit
          ? `Cita modificada — ${dateShort} a las ${timeShort}`
          : `Nueva cita asignada — ${dateShort} a las ${timeShort}`,
        workerHtml({ workerName, patientName, treatmentName, date, time, duration, notes, isEdit, clinicName }),
        [{ filename: 'cita.ics', content: icsBase64 }],
      ).catch(() => {})
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
