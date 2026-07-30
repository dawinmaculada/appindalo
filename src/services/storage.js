import { supabase, getClinicId } from './supabase';

// ── Helpers de mapeo ─────────────────────────────────────────────────────

const mapPatient = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  birthDate: row.birth_date || '',
  address: row.address || '',
  notes: row.notes || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAppointment = (row) => ({
  id: row.id,
  patientId: row.patient_id,
  treatmentId: row.treatment_id,
  workerId: row.worker_id || '',
  date: row.date,
  time: row.time,
  notes: row.notes || '',
  status: row.status || 'scheduled',
  googleEventId: row.google_event_id || null,
  reminderSent: row.reminder_sent || false,
  billing: row.billing || null,
  invoiceId: row.invoice_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapWorker = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role || '',
  phone: row.phone || '',
  email: row.email || '',
  color: row.color || '#c9a227',
  notes: row.notes || '',
  schedule: row.schedule || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapInvoice = (row) => ({
  id: row.id,
  number: row.number,
  patientId: row.patient_id,
  appointmentId: row.appointment_id,
  date: row.date,
  lineItems: row.line_items || [],
  total: row.total || 0,
  base: row.base || 0,
  iva: row.iva || 0,
  paymentMethod: row.payment_method || '',
  status: row.status || 'pending',
  issuer: row.issuer || {},
  clientData: row.client_data || {},
  notes: row.notes || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── Pacientes ─────────────────────────────────────────────────────────────

export const getPatients = async () => {
  const cid = await getClinicId();
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', cid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPatient);
};

export const savePatient = async (patient) => {
  const cid = await getClinicId();
  if (patient.id) {
    const { error } = await supabase
      .from('patients')
      .update({
        name: patient.name,
        email: patient.email || null,
        phone: patient.phone || null,
        birth_date: patient.birthDate || null,
        address: patient.address || null,
        notes: patient.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', patient.id)
      .eq('clinic_id', cid);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('patients')
      .insert({
        clinic_id: cid,
        name: patient.name,
        email: patient.email || null,
        phone: patient.phone || null,
        birth_date: patient.birthDate || null,
        address: patient.address || null,
        notes: patient.notes || null,
      });
    if (error) throw error;
  }
  return getPatients();
};

export const deletePatient = async (id) => {
  const cid = await getClinicId();
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id)
    .eq('clinic_id', cid);
  if (error) throw error;
  return getPatients();
};

export const insertPatients = async (patients) => {
  const cid = await getClinicId();
  const rows = patients.map((p) => ({
    clinic_id: cid,
    name: p.name,
    email: p.email || null,
    phone: p.phone || null,
    birth_date: p.birthDate || null,
    address: p.address || null,
    notes: p.notes || null,
  }));
  const { error } = await supabase.from('patients').insert(rows);
  if (error) throw error;
};

// ── Citas ─────────────────────────────────────────────────────────────────

export const getAppointments = async () => {
  const cid = await getClinicId();
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('clinic_id', cid)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAppointment);
};

export const saveAppointment = async (appointment) => {
  const cid = await getClinicId();
  if (appointment.id) {
    const { error } = await supabase
      .from('appointments')
      .update({
        patient_id: appointment.patientId,
        treatment_id: appointment.treatmentId,
        worker_id: appointment.workerId || null,
        date: appointment.date,
        time: appointment.time,
        notes: appointment.notes || null,
        status: appointment.status || 'scheduled',
        google_event_id: appointment.googleEventId || null,
        reminder_sent: appointment.reminderSent || false,
        billing: appointment.billing || null,
        invoice_id: appointment.invoiceId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)
      .eq('clinic_id', cid);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('appointments')
      .insert({
        clinic_id: cid,
        patient_id: appointment.patientId,
        treatment_id: appointment.treatmentId,
        worker_id: appointment.workerId || null,
        date: appointment.date,
        time: appointment.time,
        notes: appointment.notes || null,
        status: appointment.status || 'scheduled',
        google_event_id: appointment.googleEventId || null,
        reminder_sent: appointment.reminderSent || false,
        billing: appointment.billing || null,
      });
    if (error) throw error;
  }
  return getAppointments();
};

export const deleteAppointment = async (id) => {
  const cid = await getClinicId();
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', cid);
  if (error) throw error;
  return getAppointments();
};

// ── Trabajadores ──────────────────────────────────────────────────────────

export const getWorkers = async () => {
  const cid = await getClinicId();
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('clinic_id', cid)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapWorker);
};

export const saveWorker = async (worker) => {
  const cid = await getClinicId();
  if (worker.id) {
    const { error } = await supabase
      .from('workers')
      .update({
        name: worker.name,
        role: worker.role || null,
        phone: worker.phone || null,
        email: worker.email || null,
        color: worker.color || '#c9a227',
        notes: worker.notes || null,
        schedule: worker.schedule || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', worker.id)
      .eq('clinic_id', cid);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('workers')
      .insert({
        clinic_id: cid,
        name: worker.name,
        role: worker.role || null,
        phone: worker.phone || null,
        email: worker.email || null,
        color: worker.color || '#c9a227',
        notes: worker.notes || null,
        schedule: worker.schedule || {},
      });
    if (error) throw error;
  }
  return getWorkers();
};

export const deleteWorker = async (id) => {
  const cid = await getClinicId();
  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', id)
    .eq('clinic_id', cid);
  if (error) throw error;
  return getWorkers();
};

// ── Facturas ──────────────────────────────────────────────────────────────

export const getInvoices = async () => {
  const cid = await getClinicId();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('clinic_id', cid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInvoice);
};

async function nextInvoiceNumber(cid) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', cid)
    .like('number', `FAC-${year}-%`);
  return `FAC-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
}

export const saveInvoice = async (invoice) => {
  const cid = await getClinicId();
  if (invoice.id) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        date: invoice.date,
        line_items: invoice.lineItems || [],
        total: invoice.total || 0,
        base: invoice.base || 0,
        iva: invoice.iva || 0,
        payment_method: invoice.paymentMethod || null,
        status: invoice.status || 'pending',
        issuer: invoice.issuer || null,
        client_data: invoice.clientData || null,
        notes: invoice.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id)
      .eq('clinic_id', cid)
      .select()
      .single();
    if (error) throw error;
    return mapInvoice(data);
  } else {
    const number = await nextInvoiceNumber(cid);
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        clinic_id: cid,
        number,
        patient_id: invoice.patientId || null,
        date: invoice.date,
        line_items: invoice.lineItems || [],
        total: invoice.total || 0,
        base: invoice.base || 0,
        iva: invoice.iva || 0,
        payment_method: invoice.paymentMethod || null,
        status: invoice.status || 'pending',
        issuer: invoice.issuer || null,
        client_data: invoice.clientData || null,
        notes: invoice.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapInvoice(data);
  }
};

export const deleteInvoice = async (id) => {
  const cid = await getClinicId();
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('clinic_id', cid);
  if (error) throw error;
  return getInvoices();
};

// ── Tratamientos ──────────────────────────────────────────────────────────

const mapTreatment = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  duration: row.duration || 60,
  price: Number(row.price) || 0,
  color: row.color || '#c9a227',
  icon: row.icon || '💊',
  category: row.category || 'general',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getTreatments = async () => {
  const cid = await getClinicId();
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('clinic_id', cid)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapTreatment);
};

export const saveTreatment = async (treatment) => {
  const cid = await getClinicId();
  if (treatment.id) {
    const { error } = await supabase
      .from('treatments')
      .update({
        name: treatment.name,
        description: treatment.description || null,
        duration: treatment.duration || 60,
        price: treatment.price || 0,
        color: treatment.color || '#c9a227',
        icon: treatment.icon || '💊',
        category: treatment.category || 'general',
        updated_at: new Date().toISOString(),
      })
      .eq('id', treatment.id)
      .eq('clinic_id', cid);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('treatments')
      .insert({
        clinic_id: cid,
        name: treatment.name,
        description: treatment.description || null,
        duration: treatment.duration || 60,
        price: treatment.price || 0,
        color: treatment.color || '#c9a227',
        icon: treatment.icon || '💊',
        category: treatment.category || 'general',
      });
    if (error) throw error;
  }
  return getTreatments();
};

export const deleteTreatment = async (id) => {
  const cid = await getClinicId();
  const { error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', id)
    .eq('clinic_id', cid);
  if (error) throw error;
  return getTreatments();
};

// ── Datos del emisor ──────────────────────────────────────────────────────

const ISSUER_DEFAULT = { name: '', nif: '', address: '', phone: '', email: '' };

export const getIssuerData = async () => {
  const cid = await getClinicId();
  const { data } = await supabase
    .from('issuer_data')
    .select('*')
    .eq('clinic_id', cid)
    .maybeSingle();
  if (!data) return ISSUER_DEFAULT;
  return { name: data.name || '', nif: data.nif || '', address: data.address || '', phone: data.phone || '', email: data.email || '' };
};

export const saveIssuerData = async (issuerData) => {
  const cid = await getClinicId();
  const { data: existing } = await supabase
    .from('issuer_data')
    .select('id')
    .eq('clinic_id', cid)
    .maybeSingle();
  if (existing) {
    await supabase.from('issuer_data').update({ ...issuerData }).eq('clinic_id', cid);
  } else {
    await supabase.from('issuer_data').insert({ clinic_id: cid, ...issuerData });
  }
};

// ── Configuración Google Calendar ─────────────────────────────────────────

export const getGoogleConfig = async () => {
  const cid = await getClinicId();
  const { data } = await supabase
    .from('clinics')
    .select('google_client_id, google_api_key')
    .eq('id', cid)
    .single();
  return {
    clientId: data?.google_client_id || '',
    apiKey:   data?.google_api_key   || '',
  };
};

export const saveGoogleConfig = async ({ clientId, apiKey }) => {
  const cid = await getClinicId();
  await supabase
    .from('clinics')
    .update({ google_client_id: clientId, google_api_key: apiKey })
    .eq('id', cid);
};
