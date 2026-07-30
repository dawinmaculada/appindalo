import { useState, useMemo } from 'react';
import {
  X, Plus, Trash2, Printer, FileText, CreditCard, Banknote, Clock,
  ChevronDown, ChevronUp, Building2, User,
} from 'lucide-react';
import { TREATMENTS } from '../data/treatments';
import { saveInvoice, saveAppointment, getIssuerData, saveIssuerData } from '../services/storage';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const IVA = 0.21;
const fmt  = (n) => (n % 1 === 0 ? `${n}€` : `${n.toFixed(2)}€`);
const fmt2 = (n) => `${n.toFixed(2)}€`;

const PAYMENT_OPTIONS = [
  { key: 'session', label: 'Sesión',  sublabel: '1 sesión',    amount: 48  },
  { key: 'bono5',   label: 'Bono 5',  sublabel: '5 sesiones',  amount: 225 },
  { key: 'bono10',  label: 'Bono 10', sublabel: '10 sesiones', amount: 420 },
];

// Los precios son IVA incluido → desglosamos hacia atrás
function calcIva(total) {
  const base = total / (1 + IVA);
  const iva  = total - base;
  return { base, iva };
}

// ── HTML para la ventana de impresión ────────────────────────────────────────
function buildPrintHtml(invoice, patient, clientData, issuer) {
  const dateStr = format(parseISO(invoice.date), "d 'de' MMMM 'de' yyyy", { locale: es });
  const { base, iva } = calcIva(invoice.total);

  const rows = invoice.lineItems.map((item) => {
    const sub = item.qty * item.price;
    const sublabelNote = item.sublabel
      ? `<br><span style="color:#00af38;font-size:11px;font-weight:600;">${item.sublabel}</span>`
      : '';
    const dateNote = item.date
      ? `<br><span style="color:#9ca3af;font-size:11px;">${format(parseISO(item.date), 'd MMM yyyy', { locale: es })}${item.time ? ' · ' + item.time : ''}</span>`
      : '';
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;">${item.description}${sublabelNote}${dateNote}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:center;font-size:13px;">${item.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;">${fmt2(item.price)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;">${fmt2(sub)}</td>
    </tr>`;
  }).join('');

  const pmLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', pendiente: 'Pendiente de pago' };

  const issuerBlock = `
    <div><strong style="font-size:16px;color:#00af38;">${issuer.name}</strong></div>
    ${issuer.nif     ? `<div>NIF: ${issuer.nif}</div>` : ''}
    ${issuer.address ? `<div>${issuer.address}</div>` : ''}
    ${issuer.phone   ? `<div>${issuer.phone}</div>` : ''}
    ${issuer.email   ? `<div>${issuer.email}</div>` : ''}`;

  const clientBlock = `
    <div><strong>${clientData.name}</strong></div>
    ${clientData.nif     ? `<div>NIF/DNI: ${clientData.nif}</div>` : ''}
    ${clientData.address ? `<div>${clientData.address}</div>` : ''}
    ${clientData.email   ? `<div>${clientData.email}</div>` : ''}
    ${clientData.phone   ? `<div>${clientData.phone}</div>` : ''}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${invoice.number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;color:#1a2332;font-size:13px;padding:48px;}
    @media print{body{padding:24px;}.no-print{display:none!important;}}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:2px solid #00af38;}
    .invoice-ref{text-align:right;}
    .invoice-ref .num{font-size:20px;font-weight:800;color:#1a2332;}
    .invoice-ref .date{color:#9ca3af;font-size:12px;margin-top:4px;}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;}
    .party-box{background:#f8fafb;border-radius:8px;padding:16px;font-size:12px;line-height:1.7;color:#374151;}
    .party-label{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#9ca3af;font-weight:700;margin-bottom:8px;}
    table{width:100%;border-collapse:collapse;margin-bottom:0;}
    th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;font-weight:700;padding-bottom:10px;border-bottom:2px solid #e5e7eb;}
    th.r{text-align:right;}th.c{text-align:center;}
    .tax-block{margin-top:0;border-top:1px solid #e5e7eb;padding-top:16px;}
    .tax-row{display:flex;justify-content:space-between;font-size:13px;color:#6b7280;padding:4px 0;}
    .tax-row.total{font-size:16px;font-weight:800;color:#00af38;border-top:2px solid #e5e7eb;margin-top:8px;padding-top:12px;}
    .footer{margin-top:32px;border-top:1px solid #f3f4f6;padding-top:16px;display:flex;justify-content:space-between;align-items:center;}
    .badge{background:#e6f9ed;color:#00af38;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;}
    .print-btn{position:fixed;bottom:24px;right:24px;background:#00af38;color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,175,56,.35);}
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size:12px;line-height:1.7;color:#374151;">${issuerBlock}</div>
    <div class="invoice-ref">
      <div class="num">FACTURA ${invoice.number}</div>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Emisor</div>
      ${issuerBlock}
    </div>
    <div class="party-box">
      <div class="party-label">Cliente</div>
      ${clientBlock}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th class="c" style="width:56px">Ud.</th>
        <th class="r" style="width:100px">Precio ud.</th>
        <th class="r" style="width:100px">Importe</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="tax-block">
    <div class="tax-row"><span>Base imponible</span><span>${fmt2(base)}</span></div>
    <div class="tax-row"><span>IVA (21%)</span><span>${fmt2(iva)}</span></div>
    <div class="tax-row total"><span>TOTAL</span><span>${fmt2(invoice.total)}</span></div>
  </div>

  <div class="footer">
    <span class="badge">${pmLabel[invoice.paymentMethod] || invoice.paymentMethod}</span>
    ${invoice.notes ? `<span style="font-size:12px;color:#9ca3af;font-style:italic;">${invoice.notes}</span>` : ''}
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
</body>
</html>`;
}

// ── Sección colapsable ───────────────────────────────────────────────────────
function Section({ icon: Icon, title, badge, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#1a2332]">
          <Icon size={15} className="text-gray-400" />
          {title}
          {badge && (
            <span className="text-xs text-[#00af38] font-medium">{badge}</span>
          )}
        </span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
      />
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function InvoiceModal({ patient, appointments, onClose }) {
  const [step, setStep] = useState('select');
  const [selected, setSelected] = useState(new Set());
  const [manualItems, setManualItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState(null);

  // Datos del emisor (persistidos en localStorage)
  const [issuer, setIssuer] = useState(getIssuerData);
  const updateIssuer = (field, val) => setIssuer((p) => ({ ...p, [field]: val }));

  // Datos del cliente (prefill desde paciente)
  const [clientData, setClientData] = useState({
    name:    patient.name    || '',
    nif:     patient.nif     || '',
    address: patient.address || '',
    email:   patient.email   || '',
    phone:   patient.phone   || '',
  });
  const updateClient = (field, val) => setClientData((p) => ({ ...p, [field]: val }));

  // Sesiones disponibles (sin factura, sin cancelar)
  const available = useMemo(() =>
    appointments
      .filter((a) => !a.invoiceId && a.status !== 'cancelled')
      .sort((a, b) =>
        new Date(b.date + 'T' + (b.time || '00:00')) -
        new Date(a.date + 'T' + (a.time || '00:00'))
      ),
    [appointments]
  );

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addManual = () =>
    setManualItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: '', qty: 1, price: '' },
    ]);

  const updateManual = (id, field, value) =>
    setManualItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );

  const removeManual = (id) =>
    setManualItems((prev) => prev.filter((item) => item.id !== id));

  const selectedApts = available.filter((a) => selected.has(a.id));

  const lineItems = [
    ...selectedApts.map((a) => {
      const treatment = TREATMENTS.find((t) => t.id === a.treatmentId);
      const billing   = a.billing;

      if (billing) {
        // Usar el cobro real registrado (sesión, bono5, bono10)
        const opt = PAYMENT_OPTIONS.find((o) => o.key === billing.paymentType);
        const description = billing.paymentType === 'session'
          ? treatment?.name || 'Sesión'
          : `${opt?.label || billing.paymentType} · ${treatment?.name || 'Sesiones'}`;
        return {
          type: 'session',
          appointmentId: a.id,
          description,
          sublabel: opt?.sublabel,
          date: a.date,
          time: a.time,
          qty: 1,
          price: billing.total, // importe real cobrado
        };
      }

      // Sin cobro previo → precio de tratamiento individual
      return {
        type: 'session',
        appointmentId: a.id,
        description: treatment?.name || 'Sesión',
        sublabel: '1 sesión',
        date: a.date,
        time: a.time,
        qty: 1,
        price: treatment?.price ?? 48,
      };
    }),
    ...manualItems.map((item) => ({
      type: 'manual',
      id: item.id,
      description: item.description,
      qty: Number(item.qty) || 1,
      price: Number(item.price) || 0,
    })),
  ];

  const total = lineItems.reduce((s, i) => s + i.qty * i.price, 0);
  const { base, iva } = calcIva(total);

  const canCreate =
    lineItems.length > 0 &&
    lineItems.every((i) => i.description.trim() && i.price > 0);

  const handleCreate = () => {
    saveIssuerData(issuer);

    const invoice = saveInvoice({
      patientId: patient.id,
      date: invoiceDate,
      lineItems,
      total,
      base,
      iva,
      paymentMethod,
      notes,
      issuer,
      clientData,
    });

    selectedApts.forEach((apt) =>
      saveAppointment({ ...apt, invoiceId: invoice.id })
    );

    setCreatedInvoice(invoice);
    setStep('preview');
  };

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=720');
    win.document.write(buildPrintHtml(createdInvoice, patient, clientData, issuer));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e6f9ed] flex items-center justify-center flex-shrink-0">
              <FileText size={17} className="text-[#00af38]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1a2332] text-lg leading-tight">
                {step === 'select' ? 'Nueva Factura' : createdInvoice?.number}
              </h2>
              <p className="text-sm text-gray-400">{patient.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── PASO 1: Selección ─────────────────────────────────── */}
        {step === 'select' && (
          <div className="p-6 space-y-5">

            {/* Sesiones */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1a2332]">Sesiones del paciente</h3>
                {selected.size > 0 && (
                  <span className="text-xs text-[#00af38] font-medium">
                    {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {available.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                  No hay sesiones disponibles para facturar.
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {available.map((a) => {
                    const treatment = TREATMENTS.find((t) => t.id === a.treatmentId);
                    const isSelected = selected.has(a.id);
                    const billing    = a.billing;
                    const opt        = billing ? PAYMENT_OPTIONS.find((o) => o.key === billing.paymentType) : null;
                    const displayPrice = billing ? billing.total : (treatment?.price ?? 48);
                    const typeLabel    = opt && billing.paymentType !== 'session' ? opt.label : null;
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#00af38] bg-[#e6f9ed]'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        <input type="checkbox" checked={isSelected} onChange={() => toggle(a.id)} className="sr-only" />
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'border-[#00af38] bg-[#00af38]' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                        <span className="text-base flex-shrink-0">{treatment?.icon || '📅'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium text-[#1a2332] truncate">{treatment?.name || 'Sesión'}</p>
                            {typeLabel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#00af38] text-white font-bold flex-shrink-0">
                                {typeLabel}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {a.date ? format(parseISO(a.date), 'd MMM yyyy', { locale: es }) : '—'}
                            {a.time && ` · ${a.time}`}
                            {opt && <span className="ml-1 text-gray-500">· {opt.sublabel}</span>}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#1a2332] flex-shrink-0">
                          {fmt(displayPrice)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Líneas manuales */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1a2332]">Líneas adicionales</h3>
                <button type="button" onClick={addManual}
                  className="flex items-center gap-1.5 text-xs text-[#00af38] font-semibold hover:bg-[#e6f9ed] px-2.5 py-1.5 rounded-lg transition-colors">
                  <Plus size={12} /> Añadir línea
                </button>
              </div>
              {manualItems.length === 0 ? (
                <p className="text-xs text-gray-400">Opcional: materiales o servicios sin sesión asociada.</p>
              ) : (
                <div className="space-y-2">
                  {manualItems.map((item) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input type="text" value={item.description}
                        onChange={(e) => updateManual(item.id, 'description', e.target.value)}
                        placeholder="Descripción..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]" />
                      <input type="number" value={item.qty}
                        onChange={(e) => updateManual(item.id, 'qty', e.target.value)}
                        min="1" placeholder="Ud"
                        className="w-14 px-2 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] text-center" />
                      <div className="relative w-24">
                        <input type="number" value={item.price}
                          onChange={(e) => updateManual(item.id, 'price', e.target.value)}
                          min="0" step="0.01" placeholder="0"
                          className="w-full pl-3 pr-6 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">€</span>
                      </div>
                      <button type="button" onClick={() => removeManual(item.id)}
                        className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Datos del emisor */}
            <Section icon={Building2} title="Datos del emisor" badge={issuer.name ? issuer.name : 'Sin rellenar'}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre / Razón social" value={issuer.name} onChange={(v) => updateIssuer('name', v)} placeholder="Osteopatía Indalo" />
                <Field label="NIF / CIF" value={issuer.nif} onChange={(v) => updateIssuer('nif', v)} placeholder="B12345678" />
              </div>
              <Field label="Dirección" value={issuer.address} onChange={(v) => updateIssuer('address', v)} placeholder="Calle, número, ciudad, CP" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono" value={issuer.phone} onChange={(v) => updateIssuer('phone', v)} placeholder="600 000 000" />
                <Field label="Email" value={issuer.email} onChange={(v) => updateIssuer('email', v)} placeholder="info@clinica.es" type="email" />
              </div>
              <p className="text-[11px] text-gray-400">Estos datos se guardan automáticamente para la próxima factura.</p>
            </Section>

            {/* Datos del cliente */}
            <Section icon={User} title="Datos del cliente" badge={clientData.nif ? `NIF: ${clientData.nif}` : 'Sin NIF'}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre completo" value={clientData.name} onChange={(v) => updateClient('name', v)} placeholder="Nombre del cliente" />
                <Field label="NIF / DNI" value={clientData.nif} onChange={(v) => updateClient('nif', v)} placeholder="12345678A" />
              </div>
              <Field label="Dirección" value={clientData.address} onChange={(v) => updateClient('address', v)} placeholder="Calle, número, ciudad, CP" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" value={clientData.email} onChange={(v) => updateClient('email', v)} placeholder="cliente@email.com" type="email" />
                <Field label="Teléfono" value={clientData.phone} onChange={(v) => updateClient('phone', v)} placeholder="600 000 000" />
              </div>
            </Section>

            {/* Fecha y pago */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de factura</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Método de pago</label>
                <div className="flex gap-2">
                  {[
                    { value: 'efectivo',  label: 'Efectivo', Icon: Banknote },
                    { value: 'tarjeta',   label: 'Tarjeta',  Icon: CreditCard },
                    { value: 'pendiente', label: 'Pendiente', Icon: Clock },
                  ].map(({ value, label, Icon }) => (
                    <button key={value} type="button" onClick={() => setPaymentMethod(value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] font-semibold rounded-xl border-2 transition-all ${
                        paymentMethod === value
                          ? 'border-[#00af38] bg-[#e6f9ed] text-[#00af38]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      <Icon size={14} />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas (opcional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Observaciones que aparecerán en la factura..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38] resize-none" />
            </div>

            {/* Resumen IVA + acción */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              {total > 0 && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Base imponible</span>
                    <span>{fmt2(base)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>IVA (21%)</span>
                    <span>{fmt2(iva)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[#00af38] text-lg border-t border-gray-200 pt-2 mt-1">
                    <span>Total</span>
                    <span>{fmt2(total)}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={handleCreate} disabled={!canCreate}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <FileText size={15} /> Crear factura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 2: Vista previa ──────────────────────────────── */}
        {step === 'preview' && createdInvoice && (
          <div className="p-6 space-y-5">
            <div className="bg-[#e6f9ed] rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-[#00af38] text-lg">✓</span>
              <p className="text-sm font-semibold text-[#00af38]">
                Factura {createdInvoice.number} creada correctamente
              </p>
            </div>

            {/* Preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden text-sm">
              {/* Cabecera verde */}
              <div className="bg-[#00af38] px-5 py-4 flex items-start justify-between">
                <div>
                  <p className="text-white font-bold text-base">{issuer.name}</p>
                  {issuer.nif && <p className="text-white/70 text-xs mt-0.5">NIF: {issuer.nif}</p>}
                  {issuer.address && <p className="text-white/70 text-xs">{issuer.address}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{createdInvoice.number}</p>
                  <p className="text-white/70 text-xs">
                    {format(parseISO(createdInvoice.date), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Emisor + Cliente */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Emisor</p>
                    <p className="font-bold text-[#1a2332] text-xs">{issuer.name}</p>
                    {issuer.nif && <p className="text-[11px] text-gray-400">NIF: {issuer.nif}</p>}
                    {issuer.address && <p className="text-[11px] text-gray-400">{issuer.address}</p>}
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Cliente</p>
                    <p className="font-bold text-[#1a2332] text-xs">{clientData.name}</p>
                    {clientData.nif && <p className="text-[11px] text-gray-400">NIF/DNI: {clientData.nif}</p>}
                    {clientData.address && <p className="text-[11px] text-gray-400">{clientData.address}</p>}
                    {clientData.email && <p className="text-[11px] text-gray-400">{clientData.email}</p>}
                  </div>
                </div>

                {/* Líneas */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left pb-2 font-semibold text-gray-500">Concepto</th>
                      <th className="text-center pb-2 font-semibold text-gray-500 w-10">Ud.</th>
                      <th className="text-right pb-2 font-semibold text-gray-500 w-20">Precio</th>
                      <th className="text-right pb-2 font-semibold text-gray-500 w-20">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {createdInvoice.lineItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2.5">
                          <p className="font-medium text-[#1a2332]">{item.description}</p>
                          {item.sublabel && (
                            <p className="text-[10px] text-[#00af38] font-semibold mt-0.5">{item.sublabel}</p>
                          )}
                          {item.date && (
                            <p className="text-gray-400 text-[10px] mt-0.5">
                              {format(parseISO(item.date), 'd MMM yyyy', { locale: es })}
                              {item.time && ` · ${item.time}`}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-gray-600">{item.qty}</td>
                        <td className="py-2.5 text-right text-gray-600">{fmt2(item.price)}</td>
                        <td className="py-2.5 text-right font-semibold text-[#1a2332]">
                          {fmt2(item.qty * item.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Desglose IVA */}
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Base imponible</span>
                    <span>{fmt2(createdInvoice.base)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>IVA (21%)</span>
                    <span>{fmt2(createdInvoice.iva)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[#00af38] border-t border-gray-200 pt-2 mt-1">
                    <span className="text-sm">TOTAL</span>
                    <span className="text-xl">{fmt2(createdInvoice.total)}</span>
                  </div>
                </div>

                {/* Método + notas */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-[#e6f9ed] text-[#00af38] font-semibold">
                    {createdInvoice.paymentMethod === 'efectivo' ? '💵 Efectivo'
                      : createdInvoice.paymentMethod === 'tarjeta' ? '💳 Tarjeta'
                      : '⏳ Pendiente de pago'}
                  </span>
                  {createdInvoice.notes && (
                    <p className="text-xs text-gray-400 italic">{createdInvoice.notes}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cerrar
              </button>
              <button type="button" onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors">
                <Printer size={15} /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
