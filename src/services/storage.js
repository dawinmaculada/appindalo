// Servicio de almacenamiento local (localStorage)
// Puede ser reemplazado por llamadas a API en el futuro

const KEYS = {
  PATIENTS: 'indalo_patients',
  APPOINTMENTS: 'indalo_appointments',
  WORKERS: 'indalo_workers',
  INVOICES: 'indalo_invoices',
};

// ── Pacientes ──────────────────────────────────────────────
export const getPatients = () => {
  try {
    const data = localStorage.getItem(KEYS.PATIENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const savePatient = (patient) => {
  const patients = getPatients();
  const existing = patients.findIndex((p) => p.id === patient.id);
  if (existing >= 0) {
    patients[existing] = { ...patient, updatedAt: new Date().toISOString() };
  } else {
    patients.push({
      ...patient,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
  return patients;
};

export const deletePatient = (id) => {
  const patients = getPatients().filter((p) => p.id !== id);
  localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
  return patients;
};

// ── Citas ──────────────────────────────────────────────────
export const getAppointments = () => {
  try {
    const data = localStorage.getItem(KEYS.APPOINTMENTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveAppointment = (appointment) => {
  const appointments = getAppointments();
  const existing = appointments.findIndex((a) => a.id === appointment.id);
  if (existing >= 0) {
    appointments[existing] = {
      ...appointment,
      updatedAt: new Date().toISOString(),
    };
  } else {
    appointments.push({
      ...appointment,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
  return appointments;
};

export const deleteAppointment = (id) => {
  const appointments = getAppointments().filter((a) => a.id !== id);
  localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
  return appointments;
};

// ── Trabajadores ───────────────────────────────────────────
export const getWorkers = () => {
  try {
    const data = localStorage.getItem(KEYS.WORKERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveWorker = (worker) => {
  const workers = getWorkers();
  const existing = workers.findIndex((w) => w.id === worker.id);
  if (existing >= 0) {
    workers[existing] = { ...worker, updatedAt: new Date().toISOString() };
  } else {
    workers.push({
      ...worker,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  localStorage.setItem(KEYS.WORKERS, JSON.stringify(workers));
  return workers;
};

export const deleteWorker = (id) => {
  const workers = getWorkers().filter((w) => w.id !== id);
  localStorage.setItem(KEYS.WORKERS, JSON.stringify(workers));
  return workers;
};

// ── Facturas ───────────────────────────────────────────────
export const getInvoices = () => {
  try {
    const data = localStorage.getItem(KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

function nextInvoiceNumber(invoices) {
  const year = new Date().getFullYear();
  const count = invoices.filter((i) => i.number?.startsWith(`FAC-${year}-`)).length;
  return `FAC-${year}-${String(count + 1).padStart(3, '0')}`;
}

// Devuelve la factura guardada (no el array completo)
export const saveInvoice = (invoice) => {
  const invoices = getInvoices();
  let saved;
  const idx = invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) {
    saved = { ...invoice, updatedAt: new Date().toISOString() };
    invoices[idx] = saved;
  } else {
    saved = {
      ...invoice,
      id: crypto.randomUUID(),
      number: nextInvoiceNumber(invoices),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    invoices.push(saved);
  }
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
  return saved;
};

export const deleteInvoice = (id) => {
  const invoices = getInvoices().filter((i) => i.id !== id);
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
  return invoices;
};

// ── Datos del emisor ───────────────────────────────────────
const ISSUER_KEY = 'indalo_issuer';

export const getIssuerData = () => {
  try {
    const data = localStorage.getItem(ISSUER_KEY);
    return data
      ? JSON.parse(data)
      : { name: 'Osteopatía Indalo', nif: '', address: '', phone: '', email: '' };
  } catch {
    return { name: 'Osteopatía Indalo', nif: '', address: '', phone: '', email: '' };
  }
};

export const saveIssuerData = (data) => {
  localStorage.setItem(ISSUER_KEY, JSON.stringify(data));
};
