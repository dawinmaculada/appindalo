import { createContext, useContext, useState, useEffect } from 'react';
import { getTreatments } from '../services/storage';

const TreatmentsContext = createContext({ treatments: [], setTreatments: () => {} });

export function TreatmentsProvider({ children }) {
  const [treatments, setTreatments] = useState([]);

  useEffect(() => {
    getTreatments().then(setTreatments).catch(() => {});
  }, []);

  return (
    <TreatmentsContext.Provider value={{ treatments, setTreatments }}>
      {children}
    </TreatmentsContext.Provider>
  );
}

export function useTreatments() {
  return useContext(TreatmentsContext);
}
