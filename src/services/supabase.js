import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

let _clinicId = null;
let _clinicName = null;

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

export async function getClinicName() {
  if (_clinicName) return _clinicName;
  const cid = await getClinicId();
  const { data } = await supabase.from('clinics').select('name').eq('id', cid).single();
  _clinicName = data?.name || 'Mi Clínica';
  return _clinicName;
}

export function clearClinicIdCache() {
  _clinicId = null;
  _clinicName = null;
}
