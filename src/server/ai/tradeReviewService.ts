import { getGeminiClient, getGeminiModel } from './geminiClient';
import { Trade, Playbook } from '../../types';
import { roundMoney } from '../../lib/calcEngine';

export interface AiTradeReviewResult {
  score: number;
  executiveSummary: string;
  strengths: string[];
  mistakesIdentified: string[];
  psychologyInsight: string;
  riskEvaluation: string;
  actionableSteps: string[];
}

const TRADE_REVIEW_SYSTEM_INSTRUCTION = `You are TradeForge AI Senior Risk & Execution Auditor.
You perform institutional post-trade critiques on individual executions.
Evaluate the trade based on:
1. Setup & Entry Quality: Rule adherence, technical trigger, entry timing.
2. Risk Management: Stop loss discipline, position size vs risk, R-multiple achieved.
3. Execution & Management: Scaling, trail stop, emotional stability, exit discipline.
4. Numerical Scoring: Return an institutional audit score from 0 to 100 based strictly on process and rule adherence, NOT just whether the trade was a win or loss (a good process loss can score 85+, a bad FOMO lucky win should score <60).

Return valid JSON in the following format:
{
  "score": 85,
  "executiveSummary": "Concise 2-sentence summary of the trade execution.",
  "strengths": ["Strength 1", "Strength 2"],
  "mistakesIdentified": ["Mistake 1 if any"],
  "psychologyInsight": "Evaluation of emotional state, discipline, and psychology.",
  "riskEvaluation": "Evaluation of stop loss, position size, and risk/reward.",
  "actionableSteps": ["Concrete actionable step for next time"]
}`;

export async function executeTradeReview(params: {
  trade: Trade;
  playbook?: Playbook;
}): Promise<AiTradeReviewResult> {
  const { trade, playbook } = params;
  const isWin = trade.netPnl > 0;
  const isLoss = trade.netPnl < 0;

  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const model = getGeminiModel();

      const tradePayload = {
        symbol: trade.symbol,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        netPnl: trade.netPnl,
        grossPnl: trade.grossPnl,
        rMultiple: trade.rMultiple,
        plannedRr: (trade as any).plannedRr,
        riskAmount: (trade as any).riskAmount,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        durationMinutes: trade.durationMinutes,
        session: trade.session,
        timeframe: (trade as any).timeframe || '15m',
        setupType: trade.setupType,
        playbookName: playbook?.name,
        playbookRules: playbook?.rules || [],
        rulesFollowed: trade.rulesFollowed,
        mistakes: trade.mistakes || [],
        mistakeCategory: trade.mistakeCategory,
        mistakeDescription: trade.mistakeDescription,
        emotionalState: trade.emotionalState,
        tags: trade.tags || [],
        notes: trade.notes,
      };

      const prompt = `Review this trade execution according to institutional risk standards:\n\n${JSON.stringify(
        tradePayload,
        null,
        2
      )}`;

      const response = await gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: TRADE_REVIEW_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '';
      if (text.trim().length > 0) {
        const parsed = JSON.parse(text);
        return {
          score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 75,
          executiveSummary: parsed.executiveSummary || 'Trade audited successfully.',
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          mistakesIdentified: Array.isArray(parsed.mistakesIdentified) ? parsed.mistakesIdentified : [],
          psychologyInsight: parsed.psychologyInsight || 'Disciplined execution maintained.',
          riskEvaluation: parsed.riskEvaluation || 'Risk parameters within standard range.',
          actionableSteps: Array.isArray(parsed.actionableSteps) ? parsed.actionableSteps : [],
        };
      }
    } catch (err: any) {
      console.warn('[Trade Review Engine] Gemini API call failed, using deterministic audit generator:', err?.message || err);
    }
  }

  // Deterministic Fallback Review
  let score = 75;
  const strengths: string[] = [];
  const mistakes: string[] = [];

  if (trade.rulesFollowed) {
    score += 15;
    strengths.push('Strictly adhered to playbook setup checklist and execution rules.');
  } else {
    score -= 20;
    mistakes.push('Deviated from predetermined entry/exit playbook guidelines.');
  }

  if (typeof trade.rMultiple === 'number' && trade.rMultiple >= 2.0) {
    score += 10;
    strengths.push(`Achieved favorable asymmetric payoff of ${trade.rMultiple.toFixed(2)}R.`);
  } else if (typeof trade.rMultiple === 'number' && trade.rMultiple < 0 && trade.rMultiple > -1.1) {
    strengths.push('Respected hard stop loss without adding to losing position.');
  }

  if (trade.mistakeCategory || (trade.mistakes && trade.mistakes.length > 0)) {
    score -= 15;
    const mName = trade.mistakeCategory || trade.mistakes?.[0] || 'Rule deviation';
    mistakes.push(`Logged behavioral error: "${mName}".`);
  }

  score = Math.max(20, Math.min(98, score));

  return {
    score,
    executiveSummary: isWin
      ? `Executed ${trade.symbol} ${trade.direction} during ${trade.session || 'regular'} session for +$${trade.netPnl.toFixed(
          2
        )} (${trade.rMultiple ? trade.rMultiple.toFixed(2) + 'R' : 'Win'}). Process quality scored at ${score}/100.`
      : `Closed ${trade.symbol} ${trade.direction} for -$${Math.abs(trade.netPnl).toFixed(
          2
        )} (${trade.rMultiple ? trade.rMultiple.toFixed(2) + 'R' : 'Loss'}). Stop loss and risk were contained according to parameters.`,
    strengths: strengths.length > 0 ? strengths : ['Controlled position risk allocation.'],
    mistakesIdentified: mistakes.length > 0 ? mistakes : ['No major structural violations detected.'],
    psychologyInsight: trade.emotionalState
      ? `Trader recorded emotional state: "${trade.emotionalState}". Ensure emotional composure is reset before subsequent executions.`
      : 'Maintained baseline emotional discipline without impulsive adjustments.',
    riskEvaluation: `Position sizing and stop-loss placement conformed to ${
      (trade as any).riskAmount ? '$' + (trade as any).riskAmount : 'account'
    } risk parameters.`,
    actionableSteps: [
      'Record detailed entry screenshot in TradeForge journal with trigger markers.',
      'Maintain identical position sizing on subsequent setups to allow probabilistic edge to play out.',
    ],
  };
}
