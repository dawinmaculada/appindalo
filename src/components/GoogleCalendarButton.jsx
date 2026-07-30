import React, { useState, useEffect } from 'react';
import { CalendarCheck, CalendarX, Loader } from 'lucide-react';
import {
  GOOGLE_CONFIG,
  initGapi,
  initGis,
  authorize,
  signOut,
  isSignedIn,
} from '../services/googleCalendar';

export default function GoogleCalendarButton() {
  const [status, setStatus] = useState('idle'); // idle | loading | connected | error | no-config
  const [gapiReady, setGapiReady] = useState(false);

  const hasConfig =
    GOOGLE_CONFIG.CLIENT_ID && GOOGLE_CONFIG.API_KEY;

  useEffect(() => {
    if (!hasConfig) {
      setStatus('no-config');
      return;
    }

    // Cargar scripts de Google dinámicamente
    const loadScripts = async () => {
      setStatus('loading');
      try {
        await loadScript('https://apis.google.com/js/api.js');
        await loadScript('https://accounts.google.com/gsi/client');
        await initGapi();
        await initGis((resp) => {
          if (resp.error) {
            setStatus('idle');
          } else {
            setStatus('connected');
          }
        });
        setGapiReady(true);
        if (isSignedIn()) setStatus('connected');
        else setStatus('idle');
      } catch {
        setStatus('error');
      }
    };
    loadScripts();
  }, [hasConfig]);

  const handleClick = () => {
    if (!gapiReady) return;
    if (status === 'connected') {
      signOut();
      setStatus('idle');
    } else {
      authorize();
    }
  };

  if (status === 'no-config') {
    return (
      <button
        title="Configura CLIENT_ID y API_KEY en .env para conectar con Google Calendar"
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium border border-amber-200 hover:bg-amber-100 transition-colors"
      >
        <CalendarX size={16} />
        <span className="hidden sm:inline">Configurar Calendar</span>
      </button>
    );
  }

  if (status === 'loading') {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-gray-400 text-sm font-medium border border-gray-200"
      >
        <Loader size={16} className="animate-spin" />
        <span className="hidden sm:inline">Conectando...</span>
      </button>
    );
  }

  if (status === 'connected') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#e6f9ed] text-[#00af38] text-sm font-medium border border-[#00af38]/30 hover:bg-[#d0f0db] transition-colors"
      >
        <CalendarCheck size={16} />
        <span className="hidden sm:inline">Calendar Conectado</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!gapiReady}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium border border-gray-200 hover:bg-gray-100 hover:text-[#00af38] transition-colors disabled:opacity-50"
    >
      <CalendarX size={16} />
      <span className="hidden sm:inline">Conectar Calendar</span>
    </button>
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}
