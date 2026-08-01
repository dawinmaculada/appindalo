const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'velsy Citas <onboarding@resend.dev>'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailItem {
  to: string
  subject: string
  html: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const { emails } = await req.json() as { emails: EmailItem[] }

  if (!emails?.length) {
    return new Response(JSON.stringify({ error: 'No hay emails' }), { status: 400, headers: CORS })
  }

  let sent = 0
  let failed = 0

  // Resend batch API: máximo 100 por petición
  const BATCH = 100
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH).map((e) => ({
      from: FROM_EMAIL,
      to: e.to,
      subject: e.subject,
      html: e.html,
    }))

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      if (res.ok) {
        const data = await res.json()
        sent += data.data?.length ?? batch.length
      } else {
        failed += batch.length
      }
    } catch {
      failed += batch.length
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
