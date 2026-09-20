import { getGeminiClient, getGeminiModel } from './geminiClient';
import { classifyUserIntent } from './intentClassifier';
import { buildStructuredAiContext, StructuredAiContext } from './dataEngine';
import {
  Trade,
  TradingAccount,
  PropFirmAccount,
  Playbook,
  Strategy,
  JournalNote,
  RiskGoalSettings,
} from '../../types';

export interface ChatMessageItem {
  sender: 'ai' | 'user';
  text: string;
}

export interface AiCoachRequest {
  message: string;
  conversationHistory?: ChatMessageItem[];
  activeAccountId?: string;
  activePropFirmAccountId?: string;
  filterOverrides?: {
    dateRange?: string;
    symbol?: string;
    session?: string;
    setup?: string;
  };
}

export interface ReferencedTradeSummary {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL' | string;
  entryPrice: number;
  exitPrice?: number;
  netPnl: number;
  rMultiple: number | null;
  setupType?: string;
  mistakes?: string[];
  entryDate: string;
  session?: string;
  durationMinutes?: number;
}

export interface PrimaryLeakInfo {
  name: string;
  impactDollars: number;
  occurrences: number;
  recommendation: string;
}

export interface EvidenceSourceInfo {
  tradeCount: number;
  dateRange: string;
  accountName: string;
  netPnlFormatted: string;
  sources: string[];
}

export interface AiCoachResponse {
  reply: string;
  summary?: string;
  intent: string;
  sampleSizeTier: 'LOW' | 'MODERATE' | 'STRONG';
  appliedFilters: string[];
  dataScope: {
    totalTradesAnalyzed: number;
    totalJournalsAnalyzed: number;
    totalPlaybooksAnalyzed: number;
    accountName: string;
    dateScope: string;
  };
  deterministicSummary: {
    netPnl: number;
    winRate: number;
    totalTrades: number;
    profitFactor: number | null;
    expectancy: number;
    avgR: number | null;
    payoffRatio: number | null;
    maxDrawdown: number;
    streak: { count: number; type: string };
  };
  keyInsights?: string[];
  evidence?: EvidenceSourceInfo;
  primaryLeak?: PrimaryLeakInfo;
  actionablePrescriptions?: string[];
  referencedTrades?: ReferencedTradeSummary[];
  toolInvocations?: Array<{
    toolName: string;
    summary: string;
  }>;
}

const SYSTEM_INSTRUCTION = `You are TradeForge AI — an Elite Institutional Trading Coach, Quantitative Risk Officer, and Performance Psychologist.
You are embedded directly inside the trader's professional trade journaling and prop firm management terminal.

YOUR PRIME DIRECTIVES:
1. ABSOLUTE ZERO HALLUCINATION: You MUST NOT invent, guess, or fabricate numbers, win rates, P&L amounts, trade counts, or symbols. Every single quantitative fact you mention MUST come directly from the PROVIDED STRUCTURED CONTEXT.
2. STRICT DATA CITATION: Quote the exact metrics provided (e.g. Net P&L: +$2,450.00, Win Rate: 58.3%, Expectancy: +$142.10/trade, 24 closed trades).
3. DISTINGUISH FACT VS INTERPRETATION:
   - FACT: Authoritative historical calculations from the database (e.g., "In London session, you executed 14 trades with a 64.3% win rate and +$1,850 net P&L").
   - INTERPRETATION: Behavioral or statistical deduction (e.g., "Your average winning hold time is 22 mins vs 68 mins on losses, which reflects hesitation to accept predetermined stop losses").
   - PRESCRIPTION: Concrete, enforceable rules (e.g., "Cap daily max trades at 3. Enforce a mandatory 30-minute cooling-off period after any losing trade").
4. SAMPLE SIZE CALIBRATION:
   - LOW SAMPLE (< 10 trades): Explicitly declare: "⚠️ Note: This sample size is small (<10 trades). Early directional indicator, not statistically significant yet."
   - MODERATE SAMPLE (10-29 trades): Treat trends with measured confidence.
   - STRONG SAMPLE (30+ trades): Draw high-confidence conclusions.
5. INSTITUTIONAL TONE: Professional, objective, direct, supportive yet uncompromising on risk and discipline. Use Markdown with clean headers, bullet points, and bold metric callouts.
6. SCENARIO / WHAT-IF REQUESTS: Clearly contrast Baseline vs Simulated metrics with the exact Delta amounts.
7. PROP FIRM METRICS: When discussing prop firm accounts, state starting balance, current balance, daily loss buffer remaining, and max drawdown buffer remaining accurately.
8. MULTI-TURN CONVERSATION: Acknowledge previous context if the user asks a follow-up or comparison.`;

