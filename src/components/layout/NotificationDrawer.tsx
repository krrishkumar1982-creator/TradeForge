import React from 'react';
import {
  X,
  Bell,
  CheckCheck,
  AlertTriangle,
  Zap,
  Calendar,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    markNotificationRead,
    clearAllNotifications,
    setActiveView,
    theme,
  } = useTrading();

  const isLight = theme === 'light';

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TRADE_SYNC':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'RISK_ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'GOAL_ACHIEVED':
        return <CheckCheck className="w-4 h-4 text-blue-400" />;
      case 'ECONOMIC_REMINDER':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      case 'JOURNAL_REMINDER':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-140">
      <div
        className={`w-full max-w-md h-full shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-200 border-l ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#101116] border-[rgba(255,255,255,0.08)] text-slate-100'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-[rgba(255,255,255,0.07)] bg-[#0C0D12]'
        }`}>
          <div className="flex items-center gap-2">
            <Bell className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <h2 className={`text-xs font-semibold tracking-tight uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>Notifications & Risk Alerts</h2>
            {unreadCount > 0 && (
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.2 rounded ${
                isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
              }`}>
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className={`text-xs p-1.5 rounded-lg transition cursor-pointer ${
                  isLight ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                }`}
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-[#181A21]'
              }`}
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className={`text-center py-20 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>No active alerts</p>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>All trade monitors and risk triggers are nominal</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  notif.read
                    ? isLight
                      ? 'bg-slate-50/80 border-slate-200 opacity-70 hover:opacity-100'
                      : 'bg-[#0C0D12]/70 border-[rgba(255,255,255,0.04)] opacity-70 hover:opacity-100'
                    : isLight
                    ? 'bg-white border-blue-300 shadow-xs hover:border-blue-500'
                    : 'bg-[#181A21] border-blue-500/25 shadow-xs hover:border-blue-500/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                    isLight ? 'border-slate-200 bg-slate-100' : 'border-[rgba(255,255,255,0.06)] bg-[#0C0D12]'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{notif.title}</h4>
                      <span className={`text-[10px] font-mono shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{notif.timestamp}</span>
                    </div>
                    <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{notif.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`p-3.5 border-t flex items-center justify-between text-xs ${
          isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[rgba(255,255,255,0.07)] bg-[#0C0D12] text-slate-400'
        }`}>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Audit engine sync active</span>
          </div>
          <button
            onClick={() => {
              onClose();
              setActiveView('goals');
            }}
            className={`font-semibold text-xs transition cursor-pointer ${
              isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            Configure Risk Limits →
          </button>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
