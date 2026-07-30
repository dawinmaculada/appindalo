import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function formatDateTime(date, time) {
  const parsed = parseISO(`${date}T${time}`);
  const dayName = format(parsed, 'EEEE', { locale: es });
  return `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)}, ${format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es })} a las ${time}`;
}

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;">
  <tr><td style="background:#c9a227;padding:32px 40px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Osteopatía Indalo</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Centro de Osteopatía y Bienestar</p>
  </td></tr>
  <tr><td style="padding:36px 40px;">${content}</td></tr>
  <tr><td style="background:#fafaf9;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">Mensaje enviado automáticamente por Osteopatía Indalo.</p>
    <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Para cualquier consulta, contacta directamente con la clínica.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function appointmentBlock(treatment, dateStr, worker) {
  return `
<div style="background:#fafaf9;border-radius:12px;padding:24px;margin:24px 0;">
  <p style="margin:0 0 16px;font-size:28px;">${treatment?.icon || '📅'}</p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding-bottom:14px;">
      <span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Tratamiento</span><br>
      <span style="font-size:16px;color:#111827;font-weight:600;">${treatment?.name || 'Tratamiento'}</span>
      <span style="color:#9ca3af;font-size:13px;"> · ${treatment?.duration || 60} min</span>
    </td></tr>
    <tr><td style="${worker?.name ? 'padding-bottom:14px;' : ''}">
      <span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Fecha y hora</span><br>
      <span style="font-size:16px;color:#111827;font-weight:600;">📅 ${dateStr}</span>
    </td></tr>
    ${worker?.name ? `<tr><td>
      <span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Profesional</span><br>
      <span style="font-size:16px;color:#111827;font-weight:600;">👨‍⚕️ ${worker.name}</span>
    </td></tr>` : ''}
  </table>
</div>`;
}

export function buildConfirmationEmail({ patient, treatment, appointment, worker, isEdit }) {
  const dateStr = formatDateTime(appointment.date, appointment.time);
  const title = isEdit ? '✏️ Tu cita ha sido actualizada' : '✅ Cita confirmada';
  const intro = isEdit
    ? `Hola <strong>${patient.name}</strong>, hemos actualizado los detalles de tu cita.`
    : `Hola <strong>${patient.name}</strong>, tu cita ha quedado registrada correctamente.`;

  const content = `
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">${title}</h2>
<p style="margin:0;color:#6b7280;font-size:15px;line-height:1.5;">${intro}</p>
${appointmentBlock(treatment, dateStr, worker)}
${appointment.notes ? `
<div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
  <p style="margin:0;font-size:14px;color:#92400e;"><strong>Nota:</strong> ${appointment.notes}</p>
</div>` : ''}
<p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
  Por favor, recuerda llegar con unos minutos de antelación. Si necesitas cancelar o modificar tu cita, contáctanos lo antes posible.
</p>`;

  return {
    subject: isEdit
      ? `Cita actualizada — ${treatment?.name || 'Tratamiento'} el ${appointment.date}`
      : `Cita confirmada — ${treatment?.name || 'Tratamiento'} el ${appointment.date}`,
    bodyHtml: emailWrapper(content),
  };
}

export function buildReminderEmail({ patient, treatment, appointment, worker }) {
  const dateStr = formatDateTime(appointment.date, appointment.time);

  const content = `
<h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">🔔 Recordatorio de cita</h2>
<p style="margin:0;color:#6b7280;font-size:15px;line-height:1.5;">
  Hola <strong>${patient.name}</strong>, te recordamos que <strong>mañana tienes una cita</strong> en Osteopatía Indalo.
</p>
${appointmentBlock(treatment, dateStr, worker)}
<div style="background:#e6f9ed;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
  <p style="margin:0;color:#c9a227;font-size:14px;font-weight:600;">¿Todo listo para mañana?</p>
  <p style="margin:8px 0 0;color:#166534;font-size:14px;line-height:1.5;">
    Recuerda llegar con 5–10 minutos de antelación. Si necesitas cancelar, avísanos con la mayor antelación posible.
  </p>
</div>
<p style="margin:0;color:#6b7280;font-size:14px;">¡Hasta mañana!<br><strong>El equipo de Osteopatía Indalo</strong></p>`;

  return {
    subject: `Recordatorio: ${treatment?.name || 'Cita'} mañana a las ${appointment.time}`,
    bodyHtml: emailWrapper(content),
  };
}
