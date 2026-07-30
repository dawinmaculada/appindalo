/**
 * Parser CSV para el formato de exportación de pacientes de Osteopatía Indalo.
 * Delimitador: punto y coma (;)
 * Columnas: Nombre;Apellidos;Teléfono;Email;Última cita;Total de citas
 *
 * Maneja tres tipos de filas:
 *  1. Normal:  Laura;Seco;+34617308343;email;;0
 *  2. Quoted:  "Ascensión ";"Montero";+34917300769;;fecha;2
 *  3. Embedded:"Nombre;Apellidos;phone;email;fecha;";;;;;0
 */

// ── Tokenizador simple de CSV con delimitador ; ─────────────────────────
function tokenizeLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ';' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ── Limpia el número de teléfono ────────────────────────────────────────
function cleanPhone(raw = '') {
  const s = raw.replace(/\s+/g, '').trim();
  if (!s || s === '-') return '';
  // Normalizar a formato +34XXXXXXXXX
  if (s.startsWith('+')) return s;
  if (s.startsWith('34') && s.length >= 11) return '+' + s;
  if (s.length === 9) return '+34' + s;
  return s;
}

// ── Parsea una fila del CSV y devuelve un objeto de paciente ────────────
function parseRow(fields) {
  // Tipo 3 – datos embebidos en el primer campo
  // Detectar si el primer campo contiene más de 2 puntos y comas internos
  const f0 = fields[0] || '';
  const innerSemicolons = (f0.match(/;/g) || []).length;

  let nombre = '', apellidos = '', phone = '', email = '', lastDate = '', totalStr = '0';

  if (innerSemicolons >= 2) {
    // Todos los datos están dentro del primer campo, separados por ;
    const inner = tokenizeLine(f0);
    nombre    = inner[0] || '';
    apellidos = inner[1] || '';
    phone     = inner[2] || '';
    email     = inner[3] || '';
    // Ignorar el resto (birthdate u otros metadatos)
  } else {
    // Tipo 1 y 2 – fila normal
    nombre    = fields[0] || '';
    apellidos = fields[1] || '';
    phone     = fields[2] || '';
    email     = fields[3] || '';
    lastDate  = fields[4] || '';
    totalStr  = fields[5] || '0';
  }

  const name = `${nombre} ${apellidos}`.replace(/\s+/g, ' ').trim();

  // Filtrar filas basura
  if (!name || name.length < 2) return null;
  if (name.toLowerCase().includes('notas:')) return null;
  if (name.toLowerCase().includes('additional email')) return null;
  if (name.toLowerCase().startsWith('info ')) return null;
  if (/^[a-z]{1,4}$/i.test(name) && !email && !phone) return null;

  const totalCitas = parseInt(totalStr, 10) || 0;
  const notes = [
    lastDate ? `Última cita: ${lastDate.replace(' ', ' a las ')}` : '',
    totalCitas > 0 ? `Total citas previas: ${totalCitas}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    name,
    phone: cleanPhone(phone),
    email: email.replace(/['"]/g, '').trim().toLowerCase(),
    notes,
  };
}

// ── Función principal de importación ────────────────────────────────────
export function parseCSV(text) {
  // Eliminar BOM UTF-8 si existe
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((l) => l.trim());

  const patients = [];
  const skipped = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = tokenizeLine(line);

    // Saltar cabecera
    if (i === 0 && (fields[0].toLowerCase().includes('nombre') || fields[0].toLowerCase().includes('name'))) {
      continue;
    }

    const patient = parseRow(fields);
    if (patient && patient.name) {
      patients.push(patient);
    } else {
      skipped.push(line);
    }
  }

  return { patients, skipped };
}

// ── Deduplica contra pacientes existentes (por teléfono o email) ─────────
export function deduplicatePatients(newPatients, existingPatients) {
  const existingPhones = new Set(existingPatients.map((p) => p.phone).filter(Boolean));
  const existingEmails = new Set(existingPatients.map((p) => p.email).filter(Boolean));

  const toImport = [];
  const duplicates = [];

  for (const p of newPatients) {
    const isDup =
      (p.phone && existingPhones.has(p.phone)) ||
      (p.email && existingEmails.has(p.email));
    if (isDup) {
      duplicates.push(p);
    } else {
      toImport.push(p);
    }
  }

  return { toImport, duplicates };
}
