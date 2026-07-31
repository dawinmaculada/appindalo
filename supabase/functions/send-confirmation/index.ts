const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUVIA Citas <onboarding@resend.dev>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          Este es un aviso automático de ${clinic}.
        </p>
      </div>
    </div>
  `
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(JSON.stringify(err))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const {
    to, patientName, treatmentName, workerName, workerEmail, date, time, notes, isEdit, clinicName,
  } = await req.json()

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

    // Email al trabajador si tiene notificaciones activadas
    if (workerEmail && workerName) {
      await sendEmail(
        workerEmail,
        isEdit
          ? `Cita modificada — ${dateShort} a las ${timeShort}`
          : `Nueva cita asignada — ${dateShort} a las ${timeShort}`,
        workerHtml({ workerName, patientName, treatmentName, date, time, notes, isEdit, clinicName }),
      ).catch(() => { /* no bloquear si falla el email al trabajador */ })
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
