import { createContext, useContext, useState, useEffect } from 'react';
import { getClinicName } from '../services/supabase';
import { getGoogleConfig, getSubscriptionInfo } from '../services/storage';
import { setGoogleConfig } from '../services/googleCalendar';

const ClinicContext = createContext({
  clinicName: '',
  googleConfig: { clientId: '', apiKey: '' },
  subscription: { status: 'active', trialEndsAt: null },
  daysLeft: null,
  isActive: true,
});

export function ClinicProvider({ children }) {
  const [clinicName, setClinicName]      = useState('');
  const [googleConfig, setGoogleConfig_] = useState({ clientId: '', apiKey: '' });
  const [subscription, setSubscription]  = useState({ status: 'active', trialEndsAt: null });

  useEffect(() => {
    getClinicName().then(setClinicName).catch(() => {});
    getGoogleConfig().then((cfg) => {
      setGoogleConfig_(cfg);
      setGoogleConfig(cfg);
    }).catch(() => {});
    getSubscriptionInfo().then(setSubscription).catch(() => {});
  }, []);

  const daysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / 86400000))
    : null;

  const isActive = subscription.status === 'active' ||
    (subscription.status === 'trial' && daysLeft !== null && daysLeft > 0);

  return (
    <ClinicContext.Provider value={{
      clinicName,
      googleConfig,
      subscription,
      daysLeft,
      isActive,
      reloadGoogleConfig: () => {
        getGoogleConfig().then((cfg) => { setGoogleConfig_(cfg); setGoogleConfig(cfg); }).catch(() => {});
      },
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
