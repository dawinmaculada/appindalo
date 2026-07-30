import { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Users,
  SkipForward,
  Loader,
  Download,
} from 'lucide-react';
import { parseCSV, deduplicatePatients } from '../services/csvImport';
import { getPatients, savePatient } from '../services/storage';

const STEPS = { UPLOAD: 'upload', PREVIEW: 'preview', DONE: 'done' };

export default function CSVImportModal({ onClose, onImported }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState([]);
  const [toImport, setToImport] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    setFileName(file.name);

    const tryParse = (text) => {
      const { patients } = parseCSV(text);
      const existing = getPatients();
      const { toImport: ti, duplicates: dups } = deduplicatePatients(patients, existing);
      setParsed(patients);
      setToImport(ti);
      setDuplicates(dups);
      setStep(STEPS.PREVIEW);
    };

    // Intento 1: UTF-8
    const r1 = new FileReader();
    r1.onload = (e) => {
      try {
        const text = e.target.result;
        // Si hay caracteres de reemplazo (UTF-8 mal interpretado) reintentamos con latin-1
        if (text.includes('\uFFFD')) {
          const r2 = new FileReader();
          r2.onload = (e2) => {
            try { tryParse(e2.target.result); }
            catch { setError('Error al leer el fichero. Asegúrate de que es un CSV válido.'); }
          };
          r2.readAsText(file, 'ISO-8859-1');
        } else {
          tryParse(text);
        }
      } catch {
        setError('Error al leer el fichero. Asegúrate de que es un CSV válido.');
      }
    };
    r1.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let count = 0;
    for (const p of toImport) {
      savePatient(p);
      count++;
      // Pequeña pausa para no bloquear UI en listas grandes
      if (count % 50 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    setImportedCount(count);
    setImporting(false);
    setStep(STEPS.DONE);
    onImported?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#e6f9ed] rounded-xl flex items-center justify-center">
              <Upload size={18} className="text-[#00af38]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1a2332]">Importar Pacientes</h2>
              <p className="text-xs text-gray-400">Fichero CSV con separador punto y coma</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── PASO 1: SUBIR FICHERO ── */}
          {step === STEPS.UPLOAD && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center cursor-pointer hover:border-[#00af38] hover:bg-[#f8fef9] transition-all group"
              >
                <div className="w-14 h-14 bg-gray-50 group-hover:bg-[#e6f9ed] rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                  <FileText size={28} className="text-gray-300 group-hover:text-[#00af38] transition-colors" />
                </div>
                <p className="font-semibold text-gray-700">
                  Arrastra tu fichero CSV aquí
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  o haz clic para seleccionarlo
                </p>
                <p className="text-xs text-gray-300 mt-3">
                  Formato: Nombre;Apellidos;Teléfono;Email;Última cita;Total citas
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Guía de formato */}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-semibold text-gray-600 mb-2">Formato esperado del CSV:</p>
                <p className="font-mono bg-white rounded-lg px-3 py-2 border border-gray-100 overflow-x-auto whitespace-nowrap">
                  Nombre;Apellidos;Teléfono;Email;Última cita;Total citas
                </p>
                <p className="mt-2">
                  ✓ Compatible con el exportado de tu sistema actual (Bookly)
                </p>
              </div>
            </div>
          )}

          {/* ── PASO 2: PREVISUALIZACIÓN ── */}
          {step === STEPS.PREVIEW && (
            <div className="space-y-5">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  icon={Users}
                  label="Total detectados"
                  value={parsed.length}
                  color="text-[#1a2332]"
                  bg="bg-gray-50"
                />
                <SummaryCard
                  icon={CheckCircle2}
                  label="A importar"
                  value={toImport.length}
                  color="text-[#00af38]"
                  bg="bg-[#e6f9ed]"
                />
                <SummaryCard
                  icon={SkipForward}
                  label="Ya existen"
                  value={duplicates.length}
                  color="text-amber-600"
                  bg="bg-amber-50"
                />
              </div>

              {fileName && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <FileText size={13} /> {fileName}
                </p>
              )}

              {/* Vista previa */}
              <div>
                <p className="text-sm font-semibold text-[#1a2332] mb-2">
                  Vista previa (primeros 10)
                </p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Nombre</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Teléfono</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 hidden sm:table-cell">Email</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {toImport.slice(0, 10).map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-[#1a2332] truncate max-w-[150px]">
                            {p.name}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{p.phone || '—'}</td>
                          <td className="px-3 py-2 text-gray-400 truncate max-w-[160px] hidden sm:table-cell">
                            {p.email || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[#00af38] bg-[#e6f9ed] px-2 py-0.5 rounded-full font-medium">
                              Nuevo
                            </span>
                          </td>
                        </tr>
                      ))}
                      {duplicates.slice(0, 3).map((p, i) => (
                        <tr key={'dup' + i} className="opacity-50">
                          <td className="px-3 py-2 font-medium text-[#1a2332] truncate max-w-[150px]">
                            {p.name}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{p.phone || '—'}</td>
                          <td className="px-3 py-2 text-gray-400 truncate max-w-[160px] hidden sm:table-cell">
                            {p.email || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                              Duplicado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {toImport.length > 10 && (
                    <p className="text-xs text-gray-400 text-center py-2 bg-gray-50 border-t border-gray-100">
                      + {toImport.length - 10} pacientes más
                    </p>
                  )}
                </div>
              </div>

              {duplicates.length > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3 flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  Se omitirán {duplicates.length} paciente
                  {duplicates.length !== 1 ? 's' : ''} que ya existen (mismo teléfono o email).
                </p>
              )}

              {toImport.length === 0 && (
                <p className="text-sm text-center text-gray-500 py-4">
                  Todos los pacientes del CSV ya están en el sistema.
                </p>
              )}
            </div>
          )}

          {/* ── PASO 3: RESULTADO ── */}
          {step === STEPS.DONE && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-[#e6f9ed] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-[#00af38]" />
              </div>
              <div>
                <p className="text-xl font-bold text-[#1a2332]">
                  ¡Importación completada!
                </p>
                <p className="text-gray-500 mt-1 text-sm">
                  Se han añadido{' '}
                  <span className="font-bold text-[#00af38]">{importedCount} pacientes</span>{' '}
                  al sistema.
                </p>
                {duplicates.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {duplicates.length} omitidos por duplicado.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step === STEPS.UPLOAD && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}

          {step === STEPS.PREVIEW && (
            <>
              <button
                onClick={() => setStep(STEPS.UPLOAD)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleImport}
                disabled={importing || toImport.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Importar {toImport.length} pacientes
                  </>
                )}
              </button>
            </>
          )}

          {step === STEPS.DONE && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <Icon size={20} className={`${color} mx-auto mb-1`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
