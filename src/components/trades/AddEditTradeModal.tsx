import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Edit3,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Star,
  BookmarkCheck,
  Shield,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  Tag,
  Zap,
  Check,
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';
import { Trade, MarketType, TradeDirection, TradeStatus, SessionType } from '../../types';
import { SupabaseStorageService } from '../../services/supabaseStorage';
import { getTagColor, hexToRgba } from '../../utils/tagColors';
import { validatePreTrade, logRiskEvent, getInstrumentUnitLabel } from '../../services/riskEngine';
import { calculateTradeFinancials } from '../../lib/calcEngine';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDateTimePicker } from '../common/CustomDateTimePicker';

interface AddEditTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeToEdit?: Trade | null;
}

export const AddEditTradeModal: React.FC<AddEditTradeModalProps> = ({
  isOpen,
  onClose,
  tradeToEdit,
}) => {
  const {
    addTrade,
    updateTrade,
    playbooks,
    accounts,
    propFirmAccounts,
    selectedAccountId,
    riskGoals,
    getAccountRiskGoals,
    trades,
    addToast,
    userSettings,
    formatCurrency,
  } = useTrading();

  const [formError, setFormError] = useState<string>('');

  // Primary Execution Fields
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [status, setStatus] = useState<TradeStatus>('CLOSED');
  const [symbol, setSymbol] = useState('MES');
  const [market, setMarket] = useState<MarketType>('Futures');
  const [quantity, setQuantity] = useState('1');
  const [entryPrice, setEntryPrice] = useState('5642.50');
  const [exitPrice, setExitPrice] = useState('5668.00');
  const [stopLoss, setStopLoss] = useState('5634.50');
  const [takeProfit, setTakeProfit] = useState('5670.00');

  // Dates & Times
  const [entryDate, setEntryDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const [exitDate, setExitDate] = useState(() => {
    const exitD = new Date(Date.now() + 35 * 60000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${exitD.getFullYear()}-${pad(exitD.getMonth() + 1)}-${pad(exitD.getDate())}T${pad(exitD.getHours())}:${pad(exitD.getMinutes())}`;
  });

  // Trade Context
  const [accountId, setAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [propFirmAccountId, setPropFirmAccountId] = useState<string>('');
  const [session, setSession] = useState<SessionType>('New York');
  const [playbookId, setPlaybookId] = useState<string>(playbooks[0]?.id || '');
  const [setupId, setSetupId] = useState<string>('');
  const [setupType, setSetupType] = useState('Opening Drive');
  const [setupGrade, setSetupGrade] = useState<'A+' | 'A' | 'B' | 'C' | 'D' | ''>('');
  const [checkedRuleIds, setCheckedRuleIds] = useState<string[]>([]);

  // Review & Discipline
  const [emotionalState, setEmotionalState] = useState<
    'Disciplined' | 'Confident' | 'Neutral' | 'FOMO' | 'Revenge' | 'Hesitant' | 'Greedy'
  >('Disciplined');
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState('Strong morning liquidity sweep. Held until liquidity target reached.');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [mistakeCategory, setMistakeCategory] = useState<string>('Entry Discipline');
  const [mistakeDescription, setMistakeDescription] = useState<string>('');
  const [mistakeSeverity, setMistakeSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [rulesFollowed, setRulesFollowed] = useState(true);

  // Screenshots & Attachments
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  // Collapsible UI state
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(true);
  const [showAdvancedRisk, setShowAdvancedRisk] = useState<boolean>(false);

  // Handle Screenshot Upload
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await SupabaseStorageService.uploadTradeScreenshot(file, tradeToEdit?.id);
      setScreenshotUrl(uploadedUrl);
    } catch (err) {
      console.error('Failed to upload trade screenshot:', err);
    } finally {
      setIsUploadingImage(false);
      if (screenshotInputRef.current) screenshotInputRef.current.value = '';
    }
  };

  // Populate data when opening / editing
  useEffect(() => {
    if (tradeToEdit) {
      setAccountId(tradeToEdit.accountId);
      setPropFirmAccountId(tradeToEdit.propFirmAccountId || '');
      setSymbol(tradeToEdit.symbol);
      setMarket(tradeToEdit.market);
      setDirection(tradeToEdit.direction);
      setStatus(tradeToEdit.status);
      setEntryPrice(tradeToEdit.entryPrice.toString());
      setExitPrice(tradeToEdit.exitPrice !== undefined && tradeToEdit.exitPrice !== null ? tradeToEdit.exitPrice.toString() : '');
      setStopLoss(tradeToEdit.stopLoss ? tradeToEdit.stopLoss.toString() : '');
      setTakeProfit(tradeToEdit.takeProfit ? tradeToEdit.takeProfit.toString() : '');
      setQuantity(tradeToEdit.quantity.toString());
      setSession(tradeToEdit.session || 'New York');

      const foundPb =
        playbooks.find((p) => p.id === tradeToEdit.playbookId) ||
        playbooks.find((p) => p.name === tradeToEdit.setupType) ||
        playbooks[0];

      const pbIdToSet = foundPb?.id || tradeToEdit.playbookId || '';
      setPlaybookId(pbIdToSet);
      setSetupType(foundPb?.name || tradeToEdit.setupType || '');
      setSetupId(tradeToEdit.setupId || '');
      setSetupGrade(tradeToEdit.setupGrade || '');

      if (tradeToEdit.checkedRuleIds && Array.isArray(tradeToEdit.checkedRuleIds)) {
        setCheckedRuleIds(tradeToEdit.checkedRuleIds);
      } else if (foundPb?.rules && foundPb.rules.length > 0) {
        setCheckedRuleIds(tradeToEdit.rulesFollowed ? foundPb.rules.map((r) => r.id) : []);
      } else {
        setCheckedRuleIds([]);
      }

      setRulesFollowed(tradeToEdit.rulesFollowed);
      setMistakeCategory(tradeToEdit.mistakeCategory || 'Entry Discipline');
      setMistakeDescription(tradeToEdit.mistakeDescription || '');
      setMistakeSeverity(tradeToEdit.mistakeSeverity || 'Medium');
      setEmotionalState(tradeToEdit.emotionalState || 'Disciplined');
      setRating(tradeToEdit.rating ?? 5);
      setTags(tradeToEdit.tags || []);
      setScreenshotUrl(tradeToEdit.screenshotUrl || '');

      if (tradeToEdit.entryDate) {
        const d = new Date(tradeToEdit.entryDate);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          setEntryDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      }

      if (tradeToEdit.exitDate) {
        const d = new Date(tradeToEdit.exitDate);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          setExitDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      } else {
        const exitD = new Date(Date.now());
        const pad = (n: number) => n.toString().padStart(2, '0');
        setExitDate(`${exitD.getFullYear()}-${pad(exitD.getMonth() + 1)}-${pad(exitD.getDate())}T${pad(exitD.getHours())}:${pad(exitD.getMinutes())}`);
      }

      setNotes(tradeToEdit.notes || '');
      setShowChecklist(foundPb && foundPb.rules && foundPb.rules.length > 0 ? true : false);
    } else {
      // Default Trade creation
      const tradeDefaults = userSettings.tradeDefaults;
      const isSelectedPF = propFirmAccounts.find((pf) => pf.id === selectedAccountId);

      if (isSelectedPF) {
        setPropFirmAccountId(isSelectedPF.id);
        if (isSelectedPF.tradingAccountLink && isSelectedPF.tradingAccountLink !== 'all') {
          setAccountId(isSelectedPF.tradingAccountLink);
        } else if (tradeDefaults?.defaultAccountId && accounts.some((a) => a.id === tradeDefaults.defaultAccountId)) {
          setAccountId(tradeDefaults.defaultAccountId);
        } else {
          setAccountId(accounts[0]?.id || 'acc-1');
        }
      } else if (selectedAccountId && selectedAccountId !== 'all') {
        setAccountId(selectedAccountId);
        setPropFirmAccountId('');
      } else if (tradeDefaults?.defaultAccountId && accounts.some((a) => a.id === tradeDefaults.defaultAccountId)) {
        setAccountId(tradeDefaults.defaultAccountId);
        setPropFirmAccountId('');
      } else {
        setAccountId(accounts[0]?.id || 'acc-1');
        setPropFirmAccountId('');
      }

      setMarket((tradeDefaults?.defaultMarket as any) || 'Futures');
      setSession((tradeDefaults?.defaultSession as any) || 'New York');
      setDirection((tradeDefaults?.defaultDirection as any) || 'BUY');
      setQuantity(tradeDefaults?.defaultQuantity?.toString() || '1');
      setStatus((tradeDefaults?.defaultStatus as any) || 'CLOSED');
      setRating(5);
      setTags([]);

      const defaultPb =
        (tradeDefaults?.defaultPlaybookId && playbooks.find((p) => p.id === tradeDefaults.defaultPlaybookId)) ||
        (tradeDefaults?.defaultSetup && playbooks.find((p) => p.name === tradeDefaults.defaultSetup)) ||
        playbooks[0];

      setPlaybookId(defaultPb?.id || '');
      setSetupType(tradeDefaults?.defaultSetup || defaultPb?.name || 'Opening Drive');
      setSetupId('');
      setSetupGrade('');
      setCheckedRuleIds(defaultPb?.rules ? defaultPb.rules.map((r) => r.id) : []);
      setMistakeCategory('Entry Discipline');
      setMistakeDescription('');
      setMistakeSeverity('Medium');

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setEntryDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);

      const exitD = new Date(now.getTime() + 35 * 60000);
      setExitDate(`${exitD.getFullYear()}-${pad(exitD.getMonth() + 1)}-${pad(exitD.getDate())}T${pad(exitD.getHours())}:${pad(exitD.getMinutes())}`);

      setScreenshotUrl('');
      setShowChecklist(false);
    }
  }, [tradeToEdit, isOpen, selectedAccountId, accounts, propFirmAccounts, playbooks, userSettings.tradeDefaults]);

  // Real-time live calculations (NO COMMISSIONS OR HIDDEN FEES)
  const numEntry = parseFloat(entryPrice) || 0;
  const numExit = status === 'CLOSED' ? parseFloat(exitPrice) || numEntry : numEntry;
  const numSL = parseFloat(stopLoss) || (direction === 'BUY' ? numEntry - 5 : numEntry + 5);
  const numQty = parseFloat(quantity) || 1;

  const pointDiff = direction === 'BUY' ? numExit - numEntry : numEntry - numExit;
  const multiplier =
    market === 'Futures'
      ? symbol === 'MES'
        ? 5
        : symbol === 'ES'
        ? 50
        : symbol === 'NQ'
        ? 20
        : symbol === 'MNQ'
        ? 2
        : 1
      : 1;

  const grossPnl = status === 'CLOSED' ? pointDiff * numQty * multiplier : 0;
  const netPnl = grossPnl; // Pure Net P&L equal to trade P&L without commissions

  const riskPerUnit = Math.abs(numEntry - numSL) * multiplier || 1;
  const totalRisk = riskPerUnit * numQty || 1;
  const rMultiple = status === 'CLOSED' ? parseFloat((grossPnl / totalRisk).toFixed(2)) : 0;

  // Selected Playbook & Rules
  const selectedPlaybook =
    playbooks.find((p) => p.id === playbookId) ||
    playbooks.find((p) => p.name === setupType) ||
    playbooks[0];

  const activeRules = selectedPlaybook?.rules || [];
  const activeSetups = selectedPlaybook?.setups || [];
  const totalRulesCount = activeRules.length;
  const checkedCount = activeRules.filter((r) => checkedRuleIds.includes(r.id)).length;
  const compliancePct = totalRulesCount > 0 ? Math.round((checkedCount / totalRulesCount) * 100) : 0;

  const suggestedGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'N/A' = (() => {
    if (totalRulesCount === 0) return 'N/A';
    if (compliancePct >= 90) return 'A+';
    if (compliancePct >= 80) return 'A';
    if (compliancePct >= 70) return 'B';
    if (compliancePct >= 60) return 'C';
    return 'D';
  })();

  const currentAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const effectiveRiskGoals = getAccountRiskGoals ? getAccountRiskGoals(accountId) : riskGoals;

  // Pre-trade risk validation
  const preTradeRisk = useMemo(() => {
    if (!isOpen || tradeToEdit || !currentAccount) return null;
    return validatePreTrade(
      {
        symbol,
        market,
        direction,
        entryPrice: numEntry,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        quantity: numQty,
      },
      currentAccount,
      trades,
      effectiveRiskGoals
    );
  }, [isOpen, tradeToEdit, currentAccount, effectiveRiskGoals, symbol, market, direction, numEntry, stopLoss, takeProfit, numQty, trades]);

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!symbol.trim()) {
      setFormError('Please enter a trade symbol.');
      return;
    }

    if (!tradeToEdit && preTradeRisk && !preTradeRisk.allowed) {
      const errorMsg = `Trade Entry Blocked: ${preTradeRisk.blockingReason}`;
      setFormError(errorMsg);
      addToast('Trade Entry Blocked', preTradeRisk.blockingReason || 'Risk boundary breached.', 'error');

      const failedCheck = preTradeRisk.checks.find((c) => c.status === 'FAIL');
      logRiskEvent({
        accountId,
        accountName: currentAccount?.name,
        eventType: 'ORDER_BLOCKED',
        rule: failedCheck?.name || 'Pre-Trade Risk Engine',
        currentValue: `$${preTradeRisk.plannedRiskDollar.toFixed(2)} (${preTradeRisk.plannedRiskPercent.toFixed(2)}%)`,
        limitValue: String(failedCheck?.limit || 'Risk Limit'),
        severity: 'BLOCKED',
        actionTaken: 'Order blocked by pre-trade validation engine',
        notes: preTradeRisk.blockingReason || 'Risk boundary breached.',
      });
      return;
    }

    const isoEntryDate = new Date(entryDate).toISOString();
    const isoExitDate = status === 'CLOSED' ? new Date(exitDate).toISOString() : undefined;

    // Calculate duration in minutes from actual timestamps
    const calculatedDurationMinutes =
      status === 'CLOSED' && isoExitDate
        ? Math.max(1, Math.round((new Date(isoExitDate).getTime() - new Date(isoEntryDate).getTime()) / 60000))
        : 0;

    const finalGrade = setupGrade || (suggestedGrade !== 'N/A' ? suggestedGrade : 'A+');

    const tradeData: Omit<Trade, 'id'> = {
      accountId,
      propFirmAccountId: propFirmAccountId || undefined,
      symbol: symbol.toUpperCase().trim(),
      market,
      direction,
      status,
      entryDate: isoEntryDate,
      exitDate: isoExitDate,
      entryPrice: numEntry,
      exitPrice: status === 'CLOSED' ? numExit : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      quantity: numQty,
      commission: 0,
      fees: 0,
      swap: 0,
      grossPnl,
      netPnl,
      rMultiple,
      roiPercent: numEntry * numQty > 0 ? parseFloat(((netPnl / (numEntry * numQty)) * 100).toFixed(2)) : 0,
      rating,
      playbookId: selectedPlaybook?.id || playbookId,
      setupId: setupId || undefined,
      setupType: selectedPlaybook?.name || setupType || 'General',
      setupGrade: finalGrade as any,
      autoGrade: suggestedGrade !== 'N/A' ? (suggestedGrade as any) : undefined,
      ruleCompliancePercent: totalRulesCount > 0 ? compliancePct : undefined,
      checkedRuleIds,
      mistakeCategory: totalRulesCount > 0 && compliancePct < 100 ? mistakeCategory : undefined,
      mistakeDescription: totalRulesCount > 0 && compliancePct < 100 ? mistakeDescription : undefined,
      mistakeSeverity: totalRulesCount > 0 && compliancePct < 100 ? mistakeSeverity : undefined,
      session,
      rulesFollowed: totalRulesCount > 0 ? compliancePct === 100 : true,
      mistakes: totalRulesCount > 0 && compliancePct < 100 && mistakeDescription ? [mistakeDescription] : [],
      emotionalState,
      notes,
      durationMinutes: calculatedDurationMinutes,
      tags: tags.length > 0 ? tags : [market, selectedPlaybook?.name || setupType || 'General'],
      screenshotUrl: screenshotUrl || undefined,
    };

    if (tradeToEdit) {
      updateTrade({ ...tradeData, id: tradeToEdit.id });
      addToast('Trade Updated', `${tradeData.symbol} ${tradeData.direction} trade updated successfully.`, 'success');
    } else {
      addTrade(tradeData);
      addToast('Trade Logged', `${tradeData.symbol} ${tradeData.direction} trade saved to your journal.`, 'success');
    }

    onClose();
  };

  if (!isOpen) return null;

  // Dropdown Options
  const sessionOptions: SelectOption[] = [
    { value: 'New York', label: 'New York (NYSE / CME)', subtitle: '09:30 - 16:00 EST' },
    { value: 'London', label: 'London (LSE / FX)', subtitle: '03:00 - 11:30 EST' },
    { value: 'Asian', label: 'Asia / Tokyo (TSE)', subtitle: '19:00 - 02:00 EST' },
    { value: 'Sydney', label: 'Sydney (ASX)', subtitle: '17:00 - 00:00 EST' },
    { value: 'Pre-Market', label: 'US Pre-Market', subtitle: '04:00 - 09:30 EST' },
    { value: 'After-Hours', label: 'US After-Hours', subtitle: '16:00 - 20:00 EST' },
    { value: 'Custom', label: 'Custom / Other', subtitle: 'Global 24/7 Market' },
  ];

  const playbookOptions: SelectOption[] = playbooks.map((pb) => ({
    value: pb.id,
    label: pb.name,
    subtitle: `${pb.market || 'All Markets'} • ${pb.rules?.length || 0} rules`,
    badge: pb.winRate ? `${pb.winRate}% WR` : undefined,
  }));

  const accountOptions: SelectOption[] = accounts.map((acc) => ({
    value: acc.id,
    label: acc.name,
    subtitle: `${acc.broker || 'Broker'} • Balance: ${formatCurrency(acc.currentBalance)}`,
  }));

  const propFirmOptions: SelectOption[] = [
    { value: '', label: 'None (Personal Account Trade)' },
    ...propFirmAccounts.map((pf) => ({
      value: pf.id,
      label: pf.name,
      subtitle: `${pf.firmName} (${pf.phaseName || pf.phase} • $${pf.startingBalance.toLocaleString()})`,
    })),
  ];

  const marketOptions: SelectOption[] = [
    { value: 'Futures', label: 'Futures (MES / ES / NQ)' },
    { value: 'Forex', label: 'Forex (Currencies)' },
    { value: 'Stocks', label: 'Equities / Stocks' },
    { value: 'Crypto', label: 'Crypto (Spot & Perps)' },
    { value: 'CFDs', label: 'CFDs' },
    { value: 'Indices', label: 'Indices' },
    { value: 'Commodities', label: 'Commodities' },
  ];

  const emotionalStateOptions: SelectOption[] = [
    { value: 'Disciplined', label: 'Disciplined & Calm 🧘', subtitle: 'Followed trading rules strictly' },
    { value: 'Confident', label: 'Confident & Patient 🎯', subtitle: 'A+ Setup alignment' },
    { value: 'Neutral', label: 'Neutral & Objective ⚖️', subtitle: 'Standard execution' },
    { value: 'FOMO', label: 'FOMO (Chasing Move) 🏃', subtitle: 'Entered late on impulse' },
    { value: 'Revenge', label: 'Revenge / Frustrated 😡', subtitle: 'Trying to recover previous loss' },
    { value: 'Hesitant', label: 'Hesitant / Fearful 😨', subtitle: 'Second-guessed plan' },
    { value: 'Greedy', label: 'Greedy / Overleveraged 🤑', subtitle: 'Oversized position' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-[2px] p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-[#1C2129] bg-[#050608] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Sticky Terminal Header */}
        <div className="px-6 py-4 border-b border-[#1C2129] bg-[#080A0D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#12161E] border border-[#1C2129] flex items-center justify-center text-[#818CF8]">
              {tradeToEdit ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-[#F3F4F6] tracking-tight">
                {tradeToEdit ? 'Edit Trade' : 'Add Trade'}
              </h2>
              <p className="text-xs text-[#71717A]">
                {tradeToEdit ? 'Update trade parameters and execution notes' : 'Log a new execution to your journal'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#F3F4F6] hover:bg-[#12151B] border border-transparent hover:border-[#1C2129] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050608]">
          {formError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                {formError}
              </span>
              <button
                type="button"
                onClick={() => setFormError('')}
                className="text-rose-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form id="trade-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 1. DIRECTION TOGGLE (Long / Short) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#9CA3AF]">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                    direction === 'BUY'
                      ? 'bg-emerald-950/25 border-emerald-500/60 text-emerald-400 shadow-xs'
                      : 'bg-[#0A0C10] border-[#1C2129] text-[#71717A] hover:text-[#D1D5DB] hover:border-[#282E38]'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Long</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                    direction === 'SELL'
                      ? 'bg-rose-950/25 border-rose-500/60 text-rose-400 shadow-xs'
                      : 'bg-[#0A0C10] border-[#1C2129] text-[#71717A] hover:text-[#D1D5DB] hover:border-[#282E38]'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Short</span>
                </button>
              </div>
            </div>

            {/* 2. PRIMARY TRADE PARAMETERS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Symbol */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA3AF]">
                  Symbol
                </label>
                <input
                  type="text"
                  required
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. MES, NQ, EURUSD, AAPL"
                  className="w-full h-10 px-3 text-sm font-sans font-semibold rounded-xl bg-[#080A0D] border border-[#1C2129] text-[#F3F4F6] placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20 uppercase"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA3AF]">
                  Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="w-full h-10 px-3 text-sm font-mono font-medium rounded-xl bg-[#080A0D] border border-[#1C2129] text-[#F3F4F6] placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20"
                />
              </div>

              {/* Entry Price */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA3AF]">
                  Entry Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="5642.50"
                  className="w-full h-10 px-3 text-sm font-mono font-medium rounded-xl bg-[#080A0D] border border-[#1C2129] text-[#F3F4F6] placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20"
                />
              </div>

              {/* Exit Price */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#9CA3AF]">
                    Exit Price ($)
                  </label>
                  {status === 'OPEN' && (
                    <span className="text-[10px] text-[#818CF8] font-mono">
                      Trade is Open
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  disabled={status === 'OPEN'}
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder={status === 'OPEN' ? 'Active / Open' : '5668.00'}
                  className={`w-full h-10 px-3 text-sm font-mono font-medium rounded-xl border transition-all ${
                    status === 'OPEN'
                      ? 'bg-[#07090C] border-[#161A22] text-[#52525B] cursor-not-allowed'
                      : 'bg-[#080A0D] border-[#1C2129] text-[#F3F4F6] placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20'
                  }`}
                />
              </div>

              {/* Entry Date & Time */}
              <CustomDateTimePicker
                label="Entry Date & Time"
                value={entryDate}
                onChange={setEntryDate}
              />

              {/* Exit Date & Time */}
              <CustomDateTimePicker
                label="Exit Date & Time"
                value={exitDate}
                onChange={setExitDate}
                disabled={status === 'OPEN'}
                hint={status === 'OPEN' ? 'Available when trade is closed' : undefined}
              />
            </div>

            {/* 3. OPTIONAL RISK / STOP LOSS & TAKE PROFIT (Compact) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA3AF]">
                  Stop Loss ($) <span className="text-[#52525B] font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="5634.50"
                  className="w-full h-10 px-3 text-sm font-mono font-medium rounded-xl bg-[#080A0D] border border-[#1C2129] text-rose-300 placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#9CA3AF]">
                  Take Profit ($) <span className="text-[#52525B] font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="5670.00"
                  className="w-full h-10 px-3 text-sm font-mono font-medium rounded-xl bg-[#080A0D] border border-[#1C2129] text-emerald-300 placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20"
                />
              </div>
            </div>

            {/* 4. LIVE CALCULATION STRIP (Restrained, Institutional, NO Commissions) */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#0A0C10] border border-[#1C2129]">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-[#71717A] block">
                  Net P&L
                </span>
                <span
                  className={`font-mono font-bold text-sm sm:text-base mt-0.5 block ${
                    netPnl > 0
                      ? 'text-emerald-400'
                      : netPnl < 0
                      ? 'text-rose-400'
                      : 'text-[#D1D5DB]'
                  }`}
                >
                  {status === 'OPEN' ? 'Open' : formatCurrency(netPnl)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-[#71717A] block">
                  R-Multiple
                </span>
                <span
                  className={`font-mono font-bold text-sm sm:text-base mt-0.5 block ${
                    rMultiple > 0
                      ? 'text-emerald-400'
                      : rMultiple < 0
                      ? 'text-rose-400'
                      : 'text-[#D1D5DB]'
                  }`}
                >
                  {status === 'OPEN' ? '—' : `${rMultiple > 0 ? '+' : ''}${rMultiple}R`}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-[#71717A] block">
                  Initial Risk
                </span>
                <span className="font-mono font-bold text-sm sm:text-base text-[#D1D5DB] mt-0.5 block">
                  {formatCurrency(totalRisk)}
                </span>
              </div>
            </div>

            {/* 5. CONTEXT: STRATEGY & SESSION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CustomSelect
                label="Strategy / Playbook"
                value={selectedPlaybook?.id || playbookId}
                onChange={(pid) => {
                  setPlaybookId(pid);
                  const found = playbooks.find((p) => p.id === pid);
                  if (found) {
                    setSetupType(found.name);
                    setSetupId('');
                    setSetupGrade('');
                    setCheckedRuleIds(found.rules ? found.rules.map((r) => r.id) : []);
                  }
                }}
                options={playbookOptions}
                placeholder="Select playbook..."
              />

              <CustomSelect
                label="Trading Session"
                value={session}
                onChange={(s) => setSession(s as any)}
                options={sessionOptions}
                placeholder="Select trading session..."
              />

              <CustomSelect
                label="Trading Account"
                value={accountId}
                onChange={setAccountId}
                options={accountOptions}
                placeholder="Select account..."
              />

              <CustomSelect
                label="Prop Firm Portfolio"
                value={propFirmAccountId}
                onChange={setPropFirmAccountId}
                options={propFirmOptions}
                placeholder="Select portfolio..."
              />
            </div>

            {/* 6. EXPANDABLE PLAYBOOK CHECKLIST */}
            {selectedPlaybook && activeRules.length > 0 && (
              <div className="rounded-xl border border-[#1C2129] bg-[#0A0C10] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowChecklist(!showChecklist)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#0F1217] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-[#818CF8]" />
                    <span className="text-xs font-semibold text-[#F3F4F6]">
                      Playbook Checklist
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#9CA3AF] bg-[#12161E] border border-[#1C2129]">
                      {checkedCount}/{totalRulesCount} Followed
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#818CF8] font-semibold">
                      Grade {suggestedGrade}
                    </span>
                    {showChecklist ? (
                      <ChevronUp className="w-4 h-4 text-[#71717A]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#71717A]" />
                    )}
                  </div>
                </button>

                {showChecklist && (
                  <div className="p-4 border-t border-[#1C2129] space-y-3 bg-[#080A0D]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeRules.map((rule) => {
                        const isChecked = checkedRuleIds.includes(rule.id);
                        return (
                          <label
                            key={rule.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-[#0E1218] border-[#6366F1]/40 text-[#F3F4F6]'
                                : 'bg-[#050608] border-[#1C2129] text-[#8A919D] hover:border-[#282E38]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setCheckedRuleIds((prev) => prev.filter((id) => id !== rule.id));
                                } else {
                                  setCheckedRuleIds((prev) => [...prev, rule.id]);
                                }
                              }}
                              className="mt-0.5 h-4 w-4 rounded bg-[#0A0C10] border-[#1C2129] text-[#6366F1] focus:ring-[#6366F1]"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium block">{rule.text}</span>
                              <span className="text-[9px] font-mono text-[#71717A] uppercase">
                                {rule.category || 'RULE'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. TRADE REVIEW & NOTES */}
            <div className="rounded-xl border border-[#1C2129] bg-[#0A0C10] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReview(!showReview)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#0F1217] transition-colors cursor-pointer"
              >
                <span className="text-xs font-semibold text-[#F3F4F6]">
                  Trade Review & Notes
                </span>
                {showReview ? (
                  <ChevronUp className="w-4 h-4 text-[#71717A]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#71717A]" />
                )}
              </button>

              {showReview && (
                <div className="p-4 border-t border-[#1C2129] space-y-4 bg-[#080A0D]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Emotional State */}
                    <CustomSelect
                      label="Emotional State"
                      value={emotionalState}
                      onChange={(e) => setEmotionalState(e as any)}
                      options={emotionalStateOptions}
                    />

                    {/* Execution Quality (Rating) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-[#9CA3AF]">
                        Execution Quality
                      </label>
                      <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[#080A0D] border border-[#1C2129]">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-1 hover:scale-110 transition cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-[#52525B]'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-mono font-medium text-[#9CA3AF]">
                          {rating}/5
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-[#9CA3AF]">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Trade rationale, execution notes, what went well, what went wrong..."
                      className="w-full rounded-xl bg-[#080A0D] border border-[#1C2129] p-3 text-xs sm:text-sm font-sans text-[#F3F4F6] placeholder-[#52525B] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20"
                    />
                  </div>

                  {/* Chart Screenshot */}
                  <div className="pt-2 border-t border-[#1C2129] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#818CF8]" />
                      <span className="text-xs text-[#9CA3AF]">
                        {screenshotUrl ? 'Chart screenshot attached' : 'Attach chart screenshot'}
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={screenshotInputRef}
                      onChange={handleScreenshotUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="px-3 py-1.5 rounded-lg bg-[#12161E] hover:bg-[#161B24] border border-[#1C2129] text-xs font-medium text-[#818CF8] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingImage ? 'Uploading...' : screenshotUrl ? 'Change' : 'Upload Screenshot'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Sticky Terminal Action Footer */}
        <div className="px-6 py-4 border-t border-[#1C2129] bg-[#080A0D] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#12151B] border border-[#1C2129] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="trade-form"
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#6366F1] hover:bg-[#4F46E5] shadow-xs transition-colors cursor-pointer"
          >
            {tradeToEdit ? 'Save Changes' : 'Save Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};
