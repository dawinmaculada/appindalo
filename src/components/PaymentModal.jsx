import { useState } from 'react';
import { X, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';

const PAYMENT_OPTIONS = [
  { key: 'session', label: 'Sesión',   sublabel: '1 sesión',    amount: 48  },
  { key: 'bono5',   label: 'Bono 5',   sublabel: '5 sesiones',  amount: 225 },
  { key: 'bono10',  label: 'Bono 10',  sublabel: '10 sesiones', amount: 420 },
];

export default function PaymentModal({ appointment, patient, treatment, onConfirm, onClose }) {
  const [paymentType,   setPaymentType]   = useState('session');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [adjustment,    setAdjustment]    = useState('');

  const base  = PAYMENT_OPTIONS.find((o) => o.key === paymentType)?.amount ?? 48;
  const adj   = parseFloat(adjustment) || 0;
  const total = base + adj;

  const handleConfirm = () => {
    onConfirm({
      paymentType,
      paymentMethod,
      baseAmount: base,
      adjustment: adj,
      total,
      paidAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Cabecera */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-[#1a2332] text-lg">Cobrar cita</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {patient?.name || '—'} · {treatment?.name || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Tipo de cobro */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Tipo de cobro</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaymentType(opt.key)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    paymentType === opt.key
                      ? 'border-[#00af38] bg-[#e6f9ed]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-xs font-bold ${paymentType === opt.key ? 'text-[#00af38]' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[10px] mt-0.5 ${paymentType === opt.key ? 'text-[#00af38]/70' : 'text-gray-400'}`}>
                    {opt.sublabel}
                  </span>
                  <span className={`text-lg font-extrabold mt-1 ${paymentType === opt.key ? 'text-[#00af38]' : 'text-[#1a2332]'}`}>
                    {opt.amount}€
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ajuste personalizado */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Ajuste personalizado</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">€</span>
              <input
                type="number"
                step="0.01"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00af38]/30 focus:border-[#00af38]"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Número negativo para descuento · positivo para cargo extra
            </p>
          </div>

          {/* Total */}
          <div className={`rounded-xl px-5 py-4 flex items-center justify-between ${
            total >= 0 ? 'bg-[#e6f9ed]' : 'bg-red-50'
          }`}>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total a cobrar</p>
              {adj !== 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {base}€ {adj > 0 ? `+ ${adj}€` : `− ${Math.abs(adj)}€`}
                </p>
              )}
            </div>
            <span className={`text-3xl font-extrabold ${total >= 0 ? 'text-[#00af38]' : 'text-red-500'}`}>
              {total % 1 === 0 ? total : total.toFixed(2)}€
            </span>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  paymentMethod === 'efectivo'
                    ? 'border-[#00af38] bg-[#e6f9ed] text-[#00af38]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Banknote size={17} /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('tarjeta')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  paymentMethod === 'tarjeta'
                    ? 'border-[#00af38] bg-[#e6f9ed] text-[#00af38]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <CreditCard size={17} /> Tarjeta
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#00af38] rounded-xl hover:bg-[#008a2c] transition-colors shadow-lg shadow-[#00af38]/20"
            >
              <CheckCircle2 size={15} />
              Confirmar pago
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
