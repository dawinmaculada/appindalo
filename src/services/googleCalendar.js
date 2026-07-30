// Servicio de integración con Google Calendar API
// Requiere configurar credenciales OAuth2 en Google Cloud Console

const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send';
const DISCOVERY_DOC =
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// ⚠️  Reemplaza estos valores con tus credenciales de Google Cloud Console
// https://console.cloud.google.com/ → APIs & Services → Credentials
export const GOOGLE_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
};

let tokenClient = null;

// Inicializar GAPI (Google API client)
export const initGapi = () =>
  new Promise((resolve, reject) => {
    if (!window.gapi) {
      reject(new Error('gapi no cargado'));
      return;
    }
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_CONFIG.API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  });

// Inicializar Google Identity Services
export const initGis = (onTokenReceived) =>
  new Promise((resolve) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (onTokenReceived) onTokenReceived(resp);
      },
    });
    resolve();
  });

// Solicitar autorización al usuario
export const authorize = () => {
  if (!tokenClient) throw new Error('GIS no inicializado');
  if (
    window.gapi.client.getToken() === null ||
    window.gapi.client.getToken()?.access_token === undefined
  ) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
};

// Cerrar sesión
export const signOut = () => {
  const token = window.gapi.client.getToken();
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
};

// Comprobar si hay token activo
export const isSignedIn = () => {
  const token = window.gapi.client?.getToken();
  return !!(token && token.access_token);
};

// Obtener eventos del calendario (rango de fechas)
export const getCalendarEvents = async (timeMin, timeMax) => {
  const response = await window.gapi.client.calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin || new Date().toISOString(),
    timeMax:
      timeMax ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return response.result.items || [];
};

// Crear evento en Google Calendar
export const createCalendarEvent = async (appointment, patient, treatment) => {
  const startDateTime = new Date(
    `${appointment.date}T${appointment.time}:00`
  ).toISOString();
  const endDateTime = new Date(
    new Date(startDateTime).getTime() + (treatment?.duration || 60) * 60 * 1000
  ).toISOString();

  const event = {
    summary: `${treatment?.name || 'Cita'} - ${patient?.name || 'Paciente'}`,
    description: `Tratamiento: ${treatment?.name}\nPaciente: ${patient?.name}\nTeléfono: ${patient?.phone || '-'}\nNotas: ${appointment.notes || ''}`,
    start: { dateTime: startDateTime, timeZone: 'Europe/Madrid' },
    end: { dateTime: endDateTime, timeZone: 'Europe/Madrid' },
    colorId: '2', // Verde
  };

  const response = await window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });
  return response.result;
};

// Eliminar evento de Google Calendar
export const deleteCalendarEvent = async (eventId) => {
  await window.gapi.client.calendar.events.delete({
    calendarId: 'primary',
    eventId,
  });
};

// Comprobar disponibilidad en un rango horario
export const checkAvailability = async (date, startTime, duration = 60) => {
  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(
    startDateTime.getTime() + duration * 60 * 1000
  );

  const events = await getCalendarEvents(
    startDateTime.toISOString(),
    endDateTime.toISOString()
  );
  return events.length === 0; // true = disponible
};
