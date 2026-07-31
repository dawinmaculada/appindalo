import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Indalo Citas <onboarding@resend.dev>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const WINDOW_MIN = 23 * 60 * 60 * 1000
const WINDOW_MAX = 25 * 60 * 60 * 1000

function reminderHtml(p: {
  patientName: string
  treatmentName?: string
  workerName?: string
  date: string
  time: string
}) {
  const dateStr = new Date(p.date + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = p.time.slice(0, 5)
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
      <div style="background:#111827;border-radius:10px 10px 0 0;padding:20px 24px">
        <p style="color:#c9a227;font-size:12px;margin:0 0 4px;font-weight:600;letter-spacing:1px">NUVIA</p>
        <h1 style="color:#fff;margin:0;font-size:20px">Recordatorio de cita</h1>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:24px">
        <p style="margin:0 0 16px">Hola <strong>${p.patientName}</strong>,</p>
        <p style="margin:0 0 16px">Te recordamos que mañana tienes una cita:</p>
        <div style="background:#f4f6f9;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:6px 0">📅 <strong>${dateStr}</strong></p>
          <p style="margin:6px 0">🕐 <strong>${timeStr}</strong></p>
          ${p.treatmentName ? `<p style="margin:6px 0">💆 <strong>${p.treatmentName}</strong></p>` : ''}
          ${p.workerName ? `<p style="margin:6px 0">👨‍⚕️ <strong>${p.workerName}</strong></p>` : ''}
        </div>
        <p style="color:#6b7280;font-size:13px;margin:16px 0 0">
          Si necesitas cancelar o modificar tu cita, por favor contáctanos con antelación.
        </p>
      </div>
    </div>
  `
}

Deno.serve(async (_req) => {
  const now = Date.now()

  const { data: apts, error } = await supabase
    .from('appointments')
    .select('id, date, time, patient_id, treatment_id, worker_id')
    .eq('reminder_sent', false)
    .neq('status', 'cancelled')
    .not('date', 'is', null)
    .not('time', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const pending = (apts ?? []).filter((apt) => {
    const diff = new Date(`${apt.date}T${apt.time}`).getTime() - now
    return diff >= WINDOW_MIN && diff <= WINDOW_MAX
  })

  let sent = 0

  for (const apt of pending) {
    const [{ data: patient }, { data: treatment }, { data: worker }] = await Promise.all([
      supabase.from('patients').select('name, email').eq('id', apt.patient_id).single(),
      supabase.from('treatments').select('name').eq('id', apt.treatment_id).single(),
      supabase.from('workers').select('name').eq('id', apt.worker_id).single(),
    ])

    if (!patient?.email) continue

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: patient.email,
        subject: `Recordatorio: tu cita de mañana a las ${apt.time.slice(0, 5)}`,
        html: reminderHtml({
          patientName: patient.name,
          treatmentName: treatment?.name,
          workerName: worker?.name,
          date: apt.date,
          time: apt.time,
        }),
      }),
    })

    if (res.ok) {
      await supabase.from('appointments').update({ reminder_sent: true }).eq('id', apt.id)
      sent++
    } else {
      const err = await res.json().catch(() => ({}))
      console.error(`Error enviando a ${patient.email}:`, err)
    }
  }

  return new Response(JSON.stringify({ sent, checked: pending.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
