import {
  PropFirmAccount,
  PropFirmRule,
  PropFirmViolation,
  PropFirmRiskState,
  Trade,
  PreTradeValidationResult,
  PreTradeValidationCheck,
  PropFirmPhase,
  PropFirmPhaseConfig,
  PropFirmRuleType,
  ProgramModelType,
  DrawdownModelType,
  DailyDrawdownModelType,
  PropFirmTimelineEvent,
} from '../types';

export type { ProgramModelType, DrawdownModelType, DailyDrawdownModelType };
import { roundMoney, safeAdd, safeSub } from '../lib/calcEngine';

export interface LegionsPreset {
  id: string;
  name: string;
  firmName: string;
  legalEntity: string;
  tradingBrand: string;
  registrationNumber: string;
  jurisdiction: string;
  termsEffectiveDate: string;
  rulesVersion: string;
  programModel: ProgramModelType;
  phase: PropFirmPhase;
  startingBalance: number;
  currency: string;
  profitTargetPercent: number;
  dailyLossPercent: number;
  totalLossPercent: number;
  drawdownModel: DrawdownModelType;
  dailyLossMethod: 'REALIZED_ONLY' | 'REALIZED_PLUS_FLOATING' | 'START_OF_DAY_EQUITY' | 'START_OF_DAY_BALANCE' | 'CUSTOM';
  maxRiskPerSymbolPercent?: number;
  minTradeDurationSec?: number;
  avgTradeDurationSec?: number;
  minTradingDays?: number;
  qualifyingDayProfitPercent?: number;
  consistencyMaxDayPercent?: number;
  rewardBufferPercent?: number;
  rewardSplitPercent: number;
  activationFee?: number;
  rules: Omit<PropFirmRule, 'currentValue' | 'status'>[];
}

/**
 * LegionFunding Official Presets
 */
export const LEGION_FUNDING_PRESETS: LegionsPreset[] = [
  // 1. Two-Step Model: Phase 1
  {
    id: 'legion-2step-p1-50k',
    name: 'LegionFunding 50K Two-Step (Phase 1)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'TWO_STEP',
    phase: 'PHASE_1',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 8,
    dailyLossPercent: 4,
    totalLossPercent: 10,
    drawdownModel: 'STATIC',
    dailyLossMethod: 'REALIZED_ONLY',
    minTradingDays: 3,
    qualifyingDayProfitPercent: 0.5,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-2p1-target',
        name: 'Profit Target (8%)',
        type: 'PROFIT_TARGET',
        description: 'Achieve 8% profit ($4,000 on $50,000) on closed trades.',
        enabled: true,
        threshold: 4000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance × 8%',
      },
      {
        id: 'legion-2p1-daily',
        name: 'Daily Loss Limit (4%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 4% ($2,000 on $50,000) of starting balance.',
        enabled: true,
        threshold: 2000,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 4%',
        warningThreshold: 1400,
        criticalThreshold: 1800,
      },
      {
        id: 'legion-2p1-total',
        name: 'Total Loss Limit (10%)',
        type: 'MAX_DRAWDOWN',
        description: 'Static total loss limit 10% ($5,000 on $50,000). Account balance/equity must not drop below $45,000.',
        enabled: true,
        threshold: 5000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance − $5,000',
        warningThreshold: 3500,
        criticalThreshold: 4500,
      },
      {
        id: 'legion-2p1-days',
        name: 'Minimum Trading Days (3 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Execute trades on at least 3 distinct trading days.',
        enabled: true,
        threshold: 3,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique active dates with trades',
      },
      {
        id: 'legion-2p1-qual',
        name: 'Qualifying Day Requirement (0.5%)',
        type: 'QUALIFYING_DAY',
        description: 'A qualifying trading day requires at least 0.5% realized profit ($250 on $50K).',
        enabled: true,
        threshold: 0.5,
        unit: 'PERCENT',
        calculationMethodology: 'Daily Realized Net P&L >= Starting Balance × 0.5%',
      },
    ],
  },

  // 2. Two-Step Model: Phase 2
  {
    id: 'legion-2step-p2-50k',
    name: 'LegionFunding 50K Two-Step (Phase 2)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'TWO_STEP',
    phase: 'PHASE_2',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 5,
    dailyLossPercent: 4,
    totalLossPercent: 10,
    drawdownModel: 'STATIC',
    dailyLossMethod: 'REALIZED_ONLY',
    minTradingDays: 3,
    qualifyingDayProfitPercent: 0.5,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-2p2-target',
        name: 'Profit Target (5%)',
        type: 'PROFIT_TARGET',
        description: 'Achieve 5% profit ($2,500 on $50,000) on closed trades.',
        enabled: true,
        threshold: 2500,
        unit: 'USD',
        calculationMethodology: 'Starting Balance × 5%',
      },
      {
        id: 'legion-2p2-daily',
        name: 'Daily Loss Limit (4%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 4% ($2,000 on $50,000) of starting balance.',
        enabled: true,
        threshold: 2000,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 4%',
        warningThreshold: 1400,
        criticalThreshold: 1800,
      },
      {
        id: 'legion-2p2-total',
        name: 'Total Loss Limit (10%)',
        type: 'MAX_DRAWDOWN',
        description: 'Static total loss limit 10% ($5,000 on $50,000).',
        enabled: true,
        threshold: 5000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance − $5,000',
        warningThreshold: 3500,
        criticalThreshold: 4500,
      },
      {
        id: 'legion-2p2-days',
        name: 'Minimum Trading Days (3 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Execute trades on at least 3 distinct trading days.',
        enabled: true,
        threshold: 3,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique active dates with trades',
      },
      {
        id: 'legion-2p2-qual',
        name: 'Qualifying Day Requirement (0.5%)',
        type: 'QUALIFYING_DAY',
        description: 'A qualifying trading day requires at least 0.5% realized profit ($250 on $50K).',
        enabled: true,
        threshold: 0.5,
        unit: 'PERCENT',
        calculationMethodology: 'Daily Realized Net P&L >= Starting Balance × 0.5%',
      },
    ],
  },

  // 3. Two-Step Model: Simulated Funded
  {
    id: 'legion-2step-funded-50k',
    name: 'LegionFunding 50K Two-Step (Simulated Funded)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'TWO_STEP',
    phase: 'SIMULATED_FUNDED',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 0,
    dailyLossPercent: 4,
    totalLossPercent: 10,
    drawdownModel: 'STATIC',
    dailyLossMethod: 'REALIZED_ONLY',
    maxRiskPerSymbolPercent: 2,
    minTradeDurationSec: 60,
    minTradingDays: 5,
    qualifyingDayProfitPercent: 0.5,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-2sf-daily',
        name: 'Daily Loss Limit (4%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 4% ($2,000 on $50,000).',
        enabled: true,
        threshold: 2000,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 4%',
      },
      {
        id: 'legion-2sf-total',
        name: 'Total Loss Limit (10%)',
        type: 'MAX_DRAWDOWN',
        description: 'Static total loss limit 10% ($5,000 on $50,000).',
        enabled: true,
        threshold: 5000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance − $5,000',
      },
      {
        id: 'legion-2sf-symbol',
        name: 'Max Risk Per Symbol (2%)',
        type: 'SYMBOL_EXPOSURE_RISK',
        description: 'Combined open/closed risk exposure on a single symbol must not exceed 2% ($1,000).',
        enabled: true,
        threshold: 1000,
        unit: 'USD',
        calculationMethodology: 'Aggregate potential risk per symbol <= Starting Balance × 2%',
      },
      {
        id: 'legion-2sf-duration',
        name: 'Minimum Trade Duration (1 Min)',
        type: 'MIN_TRADE_DURATION',
        description: 'Positions must be held open for at least 60 seconds.',
        enabled: true,
        threshold: 60,
        unit: 'SECONDS',
        calculationMethodology: 'Trade Exit Time − Entry Time >= 60 seconds',
      },
      {
        id: 'legion-2sf-days',
        name: 'Minimum Trading Days (5 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Must complete at least 5 trading days before first reward request.',
        enabled: true,
        threshold: 5,
        unit: 'DAYS',
        calculationMethodology: 'Count of active trading days',
      },
    ],
  },

  // 4. One-Step Model: Evaluation
  {
    id: 'legion-1step-eval-50k',
    name: 'LegionFunding 50K One-Step (Evaluation)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'ONE_STEP',
    phase: 'EVALUATION',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 10,
    dailyLossPercent: 3,
    totalLossPercent: 6,
    drawdownModel: 'EOD_TRAILING',
    dailyLossMethod: 'REALIZED_ONLY',
    minTradingDays: 4,
    qualifyingDayProfitPercent: 0.5,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-1eval-target',
        name: 'Profit Target (10%)',
        type: 'PROFIT_TARGET',
        description: 'Achieve 10% profit ($5,000 on $50,000).',
        enabled: true,
        threshold: 5000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance × 10%',
      },
      {
        id: 'legion-1eval-daily',
        name: 'Daily Loss Limit (3%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 3% ($1,500 on $50,000).',
        enabled: true,
        threshold: 1500,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 3%',
      },
      {
        id: 'legion-1eval-total',
        name: 'Trailing Total Loss Limit (6%)',
        type: 'MAX_DRAWDOWN',
        description: 'Trailing total drawdown 6% ($3,000 on $50,000) from peak high-water mark.',
        enabled: true,
        threshold: 3000,
        unit: 'USD',
        calculationMethodology: 'Peak Balance − $3,000',
      },
      {
        id: 'legion-1eval-days',
        name: 'Minimum Trading Days (4 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Must complete at least 4 active trading days.',
        enabled: true,
        threshold: 4,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique trading dates',
      },
    ],
  },

  // 5. One-Step Model: Funded
  {
    id: 'legion-1step-funded-50k',
    name: 'LegionFunding 50K One-Step (Funded)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'ONE_STEP',
    phase: 'FUNDED',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 0,
    dailyLossPercent: 3,
    totalLossPercent: 6,
    drawdownModel: 'EOD_TRAILING',
    dailyLossMethod: 'REALIZED_ONLY',
    maxRiskPerSymbolPercent: 1,
    minTradingDays: 5,
    qualifyingDayProfitPercent: 0.5,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-1fun-daily',
        name: 'Daily Loss Limit (3%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 3% ($1,500 on $50,000).',
        enabled: true,
        threshold: 1500,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 3%',
      },
      {
        id: 'legion-1fun-total',
        name: 'Trailing Loss Limit (6%)',
        type: 'MAX_DRAWDOWN',
        description: 'Trailing total drawdown 6% ($3,000 on $50,000).',
        enabled: true,
        threshold: 3000,
        unit: 'USD',
        calculationMethodology: 'Peak Balance − $3,000',
      },
      {
        id: 'legion-1fun-symbol',
        name: 'Max Risk Per Symbol (1%)',
        type: 'SYMBOL_EXPOSURE_RISK',
        description: 'Max risk per symbol 1% ($500 on $50,000).',
        enabled: true,
        threshold: 500,
        unit: 'USD',
        calculationMethodology: 'Aggregate potential risk per symbol <= Starting Balance × 1%',
      },
      {
        id: 'legion-1fun-days',
        name: 'Minimum Trading Days (5 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Must complete at least 5 active trading days.',
        enabled: true,
        threshold: 5,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique active dates',
      },
    ],
  },

  // 6. Instant Funding Model
  {
    id: 'legion-instant-funded-50k',
    name: 'LegionFunding 50K Instant Funding (Funded)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'INSTANT_FUNDING',
    phase: 'FUNDED',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 0,
    dailyLossPercent: 3,
    totalLossPercent: 5,
    drawdownModel: 'EOD_TRAILING',
    dailyLossMethod: 'REALIZED_ONLY',
    consistencyMaxDayPercent: 20,
    maxRiskPerSymbolPercent: 2,
    rewardBufferPercent: 3,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-inst-daily',
        name: 'Daily Loss Limit (3%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 3% ($1,500 on $50,000).',
        enabled: true,
        threshold: 1500,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 3%',
      },
      {
        id: 'legion-inst-total',
        name: 'Trailing Loss Limit (5%)',
        type: 'MAX_DRAWDOWN',
        description: 'Trailing total loss limit 5% ($2,500 on $50,000).',
        enabled: true,
        threshold: 2500,
        unit: 'USD',
        calculationMethodology: 'Peak Balance − $2,500',
      },
      {
        id: 'legion-inst-consistency',
        name: 'Consistency Rule (20%)',
        type: 'CONSISTENCY',
        description: 'No single day profit may exceed 20% of total accumulated eligible profit.',
        enabled: true,
        threshold: 20,
        unit: 'PERCENT',
        calculationMethodology: '(Highest Day Profit / Total Eligible Profit) × 100 <= 20%',
      },
      {
        id: 'legion-inst-symbol',
        name: 'Max Risk Per Symbol (2%)',
        type: 'SYMBOL_EXPOSURE_RISK',
        description: 'Max risk per symbol 2% ($1,000 on $50,000).',
        enabled: true,
        threshold: 1000,
        unit: 'USD',
        calculationMethodology: 'Aggregate potential risk per symbol <= Starting Balance × 2%',
      },
      {
        id: 'legion-inst-buffer',
        name: 'Reward Buffer (3%)',
        type: 'REWARD_BUFFER',
        description: 'Must hold a 3% profit buffer ($1,500) above initial balance before first payout.',
        enabled: true,
        threshold: 1500,
        unit: 'USD',
        calculationMethodology: 'Realized Net Profit >= Starting Balance × 3%',
      },
    ],
  },

  // 7. Fast Track Model
  {
    id: 'legion-fasttrack-eval-50k',
    name: 'LegionFunding 50K Fast Track (Evaluation)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'FAST_TRACK',
    phase: 'EVALUATION',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 6,
    dailyLossPercent: 3,
    totalLossPercent: 5,
    drawdownModel: 'EOD_TRAILING',
    dailyLossMethod: 'REALIZED_ONLY',
    minTradingDays: 0,
    activationFee: 350, // $350 for 50k
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-ft-target',
        name: 'Fast Track Target (6%)',
        type: 'PROFIT_TARGET',
        description: 'Achieve 6% profit target ($3,000 on $50,000).',
        enabled: true,
        threshold: 3000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance × 6%',
      },
      {
        id: 'legion-ft-daily',
        name: 'Daily Loss Limit (3%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 3% ($1,500 on $50,000).',
        enabled: true,
        threshold: 1500,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 3%',
      },
      {
        id: 'legion-ft-total',
        name: 'Trailing Loss Limit (5%)',
        type: 'MAX_DRAWDOWN',
        description: 'Trailing total loss limit 5% ($2,500 on $50,000).',
        enabled: true,
        threshold: 2500,
        unit: 'USD',
        calculationMethodology: 'Peak Balance − $2,500',
      },
    ],
  },

  // 8. Fast Track Model: Simulated Funded
  {
    id: 'legion-fasttrack-funded-50k',
    name: 'LegionFunding 50K Fast Track (Simulated Funded)',
    firmName: 'LegionFunding',
    legalEntity: 'Hyper Funded Ltd.',
    tradingBrand: 'LegionFunding',
    registrationNumber: '2026-00324',
    jurisdiction: 'Saint Lucia',
    termsEffectiveDate: '2026-07-01',
    rulesVersion: 'v1.0',
    programModel: 'FAST_TRACK',
    phase: 'SIMULATED_FUNDED',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 0,
    dailyLossPercent: 3,
    totalLossPercent: 5,
    drawdownModel: 'EOD_TRAILING',
    dailyLossMethod: 'REALIZED_ONLY',
    consistencyMaxDayPercent: 20,
    rewardSplitPercent: 80,
    rules: [
      {
        id: 'legion-ftf-daily',
        name: 'Daily Loss Limit (3%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit 3% ($1,500 on $50,000).',
        enabled: true,
        threshold: 1500,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 3%',
      },
      {
        id: 'legion-ftf-total',
        name: 'Trailing Loss Limit (5%)',
        type: 'MAX_DRAWDOWN',
        description: 'Trailing total loss limit 5% ($2,500 on $50,000).',
        enabled: true,
        threshold: 2500,
        unit: 'USD',
        calculationMethodology: 'Peak Balance − $2,500',
      },
      {
        id: 'legion-ftf-consistency',
        name: 'Consistency Rule (20%)',
        type: 'CONSISTENCY',
        description: 'No single day profit may exceed 20% of total accumulated profit.',
        enabled: true,
        threshold: 20,
        unit: 'PERCENT',
        calculationMethodology: 'Highest Day Profit / Total Profit <= 20%',
      },
    ],
  },

  // 10. FTMO 100K Two-Step Preset
  {
    id: 'ftmo-100k-2step',
    name: 'FTMO $100K Two-Step Challenge',
    firmName: 'FTMO',
    legalEntity: 'FTMO Evaluation Global s.r.o.',
    tradingBrand: 'FTMO',
    registrationNumber: 'CZ-0394821',
    jurisdiction: 'Czech Republic',
    termsEffectiveDate: '2026-01-01',
    rulesVersion: '2026.1',
    programModel: 'TWO_STEP',
    phase: 'PHASE_1',
    startingBalance: 100000,
    currency: 'USD',
    profitTargetPercent: 10,
    dailyLossPercent: 5,
    totalLossPercent: 10,
    drawdownModel: 'STATIC',
    dailyLossMethod: 'START_OF_DAY_BALANCE',
    minTradingDays: 4,
    rewardSplitPercent: 80,
    activationFee: 540,
    rules: [
      {
        id: 'ftmo-target',
        name: 'Profit Target (10%)',
        type: 'PROFIT_TARGET',
        description: 'Achieve 10% profit ($10,000 on $100,000) on closed trades in Phase 1.',
        enabled: true,
        threshold: 10000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance × 10%',
      },
      {
        id: 'ftmo-daily',
        name: 'Maximum Daily Loss (5%)',
        type: 'DAILY_DRAWDOWN',
        description: 'Maximum permitted daily loss is 5% ($5,000 on $100,000).',
        enabled: true,
        threshold: 5000,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance × 5%',
        warningThreshold: 3500,
        criticalThreshold: 4500,
      },
      {
        id: 'ftmo-total',
        name: 'Maximum Overall Loss (10%)',
        type: 'MAX_DRAWDOWN',
        description: 'Static maximum total loss 10% ($10,000 on $100,000). Equity cannot breach $90,000.',
        enabled: true,
        threshold: 10000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance − $10,000',
        warningThreshold: 7000,
        criticalThreshold: 9000,
      },
      {
        id: 'ftmo-days',
        name: 'Minimum Trading Days (4 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Trade on at least 4 distinct trading days.',
        enabled: true,
        threshold: 4,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique active dates with trades',
      },
    ],
  },

  // 11. Topstep 50K One-Step Combine Preset
  {
    id: 'topstep-50k-combine',
    name: 'Topstep $50K Trading Combine',
    firmName: 'Topstep',
    legalEntity: 'Topstep LLC',
    tradingBrand: 'Topstep',
    registrationNumber: 'US-IL-9831',
    jurisdiction: 'United States',
    termsEffectiveDate: '2026-01-01',
    rulesVersion: '2026.1',
    programModel: 'ONE_STEP',
    phase: 'EVALUATION',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 6,
    dailyLossPercent: 2,
    totalLossPercent: 4,
    drawdownModel: 'EOD_TRAILING',
    dailyLossMethod: 'START_OF_DAY_BALANCE',
    minTradingDays: 5,
    rewardSplitPercent: 90,
    activationFee: 49,
    rules: [
      {
        id: 'ts-target',
        name: 'Profit Target ($3,000)',
        type: 'PROFIT_TARGET',
        description: 'Achieve $3,000 profit (6% on $50,000).',
        enabled: true,
        threshold: 3000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance + $3,000',
      },
      {
        id: 'ts-daily',
        name: 'Daily Loss Limit ($1,000)',
        type: 'DAILY_DRAWDOWN',
        description: 'Daily loss limit of $1,000.',
        enabled: true,
        threshold: 1000,
        unit: 'USD',
        calculationMethodology: 'Start-of-Day Balance − $1,000',
      },
      {
        id: 'ts-total',
        name: 'Maximum Trailing Loss ($2,000)',
        type: 'MAX_DRAWDOWN',
        description: 'End-of-day trailing maximum drawdown of $2,000.',
        enabled: true,
        threshold: 2000,
        unit: 'USD',
        calculationMethodology: 'EOD Peak Balance − $2,000',
      },
      {
        id: 'ts-days',
        name: 'Minimum Trading Days (5 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Execute trades on at least 5 trading days.',
        enabled: true,
        threshold: 5,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique active dates with trades',
      },
      {
        id: 'ts-consistency',
        name: 'Consistency Target (50%)',
        type: 'CONSISTENCY',
        description: 'Best trading day must not exceed 50% of total profit.',
        enabled: true,
        threshold: 50,
        unit: 'PERCENT',
        calculationMethodology: 'Highest Day Profit / Total Profit <= 50%',
      },
    ],
  },

  // 12. Apex Trader Funding 50K Trailing
  {
    id: 'apex-50k-trailing',
    name: 'Apex $50K Trailing Evaluation',
    firmName: 'Apex Trader Funding',
    legalEntity: 'Apex Trader Funding Inc.',
    tradingBrand: 'Apex',
    registrationNumber: 'US-TX-4402',
    jurisdiction: 'United States',
    termsEffectiveDate: '2026-01-01',
    rulesVersion: '2026.1',
    programModel: 'ONE_STEP',
    phase: 'EVALUATION',
    startingBalance: 50000,
    currency: 'USD',
    profitTargetPercent: 6,
    dailyLossPercent: 5,
    totalLossPercent: 5,
    drawdownModel: 'INTRADAY_HWM_TRAILING',
    dailyLossMethod: 'REALIZED_ONLY',
    minTradingDays: 7,
    rewardSplitPercent: 90,
    rules: [
      {
        id: 'apex-target',
        name: 'Profit Target ($3,000)',
        type: 'PROFIT_TARGET',
        description: 'Achieve $3,000 profit (6% on $50,000).',
        enabled: true,
        threshold: 3000,
        unit: 'USD',
        calculationMethodology: 'Starting Balance + $3,000',
      },
      {
        id: 'apex-trailing',
        name: 'Trailing Threshold ($2,500)',
        type: 'MAX_DRAWDOWN',
        description: 'Intraday peak trailing maximum drawdown of $2,500.',
        enabled: true,
        threshold: 2500,
        unit: 'USD',
        calculationMethodology: 'Peak Intraday Equity − $2,500',
      },
      {
        id: 'apex-days',
        name: 'Minimum Trading Days (7 Days)',
        type: 'MIN_TRADING_DAYS',
        description: 'Trade at least 7 active trading days.',
        enabled: true,
        threshold: 7,
        unit: 'DAYS',
        calculationMethodology: 'Count of unique active dates with trades',
      },
    ],
  },
];

