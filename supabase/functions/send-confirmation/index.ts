const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Indalo Citas <onboarding@resend.dev>'

function confirmationHtml(p: {
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
  const clinic = p.clinicName || 'Tu clínica'
  const title = p.isEdit ? 'Tu cita ha sido modificada' : 'Cita confirmada'
  const intro = p.isEdit
    ? 'Los datos de tu cita han sido actualizados:'
    : 'Tu cita ha sido confirmada con los siguientes datos:'

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:#1a2332;border-radius:10px 10px 0 0;padding:20px 24px">
        <p style="color:#00af38;font-size:12px;margin:0 0 4px;font-weight:600;letter-spacing:1px">${clinic}</p>
        <h1 style="color:#fff;margin:0;font-size:20px">${title}</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:24px">
        <p style="margin:0 0 16px">Hola <strong>${p.patientName}</strong>,</p>
        <p style="margin:0 0 16px">${intro}</p>
        <div style="background:#f4f6f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:6px 0">📅 <strong>${dateStr}</strong></p>
          <p style="margin:6px 0">🕐 <strong>${timeStr}</strong></p>
          ${p.treatmentName ? `<p style="margin:6px 0">💆 <strong>${p.treatmentName}</strong></p>` : ''}
          ${p.workerName ? `<p style="margin:6px 0">👨‍⚕️ <strong>${p.workerName}</strong></p>` : ''}
          ${p.notes ? `<p style="margin:6px 0">📝 ${p.notes}</p>` : ''}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          Si necesitas cancelar o modificar tu cita, por favor contáctanos con antelación.
        </p>
      </div>
    </div>
  `
}

Deno.serve(async (req) => {
  const { to, patientName, treatmentName, workerName, date, time, notes, isEdit, clinicName } = await req.json()

  if (!to || !patientName || !date || !time) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400 })
  }

  const subject = isEdit
    ? `Tu cita ha sido modificada — ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} a las ${time.slice(0, 5)}`
    : `Cita confirmada — ${treatmentName ?? 'Consulta'} el ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html: confirmationHtml({ patientName, treatmentName, workerName, date, time, notes, isEdit }),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
