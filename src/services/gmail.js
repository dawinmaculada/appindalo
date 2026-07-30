/**
 * Servicio de envío de emails vía Gmail API.
 * Usa el mismo token OAuth que Google Calendar.
 * Requiere scope: https://www.googleapis.com/auth/gmail.send
 */

// Construye un mensaje MIME y lo codifica en base64url
function buildRawEmail({ to, subject, bodyHtml, fromName = 'Osteopatía Indalo' }) {
  const mime = [
    `From: ${fromName} <me>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    bodyHtml,
  ].join('\r\n');

  // base64url (RFC 4648)
  return btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Envía un email usando la Gmail API REST directamente
export async function sendEmail({ to, subject, bodyHtml }) {
  const token = window.gapi?.client?.getToken();
  if (!token?.access_token) throw new Error('No hay sesión de Google activa');

  const raw = buildRawEmail({ to, subject, bodyHtml });

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error ${res.status}`);
  }
  return res.json();
}

// Envía a múltiples destinatarios con pausa entre envíos para evitar límites
export async function sendBulkEmails(recipients, buildEmail, onProgress) {
  const results = { sent: [], failed: [] };

  for (let i = 0; i < recipients.length; i++) {
    const p = recipients[i];
    onProgress?.({ current: i + 1, total: recipients.length, name: p.name });
    try {
      const { subject, bodyHtml } = buildEmail(p);
      await sendEmail({ to: p.email, subject, bodyHtml });
      results.sent.push(p);
    } catch (err) {
      results.failed.push({ patient: p, error: err.message });
    }
    // Pausa entre envíos (evitar rate limit)
    if (i < recipients.length - 1) {
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return results;
}
