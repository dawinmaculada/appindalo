import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

let _clinicId = null;

export async function getClinicId() {
  if (_clinicId) return _clinicId;
  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .single();
  if (error || !data) throw new Error('Perfil de clínica no encontrado');
  _clinicId = data.clinic_id;
  return _clinicId;
}

export function clearClinicIdCache() {
  _clinicId = null;
}
