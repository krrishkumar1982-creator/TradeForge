import React from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, theme } = useTrading();
  const isLight = theme === 'light';

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let borderClass = isLight
          ? 'border-slate-200 bg-white text-slate-900 shadow-lg'
          : 'border-[rgba(255,255,255,0.10)] bg-[#181A21] text-slate-100';
        let Icon = Info;
        let iconColor = isLight ? 'text-blue-600' : 'text-blue-400';

        if (toast.type === 'success') {
          borderClass = isLight
            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-950 shadow-md'
            : 'border-emerald-500/30 bg-[#141822] text-slate-100';
          Icon = CheckCircle2;
          iconColor = isLight ? 'text-emerald-600' : 'text-emerald-400';
        } else if (toast.type === 'error') {
          borderClass = isLight
            ? 'border-rose-200 bg-rose-50/90 text-rose-950 shadow-md'
            : 'border-rose-500/30 bg-[#1A1318] text-slate-100';
          Icon = AlertCircle;
          iconColor = isLight ? 'text-rose-600' : 'text-rose-400';
        } else if (toast.type === 'warning') {
          borderClass = isLight
            ? 'border-amber-200 bg-amber-50/90 text-amber-950 shadow-md'
            : 'border-amber-500/30 bg-[#1C1712] text-slate-100';
          Icon = AlertTriangle;
          iconColor = isLight ? 'text-amber-600' : 'text-amber-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borderClass} animate-in slide-in-from-bottom-2 duration-140`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h5 className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{toast.title}</h5>
              {toast.message && (
                <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`p-0.5 rounded transition cursor-pointer shrink-0 ${
                isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