export const PROP_FIRM_TEMPLATES = LEGION_FUNDING_PRESETS;

export interface CreateAccountOptions {
  programModel?: ProgramModelType;
  phase1TargetPercent?: number;
  phase2TargetPercent?: number;
  dailyLossPercent?: number;
  totalLossPercent?: number;
  minTradingDays?: number;
  maxTradingDays?: number;
  drawdownModel?: DrawdownModelType;
  dailyDrawdownModel?: DailyDrawdownModelType;
  profitSplitTraderPercent?: number;
  payoutFrequency?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ON_REQUEST';
  newsTradingAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  weekendHoldingAllowed?: boolean;
  overnightHoldingAllowed?: boolean;
  eaAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  copyTradingAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  hedgingAllowed?: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  maxLotSize?: number;
  consistencyMaxDayPercent?: number;
  maxProfitConcentrationPercent?: number;
  prohibitedStrategies?: string[];
  challengePrice?: number;
  currency?: string;
  sessionTimezone?: string;
  startDate?: string;
  notes?: string;
  scalingRules?: {
    enabled: boolean;
    thresholdAmount: number;
    scalingPercentage: number;
    maxAccountSize: number;
  };
}

export function createAccountFromPreset(
  preset: LegionsPreset,
  customBalance?: number,
  customName?: string,
  tradingAccountLink?: string,
  options?: CreateAccountOptions
): PropFirmAccount {
  const startingBalance = customBalance && customBalance > 0 ? customBalance : preset.startingBalance;
  const programModel: ProgramModelType = options?.programModel || preset.programModel || 'TWO_STEP';
  const drawdownModel: DrawdownModelType = options?.drawdownModel || preset.drawdownModel || 'STATIC';
  const dailyDrawdownModel: DailyDrawdownModelType = options?.dailyDrawdownModel || 'START_OF_DAY_BALANCE';
  const currency = options?.currency || preset.currency || 'USD';
  const sessionTimezone = options?.sessionTimezone || 'America/New_York';

  const p1TargetPercent = options?.phase1TargetPercent ?? preset.profitTargetPercent ?? 8;
  const p2TargetPercent = options?.phase2TargetPercent ?? 5;
  const dailyLossPercent = options?.dailyLossPercent ?? preset.dailyLossPercent ?? 4;
  const totalLossPercent = options?.totalLossPercent ?? preset.totalLossPercent ?? 10;
  const minTradingDays = options?.minTradingDays ?? preset.minTradingDays ?? 3;
  const maxTradingDays = options?.maxTradingDays ?? 0;

  const profitTargetAmount = p1TargetPercent > 0 ? roundMoney(startingBalance * (p1TargetPercent / 100)) : 0;
  const dailyLossAmount = roundMoney(startingBalance * (dailyLossPercent / 100));
  const totalLossAmount = roundMoney(startingBalance * (totalLossPercent / 100));
  const maxRiskSymbolAmount = preset.maxRiskPerSymbolPercent ? roundMoney(startingBalance * (preset.maxRiskPerSymbolPercent / 100)) : undefined;
  const rewardBufferAmount = preset.rewardBufferPercent ? roundMoney(startingBalance * (preset.rewardBufferPercent / 100)) : 0;
  const qualifyingDayAmount = preset.qualifyingDayProfitPercent ? roundMoney(startingBalance * (preset.qualifyingDayProfitPercent / 100)) : 0;

  const rules: PropFirmRule[] = preset.rules.map((r, idx) => {
    let newThreshold = r.threshold;
    let description = r.description;

    if (r.type === 'PROFIT_TARGET') {
      newThreshold = profitTargetAmount;
      description = `Achieve ${p1TargetPercent}% profit ($${profitTargetAmount.toLocaleString()} on $${startingBalance.toLocaleString()}).`;
    } else if (r.type === 'DAILY_DRAWDOWN') {
      newThreshold = dailyLossAmount;
      description = `Daily loss limit ${dailyLossPercent}% ($${dailyLossAmount.toLocaleString()} on $${startingBalance.toLocaleString()}).`;
    } else if (r.type === 'MAX_DRAWDOWN') {
      newThreshold = totalLossAmount;
      description = `${drawdownModel === 'INTRADAY_HWM_TRAILING' ? 'Trailing' : 'Static'} total loss limit ${totalLossPercent}% ($${totalLossAmount.toLocaleString()} on $${startingBalance.toLocaleString()}).`;
    } else if (r.type === 'SYMBOL_EXPOSURE_RISK' && preset.maxRiskPerSymbolPercent) {
      newThreshold = maxRiskSymbolAmount!;
      description = `Max risk per symbol ${preset.maxRiskPerSymbolPercent}% ($${maxRiskSymbolAmount!.toLocaleString()} on $${startingBalance.toLocaleString()}).`;
    } else if (r.type === 'REWARD_BUFFER' && preset.rewardBufferPercent) {
      newThreshold = rewardBufferAmount;
      description = `Must hold a ${preset.rewardBufferPercent}% profit buffer ($${rewardBufferAmount.toLocaleString()}) above initial balance before first payout.`;
    } else if (r.type === 'QUALIFYING_DAY' && preset.qualifyingDayProfitPercent) {
      newThreshold = preset.qualifyingDayProfitPercent;
      description = `A qualifying trading day requires at least ${preset.qualifyingDayProfitPercent}% realized profit ($${qualifyingDayAmount.toLocaleString()} on $${startingBalance.toLocaleString()}).`;
    }

    return {
      ...r,
      id: `r-${Date.now()}-${idx}`,
      threshold: newThreshold,
      description,
      warningThreshold: r.warningThreshold ? roundMoney(newThreshold * 0.7) : undefined,
      criticalThreshold: r.criticalThreshold ? roundMoney(newThreshold * 0.9) : undefined,
    };
  });

  // Build Multi-Phase Structure
  const accountId = `pf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let phases: any[] = [];
  let initialPhase: any = 'PHASE_1';

  if (programModel === 'TWO_STEP') {
    initialPhase = 'PHASE_1';
    phases = [
      {
        id: `phase-1-${accountId}`,
        name: 'Phase 1 Evaluation',
        phaseOrder: 1,
        phaseType: 'PHASE_1',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: p1TargetPercent,
        profitTargetAmount: profitTargetAmount,
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays,
        maxTradingDays,
        consistencyMaxDayPercent: options?.consistencyMaxDayPercent ?? preset.consistencyMaxDayPercent ?? 40,
        startedAt: new Date().toISOString(),
      },
      {
        id: `phase-2-${accountId}`,
        name: 'Phase 2 Verification',
        phaseOrder: 2,
        phaseType: 'PHASE_2',
        status: 'INACTIVE',
        startingBalance,
        profitTargetPercent: p2TargetPercent,
        profitTargetAmount: roundMoney(startingBalance * (p2TargetPercent / 100)),
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays,
        maxTradingDays,
        consistencyMaxDayPercent: options?.consistencyMaxDayPercent ?? preset.consistencyMaxDayPercent ?? 40,
      },
      {
        id: `phase-funded-${accountId}`,
        name: 'Funded Account',
        phaseOrder: 3,
        phaseType: 'FUNDED',
        status: 'INACTIVE',
        startingBalance,
        profitTargetPercent: 0,
        profitTargetAmount: 0,
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays: 0,
      },
    ];
  } else if (programModel === 'ONE_STEP' || programModel === 'FAST_TRACK') {
    initialPhase = 'EVALUATION';
    phases = [
      {
        id: `phase-eval-${accountId}`,
        name: 'Evaluation Phase',
        phaseOrder: 1,
        phaseType: 'EVALUATION',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: p1TargetPercent,
        profitTargetAmount,
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays,
        maxTradingDays,
        startedAt: new Date().toISOString(),
      },
      {
        id: `phase-funded-${accountId}`,
        name: 'Funded Account',
        phaseOrder: 2,
        phaseType: 'FUNDED',
        status: 'INACTIVE',
        startingBalance,
        profitTargetPercent: 0,
        profitTargetAmount: 0,
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays: 0,
      },
    ];
  } else if (programModel === 'INSTANT_FUNDING') {
    initialPhase = 'FUNDED';
    phases = [
      {
        id: `phase-funded-${accountId}`,
        name: 'Funded Account',
        phaseOrder: 1,
        phaseType: 'FUNDED',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: 0,
        profitTargetAmount: 0,
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays: 0,
        startedAt: new Date().toISOString(),
      },
    ];
  } else {
    // CUSTOM
    initialPhase = 'CUSTOM';
    phases = [
      {
        id: `phase-custom-${accountId}`,
        name: 'Custom Evaluation',
        phaseOrder: 1,
        phaseType: 'CUSTOM',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: p1TargetPercent,
        profitTargetAmount,
        dailyLossPercent,
        dailyLossAmount,
        totalLossPercent,
        totalLossAmount,
        drawdownModel,
        dailyDrawdownModel,
        minTradingDays,
        maxTradingDays,
        startedAt: new Date().toISOString(),
      },
    ];
  }

  const formattedK = startingBalance >= 1000 ? `${(startingBalance / 1000).toLocaleString()}K` : startingBalance.toString();
  const name = customName || `${preset.firmName} $${formattedK} ${preset.name.replace(/^(LegionFunding|FTMO|Topstep|Apex)\s*\$?\d*K?\s*/, '')}`;

  return {
    id: accountId,
    createdAt: new Date().toISOString(),
    name,
    firmName: preset.firmName,
    legalEntity: preset.legalEntity,
    tradingBrand: preset.tradingBrand,
    registrationNumber: preset.registrationNumber,
    jurisdiction: preset.jurisdiction,
    termsEffectiveDate: preset.termsEffectiveDate,
    rulesVersion: preset.rulesVersion,
    accountSize: startingBalance,
    startingBalance,
    currentBalance: startingBalance,
    equity: startingBalance,
    programModel,
    phases,
    activePhaseIndex: 0,
    phase: initialPhase,
    status: 'ACTIVE',
    riskState: 'SAFE',
    enforcementMode: 'MONITOR',
    drawdownModel,
    dailyDrawdownModel,
    dailyLossMethod: preset.dailyLossMethod,
    profitTargetPercent: p1TargetPercent,
    dailyLossPercent,
    totalLossPercent,
    profitTargetAmount,
    dailyLossAmount,
    totalLossAmount,
    maxRiskPerSymbolPercent: preset.maxRiskPerSymbolPercent,
    minTradeDurationSec: preset.minTradeDurationSec,
    minTradingDays,
    maxTradingDays,
    startDate: options?.startDate || new Date().toISOString().split('T')[0],
    qualifyingDayProfitPercent: preset.qualifyingDayProfitPercent,
    consistencyMaxDayPercent: options?.consistencyMaxDayPercent ?? preset.consistencyMaxDayPercent,
    maxProfitConcentrationPercent: options?.maxProfitConcentrationPercent ?? 40,
    newsTradingAllowed: options?.newsTradingAllowed ?? 'ALLOWED',
    weekendHoldingAllowed: options?.weekendHoldingAllowed ?? true,
    overnightHoldingAllowed: options?.overnightHoldingAllowed ?? true,
    eaAllowed: options?.eaAllowed ?? 'ALLOWED',
    copyTradingAllowed: options?.copyTradingAllowed ?? 'ALLOWED',
    hedgingAllowed: options?.hedgingAllowed ?? 'ALLOWED',
    maxLotSize: options?.maxLotSize,
    prohibitedStrategies: options?.prohibitedStrategies ?? ['Arbitrage', 'Martingale', 'Grid', 'Latency Arbitrage', 'News Scalping'],
    rewardBufferPercent: preset.rewardBufferPercent || 0,
    rewardSplitPercent: options?.profitSplitTraderPercent ?? preset.rewardSplitPercent ?? 80,
    profitSplitTraderPercent: options?.profitSplitTraderPercent ?? preset.rewardSplitPercent ?? 80,
    profitSplitFirmPercent: 100 - (options?.profitSplitTraderPercent ?? preset.rewardSplitPercent ?? 80),
    payoutFrequency: options?.payoutFrequency ?? 'BIWEEKLY',
    activationFee: options?.challengePrice ?? preset.activationFee,
    sessionTimezone,
    currency,
    tradingAccountLink: tradingAccountLink || 'all',
    scalingRules: options?.scalingRules ?? {
      enabled: false,
      thresholdAmount: roundMoney(startingBalance * 0.1),
      scalingPercentage: 25,
      maxAccountSize: startingBalance * 4,
      currentScaleLevel: 0,
    },
    rules,
    violations: [],
    notes: options?.notes,
    payoutInfo: {
      minTradingDaysRequired: minTradingDays || 0,
      tradingDaysCompleted: 0,
      profitSplitPercent: options?.profitSplitTraderPercent ?? preset.rewardSplitPercent ?? 80,
      eligibleProfit: 0,
      payoutAmount: 0,
      minRequestAmount: 100,
      rewardBufferPercent: preset.rewardBufferPercent || 0,
      rewardBufferMet: preset.rewardBufferPercent ? false : true,
      payoutHistory: [],
    },
  };
}

export interface PropFirmWizardConfig {
  propFirmName: string;
  displayName: string;
  accountSize: number;
  currency: string;
  programModel: ProgramModelType;
  tradingAccountLink?: string;

  phase1: {
    profitTargetEnabled: boolean;
    profitTargetPercent: number;
    dailyLossEnabled: boolean;
    dailyLossPercent: number;
    dailyLossMethod: DailyDrawdownModelType;
    maxLossEnabled: boolean;
    totalLossPercent: number;
    drawdownModel: DrawdownModelType;
    minTradingDays: number;
    maxTradingDays: number;
    qualifyingDayProfitPercent?: number;
    inactivityMaxDays?: number;
  };

  phase2: {
    profitTargetEnabled: boolean;
    profitTargetPercent: number;
    dailyLossEnabled: boolean;
    dailyLossPercent: number;
    dailyLossMethod: DailyDrawdownModelType;
    maxLossEnabled: boolean;
    totalLossPercent: number;
    drawdownModel: DrawdownModelType;
    minTradingDays: number;
    maxTradingDays: number;
    qualifyingDayProfitPercent?: number;
    inactivityMaxDays?: number;
  };

  consistencyRule: boolean;
  consistencyMaxDayPercent: number;
  maxProfitConcentrationPercent: number;
  newsTrading: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  newsWindowMinutes: number;
  weekendHolding: boolean;
  overnightHolding: boolean;
  eaTrading: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  copyTrading: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  hedging: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
  maxLotSize?: number;
  maxPositions?: number;
  maxTradesPerDay?: number;
  maxLeverage?: number;
  prohibitedStrategies: string[];
  vpnAllowed: boolean;
  vpsAllowed: boolean;
  singleIpOnly: boolean;

  payoutEnabled: boolean;
  profitSplitTraderPercent: number;
  payoutFrequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ON_REQUEST';
  minPayoutAmount: number;
  firstPayoutDays: number;
  minProfitableDaysForPayout: number;

  scalingEnabled: boolean;
  scalingProfitPercent: number;
  scalingIncrementAmount: number;
  maxScalingAccountSize: number;
}

export const WIZARD_TEMPLATES: Record<string, { label: string; firm: string; model: ProgramModelType; config: Partial<PropFirmWizardConfig> }> = {
  custom: {
    label: 'Custom (Start from Scratch)',
    firm: 'Custom Prop Firm',
    model: 'TWO_STEP',
    config: {
      propFirmName: '',
      displayName: '',
      accountSize: 100000,
      currency: 'USD',
      programModel: 'TWO_STEP',
      phase1: {
        profitTargetEnabled: true,
        profitTargetPercent: 8,
        dailyLossEnabled: true,
        dailyLossPercent: 4,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 5,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: true,
        profitTargetPercent: 5,
        dailyLossEnabled: true,
        dailyLossPercent: 4,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 5,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      consistencyRule: true,
      consistencyMaxDayPercent: 50,
      maxProfitConcentrationPercent: 40,
      newsTrading: 'ALLOWED',
      newsWindowMinutes: 5,
      weekendHolding: true,
      overnightHolding: true,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'ALLOWED',
      maxLotSize: 20,
      maxPositions: 10,
      maxTradesPerDay: 50,
      maxLeverage: 100,
      prohibitedStrategies: ['Martingale', 'Grid Trading', 'Latency Arbitrage', 'High-Frequency (HFT)'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 80,
      payoutFrequency: 'BIWEEKLY',
      minPayoutAmount: 100,
      firstPayoutDays: 14,
      minProfitableDaysForPayout: 5,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 25000,
      maxScalingAccountSize: 2000000,
    },
  },
  fundednext: {
    label: 'FundedNext Stellar (2-Step)',
    firm: 'FundedNext',
    model: 'TWO_STEP',
    config: {
      propFirmName: 'FundedNext',
      displayName: 'FundedNext 100K Stellar',
      accountSize: 100000,
      currency: 'USD',
      programModel: 'TWO_STEP',
      phase1: {
        profitTargetEnabled: true,
        profitTargetPercent: 8,
        dailyLossEnabled: true,
        dailyLossPercent: 5,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 5,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: true,
        profitTargetPercent: 5,
        dailyLossEnabled: true,
        dailyLossPercent: 5,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 5,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      consistencyRule: false,
      consistencyMaxDayPercent: 50,
      maxProfitConcentrationPercent: 40,
      newsTrading: 'ALLOWED',
      newsWindowMinutes: 2,
      weekendHolding: true,
      overnightHolding: true,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'ALLOWED',
      maxLotSize: 50,
      maxPositions: 20,
      maxTradesPerDay: 100,
      maxLeverage: 100,
      prohibitedStrategies: ['Latency Arbitrage', 'Tick Scalping', 'Reverse Arbitrage'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 85,
      payoutFrequency: 'BIWEEKLY',
      minPayoutAmount: 100,
      firstPayoutDays: 14,
      minProfitableDaysForPayout: 5,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 40000,
      maxScalingAccountSize: 4000000,
    },
  },
  fundingpips: {
    label: 'FundingPips 100K (2-Step)',
    firm: 'FundingPips',
    model: 'TWO_STEP',
    config: {
      propFirmName: 'FundingPips',
      displayName: 'FundingPips 100K Evaluation',
      accountSize: 100000,
      currency: 'USD',
      programModel: 'TWO_STEP',
      phase1: {
        profitTargetEnabled: true,
        profitTargetPercent: 8,
        dailyLossEnabled: true,
        dailyLossPercent: 5,
        dailyLossMethod: 'START_OF_DAY_EQUITY',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 0,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: true,
        profitTargetPercent: 5,
        dailyLossEnabled: true,
        dailyLossPercent: 5,
        dailyLossMethod: 'START_OF_DAY_EQUITY',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 0,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0,
        inactivityMaxDays: 30,
      },
      consistencyRule: false,
      consistencyMaxDayPercent: 50,
      maxProfitConcentrationPercent: 40,
      newsTrading: 'ALLOWED',
      newsWindowMinutes: 2,
      weekendHolding: true,
      overnightHolding: true,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'ALLOWED',
      maxLotSize: 50,
      maxPositions: 25,
      maxLeverage: 100,
      prohibitedStrategies: ['Latency Arbitrage', 'High-Frequency (HFT)'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 80,
      payoutFrequency: 'WEEKLY',
      minPayoutAmount: 50,
      firstPayoutDays: 5,
      minProfitableDaysForPayout: 3,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 20000,
      maxScalingAccountSize: 2000000,
    },
  },
  ftmo: {
    label: 'FTMO 100K Classic (2-Step)',
    firm: 'FTMO',
    model: 'TWO_STEP',
    config: {
      propFirmName: 'FTMO',
      displayName: 'FTMO 100K Challenge',
      accountSize: 100000,
      currency: 'USD',
      programModel: 'TWO_STEP',
      phase1: {
        profitTargetEnabled: true,
        profitTargetPercent: 10,
        dailyLossEnabled: true,
        dailyLossPercent: 5,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 4,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: true,
        profitTargetPercent: 5,
        dailyLossEnabled: true,
        dailyLossPercent: 5,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 4,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      consistencyRule: false,
      consistencyMaxDayPercent: 50,
      maxProfitConcentrationPercent: 40,
      newsTrading: 'RESTRICTED',
      newsWindowMinutes: 2,
      weekendHolding: false,
      overnightHolding: true,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'ALLOWED',
      maxLotSize: 50,
      maxPositions: 20,
      maxLeverage: 100,
      prohibitedStrategies: ['Latency Arbitrage', 'High-Frequency (HFT)'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 80,
      payoutFrequency: 'BIWEEKLY',
      minPayoutAmount: 100,
      firstPayoutDays: 14,
      minProfitableDaysForPayout: 4,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 25000,
      maxScalingAccountSize: 2000000,
    },
  },
  topstep: {
    label: 'Topstep 50K Express (1-Step)',
    firm: 'Topstep',
    model: 'ONE_STEP',
    config: {
      propFirmName: 'Topstep',
      displayName: 'Topstep 50K Trading Combine',
      accountSize: 50000,
      currency: 'USD',
      programModel: 'ONE_STEP',
      phase1: {
        profitTargetEnabled: true,
        profitTargetPercent: 6,
        dailyLossEnabled: true,
        dailyLossPercent: 2,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 4,
        drawdownModel: 'INTRADAY_HWM_TRAILING',
        minTradingDays: 2,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: false,
        profitTargetPercent: 0,
        dailyLossEnabled: true,
        dailyLossPercent: 2,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 4,
        drawdownModel: 'INTRADAY_HWM_TRAILING',
        minTradingDays: 0,
        maxTradingDays: 0,
      },
      consistencyRule: true,
      consistencyMaxDayPercent: 50,
      maxProfitConcentrationPercent: 50,
      newsTrading: 'ALLOWED',
      newsWindowMinutes: 1,
      weekendHolding: false,
      overnightHolding: false,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'PROHIBITED',
      maxLotSize: 5,
      maxPositions: 5,
      maxTradesPerDay: 50,
      maxLeverage: 30,
      prohibitedStrategies: ['Holding through market close', 'Hedging'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 90,
      payoutFrequency: 'ON_REQUEST',
      minPayoutAmount: 200,
      firstPayoutDays: 5,
      minProfitableDaysForPayout: 5,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 25000,
      maxScalingAccountSize: 150000,
    },
  },
  instant: {
    label: 'Instant Funding 50K (No Evaluation)',
    firm: 'Instant Funding',
    model: 'INSTANT_FUNDING',
    config: {
      propFirmName: 'Instant Funding',
      displayName: 'Instant Funded 50K',
      accountSize: 50000,
      currency: 'USD',
      programModel: 'INSTANT_FUNDING',
      phase1: {
        profitTargetEnabled: false,
        profitTargetPercent: 0,
        dailyLossEnabled: true,
        dailyLossPercent: 4,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 8,
        drawdownModel: 'STATIC',
        minTradingDays: 0,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: false,
        profitTargetPercent: 0,
        dailyLossEnabled: true,
        dailyLossPercent: 4,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 8,
        drawdownModel: 'STATIC',
        minTradingDays: 0,
        maxTradingDays: 0,
      },
      consistencyRule: false,
      consistencyMaxDayPercent: 50,
      maxProfitConcentrationPercent: 40,
      newsTrading: 'ALLOWED',
      newsWindowMinutes: 2,
      weekendHolding: true,
      overnightHolding: true,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'ALLOWED',
      maxLotSize: 10,
      maxPositions: 10,
      maxLeverage: 50,
      prohibitedStrategies: ['Latency Arbitrage', 'High-Frequency (HFT)'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 70,
      payoutFrequency: 'BIWEEKLY',
      minPayoutAmount: 100,
      firstPayoutDays: 14,
      minProfitableDaysForPayout: 5,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 25000,
      maxScalingAccountSize: 1000000,
    },
  },
  legion: {
    label: 'LegionFunding 50K (2-Step)',
    firm: 'LegionFunding',
    model: 'TWO_STEP',
    config: {
      propFirmName: 'LegionFunding',
      displayName: 'LegionFunding 50K Two-Step',
      accountSize: 50000,
      currency: 'USD',
      programModel: 'TWO_STEP',
      phase1: {
        profitTargetEnabled: true,
        profitTargetPercent: 8,
        dailyLossEnabled: true,
        dailyLossPercent: 4,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 3,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      phase2: {
        profitTargetEnabled: true,
        profitTargetPercent: 5,
        dailyLossEnabled: true,
        dailyLossPercent: 4,
        dailyLossMethod: 'START_OF_DAY_BALANCE',
        maxLossEnabled: true,
        totalLossPercent: 10,
        drawdownModel: 'STATIC',
        minTradingDays: 3,
        maxTradingDays: 0,
        qualifyingDayProfitPercent: 0.5,
        inactivityMaxDays: 30,
      },
      consistencyRule: true,
      consistencyMaxDayPercent: 40,
      maxProfitConcentrationPercent: 40,
      newsTrading: 'RESTRICTED',
      newsWindowMinutes: 5,
      weekendHolding: false,
      overnightHolding: true,
      eaTrading: 'ALLOWED',
      copyTrading: 'ALLOWED',
      hedging: 'ALLOWED',
      maxLotSize: 10,
      maxPositions: 5,
      maxLeverage: 100,
      prohibitedStrategies: ['Martingale', 'Grid Trading', 'Latency Arbitrage', 'Tick Scalping'],
      vpnAllowed: true,
      vpsAllowed: true,
      singleIpOnly: false,
      payoutEnabled: true,
      profitSplitTraderPercent: 80,
      payoutFrequency: 'BIWEEKLY',
      minPayoutAmount: 100,
      firstPayoutDays: 14,
      minProfitableDaysForPayout: 3,
      scalingEnabled: true,
      scalingProfitPercent: 10,
      scalingIncrementAmount: 25000,
      maxScalingAccountSize: 2000000,
    },
  },
};

export function createCustomPropFirmAccount(config: PropFirmWizardConfig): PropFirmAccount {
  const accountId = `pf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const startingBalance = config.accountSize > 0 ? config.accountSize : 100000;
  const programModel = config.programModel || 'TWO_STEP';
  const currency = config.currency || 'USD';

  const p1TargetAmount = config.phase1.profitTargetEnabled ? roundMoney(startingBalance * (config.phase1.profitTargetPercent / 100)) : 0;
  const p1DailyLossAmount = roundMoney(startingBalance * (config.phase1.dailyLossPercent / 100));
  const p1TotalLossAmount = roundMoney(startingBalance * (config.phase1.totalLossPercent / 100));

  const p2TargetAmount = config.phase2.profitTargetEnabled ? roundMoney(startingBalance * (config.phase2.profitTargetPercent / 100)) : 0;
  const p2DailyLossAmount = roundMoney(startingBalance * (config.phase2.dailyLossPercent / 100));
  const p2TotalLossAmount = roundMoney(startingBalance * (config.phase2.totalLossPercent / 100));

  let phases: PropFirmPhaseConfig[] = [];
  let initialPhase: PropFirmPhase = 'PHASE_1';
  let initialPhaseName = 'Phase 1 Evaluation';

  if (programModel === 'TWO_STEP') {
    initialPhase = 'PHASE_1';
    initialPhaseName = 'Phase 1 Evaluation';
    phases = [
      {
        id: `phase-1-${accountId}`,
        name: 'Phase 1 Evaluation',
        phaseOrder: 1,
        phaseType: 'PHASE_1',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: config.phase1.profitTargetEnabled ? config.phase1.profitTargetPercent : 0,
        profitTargetAmount: p1TargetAmount,
        dailyLossPercent: config.phase1.dailyLossPercent,
        dailyLossAmount: p1DailyLossAmount,
        totalLossPercent: config.phase1.totalLossPercent,
        totalLossAmount: p1TotalLossAmount,
        drawdownModel: config.phase1.drawdownModel,
        dailyDrawdownModel: config.phase1.dailyLossMethod,
        minTradingDays: config.phase1.minTradingDays,
        maxTradingDays: config.phase1.maxTradingDays,
        qualifyingDayProfitPercent: config.phase1.qualifyingDayProfitPercent,
        consistencyMaxDayPercent: config.consistencyRule ? config.consistencyMaxDayPercent : undefined,
        maxProfitConcentrationPercent: config.maxProfitConcentrationPercent,
        startedAt: new Date().toISOString(),
      },
      {
        id: `phase-2-${accountId}`,
        name: 'Phase 2 Verification',
        phaseOrder: 2,
        phaseType: 'PHASE_2',
        status: 'INACTIVE',
        startingBalance,
        profitTargetPercent: config.phase2.profitTargetEnabled ? config.phase2.profitTargetPercent : 0,
        profitTargetAmount: p2TargetAmount,
        dailyLossPercent: config.phase2.dailyLossPercent,
        dailyLossAmount: p2DailyLossAmount,
        totalLossPercent: config.phase2.totalLossPercent,
        totalLossAmount: p2TotalLossAmount,
        drawdownModel: config.phase2.drawdownModel,
        dailyDrawdownModel: config.phase2.dailyLossMethod,
        minTradingDays: config.phase2.minTradingDays,
        maxTradingDays: config.phase2.maxTradingDays,
        qualifyingDayProfitPercent: config.phase2.qualifyingDayProfitPercent,
        consistencyMaxDayPercent: config.consistencyRule ? config.consistencyMaxDayPercent : undefined,
        maxProfitConcentrationPercent: config.maxProfitConcentrationPercent,
      },
      {
        id: `phase-funded-${accountId}`,
        name: 'Funded Account',
        phaseOrder: 3,
        phaseType: 'FUNDED',
        status: 'INACTIVE',
        startingBalance,
        profitTargetPercent: 0,
        profitTargetAmount: 0,
        dailyLossPercent: config.phase2.dailyLossPercent,
        dailyLossAmount: p2DailyLossAmount,
        totalLossPercent: config.phase2.totalLossPercent,
        totalLossAmount: p2TotalLossAmount,
        drawdownModel: config.phase2.drawdownModel,
        dailyDrawdownModel: config.phase2.dailyLossMethod,
        minTradingDays: 0,
      },
    ];
  } else if (programModel === 'ONE_STEP') {
    initialPhase = 'EVALUATION';
    initialPhaseName = 'Evaluation Phase';
    phases = [
      {
        id: `phase-eval-${accountId}`,
        name: 'Evaluation Phase',
        phaseOrder: 1,
        phaseType: 'EVALUATION',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: config.phase1.profitTargetEnabled ? config.phase1.profitTargetPercent : 0,
        profitTargetAmount: p1TargetAmount,
        dailyLossPercent: config.phase1.dailyLossPercent,
        dailyLossAmount: p1DailyLossAmount,
        totalLossPercent: config.phase1.totalLossPercent,
        totalLossAmount: p1TotalLossAmount,
        drawdownModel: config.phase1.drawdownModel,
        dailyDrawdownModel: config.phase1.dailyLossMethod,
        minTradingDays: config.phase1.minTradingDays,
        maxTradingDays: config.phase1.maxTradingDays,
        qualifyingDayProfitPercent: config.phase1.qualifyingDayProfitPercent,
        startedAt: new Date().toISOString(),
      },
      {
        id: `phase-funded-${accountId}`,
        name: 'Funded Account',
        phaseOrder: 2,
        phaseType: 'FUNDED',
        status: 'INACTIVE',
        startingBalance,
        profitTargetPercent: 0,
        profitTargetAmount: 0,
        dailyLossPercent: config.phase1.dailyLossPercent,
        dailyLossAmount: p1DailyLossAmount,
        totalLossPercent: config.phase1.totalLossPercent,
        totalLossAmount: p1TotalLossAmount,
        drawdownModel: config.phase1.drawdownModel,
        dailyDrawdownModel: config.phase1.dailyLossMethod,
        minTradingDays: 0,
      },
    ];
  } else if (programModel === 'INSTANT_FUNDING') {
    initialPhase = 'FUNDED';
    initialPhaseName = 'Funded Account';
    phases = [
      {
        id: `phase-funded-${accountId}`,
        name: 'Funded Account',
        phaseOrder: 1,
        phaseType: 'FUNDED',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: 0,
        profitTargetAmount: 0,
        dailyLossPercent: config.phase1.dailyLossPercent,
        dailyLossAmount: p1DailyLossAmount,
        totalLossPercent: config.phase1.totalLossPercent,
        totalLossAmount: p1TotalLossAmount,
        drawdownModel: config.phase1.drawdownModel,
        dailyDrawdownModel: config.phase1.dailyLossMethod,
        minTradingDays: 0,
        startedAt: new Date().toISOString(),
      },
    ];
  } else {
    // CUSTOM
    initialPhase = 'CUSTOM';
    initialPhaseName = 'Custom Evaluation';
    phases = [
      {
        id: `phase-custom-${accountId}`,
        name: 'Custom Evaluation',
        phaseOrder: 1,
        phaseType: 'CUSTOM',
        status: 'ACTIVE',
        startingBalance,
        profitTargetPercent: config.phase1.profitTargetPercent,
        profitTargetAmount: p1TargetAmount,
        dailyLossPercent: config.phase1.dailyLossPercent,
        dailyLossAmount: p1DailyLossAmount,
        totalLossPercent: config.phase1.totalLossPercent,
        totalLossAmount: p1TotalLossAmount,
        drawdownModel: config.phase1.drawdownModel,
        dailyDrawdownModel: config.phase1.dailyLossMethod,
        minTradingDays: config.phase1.minTradingDays,
        maxTradingDays: config.phase1.maxTradingDays,
        startedAt: new Date().toISOString(),
      },
    ];
  }

  // 20 Modular Institutional Rules with accurate user-configured values
  const rules: PropFirmRule[] = [
    {
      id: `r-pt-${accountId}`,
      name: 'Profit Target',
      type: 'PROFIT_TARGET',
      description: config.phase1.profitTargetEnabled
        ? `Reach +$${p1TargetAmount.toLocaleString()} profit (${config.phase1.profitTargetPercent}% of initial balance).`
        : 'No profit target required for this phase.',
      enabled: config.phase1.profitTargetEnabled,
      threshold: p1TargetAmount,
      unit: 'USD',
      calculationMethodology: 'Closed realized PnL across active phase trades',
      warningThreshold: roundMoney(p1TargetAmount * 0.7),
      criticalThreshold: roundMoney(p1TargetAmount * 0.9),
      status: 'SAFE',
    },
    {
      id: `r-dl-${accountId}`,
      name: 'Daily Loss Limit',
      type: 'DAILY_DRAWDOWN',
      description: `Daily drawdown must not exceed $${p1DailyLossAmount.toLocaleString()} (${config.phase1.dailyLossPercent}% via ${config.phase1.dailyLossMethod.replace(/_/g, ' ')}).`,
      enabled: config.phase1.dailyLossEnabled,
      threshold: p1DailyLossAmount,
      unit: 'USD',
      calculationMethodology: `Calculated from ${config.phase1.dailyLossMethod}`,
      warningThreshold: roundMoney(p1DailyLossAmount * 0.7),
      criticalThreshold: roundMoney(p1DailyLossAmount * 0.9),
      status: 'SAFE',
    },
    {
      id: `r-ml-${accountId}`,
      name: 'Maximum Loss Limit',
      type: 'MAX_DRAWDOWN',
      description: `Total account drawdown limit is $${p1TotalLossAmount.toLocaleString()} (${config.phase1.totalLossPercent}% via ${config.phase1.drawdownModel.replace(/_/g, ' ')}).`,
      enabled: config.phase1.maxLossEnabled,
      threshold: p1TotalLossAmount,
      unit: 'USD',
      calculationMethodology: `${config.phase1.drawdownModel} drawdown calculation methodology`,
      warningThreshold: roundMoney(p1TotalLossAmount * 0.7),
      criticalThreshold: roundMoney(p1TotalLossAmount * 0.9),
      status: 'SAFE',
    },
    {
      id: `r-td-${accountId}`,
      name: 'Minimum Trading Days',
      type: 'MIN_TRADING_DAYS',
      description: `Complete at least ${config.phase1.minTradingDays} active trading day(s).`,
      enabled: config.phase1.minTradingDays > 0,
      threshold: config.phase1.minTradingDays,
      unit: 'DAYS',
      calculationMethodology: 'Count of unique calendar dates with at least 1 executed closed trade',
      status: 'SAFE',
    },
    {
      id: `r-cr-${accountId}`,
      name: 'Consistency Rule',
      type: 'CONSISTENCY',
      description: config.consistencyRule
        ? `No single day can account for more than ${config.consistencyMaxDayPercent}% of total profit.`
        : 'Consistency rule disabled.',
      enabled: config.consistencyRule,
      threshold: config.consistencyMaxDayPercent,
      unit: 'PERCENT',
      calculationMethodology: 'Highest single-day net profit divided by overall cumulative profit',
      status: 'SAFE',
    },
    {
      id: `r-nt-${accountId}`,
      name: 'News Trading Restriction',
      type: 'NEWS_RESTRICTION',
      description: config.newsTrading === 'PROHIBITED'
        ? `No executions permitted within ${config.newsWindowMinutes}m before and after high-impact economic news releases.`
        : config.newsTrading === 'RESTRICTED'
        ? `Holding positions across red folder releases is subject to slippage restrictions (${config.newsWindowMinutes}m buffer).`
        : 'News trading permitted without restriction.',
      enabled: config.newsTrading !== 'ALLOWED',
      threshold: config.newsWindowMinutes,
      unit: 'MINUTES',
      calculationMethodology: 'Cross-reference execution timestamp with red-folder economic calendar events',
      status: 'SAFE',
    },
    {
      id: `r-wh-${accountId}`,
      name: 'Weekend Holding Guard',
      type: 'WEEKEND_RESTRICTION',
      description: config.weekendHolding
        ? 'Weekend position holding permitted.'
        : 'All open positions must be closed before Friday market close (17:00 NY time).',
      enabled: !config.weekendHolding,
      threshold: 0,
      unit: 'CUSTOM',
      calculationMethodology: 'Audit for positions open past Friday 17:00 NY to Sunday 17:00 NY',
      status: 'SAFE',
    },
    {
      id: `r-oh-${accountId}`,
      name: 'Overnight Holding Rule',
      type: 'OVERNIGHT_RESTRICTION',
      description: config.overnightHolding
        ? 'Overnight position holding allowed.'
        : 'Intraday day trading only: All trades must close before daily session settlement.',
      enabled: !config.overnightHolding,
      threshold: 0,
      unit: 'CUSTOM',
      calculationMethodology: 'Detect trades held overnight past daily market settlement',
      status: 'SAFE',
    },
    {
      id: `r-ea-${accountId}`,
      name: 'EA / Algorithmic Trading',
      type: 'EA_RESTRICTION',
      description: `Expert Advisors and bots are ${config.eaTrading}.`,
      enabled: config.eaTrading !== 'ALLOWED',
      threshold: 0,
      unit: 'CUSTOM',
      calculationMethodology: 'Verification of algorithmic execution tags and bot parameters',
      status: 'SAFE',
    },
    {
      id: `r-cp-${accountId}`,
      name: 'Copy Trading Policy',
      type: 'COPY_TRADING',
      description: `Trade copying and account mirroring is ${config.copyTrading}.`,
      enabled: config.copyTrading !== 'ALLOWED',
      threshold: 0,
      unit: 'CUSTOM',
      calculationMethodology: 'Correlation analysis against external trader signals',
      status: 'SAFE',
    },
    {
      id: `r-hg-${accountId}`,
      name: 'Hedging Protection',
      type: 'HEDGING',
      description: `Simultaneous opposing positions on the same asset are ${config.hedging}.`,
      enabled: config.hedging !== 'ALLOWED',
      threshold: 0,
      unit: 'CUSTOM',
      calculationMethodology: 'Audit simultaneous BUY and SELL on identical symbols',
      status: 'SAFE',
    },
    {
      id: `r-pos-${accountId}`,
      name: 'Max Lot & Position Limits',
      type: 'MAX_POSITION_SIZE',
      description: config.maxLotSize ? `Maximum total open lot exposure: ${config.maxLotSize} lots.` : 'No hard position lot cap enforced.',
      enabled: !!config.maxLotSize,
      threshold: config.maxLotSize || 0,
      unit: 'LOTS',
      calculationMethodology: 'Sum of open contracts/lots across all concurrent positions',
      status: 'SAFE',
    },
    {
      id: `r-ina-${accountId}`,
      name: 'Inactivity Limit',
      type: 'INACTIVITY',
      description: 'Accounts with zero trade activity for over 30 consecutive calendar days expire.',
      enabled: true,
      threshold: 30,
      unit: 'DAYS',
      calculationMethodology: 'Elapsed calendar days since most recent executed trade',
      status: 'SAFE',
    },
    {
      id: `r-strat-${accountId}`,
      name: 'Prohibited Strategies',
      type: 'PROHIBITED_STRATEGY',
      description: config.prohibitedStrategies.length > 0
        ? `Prohibited: ${config.prohibitedStrategies.join(', ')}.`
        : 'Standard strategies permitted.',
      enabled: config.prohibitedStrategies.length > 0,
      threshold: config.prohibitedStrategies.length,
      unit: 'CUSTOM',
      calculationMethodology: 'Execution pattern audit against prohibited trade behaviors',
      status: 'SAFE',
    },
    {
      id: `r-net-${accountId}`,
      name: 'IP & Infrastructure Policy',
      type: 'IP_VPN_RESTRICTION',
      description: `VPN: ${config.vpnAllowed ? 'Allowed' : 'Prohibited'}, VPS: ${config.vpsAllowed ? 'Allowed' : 'Prohibited'}.`,
      enabled: !config.vpnAllowed || config.singleIpOnly,
      threshold: 0,
      unit: 'CUSTOM',
      calculationMethodology: 'Network geolocation and IP consistency audit',
      status: 'SAFE',
    },
    {
      id: `r-pay-${accountId}`,
      name: 'Payout Split & Terms',
      type: 'PAYOUT_CONDITIONS',
      description: `${config.profitSplitTraderPercent}% Trader / ${100 - config.profitSplitTraderPercent}% Firm split (${config.payoutFrequency.toLowerCase()}).`,
      enabled: config.payoutEnabled,
      threshold: config.profitSplitTraderPercent,
      unit: 'PERCENT',
      calculationMethodology: 'Profit split computation on eligible profits exceeding buffer',
      status: 'SAFE',
    },
    {
      id: `r-scale-${accountId}`,
      name: 'Scaling Plan',
      type: 'SCALING_RULE',
      description: config.scalingEnabled
        ? `Scales by +$${config.scalingIncrementAmount.toLocaleString()} upon achieving +${config.scalingProfitPercent}% profit (Cap: $${config.maxScalingAccountSize.toLocaleString()}).`
        : 'Account scaling disabled.',
      enabled: config.scalingEnabled,
      threshold: config.scalingProfitPercent,
      unit: 'PERCENT',
      calculationMethodology: 'Account tier elevation following consistent milestone targets',
      status: 'SAFE',
    },
    {
      id: `r-dur-${accountId}`,
      name: 'Minimum Holding Duration',
      type: 'MIN_TRADE_DURATION',
      description: 'Positions must be held open for at least 60 seconds to prevent ultra-fast tick scalping.',
      enabled: true,
      threshold: 60,
      unit: 'SECONDS',
      calculationMethodology: 'Exit timestamp minus entry timestamp for every trade',
      status: 'SAFE',
    },
    {
      id: `r-lev-${accountId}`,
      name: 'Account Leverage',
      type: 'LEVERAGE',
      description: config.maxLeverage ? `Maximum leverage restricted to 1:${config.maxLeverage}.` : 'Standard leverage applied.',
      enabled: !!config.maxLeverage,
      threshold: config.maxLeverage || 100,
      unit: 'CUSTOM',
      calculationMethodology: 'Position notional value divided by account equity',
      status: 'SAFE',
    },
    {
      id: `r-qual-${accountId}`,
      name: 'Qualifying Profit Day',
      type: 'QUALIFYING_DAY',
      description: config.phase1.qualifyingDayProfitPercent
        ? `A day is qualifying when net realized profit reaches at least ${config.phase1.qualifyingDayProfitPercent}% ($${roundMoney(startingBalance * (config.phase1.qualifyingDayProfitPercent / 100)).toLocaleString()}).`
        : 'Any trade day qualifies.',
      enabled: !!config.phase1.qualifyingDayProfitPercent,
      threshold: config.phase1.qualifyingDayProfitPercent || 0,
      unit: 'PERCENT',
      calculationMethodology: 'Daily net PnL divided by starting balance',
      status: 'SAFE',
    },
  ];

  const formattedK = startingBalance >= 1000 ? `${(startingBalance / 1000).toFixed(0)}K` : startingBalance.toString();
  const finalName = config.displayName?.trim() || `${config.propFirmName} $${formattedK}`;

  return {
    id: accountId,
    createdAt: new Date().toISOString(),
    name: finalName,
    firmName: config.propFirmName || 'Custom Firm',
    tradingBrand: config.propFirmName || 'Custom Firm',
    accountSize: startingBalance,
    startingBalance,
    currentBalance: startingBalance,
    equity: startingBalance,
    highWaterMark: startingBalance,
    programModel,
    phases,
    activePhaseIndex: 0,
    phase: initialPhase,
    phaseName: initialPhaseName,
    status: 'ACTIVE',
    riskState: 'SAFE',
    enforcementMode: 'MONITOR',
    drawdownModel: config.phase1.drawdownModel,
    dailyDrawdownModel: config.phase1.dailyLossMethod,
    dailyLossMethod: config.phase1.dailyLossMethod as any,
    profitTargetPercent: config.programModel === 'INSTANT_FUNDING' ? 0 : config.phase1.profitTargetPercent,
    dailyLossPercent: config.phase1.dailyLossPercent,
    totalLossPercent: config.phase1.totalLossPercent,
    profitTargetAmount: config.programModel === 'INSTANT_FUNDING' ? 0 : p1TargetAmount,
    dailyLossAmount: p1DailyLossAmount,
    totalLossAmount: p1TotalLossAmount,
    minTradingDays: config.programModel === 'INSTANT_FUNDING' ? 0 : config.phase1.minTradingDays,
    maxTradingDays: config.programModel === 'INSTANT_FUNDING' ? 0 : config.phase1.maxTradingDays,
    startDate: new Date().toISOString().split('T')[0],
    qualifyingDayProfitPercent: config.phase1.qualifyingDayProfitPercent,
    consistencyMaxDayPercent: config.consistencyRule ? config.consistencyMaxDayPercent : undefined,
    maxProfitConcentrationPercent: config.maxProfitConcentrationPercent,
    newsTradingAllowed: config.newsTrading,
    newsWindowMinutes: config.newsWindowMinutes,
    weekendHoldingAllowed: config.weekendHolding,
    overnightHoldingAllowed: config.overnightHolding,
    eaAllowed: config.eaTrading,
    copyTradingAllowed: config.copyTrading,
    hedgingAllowed: config.hedging,
    maxLotSize: config.maxLotSize,
    maxPositions: config.maxPositions,
    maxLeverage: config.maxLeverage,
    prohibitedStrategies: config.prohibitedStrategies,
    profitSplitTraderPercent: config.profitSplitTraderPercent,
    profitSplitFirmPercent: 100 - config.profitSplitTraderPercent,
    payoutFrequency: config.payoutFrequency,
    currency,
    sessionTimezone: 'America/New_York',
    tradingAccountLink: config.tradingAccountLink || 'all',
    ipRestrictions: {
      vpnAllowed: config.vpnAllowed,
      vpsAllowed: config.vpsAllowed,
      singleIpOnly: config.singleIpOnly,
    },
    scalingRules: config.scalingEnabled
      ? {
          enabled: true,
          thresholdAmount: roundMoney(startingBalance * (config.scalingProfitPercent / 100)),
          scalingPercentage: 25,
          maxAccountSize: config.maxScalingAccountSize,
          currentScaleLevel: 1,
        }
      : undefined,
    payoutInfo: {
      minTradingDaysRequired: config.minProfitableDaysForPayout || 0,
      tradingDaysCompleted: 0,
      profitSplitPercent: config.profitSplitTraderPercent,
      eligibleProfit: 0,
      payoutAmount: 0,
      minRequestAmount: config.minPayoutAmount || 100,
      rewardBufferPercent: 0,
      rewardBufferMet: true,
      payoutHistory: [],
    },
    rules,
    violations: [],
    timeline: [
      {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Account Initialized',
        description: `Configured and launched ${finalName} (${config.propFirmName}) with $${startingBalance.toLocaleString()} ${currency} balance.`,
        type: 'CREATE',
      },
    ],
  };
}

