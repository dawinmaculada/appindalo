import { createContext, useContext, useState, useEffect } from 'react';
import { getClinicName } from '../services/supabase';

const ClinicContext = createContext({ clinicName: '' });

export function ClinicProvider({ children }) {
  const [clinicName, setClinicName] = useState('');
  useEffect(() => {
    getClinicName().then(setClinicName).catch(() => {});
  }, []);
  return <ClinicContext.Provider value={{ clinicName }}>{children}</ClinicContext.Provider>;
}

export function useClinic() {
  return useContext(ClinicContext);
}