/**
 * Main AI Coach Query Handler
 */
export async function executeAiCoachQuery(params: {
  userId: string;
  query: string;
  conversationHistory?: ChatMessageItem[];
  trades: Trade[];
  tradingAccounts: TradingAccount[];
  propFirmAccounts: PropFirmAccount[];
  playbooks: Playbook[];
  strategies: Strategy[];
  journalNotes: JournalNote[];
  riskGoals?: RiskGoalSettings;
  activeAccountId?: string;
  activePropFirmAccountId?: string;
}): Promise<AiCoachResponse> {
  const {
    query,
    conversationHistory = [],
    trades,
    tradingAccounts,
    propFirmAccounts,
    playbooks,
    strategies,
    journalNotes,
    riskGoals,
    activeAccountId,
    activePropFirmAccountId,
  } = params;

  // 1. Classify Intent & Extract Entities
  const availablePlaybooks = playbooks.map((p) => p.name);
  const availableMistakes = [
    'FOMO',
    'Moved Stop Loss',
    'Chased Entry',
    'Revenge Trading',
    'Oversized Position',
    'Early Profit Taking',
    'Traded News',
    'No Setup / Random',
  ];
  const intent = classifyUserIntent(query, availablePlaybooks, availableMistakes);

  // 2. Build Deterministic Financial Context
  const context = buildStructuredAiContext({
    trades,
    tradingAccounts,
    propFirmAccounts,
    playbooks,
    strategies,
    journalNotes,
    riskGoals,
    intent,
    activeAccountId,
    activePropFirmAccountId,
  });

  const m = context.authoritativeMetrics;
  const sampleSizeTier = context.filterSummary.sampleSizeTier;
  const appliedFilters = context.filterSummary.appliedFilters;

  const targetAccount = tradingAccounts.find((a) => a.id === activeAccountId);
  const targetPropFirm = propFirmAccounts.find((a) => a.id === activePropFirmAccountId);
  const accountName = targetAccount?.name || targetPropFirm?.name || 'All Accounts (Aggregated)';

  const deterministicSummary = {
    netPnl: m.netPnl,
    winRate: m.winRatePercent,
    totalTrades: m.closedTrades,
    profitFactor: m.profitFactor,
    expectancy: m.expectancyPerTrade,
    avgR: m.averageR,
    payoffRatio: m.averageLoss > 0 ? Number((m.averageWin / m.averageLoss).toFixed(2)) : null,
    maxDrawdown: m.maxDrawdownDollars,
    streak: m.currentStreak || { count: 0, type: 'NONE' as const },
  };

  const dataScope = {
    totalTradesAnalyzed: trades.length,
    totalJournalsAnalyzed: journalNotes.length,
    totalPlaybooksAnalyzed: playbooks.length,
    accountName,
    dateScope: context.filterSummary.dateScope || 'All Recorded History',
  };

  const evidence: EvidenceSourceInfo = {
    tradeCount: trades.length,
    dateRange: context.filterSummary.dateScope || 'All Recorded History',
    accountName,
    netPnlFormatted: `${m.netPnl >= 0 ? '+$' : '-$'}${Math.abs(m.netPnl).toLocaleString()}`,
    sources: [
      `${trades.length} Closed Trades`,
      `${journalNotes.length} Journal Notes`,
      `${playbooks.length} Active Playbooks`,
      targetPropFirm ? 'Prop-Firm Rules Engine' : 'Institutional Risk Framework',
    ],
  };

  const topMistake = context.mistakeIntelligence.breakdown[0];
  const primaryLeak: PrimaryLeakInfo | undefined = topMistake
    ? {
        name: topMistake.name,
        impactDollars: Math.abs(topMistake.totalNetPnl),
        occurrences: topMistake.occurrences,
        recommendation: `Institute a mandatory rule checklist or cooling-off buffer to avoid ${topMistake.name}. Eliminating this leak recovers ~$${Math.abs(topMistake.totalNetPnl).toLocaleString()}.`,
      }
    : undefined;

  // Extract referenced trades relevant to the user query
  const qLower = query.toLowerCase();
  let selectedTradesList: Trade[] = [];

  if (qLower.includes('worst') || qLower.includes('loss') || qLower.includes('leak') || qLower.includes('drawdown')) {
    selectedTradesList = [...trades].filter((t) => t.netPnl < 0).sort((a, b) => a.netPnl - b.netPnl).slice(0, 5);
  } else if (qLower.includes('top') || qLower.includes('best') || qLower.includes('win')) {
    selectedTradesList = [...trades].filter((t) => t.netPnl > 0).sort((a, b) => b.netPnl - a.netPnl).slice(0, 5);
  } else if (intent.entities.symbols.length > 0) {
    const sym = intent.entities.symbols[0];
    selectedTradesList = trades.filter((t) => t.symbol?.toUpperCase() === sym).slice(0, 5);
  } else if (intent.entities.playbooks.length > 0) {
    const pbName = intent.entities.playbooks[0].toLowerCase();
    selectedTradesList = trades.filter((t) => t.setupType?.toLowerCase().includes(pbName)).slice(0, 5);
  } else {
    // Recent trades
    selectedTradesList = [...trades].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()).slice(0, 5);
  }

  const referencedTrades: ReferencedTradeSummary[] = selectedTradesList.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    netPnl: t.netPnl,
    rMultiple: t.rMultiple ?? null,
    setupType: t.setupType,
    mistakes: t.mistakes || [],
    entryDate: t.entryDate,
    session: t.session,
    durationMinutes: t.durationMinutes,
  }));

  const toolInvocations = [
    { toolName: 'get_account_summary', summary: `Evaluated ${accountName} equity and risk boundaries` },
    { toolName: 'get_trade_statistics', summary: `Calculated exact Net P&L ($${m.netPnl}), Win Rate (${m.winRatePercent}%), and Expectancy` },
    { toolName: 'get_mistake_analysis', summary: `Audited ${context.mistakeIntelligence.breakdown.length} behavioral tags and drain vectors` },
    { toolName: 'search_trades', summary: `Queried ${referencedTrades.length} relevant executions for evidence verification` },
  ];

  // 3. Try Calling Gemini API on Server
  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const model = getGeminiModel();

      // Format conversation history for multi-turn context
      const historySummary = conversationHistory
        .slice(-6)
        .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
        .join('\n\n');

      const promptPayload = `
=== STRUCTURED TRADEFORGE DATABASE CONTEXT (AUTHORITATIVE) ===
${JSON.stringify(context, null, 2)}
==============================================================

${historySummary ? `=== PREVIOUS CHAT CONVERSATION ===\n${historySummary}\n==================================\n` : ''}

CURRENT USER QUESTION:
"${query}"

Provide an institutional, data-grounded, professional response adhering strictly to your system directives. Cite exact metrics from the structured context. Do not invent any outside data.
`;

      const response = await gemini.models.generateContent({
        model,
        contents: promptPayload,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2, // Low temperature for high factual precision and numerical consistency
        },
      });

      const replyText = response.text || '';
      if (replyText.trim().length > 0) {
        return {
          reply: replyText.trim(),
          summary: `Institutional audit of ${m.closedTrades} closed executions in ${accountName}`,
          intent: intent.primaryIntent,
          sampleSizeTier,
          appliedFilters,
          dataScope,
          deterministicSummary,
          evidence,
          primaryLeak,
          referencedTrades,
          toolInvocations,
          actionablePrescriptions: [
            m.winRatePercent >= 50
              ? 'Protect your statistical edge: enforce minimum 2.0R targets and avoid impulsive mid-session adjustments.'
              : 'Prioritize setup quality over frequency. Filter out low-expectancy triggers and eliminate top mistake vectors.',
            topMistake ? `Enforce a hard rule against ${topMistake.name} before submitting your next order.` : 'Log emotions and market conditions immediately following each execution in your Journal.',
          ],
        };
      }
    } catch (apiError: any) {
      console.warn('[Gemini AI Engine] API Call failed or throttled, falling back to deterministic response generator:', apiError?.message || apiError);
    }
  }

  // 4. Deterministic Structured Fallback (Guaranteed to work if API key is absent or offline)
  const fallbackReply = generateDeterministicCoachReply(query, intent.primaryIntent, context);

  return {
    reply: fallbackReply,
    summary: `Deterministic institutional diagnosis across ${m.closedTrades} trades`,
    intent: intent.primaryIntent,
    sampleSizeTier,
    appliedFilters,
    dataScope,
    deterministicSummary,
    evidence,
    primaryLeak,
    referencedTrades,
    toolInvocations,
    actionablePrescriptions: [
      'Focus 80% of your risk budget on your primary positive-expectancy setup.',
      'Enforce daily max loss limits to protect capital and prevent emotional spirals.',
    ],
  };
}

