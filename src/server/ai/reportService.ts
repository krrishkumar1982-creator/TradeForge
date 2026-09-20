import { getGeminiClient, getGeminiModel } from './geminiClient';
import { Trade, TradingAccount, PropFirmAccount, Playbook, Strategy, JournalNote } from '../../types';
import { buildStructuredAiContext } from './dataEngine';
import { classifyUserIntent } from './intentClassifier';

export interface AiReportRequest {
  type: 'daily' | 'weekly' | 'monthly' | 'trader_profile';
  dateRange?: {
    start?: string;
    end?: string;
  };
  accountId?: string;
  propFirmAccountId?: string;
}

export interface AiReportResult {
  title: string;
  period: string;
  executiveSummary: string;
  keyMetrics: {
    netPnl: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number | null;
    expectancy: number;
    maxDrawdown: number;
  };
  strengths: string[];
  vulnerabilities: string[];
  topSetups: Array<{ name: string; winRate: number; netPnl: number }>;
  topMistakes: Array<{ name: string; cost: number; occurrences: number }>;
  tacticalActionPlan: string[];
}

export async function generateAiPerformanceReport(params: {
  trades: Trade[];
  tradingAccounts: TradingAccount[];
  propFirmAccounts: PropFirmAccount[];
  playbooks: Playbook[];
  strategies: Strategy[];
  journalNotes: JournalNote[];
  request: AiReportRequest;
}): Promise<AiReportResult> {
  const { trades, tradingAccounts, propFirmAccounts, playbooks, strategies, journalNotes, request } = params;

  let queryTerm = 'this_week';
  if (request.type === 'daily') queryTerm = 'today';
  if (request.type === 'monthly') queryTerm = 'this_month';
  if (request.type === 'trader_profile') queryTerm = 'all_time';

  const intent = classifyUserIntent(`generate ${request.type} report for ${queryTerm}`);
  const context = buildStructuredAiContext({
    trades,
    tradingAccounts,
    propFirmAccounts,
    playbooks,
    strategies,
    journalNotes,
    intent,
    activeAccountId: request.accountId,
    activePropFirmAccountId: request.propFirmAccountId,
  });

  const m = context.authoritativeMetrics;
  const leaks = context.mistakeIntelligence.breakdown;
  const setups = context.groupBreakdowns.bySetup;

  const keyMetrics = {
    netPnl: m.netPnl,
    winRate: m.winRatePercent,
    totalTrades: m.closedTrades,
    profitFactor: m.profitFactor,
    expectancy: m.expectancyPerTrade,
    maxDrawdown: m.maxDrawdownDollars,
  };

  const topSetups = setups.slice(0, 3).map((s) => ({
    name: s.key,
    winRate: s.winRate,
    netPnl: s.netPnl,
  }));

  const topMistakes = leaks.slice(0, 3).map((l) => ({
    name: l.name,
    cost: Math.abs(l.totalNetPnl),
    occurrences: l.occurrences,
  }));

  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const model = getGeminiModel();
      const prompt = `Generate an institutional ${request.type} performance review based on this data:\n${JSON.stringify(
        { context, keyMetrics, topSetups, topMistakes },
        null,
        2
      )}`;

      const response = await gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: `You are TradeForge AI Senior Quantitative Risk Auditor. Generate a structured JSON performance report for a professional trader.
Format:
{
  "title": "Period Title",
  "period": "e.g. Current Week / Active Month",
  "executiveSummary": "2-3 sentences concise institutional overview.",
  "strengths": ["Strength 1", "Strength 2"],
  "vulnerabilities": ["Leak 1", "Leak 2"],
  "tacticalActionPlan": ["Action 1", "Action 2"]
}`,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      if (text.trim().length > 0) {
        const parsed = JSON.parse(text);
        return {
          title: parsed.title || `${request.type.toUpperCase()} Performance Audit`,
          period: parsed.period || context.filterSummary.dateScope,
          executiveSummary: parsed.executiveSummary || 'Audit completed successfully.',
          keyMetrics,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Controlled risk parameters.'],
          vulnerabilities: Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [],
          topSetups,
          topMistakes,
          tacticalActionPlan: Array.isArray(parsed.tacticalActionPlan)
            ? parsed.tacticalActionPlan
            : ['Adhere strictly to playbook rules.'],
        };
      }
    } catch (e: any) {
      console.warn('[Report Engine] Gemini call failed, using deterministic report generator:', e?.message || e);
    }
  }

  // Deterministic Report Fallback
  return {
    title: `${request.type.toUpperCase()} TradeForge Performance Audit`,
    period: context.filterSummary.dateScope,
    executiveSummary: `Generated audit for ${m.closedTrades} closed executions yielding $${m.netPnl.toLocaleString()} Net P&L with a ${m.winRatePercent}% win rate and ${m.profitFactor ?? 'N/A'} Profit Factor. Expectancy is calculated at $${m.expectancyPerTrade} per trade.`,
    keyMetrics,
    strengths: [
      `Maintained ${m.winRatePercent}% win rate across ${m.closedTrades} executions.`,
      topSetups.length > 0 ? `Strongest setup "${topSetups[0].name}" produced $${topSetups[0].netPnl.toLocaleString()}.` : 'Solid baseline risk controls.',
    ],
    vulnerabilities: topMistakes.map((tm) => `Identified "${tm.name}" costing $${tm.cost.toLocaleString()} across ${tm.occurrences} instances.`),
    topSetups,
    topMistakes,
    tacticalActionPlan: [
      'Eliminate lower-conviction setups and focus capital on top performing playbooks.',
      'Enforce hard daily loss limit circuit breakers to preserve capital during difficult market regimes.',
    ],
  };
}
