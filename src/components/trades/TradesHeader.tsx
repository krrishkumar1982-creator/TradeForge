import React, { useState } from 'react';
import { Plus, Trash2, Link2, Radio, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { TradeConnectModal } from './TradeConnectModal';
import { TradeClearAllModal } from './TradeClearAllModal';

interface TradesHeaderProps {
  onOpenAddTrade: () => void;
  tradeCount: number;
}

export const TradesHeader: React.FC<TradesHeaderProps> = ({ onOpenAddTrade, tradeCount }) => {
  const { connections, clearAllTradesData } = useTrading();

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);

  // Compute dynamic connection status from real active connections
  const connectionState = React.useMemo(() => {
    if (!connections || connections.length === 0) {
      return {
        label: 'Not connected',
        dotColor: 'bg-[#52525B]',
        textColor: 'text-[#71717A]',
        isPulse: false,
      };
    }

    const isSyncing = connections.some(c => c.connectionStatus === 'SYNCING');
    if (isSyncing) {
      return {
        label: 'Syncing',
        dotColor: 'bg-blue-400',
        textColor: 'text-blue-400',
        isPulse: true,
      };
    }

    const hasError = connections.some(
      c => c.connectionStatus === 'ERROR' || c.connectionStatus === 'REAUTH_REQUIRED'
    );
    if (hasError) {
      return {
        label: 'Connection error',
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-400',
        isPulse: false,
      };
    }

    const connectedConn = connections.find(
      c => c.connectionStatus === 'CONNECTED' || c.connectionStatus === 'SYNCED'
    );
    if (connectedConn) {
      const brokerName = connectedConn.broker || connectedConn.platform || 'Bridge';
      return {
        label: `Connected${brokerName ? ` · ${brokerName}` : ''}`,
        dotColor: 'bg-emerald-500',
        textColor: 'text-[#A1A1AA]',
        isPulse: false,
      };
    }

    return {
      label: 'Not connected',
      dotColor: 'bg-[#52525B]',
      textColor: 'text-[#71717A]',
      isPulse: false,
    };
  }, [connections]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        {/* Left Side: Title & Dynamic Connection Status */}
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#F5F5F5]">
            Trades
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Review every trade in one place.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${connectionState.dotColor} ${
                connectionState.isPulse ? 'animate-pulse' : ''
              }`}
            />
            <span className={`text-xs font-medium ${connectionState.textColor}`}>
              {connectionState.label}
            </span>
          </div>
        </div>

        {/* Right Side Buttons: [Connect MT4/MT5] [Clear All] [+ Add Trade] */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Connect MT4/MT5 */}
          <button
            type="button"
            onClick={() => setIsConnectOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition cursor-pointer shadow-[0_0_12px_rgba(37,99,235,0.25)] active:scale-[0.98]"
          >
            <span>Connect MT4/MT5</span>
          </button>

          {/* Clear Trades */}
          <button
            type="button"
            onClick={() => setIsClearOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F0F0F] hover:bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-medium transition cursor-pointer active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Trades</span>
          </button>

          {/* + Add Trade */}
          <button
            type="button"
            onClick={onOpenAddTrade}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.35)] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <TradeConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
      <TradeClearAllModal
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={clearAllTradesData}
        tradeCount={tradeCount}
      />
    </>
  );
};
