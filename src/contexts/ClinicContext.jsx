import { createContext, useContext, useState, useEffect } from 'react';
import { getClinicName } from '../services/supabase';
import { getGoogleConfig } from '../services/storage';
import { setGoogleConfig } from '../services/googleCalendar';

const ClinicContext = createContext({ clinicName: '', googleConfig: { clientId: '', apiKey: '' } });

export function ClinicProvider({ children }) {
  const [clinicName, setClinicName]     = useState('');
  const [googleConfig, setGoogleConfig_] = useState({ clientId: '', apiKey: '' });

  useEffect(() => {
    getClinicName().then(setClinicName).catch(() => {});
    getGoogleConfig().then((cfg) => {
      setGoogleConfig_(cfg);
      setGoogleConfig(cfg); // aplica al módulo de Google Calendar
    }).catch(() => {});
  }, []);

  return (
    <ClinicContext.Provider value={{ clinicName, googleConfig, reloadGoogleConfig: () => {
      getGoogleConfig().then((cfg) => { setGoogleConfig_(cfg); setGoogleConfig(cfg); }).catch(() => {});
    }}}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