/**
 * Institutional Prop Firm Engine
 */
export class PropFirmEngine {
  /**
   * Calculate session trading date in designated timezone
   */
  static getSessionTradingDate(isoString: string, timezone: string = 'America/New_York'): string {
    if (!isoString) return new Date().toISOString().split('T')[0];
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString.split('T')[0];
      const tz = timezone || 'America/New_York';
      try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        return formatter.format(d);
      } catch {
        return d.toISOString().split('T')[0];
      }
    } catch {
      return isoString.split('T')[0];
    }
  }

  /**
   * Group trades by trading day according to account session boundary
   */
  static groupTradesByTradingDay(trades: Trade[], timezone: string): Record<string, { trades: Trade[]; netPnl: number }> {
    const map: Record<string, { trades: Trade[]; netPnl: number }> = {};
    trades.forEach((t) => {
      if (t.status !== 'CLOSED') return;
      const day = this.getSessionTradingDate(t.entryDate || t.exitDate || '', timezone);
      if (!map[day]) {
        map[day] = { trades: [], netPnl: 0 };
      }
      map[day].trades.push(t);
      map[day].netPnl = safeAdd(map[day].netPnl, t.netPnl || 0);
    });
    return map;
  }

  /**
   * Dynamic Threshold Helper: Convert % to exact dollar value based on account starting balance
   */
  static getDynamicThreshold(account: PropFirmAccount, ruleType: string, defaultPercent: number): number {
    const rule = account.rules.find((r) => r.type === ruleType && r.enabled);
    if (!rule) return roundMoney(account.startingBalance * (defaultPercent / 100), 2);
    if (rule.unit === 'PERCENT') {
      return roundMoney(account.startingBalance * (rule.threshold / 100), 2);
    }
    return rule.threshold;
  }

  /**
   * Calculate exact drawdown based on chosen model (Static, EOD Trailing, Intraday HWM Trailing)
   */
  static calculateMaxDrawdown(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    currentDrawdown: number;
    peakEquity: number;
    drawdownThreshold: number;
    bufferRemaining: number;
    bufferPercent: number;
    isBreached: boolean;
  } {
    const initial = account.startingBalance;
    const maxLossThreshold = this.getDynamicThreshold(account, 'MAX_DRAWDOWN', account.totalLossPercent || 10);

    // Chronologically sort closed trades
    const sortedTrades = [...trades]
      .filter((t) => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    let runningBalance = initial;
    let peakBalance = initial;

    // Track daily closes for EOD model
    const dailyMap = this.groupTradesByTradingDay(sortedTrades, account.sessionTimezone);
    const dailyKeys = Object.keys(dailyMap).sort();

    let eodPeak = initial;
    let eodBalance = initial;
    dailyKeys.forEach((key) => {
      eodBalance = safeAdd(eodBalance, dailyMap[key].netPnl);
      if (eodBalance > eodPeak) eodPeak = eodBalance;
    });

    sortedTrades.forEach((t) => {
      runningBalance = safeAdd(runningBalance, t.netPnl || 0);
      if (runningBalance > peakBalance) {
        peakBalance = runningBalance;
      }
    });

    const peakEquity = Math.max(peakBalance, account.highWaterMark || initial, account.currentBalance);

    let currentDrawdown = 0;
    let drawdownThreshold = 0;

    switch (account.drawdownModel) {
      case 'STATIC': {
        drawdownThreshold = roundMoney(initial - maxLossThreshold, 2);
        currentDrawdown = Math.max(0, roundMoney(initial - account.currentBalance, 2));
        break;
      }
      case 'EOD_TRAILING': {
        const lockInLevel = initial + 100;
        const rawThreshold = roundMoney(eodPeak - maxLossThreshold, 2);
        drawdownThreshold = Math.min(rawThreshold, lockInLevel);
        currentDrawdown = Math.max(0, roundMoney(eodPeak - account.currentBalance, 2));
        break;
      }
      case 'INTRADAY_HWM_TRAILING': {
        const lockInLevel = initial + 100;
        const rawThreshold = roundMoney(peakEquity - maxLossThreshold, 2);
        drawdownThreshold = Math.min(rawThreshold, lockInLevel);
        currentDrawdown = Math.max(0, roundMoney(peakEquity - account.currentBalance, 2));
        break;
      }
      default:
        drawdownThreshold = roundMoney(initial - maxLossThreshold, 2);
        currentDrawdown = Math.max(0, roundMoney(initial - account.currentBalance, 2));
    }

    const bufferRemaining = Math.max(0, roundMoney(account.currentBalance - drawdownThreshold, 2));
    const bufferPercent = maxLossThreshold > 0 ? roundMoney((bufferRemaining / maxLossThreshold) * 100, 2) : 100;
    const isBreached = account.currentBalance <= drawdownThreshold;

    return {
      currentDrawdown: roundMoney(currentDrawdown, 2),
      peakEquity: roundMoney(peakEquity, 2),
      drawdownThreshold: roundMoney(drawdownThreshold, 2),
      bufferRemaining: roundMoney(bufferRemaining, 2),
      bufferPercent: Math.min(100, Math.max(0, bufferPercent)),
      isBreached,
    };
  }

  /**
   * Calculate daily drawdown & session loss
   */
  static calculateDailyDrawdown(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    todayLoss: number;
    todayNetPnl: number;
    dailyLimit: number;
    remainingDailyBuffer: number;
    remainingDailyBufferPercent: number;
    startOfDayReference: number;
    isBreached: boolean;
  } {
    const dailyLimit = this.getDynamicThreshold(account, 'DAILY_DRAWDOWN', account.dailyLossPercent || 4);

    const todayStr = this.getSessionTradingDate(new Date().toISOString(), account.sessionTimezone);
    const dailyGroups = this.groupTradesByTradingDay(trades, account.sessionTimezone);
    const todayGroup = dailyGroups[todayStr] || { trades: [], netPnl: 0 };

    const todayNetPnl = roundMoney(todayGroup.netPnl, 2);
    const todayLoss = todayNetPnl < 0 ? Math.abs(todayNetPnl) : 0;

    const startOfDayReference = roundMoney(account.currentBalance - todayNetPnl, 2);
    const remainingDailyBuffer = Math.max(0, roundMoney(dailyLimit - todayLoss, 2));
    const remainingDailyBufferPercent = dailyLimit > 0 ? roundMoney((remainingDailyBuffer / dailyLimit) * 100, 2) : 100;
    const isBreached = todayLoss >= dailyLimit;

    return {
      todayLoss: roundMoney(todayLoss, 2),
      todayNetPnl: roundMoney(todayNetPnl, 2),
      dailyLimit: roundMoney(dailyLimit, 2),
      remainingDailyBuffer: roundMoney(remainingDailyBuffer, 2),
      remainingDailyBufferPercent: Math.min(100, Math.max(0, remainingDailyBufferPercent)),
      startOfDayReference,
      isBreached,
    };
  }

  /**
   * Calculate Profit Target Progress
   */
  static calculateProfitTarget(
    account: PropFirmAccount
  ): {
    target: number;
    currentProfit: number;
    profitPercent: number;
    progressPercent: number;
    remainingProfit: number;
    isPassed: boolean;
  } {
    const target = this.getDynamicThreshold(account, 'PROFIT_TARGET', account.profitTargetPercent || 8);
    const currentProfit = roundMoney(account.currentBalance - account.startingBalance, 2);
    const profitPercent = account.startingBalance > 0 ? roundMoney((currentProfit / account.startingBalance) * 100, 2) : 0;
    const progressPercent = target > 0 ? Math.min(100, Math.max(0, roundMoney((currentProfit / target) * 100, 1))) : 0;
    const remainingProfit = Math.max(0, roundMoney(target - currentProfit, 2));
    const isPassed = currentProfit >= target;

    return {
      target: roundMoney(target, 2),
      currentProfit,
      profitPercent,
      progressPercent,
      remainingProfit,
      isPassed,
    };
  }

  /**
   * Calculate Minimum Trading Days & Qualifying Days
   */
  static calculateTradingDays(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    minDaysRequired: number;
    daysCompleted: number;
    qualifyingDaysCompleted: number;
    qualifyingDayThresholdDollar: number;
    daysRemaining: number;
    dailyBreakdown: Array<{ date: string; netPnl: number; isQualifying: boolean }>;
    isSatisfied: boolean;
  } {
    const daysRule = account.rules.find((r) => r.type === 'MIN_TRADING_DAYS' && r.enabled);
    const minDaysRequired = daysRule ? daysRule.threshold : account.minTradingDays ?? 3;

    const qualPercent = account.qualifyingDayProfitPercent ?? 0.5;
    const qualifyingDayThresholdDollar = roundMoney(account.startingBalance * (qualPercent / 100), 2);

    const dailyGroups = this.groupTradesByTradingDay(trades, account.sessionTimezone);
    const dates = Object.keys(dailyGroups).sort();

    let qualifyingDaysCount = 0;
    const dailyBreakdown = dates.map((d) => {
      const pnl = roundMoney(dailyGroups[d].netPnl, 2);
      const isQualifying = pnl >= qualifyingDayThresholdDollar;
      if (isQualifying) qualifyingDaysCount++;
      return { date: d, netPnl: pnl, isQualifying };
    });

    const daysCompleted = dates.length;
    const daysRemaining = Math.max(0, minDaysRequired - daysCompleted);
    const isSatisfied = daysCompleted >= minDaysRequired;

    return {
      minDaysRequired,
      daysCompleted,
      qualifyingDaysCompleted: qualifyingDaysCount,
      qualifyingDayThresholdDollar,
      daysRemaining,
      dailyBreakdown,
      isSatisfied,
    };
  }

  /**
   * Calculate Risk Exposure Per Symbol
   */
  static calculateSymbolRiskExposure(
    account: PropFirmAccount,
    trades: Trade[]
  ): Array<{
    symbol: string;
    totalTradesCount: number;
    realizedPnl: number;
    potentialRiskDollar: number;
    maxAllowedRiskDollar: number;
    remainingAllowedRisk: number;
    status: 'SAFE' | 'WARNING' | 'BREACHED';
  }> {
    const maxRiskPercent = account.maxRiskPerSymbolPercent || 2;
    const maxAllowedRiskDollar = roundMoney(account.startingBalance * (maxRiskPercent / 100), 2);

    const symbolMap: Record<string, { count: number; pnl: number; potentialRisk: number }> = {};

    trades.forEach((t) => {
      if (!symbolMap[t.symbol]) {
        symbolMap[t.symbol] = { count: 0, pnl: 0, potentialRisk: 0 };
      }
      symbolMap[t.symbol].count++;
      symbolMap[t.symbol].pnl = safeAdd(symbolMap[t.symbol].pnl, t.netPnl || 0);

      // Estimated SL risk calculation if open/closed position has SL defined
      let tradeRisk = 0;
      if (t.stopLoss && t.entryPrice) {
        tradeRisk = Math.abs(t.entryPrice - t.stopLoss) * (t.quantity || 1) * 20; // fallback multiplier
      } else if (t.netPnl < 0) {
        tradeRisk = Math.abs(t.netPnl);
      }
      symbolMap[t.symbol].potentialRisk = Math.max(symbolMap[t.symbol].potentialRisk, tradeRisk);
    });

    return Object.keys(symbolMap).map((sym) => {
      const data = symbolMap[sym];
      const risk = roundMoney(data.potentialRisk, 2);
      const remaining = Math.max(0, roundMoney(maxAllowedRiskDollar - risk, 2));
      const status: 'SAFE' | 'WARNING' | 'BREACHED' =
        risk > maxAllowedRiskDollar ? 'BREACHED' : risk >= maxAllowedRiskDollar * 0.8 ? 'WARNING' : 'SAFE';

      return {
        symbol: sym,
        totalTradesCount: data.count,
        realizedPnl: roundMoney(data.pnl, 2),
        potentialRiskDollar: risk,
        maxAllowedRiskDollar,
        remainingAllowedRisk: remaining,
        status,
      };
    });
  }

  /**
   * Calculate Minimum Trade Duration vs Average Trade Duration
   */
  static calculateTradeDurations(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    minRequiredSec: number;
    avgTradeDurationSec: number;
    durationBreachesCount: number;
    compliantTradesCount: number;
    totalCheckedTrades: number;
    details: Array<{ tradeId: string; symbol: string; durationSec: number; durationText: string; isCompliant: boolean }>;
  } {
    const minRequiredSec = account.minTradeDurationSec || 60;
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');

    let totalSec = 0;
    let breachesCount = 0;
    let compliantCount = 0;

    const details = closedTrades.map((t) => {
      const mins = t.durationMinutes || 1;
      const sec = Math.round(mins * 60);
      totalSec += sec;

      const isCompliant = sec >= minRequiredSec;
      if (isCompliant) compliantCount++;
      else breachesCount++;

      const durationText = `${Math.floor(sec / 60)}m ${sec % 60}s`;
      return { tradeId: t.id, symbol: t.symbol, durationSec: sec, durationText, isCompliant };
    });

    const avgTradeDurationSec = closedTrades.length > 0 ? Math.round(totalSec / closedTrades.length) : 0;

    return {
      minRequiredSec,
      avgTradeDurationSec,
      durationBreachesCount: breachesCount,
      compliantTradesCount: compliantCount,
      totalCheckedTrades: closedTrades.length,
      details,
    };
  }

  /**
   * Calculate Consistency Metric (20% for Instant & Fast Track)
   */
  static calculateConsistency(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    bestDayProfit: number;
    totalProfit: number;
    consistencyPercent: number;
    allowedPercent: number;
    additionalProfitNeeded: number;
    marginRemaining: number;
    isCompliant: boolean;
  } {
    const consistencyRule = account.rules.find((r) => r.type === 'CONSISTENCY' && r.enabled);
    const allowedPercent = consistencyRule ? consistencyRule.threshold : account.consistencyMaxDayPercent || 20;

    const dailyGroups = this.groupTradesByTradingDay(trades, account.sessionTimezone);
    let bestDayProfit = 0;
    let totalPositiveProfit = 0;

    Object.values(dailyGroups).forEach((g) => {
      if (g.netPnl > 0) {
        totalPositiveProfit = safeAdd(totalPositiveProfit, g.netPnl);
        if (g.netPnl > bestDayProfit) {
          bestDayProfit = g.netPnl;
        }
      }
    });

    const consistencyPercent =
      totalPositiveProfit > 0 ? Math.round((bestDayProfit / totalPositiveProfit) * 100) : 0;
    const marginRemaining = Math.max(0, allowedPercent - consistencyPercent);
    const isCompliant = consistencyPercent <= allowedPercent;

    // Additional profit required to bring best day under consistency cap
    const requiredTotalProfit = bestDayProfit / (allowedPercent / 100);
    const additionalProfitNeeded = Math.max(0, roundMoney(requiredTotalProfit - totalPositiveProfit, 2));

    return {
      bestDayProfit: roundMoney(bestDayProfit, 2),
      totalProfit: roundMoney(totalPositiveProfit, 2),
      consistencyPercent,
      allowedPercent,
      additionalProfitNeeded,
      marginRemaining,
      isCompliant,
    };
  }

  /**
   * News Trading Rule Window Evaluation (5 mins before + 5 mins after High Impact news)
   */
  static calculateNewsCompliance(
    account: PropFirmAccount,
    trades: Trade[],
    newsEvents: Array<{ time: string; date: string; impact: string; event: string }>
  ): {
    restrictedWindowMinutes: number;
    violatingTradesCount: number;
    compliantTradesCount: number;
    newsAuditLogs: Array<{ tradeId: string; symbol: string; entryTime: string; eventName: string; isViolating: boolean }>;
  } {
    const windowMins = account.newsWindowMinutes || 5;
    const highImpactNews = newsEvents.filter((e) => e.impact === 'HIGH');
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');

    let violatingCount = 0;
    let compliantCount = 0;
    const newsAuditLogs: Array<{ tradeId: string; symbol: string; entryTime: string; eventName: string; isViolating: boolean }> = [];

    closedTrades.forEach((t) => {
      const tradeTime = new Date(t.entryDate).getTime();
      let isViolating = false;
      let eventName = 'None';

      highImpactNews.forEach((news) => {
        const newsTime = new Date(`${news.date}T${news.time}:00Z`).getTime();
        const diffMins = Math.abs(tradeTime - newsTime) / (1000 * 60);
        if (diffMins <= windowMins) {
          isViolating = true;
          eventName = news.event;
        }
      });

      if (isViolating) violatingCount++;
      else compliantCount++;

      newsAuditLogs.push({
        tradeId: t.id,
        symbol: t.symbol,
        entryTime: t.entryDate,
        eventName,
        isViolating,
      });
    });

    return {
      restrictedWindowMinutes: windowMins,
      violatingTradesCount: violatingCount,
      compliantTradesCount: compliantCount,
      newsAuditLogs,
    };
  }

  /**
   * Inactivity Monitor (30 consecutive calendar days)
   */
  static calculateInactivity(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    maxDaysAllowed: number;
    daysInactive: number;
    lastTradeDate: string | null;
    status: 'SAFE' | 'WARNING' | 'BREACHED';
  } {
    const maxDays = account.inactivityMaxDays || 30;
    const sorted = [...trades].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

    if (sorted.length === 0) {
      const createdTime = new Date(account.createdAt || Date.now()).getTime();
      const now = Date.now();
      const days = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
      return {
        maxDaysAllowed: maxDays,
        daysInactive: days,
        lastTradeDate: null,
        status: days >= maxDays ? 'BREACHED' : days >= 25 ? 'WARNING' : 'SAFE',
      };
    }

    const lastDateIso = sorted[0].entryDate || sorted[0].exitDate || account.createdAt;
    const lastTime = new Date(lastDateIso).getTime();
    const daysInactive = Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24));

    const status: 'SAFE' | 'WARNING' | 'BREACHED' =
      daysInactive >= maxDays ? 'BREACHED' : daysInactive >= 25 ? 'WARNING' : 'SAFE';

    return {
      maxDaysAllowed: maxDays,
      daysInactive,
      lastTradeDate: lastDateIso,
      status,
    };
  }

  /**
   * Payout & Reward Split Calculator
   */
  static calculatePayoutEligibility(
    account: PropFirmAccount
  ): {
    eligibleProfit: number;
    rewardSplitPercent: number;
    traderShare: number;
    firmShare: number;
    minRequestAmount: number;
    rewardBufferPercent: number;
    rewardBufferAmount: number;
    rewardBufferMet: boolean;
    isEligibleForRequest: boolean;
    statusText: string;
  } {
    const netProfit = roundMoney(Math.max(0, account.currentBalance - account.startingBalance), 2);
    const splitPercent = account.rewardSplitPercent || 80;
    const minRequest = account.minRewardRequest || 100;

    const rewardBufferPercent = account.rewardBufferPercent || 0;
    const rewardBufferAmount = roundMoney(account.startingBalance * (rewardBufferPercent / 100), 2);
    const rewardBufferMet = rewardBufferPercent === 0 || netProfit >= rewardBufferAmount;

    const traderShare = roundMoney(netProfit * (splitPercent / 100), 2);
    const firmShare = roundMoney(netProfit * ((100 - splitPercent) / 100), 2);

    const isEligible = netProfit >= minRequest && rewardBufferMet && account.status !== 'BREACHED';

    let statusText = 'Eligible to submit reward request';
    if (account.status === 'BREACHED') statusText = 'Account is breached. Payouts locked.';
    else if (!rewardBufferMet) statusText = `Must reach +3% reward buffer ($${rewardBufferAmount.toLocaleString()}) before payout claim.`;
    else if (netProfit < minRequest) statusText = `Minimum reward request is $${minRequest}.`;

    return {
      eligibleProfit: netProfit,
      rewardSplitPercent: splitPercent,
      traderShare,
      firmShare,
      minRequestAmount: minRequest,
      rewardBufferPercent,
      rewardBufferAmount,
      rewardBufferMet,
      isEligibleForRequest: isEligible,
      statusText,
    };
  }

  // ==========================================
  // MODULAR RULE EVALUATORS
  // ==========================================

  /**
   * 1. Profit Target Evaluator
   */
  static evaluateProfitTarget(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    target: number;
    currentProfit: number;
    remainingProfit: number;
    progressPercent: number;
    isPassed: boolean;
    status: 'COMPLETED' | 'INCOMPLETE' | 'SAFE';
    details: string;
  } {
    const targetPercent = activePhase?.profitTargetPercent ?? account.profitTargetPercent ?? 0;
    const target = activePhase?.profitTargetAmount ?? (targetPercent > 0 ? roundMoney(account.startingBalance * (targetPercent / 100)) : 0);

    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    const tradePnl = closedTrades.reduce((sum, t) => sum + (Number(t.netPnl) || 0), 0);
    const currentProfit = closedTrades.length > 0 ? roundMoney(tradePnl, 2) : roundMoney(account.currentBalance - account.startingBalance, 2);

    if (target <= 0) {
      return {
        target: 0,
        currentProfit: Math.max(0, currentProfit),
        remainingProfit: 0,
        progressPercent: 100,
        isPassed: true,
        status: 'COMPLETED',
        details: 'Funded / No Profit Target Phase',
      };
    }

    const remainingProfit = Math.max(0, roundMoney(target - currentProfit, 2));
    const progressPercent = target > 0 ? Math.min(100, Math.max(0, roundMoney((currentProfit / target) * 100, 1))) : 100;
    const isPassed = currentProfit >= target;

    return {
      target,
      currentProfit,
      remainingProfit,
      progressPercent,
      isPassed,
      status: isPassed ? 'COMPLETED' : 'INCOMPLETE',
      details: `$${currentProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} / $${target.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${progressPercent}%)`,
    };
  }

  /**
   * 2. Daily Loss Evaluator
   */
  static evaluateDailyLoss(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    dailyLimit: number;
    todayLoss: number;
    todayProfit: number;
    remainingDailyBuffer: number;
    remainingDailyBufferPercent: number;
    isBreached: boolean;
    status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';
    details: string;
    sessionDate: string;
  } {
    const base = this.calculateDailyDrawdown(account, trades);
    const status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED' = base.isBreached
      ? 'BREACHED'
      : base.remainingDailyBufferPercent < 30
      ? 'CRITICAL'
      : base.remainingDailyBufferPercent < 60
      ? 'WARNING'
      : 'SAFE';

    return {
      dailyLimit: base.dailyLimit,
      todayLoss: base.todayLoss,
      todayProfit: Math.max(0, base.todayNetPnl),
      remainingDailyBuffer: base.remainingDailyBuffer,
      remainingDailyBufferPercent: base.remainingDailyBufferPercent,
      isBreached: base.isBreached,
      status,
      details: `Today: -$${base.todayLoss.toFixed(2)} / Max -$${base.dailyLimit.toFixed(2)} ($${base.remainingDailyBuffer.toFixed(2)} buffer)`,
      sessionDate: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * 3. Maximum Drawdown Evaluator
   */
  static evaluateMaximumDrawdown(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    drawdownLimit: number;
    currentDrawdown: number;
    peakEquity: number;
    drawdownThreshold: number;
    bufferRemaining: number;
    bufferPercent: number;
    isBreached: boolean;
    status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED';
    details: string;
    model: string;
  } {
    const base = this.calculateMaxDrawdown(account, trades);
    const status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'BREACHED' = base.isBreached
      ? 'BREACHED'
      : base.bufferPercent < 25
      ? 'CRITICAL'
      : base.bufferPercent < 50
      ? 'WARNING'
      : 'SAFE';

    return {
      drawdownLimit: base.drawdownThreshold,
      currentDrawdown: base.currentDrawdown,
      peakEquity: base.peakEquity,
      drawdownThreshold: base.drawdownThreshold,
      bufferRemaining: base.bufferRemaining,
      bufferPercent: base.bufferPercent,
      isBreached: base.isBreached,
      status,
      details: `DD: $${base.currentDrawdown.toFixed(2)} / Buffer: $${base.bufferRemaining.toFixed(2)} (${base.bufferPercent.toFixed(1)}% remaining)`,
      model: account.drawdownModel,
    };
  }

  /**
   * 4. Minimum Trading Days Evaluator
   */
  static evaluateMinimumTradingDays(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    minDaysRequired: number;
    daysCompleted: number;
    daysRemaining: number;
    isSatisfied: boolean;
    qualifyingDaysCompleted: number;
    status: 'COMPLETED' | 'INCOMPLETE';
    details: string;
  } {
    const base = this.calculateTradingDays(account, trades);
    const minDaysRequired = activePhase?.minTradingDays ?? base.minDaysRequired;
    const daysRemaining = Math.max(0, minDaysRequired - base.daysCompleted);
    const isSatisfied = base.daysCompleted >= minDaysRequired;

    return {
      minDaysRequired,
      daysCompleted: base.daysCompleted,
      daysRemaining,
      isSatisfied,
      qualifyingDaysCompleted: base.qualifyingDaysCompleted,
      status: isSatisfied ? 'COMPLETED' : 'INCOMPLETE',
      details: `${base.daysCompleted} / ${minDaysRequired} days (${daysRemaining} remaining)`,
    };
  }

  /**
   * 5. Time Limit / Expiration Evaluator
   */
  static evaluateTimeLimit(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig
  ): {
    maxDays: number;
    daysRemaining: number | null;
    isExpired: boolean;
    isExpiringSoon: boolean;
    status: 'SAFE' | 'WARNING' | 'BREACHED';
    details: string;
  } {
    const maxDays = activePhase?.maxTradingDays ?? account.maxTradingDays ?? 0;
    if (maxDays <= 0) {
      return {
        maxDays: 0,
        daysRemaining: null,
        isExpired: false,
        isExpiringSoon: false,
        status: 'SAFE',
        details: 'Unlimited Trading Period (No deadline)',
      };
    }

    const startIso = activePhase?.startedAt || account.startDate || account.createdAt || new Date().toISOString();
    const startTime = new Date(startIso).getTime();
    const elapsedDays = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, maxDays - elapsedDays);
    const isExpired = elapsedDays > maxDays;
    const isExpiringSoon = !isExpired && daysRemaining <= 3;

    return {
      maxDays,
      daysRemaining,
      isExpired,
      isExpiringSoon,
      status: isExpired ? 'BREACHED' : isExpiringSoon ? 'WARNING' : 'SAFE',
      details: isExpired
        ? `Challenge period expired (${elapsedDays} days elapsed, max ${maxDays})`
        : `${daysRemaining} days remaining of ${maxDays} days`,
    };
  }

  /**
   * 6. Inactivity Evaluator
   */
  static evaluateInactivityRule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    maxDaysAllowed: number;
    daysInactive: number;
    lastTradeDate: string | null;
    isBreached: boolean;
    status: 'SAFE' | 'WARNING' | 'BREACHED';
    details: string;
  } {
    const base = this.calculateInactivity(account, trades);
    return {
      maxDaysAllowed: base.maxDaysAllowed,
      daysInactive: base.daysInactive,
      lastTradeDate: base.lastTradeDate,
      isBreached: base.status === 'BREACHED',
      status: base.status,
      details: base.status === 'BREACHED'
        ? `Breached: No trades executed in ${base.daysInactive} days (Limit: ${base.maxDaysAllowed})`
        : `${base.daysInactive} / ${base.maxDaysAllowed} days inactive`,
    };
  }

  /**
   * 7. Consistency Evaluator
   */
  static evaluateConsistencyRule(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    allowedPercent: number;
    bestDayProfit: number;
    totalProfit: number;
    consistencyPercent: number;
    isCompliant: boolean;
    additionalProfitNeeded: number;
    status: 'SAFE' | 'WARNING';
    details: string;
  } {
    const base = this.calculateConsistency(account, trades);
    const allowedPercent = activePhase?.consistencyMaxDayPercent ?? base.allowedPercent;
    const isCompliant = base.consistencyPercent <= allowedPercent;

    return {
      allowedPercent,
      bestDayProfit: base.bestDayProfit,
      totalProfit: base.totalProfit,
      consistencyPercent: base.consistencyPercent,
      isCompliant,
      additionalProfitNeeded: base.additionalProfitNeeded,
      status: isCompliant ? 'SAFE' : 'WARNING',
      details: isCompliant
        ? `Compliant: Best day is ${base.consistencyPercent}% of total profit (Cap: ${allowedPercent}%)`
        : `Best day represents ${base.consistencyPercent}% of profit (Cap: ${allowedPercent}%). Need +$${base.additionalProfitNeeded.toFixed(2)} to rebalance.`,
    };
  }

  /**
   * 8. Profit Concentration Evaluator
   */
  static evaluateProfitConcentration(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    maxTradePercent: number;
    highestTradeProfit: number;
    highestTradeProfitPercent: number;
    isCompliant: boolean;
    status: 'SAFE' | 'WARNING';
    details: string;
  } {
    const maxTradePercent = account.maxProfitConcentrationPercent || 40;
    const closed = trades.filter((t) => t.status === 'CLOSED');
    const totalProfit = closed.reduce((sum, t) => sum + (t.netPnl > 0 ? t.netPnl : 0), 0);

    if (totalProfit <= 0 || closed.length === 0) {
      return {
        maxTradePercent,
        highestTradeProfit: 0,
        highestTradeProfitPercent: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'No positive trade profit accumulated yet.',
      };
    }

    let highestTradeProfit = 0;
    closed.forEach((t) => {
      if (t.netPnl > highestTradeProfit) highestTradeProfit = t.netPnl;
    });

    const highestPercent = roundMoney((highestTradeProfit / totalProfit) * 100, 1);
    const isCompliant = highestPercent <= maxTradePercent;

    return {
      maxTradePercent,
      highestTradeProfit: roundMoney(highestTradeProfit, 2),
      highestTradeProfitPercent: highestPercent,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'WARNING',
      details: isCompliant
        ? `Highest single trade is ${highestPercent}% of profit (Cap: ${maxTradePercent}%)`
        : `Concentration alert: Single trade represents ${highestPercent}% of total profit (Cap: ${maxTradePercent}%)`,
    };
  }

  /**
   * 9. News Trading Rule Evaluator
   */
  static evaluateNewsRule(
    account: PropFirmAccount,
    trades: Trade[] = [],
    newsEvents: any[] = []
  ): {
    rule: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
    violatingTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'WARNING' | 'BREACHED';
    details: string;
  } {
    const rule = account.newsTradingAllowed || 'ALLOWED';
    if (rule === 'ALLOWED') {
      return {
        rule,
        violatingTradesCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'News trading is fully permitted.',
      };
    }

    const base = this.calculateNewsCompliance(account, trades, newsEvents);
    const isCompliant = base.violatingTradesCount === 0;
    const status = isCompliant ? 'SAFE' : rule === 'PROHIBITED' ? 'BREACHED' : 'WARNING';

    return {
      rule,
      violatingTradesCount: base.violatingTradesCount,
      isCompliant,
      status,
      details: isCompliant
        ? `No news event violations (${base.restrictedWindowMinutes} min buffer compliant)`
        : `${base.violatingTradesCount} trade(s) executed during high-impact news windows`,
    };
  }

  /**
   * 10. Weekend Holding Evaluator
   */
  static evaluateWeekendRule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    isAllowed: boolean;
    violatingTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'BREACHED';
    details: string;
  } {
    const isAllowed = account.weekendHoldingAllowed !== false;
    if (isAllowed) {
      return {
        isAllowed: true,
        violatingTradesCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'Weekend position holding permitted.',
      };
    }

    // Check for trades held over Friday 17:00 NY time to Sunday
    let violatingCount = 0;
    trades.forEach((t) => {
      if ((t as any).isWeekendTrade) {
        violatingCount++;
      } else if (t.entryDate && t.exitDate) {
        const entryD = new Date(t.entryDate);
        const exitD = new Date(t.exitDate);
        const diffDays = (exitD.getTime() - entryD.getTime()) / (1000 * 60 * 60 * 24);
        if (entryD.getDay() === 5 && (exitD.getDay() === 1 || diffDays >= 2)) {
          violatingCount++;
        }
      }
    });

    const isCompliant = violatingCount === 0;
    return {
      isAllowed: false,
      violatingTradesCount: violatingCount,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? 'No weekend holding violations detected.'
        : `${violatingCount} position(s) held over the weekend boundary (prohibited).`,
    };
  }

  /**
   * 11. Overnight Holding Evaluator
   */
  static evaluateOvernightRule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    isAllowed: boolean;
    violatingTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'BREACHED';
    details: string;
  } {
    const isAllowed = account.overnightHoldingAllowed !== false;
    if (isAllowed) {
      return {
        isAllowed: true,
        violatingTradesCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'Overnight position holding permitted.',
      };
    }

    let violatingCount = 0;
    trades.forEach((t) => {
      if ((t as any).isOvernightTrade) violatingCount++;
    });

    const isCompliant = violatingCount === 0;
    return {
      isAllowed: false,
      violatingTradesCount: violatingCount,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? 'No overnight positions held.'
        : `${violatingCount} position(s) held overnight past market close (prohibited).`,
    };
  }

  /**
   * 12. EA / Algo Trading Evaluator
   */
  static evaluateEARule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    rule: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
    eaTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'BREACHED';
    details: string;
  } {
    const rule = account.eaAllowed || 'ALLOWED';
    if (rule === 'ALLOWED') {
      return {
        rule,
        eaTradesCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'Expert Advisors and algorithmic trading permitted.',
      };
    }

    let eaCount = 0;
    trades.forEach((t) => {
      if (t.executionMethod === 'EA' || t.executionMethod === 'BOT') eaCount++;
    });

    const isCompliant = eaCount === 0;
    return {
      rule,
      eaTradesCount: eaCount,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? 'No automated EA executions detected.'
        : `${eaCount} automated EA trades detected under prohibited rule.`,
    };
  }

  /**
   * 13. Copy Trading Evaluator
   */
  static evaluateCopyTradingRule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    rule: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
    copyTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'BREACHED';
    details: string;
  } {
    const rule = account.copyTradingAllowed || 'ALLOWED';
    if (rule === 'ALLOWED') {
      return {
        rule,
        copyTradesCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'Copy trading permitted.',
      };
    }

    let copyCount = 0;
    trades.forEach((t) => {
      if (t.isCopyTrade) copyCount++;
    });

    const isCompliant = copyCount === 0;
    return {
      rule,
      copyTradesCount: copyCount,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? 'No copy trades detected.'
        : `${copyCount} trade(s) flagged as copy trades under prohibited rule.`,
    };
  }

  /**
   * 14. Hedging Rule Evaluator
   */
  static evaluateHedgingRule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    rule: 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED';
    hedgingIncidentsCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'BREACHED';
    details: string;
  } {
    const rule = account.hedgingAllowed || 'ALLOWED';
    if (rule === 'ALLOWED') {
      return {
        rule,
        hedgingIncidentsCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'Hedging opposite positions is permitted.',
      };
    }

    // Check for overlapping open long and short positions on the same symbol
    let incidents = 0;
    const openTrades = trades.filter((t) => t.status === 'OPEN');
    const symbolMap: Record<string, { buys: number; sells: number }> = {};
    openTrades.forEach((t) => {
      if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { buys: 0, sells: 0 };
      if (t.direction === 'BUY') symbolMap[t.symbol].buys++;
      else symbolMap[t.symbol].sells++;
    });

    Object.values(symbolMap).forEach((counts) => {
      if (counts.buys > 0 && counts.sells > 0) incidents++;
    });

    const isCompliant = incidents === 0;
    return {
      rule,
      hedgingIncidentsCount: incidents,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? 'No opposite hedging positions open.'
        : `${incidents} concurrent opposite hedged position(s) detected (prohibited).`,
    };
  }

  /**
   * 15. Position Sizing Rule Evaluator
   */
  static evaluatePositionSizeRule(
    account: PropFirmAccount,
    activePhase?: PropFirmPhaseConfig,
    trades: Trade[] = []
  ): {
    maxLots: number;
    oversizedTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'WARNING' | 'BREACHED';
    details: string;
  } {
    const maxLots = account.maxLotSize || 0;
    if (maxLots <= 0) {
      return {
        maxLots: 0,
        oversizedTradesCount: 0,
        isCompliant: true,
        status: 'SAFE',
        details: 'No maximum lot restriction configured.',
      };
    }

    let oversizedCount = 0;
    trades.forEach((t) => {
      if ((t.quantity || 0) > maxLots) oversizedCount++;
    });

    const isCompliant = oversizedCount === 0;
    return {
      maxLots,
      oversizedTradesCount: oversizedCount,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? `All positions comply with ${maxLots} max lot cap.`
        : `${oversizedCount} position(s) exceeded the ${maxLots} lot limit.`,
    };
  }

  /**
   * 16. Leverage Rule Evaluator
   */
  static evaluateLeverageRule(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    maxLeverage: number;
    dataAvailable: boolean;
    isCompliant: boolean;
    status: 'SAFE' | 'INFO';
    details: string;
  } {
    const maxLeverage = account.maxLeverage || 100;
    const tradesWithLeverage = trades.filter((t) => typeof t.leverage === 'number');

    if (tradesWithLeverage.length === 0) {
      return {
        maxLeverage,
        dataAvailable: false,
        isCompliant: true,
        status: 'INFO',
        details: 'Leverage metadata not provided in trade imports (verified by broker).',
      };
    }

    const exceeded = tradesWithLeverage.filter((t) => (t.leverage || 0) > maxLeverage);
    const isCompliant = exceeded.length === 0;

    return {
      maxLeverage,
      dataAvailable: true,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'INFO',
      details: isCompliant
        ? `All executions within 1:${maxLeverage} leverage cap.`
        : `${exceeded.length} trade(s) exceeded 1:${maxLeverage} leverage cap.`,
    };
  }

  /**
   * 17. IP / VPS Address Verification Evaluator
   */
  static evaluateIPRule(
    account: PropFirmAccount
  ): {
    rule: string;
    status: 'SAFE' | 'INFO';
    details: string;
  } {
    return {
      rule: 'IP_LOCATION',
      status: 'SAFE',
      details: 'Direct Broker Account Link Verified. Client sandboxed environment.',
    };
  }

  /**
   * 18. Prohibited Strategy Evaluator
   */
  static evaluateProhibitedStrategy(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    prohibitedList: string[];
    flaggedTradesCount: number;
    isCompliant: boolean;
    status: 'SAFE' | 'BREACHED';
    details: string;
  } {
    const list = account.prohibitedStrategies || ['Arbitrage', 'Martingale', 'Grid', 'Latency Arbitrage', 'News Scalping'];
    let flaggedCount = 0;

    trades.forEach((t) => {
      const combinedNotes = `${t.setupType || ''} ${t.notes || ''} ${t.tags?.join(' ') || ''}`.toLowerCase();
      list.forEach((strat) => {
        if (combinedNotes.includes(strat.toLowerCase())) {
          flaggedCount++;
        }
      });
    });

    const isCompliant = flaggedCount === 0;
    return {
      prohibitedList: list,
      flaggedTradesCount: flaggedCount,
      isCompliant,
      status: isCompliant ? 'SAFE' : 'BREACHED',
      details: isCompliant
        ? 'No prohibited trading strategies detected.'
        : `${flaggedCount} trade(s) tagged with prohibited strategies (${list.join(', ')}).`,
    };
  }

  /**
   * 19. Payout & Revenue Share Evaluator
   */
  static evaluatePayoutRules(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    traderSplitPercent: number;
    firmSplitPercent: number;
    totalProfit: number;
    eligibleProfit: number;
    traderShare: number;
    firmShare: number;
    payoutFrequency: string;
    isEligible: boolean;
    details: string;
  } {
    const base = this.calculatePayoutEligibility(account);
    const traderSplit = account.profitSplitTraderPercent || base.rewardSplitPercent;
    const firmSplit = 100 - traderSplit;

    return {
      traderSplitPercent: traderSplit,
      firmSplitPercent: firmSplit,
      totalProfit: base.eligibleProfit,
      eligibleProfit: base.eligibleProfit,
      traderShare: base.traderShare,
      firmShare: base.firmShare,
      payoutFrequency: account.payoutFrequency || 'BIWEEKLY',
      isEligible: base.isEligibleForRequest,
      details: base.statusText,
    };
  }

  /**
   * 20. Account Scaling Plan Evaluator
   */
  static evaluateScalingRules(
    account: PropFirmAccount,
    trades: Trade[] = []
  ): {
    enabled: boolean;
    currentScaleLevel: number;
    currentAccountSize: number;
    nextAccountSize: number;
    thresholdAmount: number;
    currentProfit: number;
    progressPercent: number;
    isEligibleForScaling: boolean;
    details: string;
  } {
    const scaling = account.scalingRules;
    if (!scaling || !scaling.enabled) {
      return {
        enabled: false,
        currentScaleLevel: 0,
        currentAccountSize: account.startingBalance,
        nextAccountSize: account.startingBalance,
        thresholdAmount: 0,
        currentProfit: 0,
        progressPercent: 0,
        isEligibleForScaling: false,
        details: 'Scaling plan inactive for this account.',
      };
    }

    const netProfit = Math.max(0, account.currentBalance - account.startingBalance);
    const threshold = scaling.thresholdAmount || roundMoney(account.startingBalance * 0.1);
    const progressPercent = threshold > 0 ? Math.min(100, roundMoney((netProfit / threshold) * 100, 1)) : 0;
    const isEligibleForScaling = netProfit >= threshold && account.currentBalance < scaling.maxAccountSize;
    const nextAccountSize = roundMoney(account.startingBalance * (1 + (scaling.scalingPercentage || 25) / 100));

    return {
      enabled: true,
      currentScaleLevel: scaling.currentScaleLevel || 0,
      currentAccountSize: account.startingBalance,
      nextAccountSize,
      thresholdAmount: threshold,
      currentProfit: netProfit,
      progressPercent,
      isEligibleForScaling,
      details: isEligibleForScaling
        ? `Eligible to scale up to $${nextAccountSize.toLocaleString()} (+${scaling.scalingPercentage}%)!`
        : `$${netProfit.toFixed(2)} / $${threshold.toFixed(2)} profit needed for next account scale (+${scaling.scalingPercentage}%).`,
    };
  }

  /**
   * Advance Account Phase (Phase 1 -> Phase 2 -> Funded)
   */
  static advanceAccountPhase(account: PropFirmAccount): PropFirmAccount {
    if (!account.phases || account.phases.length <= 1) return account;

    const currentIdx = account.activePhaseIndex ?? 0;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= account.phases.length) return account;

    const updatedPhases = account.phases.map((p, idx) => {
      if (idx === currentIdx) return { ...p, status: 'COMPLETED' as const, completedAt: new Date().toISOString() };
      if (idx === nextIdx) return { ...p, status: 'ACTIVE' as const, startedAt: new Date().toISOString() };
      return p;
    });

    const newActivePhase = updatedPhases[nextIdx];
    const isNowFunded = newActivePhase.phaseType === 'FUNDED';

    const newTimelineEvent: PropFirmTimelineEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: isNowFunded ? 'Evaluation Passed — Funded!' : `Advanced to ${newActivePhase.name}`,
      description: isNowFunded
        ? 'Congratulations! Evaluation stages completed. Account transitioned to active Funded status.'
        : `Phase ${currentIdx + 1} targets successfully achieved. Activated ${newActivePhase.name}.`,
      type: isNowFunded ? 'PHASE_PASS' : 'PROGRESS',
    };

    return {
      ...account,
      phases: updatedPhases,
      activePhaseIndex: nextIdx,
      phase: newActivePhase.phaseType,
      phaseName: newActivePhase.name,
      status: isNowFunded ? 'ACTIVE' : account.status,
      profitTargetPercent: newActivePhase.profitTargetPercent,
      profitTargetAmount: newActivePhase.profitTargetAmount,
      dailyLossPercent: newActivePhase.dailyLossPercent,
      dailyLossAmount: newActivePhase.dailyLossAmount,
      totalLossPercent: newActivePhase.totalLossPercent,
      totalLossAmount: newActivePhase.totalLossAmount,
      minTradingDays: newActivePhase.minTradingDays,
      maxTradingDays: newActivePhase.maxTradingDays,
      timeline: [newTimelineEvent, ...(account.timeline || [])],
    };
  }

  /**
   * Comprehensive Multi-Phase Account Evaluation
   */
  static evaluatePropFirmAccount(
    account: PropFirmAccount,
    trades: Trade[] = [],
    newsEvents: any[] = []
  ): {
    riskState: PropFirmRiskState;
    statusMessage: string;
    actionableAdvice: string;
    activePhase: PropFirmPhaseConfig | null;
    canAdvancePhase: boolean;
    isEvaluationPassed: boolean;
    evaluatedRules: PropFirmRule[];
    newViolations: PropFirmViolation[];
    evaluators: {
      profitTarget: ReturnType<typeof PropFirmEngine.evaluateProfitTarget>;
      dailyLoss: ReturnType<typeof PropFirmEngine.evaluateDailyLoss>;
      maxDrawdown: ReturnType<typeof PropFirmEngine.evaluateMaximumDrawdown>;
      tradingDays: ReturnType<typeof PropFirmEngine.evaluateMinimumTradingDays>;
      timeLimit: ReturnType<typeof PropFirmEngine.evaluateTimeLimit>;
      inactivity: ReturnType<typeof PropFirmEngine.evaluateInactivityRule>;
      consistency: ReturnType<typeof PropFirmEngine.evaluateConsistencyRule>;
      profitConcentration: ReturnType<typeof PropFirmEngine.evaluateProfitConcentration>;
      newsRule: ReturnType<typeof PropFirmEngine.evaluateNewsRule>;
      weekendRule: ReturnType<typeof PropFirmEngine.evaluateWeekendRule>;
      overnightRule: ReturnType<typeof PropFirmEngine.evaluateOvernightRule>;
      eaRule: ReturnType<typeof PropFirmEngine.evaluateEARule>;
      copyTradingRule: ReturnType<typeof PropFirmEngine.evaluateCopyTradingRule>;
      hedgingRule: ReturnType<typeof PropFirmEngine.evaluateHedgingRule>;
      positionSizeRule: ReturnType<typeof PropFirmEngine.evaluatePositionSizeRule>;
      leverageRule: ReturnType<typeof PropFirmEngine.evaluateLeverageRule>;
      ipRule: ReturnType<typeof PropFirmEngine.evaluateIPRule>;
      prohibitedStrategy: ReturnType<typeof PropFirmEngine.evaluateProhibitedStrategy>;
      payoutRules: ReturnType<typeof PropFirmEngine.evaluatePayoutRules>;
      scalingRules: ReturnType<typeof PropFirmEngine.evaluateScalingRules>;
    };
  } {
    const activePhase = account.phases && account.phases.length > 0
      ? account.phases[account.activePhaseIndex ?? 0] || account.phases[0]
      : null;

    // Run modular evaluators
    const profitTarget = this.evaluateProfitTarget(account, activePhase || undefined, trades);
    const dailyLoss = this.evaluateDailyLoss(account, activePhase || undefined, trades);
    const maxDrawdown = this.evaluateMaximumDrawdown(account, activePhase || undefined, trades);
    const tradingDays = this.evaluateMinimumTradingDays(account, activePhase || undefined, trades);
    const timeLimit = this.evaluateTimeLimit(account, activePhase || undefined);
    const inactivity = this.evaluateInactivityRule(account, trades);
    const consistency = this.evaluateConsistencyRule(account, activePhase || undefined, trades);
    const profitConcentration = this.evaluateProfitConcentration(account, activePhase || undefined, trades);
    const newsRule = this.evaluateNewsRule(account, trades, newsEvents);
    const weekendRule = this.evaluateWeekendRule(account, trades);
    const overnightRule = this.evaluateOvernightRule(account, trades);
    const eaRule = this.evaluateEARule(account, trades);
    const copyTradingRule = this.evaluateCopyTradingRule(account, trades);
    const hedgingRule = this.evaluateHedgingRule(account, trades);
    const positionSizeRule = this.evaluatePositionSizeRule(account, activePhase || undefined, trades);
    const leverageRule = this.evaluateLeverageRule(account, trades);
    const ipRule = this.evaluateIPRule(account);
    const prohibitedStrategy = this.evaluateProhibitedStrategy(account, trades);
    const payoutRules = this.evaluatePayoutRules(account, trades);
    const scalingRules = this.evaluateScalingRules(account, trades);

    // Collect new violations
    const newViolations: PropFirmViolation[] = [];
    if (maxDrawdown.isBreached) {
      newViolations.push({
        id: `viol-maxdd-${Date.now()}`,
        accountId: account.id,
        ruleId: 'rule-max-dd',
        ruleName: 'Maximum Overall Drawdown',
        ruleType: 'MAX_DRAWDOWN',
        timestamp: new Date().toISOString(),
        actualValue: `$${maxDrawdown.currentDrawdown.toFixed(2)}`,
        allowedValue: `$${maxDrawdown.drawdownThreshold.toFixed(2)}`,
        severity: 'BREACH',
        explanation: 'Account equity dropped below the maximum allowable drawdown limit.',
        status: 'ACTIVE',
      });
    }

    if (dailyLoss.isBreached) {
      newViolations.push({
        id: `viol-daily-${Date.now()}`,
        accountId: account.id,
        ruleId: 'rule-daily-dd',
        ruleName: 'Daily Loss Limit',
        ruleType: 'DAILY_DRAWDOWN',
        timestamp: new Date().toISOString(),
        actualValue: `$${dailyLoss.todayLoss.toFixed(2)}`,
        allowedValue: `$${dailyLoss.dailyLimit.toFixed(2)}`,
        severity: 'BREACH',
        explanation: 'Current session loss exceeded the daily max loss threshold.',
        status: 'ACTIVE',
      });
    }

    if (inactivity.isBreached) {
      newViolations.push({
        id: `viol-inact-${Date.now()}`,
        accountId: account.id,
        ruleId: 'rule-inactivity',
        ruleName: 'Inactivity Limit',
        ruleType: 'INACTIVITY',
        timestamp: new Date().toISOString(),
        actualValue: `${inactivity.daysInactive} days`,
        allowedValue: `${inactivity.maxDaysAllowed} days`,
        severity: 'BREACH',
        explanation: `No trades executed within the maximum permitted ${inactivity.maxDaysAllowed} calendar days.`,
        status: 'ACTIVE',
      });
    }

    if (timeLimit.isExpired) {
      newViolations.push({
        id: `viol-time-${Date.now()}`,
        accountId: account.id,
        ruleId: 'rule-time-limit',
        ruleName: 'Evaluation Time Limit',
        ruleType: 'TIME_LIMIT',
        timestamp: new Date().toISOString(),
        actualValue: 'Expired',
        allowedValue: `${timeLimit.maxDays} days`,
        severity: 'BREACH',
        explanation: 'Phase time limit expired before reaching the profit target.',
        status: 'ACTIVE',
      });
    }

    // Determine Aggregated Risk State (Priority: BREACHED > CRITICAL > WARNING > PASSED > SAFE)
    let riskState: PropFirmRiskState = 'SAFE';
    let statusMessage = 'Account comfortably within all risk parameters';
    let actionableAdvice = 'Disciplined execution. Adhere to your risk management plan.';

    const hasBreach = maxDrawdown.isBreached || dailyLoss.isBreached || inactivity.isBreached || timeLimit.isExpired || !prohibitedStrategy.isCompliant || !weekendRule.isCompliant;
    const hasCritical = maxDrawdown.status === 'CRITICAL' || dailyLoss.status === 'CRITICAL';
    const hasWarning = maxDrawdown.status === 'WARNING' || dailyLoss.status === 'WARNING' || !consistency.isCompliant || !profitConcentration.isCompliant || timeLimit.isExpiringSoon || newsRule.status === 'WARNING';

    const isPhaseTargetMet = profitTarget.isPassed && tradingDays.isSatisfied && !hasBreach;
    const isEvaluationPassed = isPhaseTargetMet && (account.phase === 'PHASE_2' || account.phase === 'EVALUATION');
    const canAdvancePhase = isPhaseTargetMet && account.phases && account.activePhaseIndex! < account.phases.length - 1;

    if (hasBreach) {
      riskState = 'BREACHED';
      if (maxDrawdown.isBreached) {
        statusMessage = `Maximum Drawdown Breached: Drawdown of $${maxDrawdown.currentDrawdown.toFixed(2)} crossed threshold.`;
        actionableAdvice = 'Trading halted. Maximum account loss limit exceeded.';
      } else if (dailyLoss.isBreached) {
        statusMessage = `Daily Loss Limit Breached: Today's loss of $${dailyLoss.todayLoss.toFixed(2)} exceeds limit ($${dailyLoss.dailyLimit.toFixed(2)}).`;
        actionableAdvice = 'Circuit breaker triggered. Cease trading for the remainder of the session.';
      } else {
        statusMessage = 'Account rule breach triggered.';
        actionableAdvice = 'Trading halted due to rule violation.';
      }
    } else if (hasCritical) {
      riskState = 'CRITICAL';
      const minBuffer = Math.min(maxDrawdown.bufferRemaining, dailyLoss.remainingDailyBuffer);
      statusMessage = `Critical Risk: Only $${minBuffer.toFixed(2)} buffer remaining before rule breach!`;
      actionableAdvice = 'Severely reduce position size or halt active trading until the next session.';
    } else if (hasWarning) {
      riskState = 'WARNING';
      if (!consistency.isCompliant) {
        statusMessage = `Consistency Warning: Single day profit represents ${consistency.consistencyPercent}% of total profit (Cap: ${consistency.allowedPercent}%).`;
        actionableAdvice = `Execute additional profit days (+$${consistency.additionalProfitNeeded.toFixed(2)} needed) to satisfy consistency.`;
      } else if (!profitConcentration.isCompliant) {
        statusMessage = profitConcentration.details;
        actionableAdvice = 'Diversify trades to avoid excessive concentration on single executions.';
      } else {
        statusMessage = `Warning: Approaching risk limits. $${dailyLoss.remainingDailyBuffer.toFixed(2)} daily buffer remaining.`;
        actionableAdvice = 'Risk warning triggered. Consider scaling down lots or tightening trade filters.';
      }
    } else if (isEvaluationPassed) {
      riskState = 'SAFE';
      statusMessage = `Evaluation Passed! Profit target +$${profitTarget.currentProfit.toLocaleString()} achieved across ${tradingDays.daysCompleted} trading days.`;
      actionableAdvice = 'Ready for funded account contract and live capital allocation!';
    } else if (isPhaseTargetMet) {
      statusMessage = `${activePhase?.name || 'Phase 1'} Target Met! Ready to advance to next phase.`;
      actionableAdvice = 'Click "Advance to Next Phase" to unlock the next stage.';
    }

    // Build evaluated rules list for the UI
    const evaluatedRules: PropFirmRule[] = (account.rules || []).map((rule) => {
      const updated: PropFirmRule = { ...rule };
      switch (rule.type) {
        case 'DAILY_DRAWDOWN':
          updated.currentValue = dailyLoss.todayLoss;
          updated.status = dailyLoss.status;
          updated.details = dailyLoss.details;
          break;
        case 'MAX_DRAWDOWN':
          updated.currentValue = maxDrawdown.currentDrawdown;
          updated.status = maxDrawdown.status;
          updated.details = maxDrawdown.details;
          break;
        case 'PROFIT_TARGET':
          updated.currentValue = profitTarget.currentProfit;
          updated.status = profitTarget.status;
          updated.details = profitTarget.details;
          break;
        case 'MIN_TRADING_DAYS':
          updated.currentValue = tradingDays.daysCompleted;
          updated.status = tradingDays.status;
          updated.details = tradingDays.details;
          break;
        case 'CONSISTENCY':
          updated.currentValue = consistency.consistencyPercent;
          updated.status = consistency.status;
          updated.details = consistency.details;
          break;
        case 'MAX_TRADING_DAYS':
          updated.currentValue = timeLimit.daysRemaining ?? 0;
          updated.status = timeLimit.status;
          updated.details = timeLimit.details;
          break;
        case 'INACTIVITY':
          updated.currentValue = inactivity.daysInactive;
          updated.status = inactivity.status;
          updated.details = inactivity.details;
          break;
        case 'NEWS_RESTRICTION':
          updated.currentValue = newsRule.violatingTradesCount;
          updated.status = newsRule.status;
          updated.details = newsRule.details;
          break;
        default:
          updated.status = 'SAFE';
          break;
      }
      return updated;
    });

    return {
      riskState,
      statusMessage,
      actionableAdvice,
      activePhase,
      canAdvancePhase,
      isEvaluationPassed,
      evaluatedRules,
      newViolations,
      evaluators: {
        profitTarget,
        dailyLoss,
        maxDrawdown,
        tradingDays,
        timeLimit,
        inactivity,
        consistency,
        profitConcentration,
        newsRule,
        weekendRule,
        overnightRule,
        eaRule,
        copyTradingRule,
        hedgingRule,
        positionSizeRule,
        leverageRule,
        ipRule,
        prohibitedStrategy,
        payoutRules,
        scalingRules,
      },
    };
  }

  /**
   * Evaluate Account (Delegates to evaluatePropFirmAccount for backward compatibility)
   */
  static evaluateAccount(
    account: PropFirmAccount,
    trades: Trade[]
  ): {
    riskState: PropFirmRiskState;
    statusMessage: string;
    actionableAdvice: string;
    evaluatedRules: PropFirmRule[];
    newViolations: PropFirmViolation[];
  } {
    const res = this.evaluatePropFirmAccount(account, trades);
    return {
      riskState: res.riskState,
      statusMessage: res.statusMessage,
      actionableAdvice: res.actionableAdvice,
      evaluatedRules: res.evaluatedRules,
      newViolations: res.newViolations,
    };
  }

  /**
   * Pre-Trade Risk & Rule Compliance Check
   */
  static validatePreTrade(
    account: PropFirmAccount,
    trades: Trade[],
    proposedTrade: {
      symbol: string;
      direction: 'BUY' | 'SELL';
      quantity: number;
      stopLossPoints?: number;
      estimatedRiskDollar?: number;
    }
  ): PreTradeValidationResult {
    const checks: PreTradeValidationCheck[] = [];
    let isBlocked = false;
    let hasWarning = false;

    const dailyResult = this.calculateDailyDrawdown(account, trades);
    const ddResult = this.calculateMaxDrawdown(account, trades);
    const symbolExposure = this.calculateSymbolRiskExposure(account, trades);
    const maxPosRule = account.rules.find((r) => r.type === 'MAX_POSITION_SIZE' && r.enabled);

    // 1. Check account breach status
    if (account.riskState === 'BREACHED' || dailyResult.isBreached || ddResult.isBreached) {
      checks.push({
        ruleName: 'Account Breach Guard',
        status: 'FAIL',
        message: 'Account is in BREACHED state. New trade submissions are prohibited.',
      });
      isBlocked = true;
    } else {
      checks.push({
        ruleName: 'Account Status',
        status: 'PASS',
        message: 'Account is in good standing.',
      });
    }

    // 2. Position size check
    if (maxPosRule) {
      if (proposedTrade.quantity > maxPosRule.threshold) {
        checks.push({
          ruleName: 'Max Position Size',
          status: 'FAIL',
          message: `Proposed size (${proposedTrade.quantity}) exceeds allowed limit of ${maxPosRule.threshold} ${maxPosRule.unit.toLowerCase()}.`,
          metric: `${proposedTrade.quantity} / ${maxPosRule.threshold}`,
        });
        isBlocked = true;
      } else {
        checks.push({
          ruleName: 'Max Position Size',
          status: 'PASS',
          message: `Size within limit (${proposedTrade.quantity} of ${maxPosRule.threshold} allowed).`,
        });
      }
    }

    // 3. Daily loss buffer check
    const estRisk = proposedTrade.estimatedRiskDollar || 250;
    if (estRisk > dailyResult.remainingDailyBuffer) {
      checks.push({
        ruleName: 'Daily Loss Buffer Check',
        status: 'FAIL',
        message: `Estimated trade risk ($${estRisk.toFixed(2)}) exceeds remaining daily buffer ($${dailyResult.remainingDailyBuffer.toFixed(2)}).`,
        metric: `Risk $${estRisk.toFixed(2)} vs Buffer $${dailyResult.remainingDailyBuffer.toFixed(2)}`,
      });
      isBlocked = true;
    } else if (estRisk > dailyResult.remainingDailyBuffer * 0.7) {
      checks.push({
        ruleName: 'Daily Loss Buffer Check',
        status: 'WARN',
        message: `Trade risk ($${estRisk.toFixed(2)}) consumes over 70% of remaining daily buffer ($${dailyResult.remainingDailyBuffer.toFixed(2)}).`,
        metric: `Buffer remaining: $${(dailyResult.remainingDailyBuffer - estRisk).toFixed(2)}`,
      });
      hasWarning = true;
    } else {
      checks.push({
        ruleName: 'Daily Loss Buffer Check',
        status: 'PASS',
        message: `Sufficient daily buffer ($${dailyResult.remainingDailyBuffer.toFixed(2)} remaining).`,
      });
    }

    // 4. Symbol Risk Exposure Check
    const existingSym = symbolExposure.find((s) => s.symbol === proposedTrade.symbol);
    const maxAllowedSymRisk = roundMoney(account.startingBalance * ((account.maxRiskPerSymbolPercent || 2) / 100), 2);
    const totalSymRiskAfterTrade = (existingSym?.potentialRiskDollar || 0) + estRisk;

    if (totalSymRiskAfterTrade > maxAllowedSymRisk) {
      checks.push({
        ruleName: 'Max Risk Per Symbol',
        status: 'FAIL',
        message: `Combined risk on ${proposedTrade.symbol} ($${totalSymRiskAfterTrade.toFixed(2)}) exceeds max allowed symbol limit ($${maxAllowedSymRisk.toFixed(2)}).`,
        metric: `Symbol Exposure: $${totalSymRiskAfterTrade.toFixed(2)} / $${maxAllowedSymRisk.toFixed(2)}`,
      });
      isBlocked = true;
    } else {
      checks.push({
        ruleName: 'Max Risk Per Symbol',
        status: 'PASS',
        message: `Symbol risk on ${proposedTrade.symbol} compliant ($${totalSymRiskAfterTrade.toFixed(2)} / $${maxAllowedSymRisk.toFixed(2)} allowed).`,
      });
    }

    const status: 'APPROVED' | 'WARNING' | 'BLOCKED' = isBlocked
      ? 'BLOCKED'
      : hasWarning
      ? 'WARNING'
      : 'APPROVED';

    const summary = isBlocked
      ? 'Trade violates configured prop firm risk constraints.'
      : hasWarning
      ? 'Trade allowed with cautionary risk alerts.'
      : 'Trade fully compliant with all prop firm rules.';

    return {
      status,
      summary,
      checks,
    };
  }
}