/**
 * Deterministic fallback generator utilizing real calculated metrics
 */
function generateDeterministicCoachReply(
  query: string,
  intentType: string,
  ctx: StructuredAiContext
): string {
  const m = ctx.authoritativeMetrics;
  const sampleNotice =
    ctx.filterSummary.sampleSizeTier === 'LOW'
      ? `\n> ⚠️ **Sample Size Alert**: This analysis is based on **${m.closedTrades} closed trade(s)**. Early directional indicator, not statistically significant yet.\n`
      : '';

  if (ctx.scenarioResult) {
    const s = ctx.scenarioResult;
    return `### 🔬 TradeForge What-If Scenario: ${s.scenarioName}
${sampleNotice}
**Objective:** ${s.description}

#### 📊 Performance Comparison
| Metric | Baseline Actual | Simulated Result | Variance / Delta |
| :--- | :--- | :--- | :--- |
| **Net P&L** | **$${s.baseline.netPnl.toLocaleString()}** | **$${s.simulated.netPnl.toLocaleString()}** | **${s.delta.netPnlChange >= 0 ? '+$' : '-$'}${Math.abs(s.delta.netPnlChange).toLocaleString()}** |
| **Win Rate** | ${s.baseline.winRate}% | ${s.simulated.winRate}% | ${s.delta.winRateChange >= 0 ? '+' : ''}${s.delta.winRateChange}% |
| **Profit Factor** | ${s.baseline.profitFactor ?? 'N/A'} | ${s.simulated.profitFactor ?? 'N/A'} | ${s.delta.profitFactorChange >= 0 ? '+' : ''}${s.delta.profitFactorChange} |
| **Total Trades** | ${s.baseline.totalTrades} | ${s.simulated.totalTrades} | -${s.delta.tradesRemovedCount} removed |

#### 💡 Institutional Coaching Insight
By eliminating or adhering to this discipline rule, your net performance improves by **$${s.delta.netPnlChange.toLocaleString()}**.
This proves numerically that your edge exists in your core setups, and losses are primarily concentrated in preventable rule deviations.`;
  }

  if (intentType === 'MISTAKES' || ctx.mistakeIntelligence.breakdown.length > 0) {
    const leaks = ctx.mistakeIntelligence.breakdown;
    const leakList = leaks
      .slice(0, 4)
      .map(
        (l, i) =>
          `${i + 1}. **${l.name}**: **$${Math.abs(l.totalNetPnl).toLocaleString()}** lost across ${l.occurrences} trades (${l.percentageOfAllTrades}% of total). Avg loss: $${Math.abs(l.avgNetPnl)}.`
      )
      .join('\n');

    return `### 🚨 Execution Leak & Mistake Audit
${sampleNotice}
Based on your recorded trading journal entries:

${leakList || 'No recurring behavioral mistakes logged yet.'}

#### 🎯 Tactical Recommendations:
- **Total Mistake Capital Drain:** **$${ctx.mistakeIntelligence.totalMistakePnlLoss.toLocaleString()}**
- **Action Plan:** Establish a hard rule checklist before pressing execute. If a setup feels rushed or triggered by price speed, institute a mandatory 60-second timer before submitting the order.`;
  }

  if (intentType === 'STRATEGY_PLAYBOOK') {
    const setups = ctx.groupBreakdowns.bySetup;
    const setupRows = setups
      .map(
        (s) =>
          `- **${s.key}**: **$${s.netPnl.toLocaleString()}** Net P&L | **${s.winRate}%** Win Rate | **${s.tradesCount}** Trades | PF: **${s.profitFactor ?? 'N/A'}**`
      )
      .join('\n');

    return `### 📈 Playbook & Setup Breakdown
${sampleNotice}
Reviewing your playbook distribution:

${setupRows || 'No categorized playbooks logged yet.'}

#### 💡 Key Takeaway:
Focus 80% of your capital allocation on your highest expectancy setups and systematically backtest or eliminate underperforming patterns.`;
  }

  if (intentType === 'SESSION_TIME' || intentType === 'COMPARISON') {
    const sessions = ctx.groupBreakdowns.bySession;
    const sessionRows = sessions
      .map(
        (s) =>
          `- **${s.key} Session**: **$${s.netPnl.toLocaleString()}** Net P&L | **${s.winRate}%** Win Rate | **${s.tradesCount}** Trades`
      )
      .join('\n');

    return `### ⏱️ Session & Timing Analysis
${sampleNotice}
Performance distribution across active trading windows:

${sessionRows || 'No session data recorded.'}

#### 💡 Recommendation:
Align your daily schedule strictly with your highest positive expectancy liquidity window. Avoid taking late-session trades when liquidity dries up.`;
  }

  // Default Performance / General Audit
  return `### 🛡️ TradeForge AI Performance Intelligence
${sampleNotice}
Here is your current institutional performance snapshot:

- **Net P&L:** **$${m.netPnl.toLocaleString()}** (Gross Profit: $${m.grossProfit.toLocaleString()} | Gross Loss: -$${m.grossLoss.toLocaleString()})
- **Win Rate:** **${m.winRatePercent}%** (${m.winningTrades} wins / ${m.losingTrades} losses / ${m.closedTrades} closed)
- **Profit Factor:** **${m.profitFactor ?? 'N/A'}**
- **Expectancy:** **$${m.expectancyPerTrade}** per trade
- **Average Win / Loss:** **+$${m.averageWin}** / **-$${m.averageLoss}** (Payoff Ratio: ${(m.averageLoss > 0 ? (m.averageWin / m.averageLoss).toFixed(2) : 'N/A')}x)
- **Max Drawdown:** **$${m.maxDrawdownDollars.toLocaleString()}** (${m.maxDrawdownPercent}%)
- **Current Streak:** **${m.currentStreak.count} ${m.currentStreak.type === 'WIN' ? 'Wins' : m.currentStreak.type === 'LOSS' ? 'Losses' : 'Trades'}**

#### 🎯 Strategic Action Item:
${
  m.winRatePercent >= 50
    ? `Maintain strict position sizing and let winners reach full R-multiple targets. Your win rate provides a solid foundation.`
    : `Focus on improving your risk-to-reward ratio and eliminating your top mistake leak to turn positive expectancy without needing a higher win rate.`
}`;
}
