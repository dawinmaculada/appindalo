import { useEffect, useRef } from 'react';
import { getAppointments, saveAppointment, getPatients, getWorkers, getTreatments } from '../services/storage';
import { sendEmail } from '../services/gmail';
import { isSignedIn } from '../services/googleCalendar';
import { buildReminderEmail } from '../services/emailTemplates';

// Ventana de recordatorio: entre 23h y 25h antes de la cita
const WINDOW_MIN = 23 * 60 * 60 * 1000;
const WINDOW_MAX = 25 * 60 * 60 * 1000;
const CHECK_INTERVAL = 60 * 1000; // cada minuto

export function useEmailReminders() {
  const running = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (running.current || !isSignedIn()) return;
      running.current = true;

      try {
        const now = Date.now();
        const appointments = await getAppointments();
        const patients = await getPatients();
        const workers = await getWorkers();
        const treatments = await getTreatments();

        const pending = appointments.filter((apt) => {
          if (apt.reminderSent || apt.status === 'cancelled') return false;
          if (!apt.date || !apt.time) return false;
          const diff = new Date(`${apt.date}T${apt.time}`).getTime() - now;
          return diff >= WINDOW_MIN && diff <= WINDOW_MAX;
        });

        for (const apt of pending) {
          const patient = patients.find((p) => p.id === apt.patientId);
          if (!patient?.email) continue;

          const treatment = treatments.find((t) => t.id === apt.treatmentId);
          const worker = workers.find((w) => w.id === apt.workerId);

          try {
            const { subject, bodyHtml } = buildReminderEmail({ patient, treatment, appointment: apt, worker });
            await sendEmail({ to: patient.email, subject, bodyHtml });
            await saveAppointment({ ...apt, reminderSent: true });
            console.info(`[Indalo] Recordatorio enviado a ${patient.email} para cita ${apt.date} ${apt.time}`);
          } catch (err) {
            console.error(`[Indalo] Error enviando recordatorio a ${patient.email}:`, err);
          }
        }
      } finally {
        running.current = false;
      }
    };

    check();
    const timer = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, []);
}
