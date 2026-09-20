export type AiIntentType =
  | 'PERFORMANCE'
  | 'MISTAKES'
  | 'STRATEGY_PLAYBOOK'
  | 'SESSION_TIME'
  | 'SYMBOL_INSTRUMENT'
  | 'RISK_DRAWDOWN'
  | 'PROP_FIRM'
  | 'BEHAVIOR_PSYCHOLOGY'
  | 'WHAT_IF_SCENARIO'
  | 'COMPARISON'
  | 'GENERAL_AUDIT'
  | 'PRE_TRADE';

export interface ExtractedEntities {
  symbols: string[];
  sessions: string[];
  playbooks: string[];
  mistakes: string[];
  dateRangeText?: string;
  timeframes: string[];
  direction?: 'LONG' | 'SHORT';
  scenarioType?:
    | 'REMOVE_MISTAKE'
    | 'REMOVE_WORST_TRADES'
    | 'REMOVE_WORST_SYMBOL'
    | 'STOP_AFTER_2_LOSSES'
    | 'ONLY_A_PLUS_SETUPS'
    | 'REDUCE_SIZE_50'
    | 'CUSTOM';
  targetMistake?: string;
  compareEntities?: {
    type: 'SESSION' | 'TIMEFRAME' | 'PLAYBOOK' | 'SYMBOL' | 'MONTH';
    itemA: string;
    itemB: string;
  };
}

export interface ClassifiedIntent {
  primaryIntent: AiIntentType;
  confidence: number;
  entities: ExtractedEntities;
  isFollowUp: boolean;
}

const COMMON_SYMBOLS = [
  'NQ', 'ES', 'YM', 'RTY', 'CL', 'GC', 'SI', 'ZB', 'ZN',
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'GBPJPY', 'EURJPY', 'EURGBP', 'CADJPY', 'AUDJPY',
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'US30', 'NAS100', 'SPX500', 'GER40', 'UK100',
  'AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META'
];

const COMMON_SESSIONS = ['London', 'New York', 'Asia', 'Sydney', 'Tokyo', 'Pre-market', 'Afternoon'];
const COMMON_TIMEFRAMES = ['1m', '2m', '3m', '5m', '15m', '30m', '1h', '4h', '1d', 'Daily'];

export function classifyUserIntent(
  query: string,
  availablePlaybooks: string[] = [],
  availableMistakes: string[] = []
): ClassifiedIntent {
  const q = query.toLowerCase();

  const entities: ExtractedEntities = {
    symbols: [],
    sessions: [],
    playbooks: [],
    mistakes: [],
    timeframes: [],
  };

  // 1. Extract Symbols
  for (const sym of COMMON_SYMBOLS) {
    const regex = new RegExp(`\\b${sym.toLowerCase()}\\b`, 'i');
    if (regex.test(q)) {
      entities.symbols.push(sym.toUpperCase());
    }
  }

  // 2. Extract Sessions
  for (const s of COMMON_SESSIONS) {
    const regex = new RegExp(`\\b${s.toLowerCase()}\\b`, 'i');
    if (regex.test(q) || (s === 'New York' && (q.includes('ny') || q.includes('new york')))) {
      if (!entities.sessions.includes(s)) entities.sessions.push(s);
    }
  }

  // 3. Extract Timeframes
  for (const tf of COMMON_TIMEFRAMES) {
    const regex = new RegExp(`\\b${tf.toLowerCase()}\\b`, 'i');
    if (regex.test(q)) {
      entities.timeframes.push(tf);
    }
  }

  // 4. Extract Playbooks
  for (const pb of availablePlaybooks) {
    if (pb && q.includes(pb.toLowerCase())) {
      entities.playbooks.push(pb);
    }
  }
  if (q.includes('breakout') && !entities.playbooks.includes('Breakout')) entities.playbooks.push('Breakout');
  if (q.includes('reversal') && !entities.playbooks.includes('Reversal')) entities.playbooks.push('Reversal');
  if ((q.includes('liquidity sweep') || q.includes('sweep')) && !entities.playbooks.includes('Liquidity Sweep')) {
    entities.playbooks.push('Liquidity Sweep');
  }

  // 5. Extract Mistakes
  for (const m of availableMistakes) {
    if (m && q.includes(m.toLowerCase())) {
      entities.mistakes.push(m);
    }
  }
  if (q.includes('fomo') && !entities.mistakes.includes('FOMO')) entities.mistakes.push('FOMO');
  if ((q.includes('move stop') || q.includes('moved stop') || q.includes('moving stop') || q.includes('stop moving')) && !entities.mistakes.includes('Moved Stop Loss')) {
    entities.mistakes.push('Moved Stop Loss');
  }
  if (q.includes('chase') || q.includes('chased')) entities.mistakes.push('Chased Entry');
  if (q.includes('revenge') || q.includes('revenge trade') || q.includes('revenge trading')) entities.mistakes.push('Revenge Trading');
  if (q.includes('oversize') || q.includes('oversized') || q.includes('too big')) entities.mistakes.push('Oversized Position');
  if (q.includes('early exit') || q.includes('early profit') || q.includes('cut winners')) entities.mistakes.push('Early Profit Taking');

  // 6. Extract Direction
  if (/\b(long|buy|bought|longs)\b/i.test(q) && !/\b(short|sell|sold|shorts)\b/i.test(q)) {
    entities.direction = 'LONG';
  } else if (/\b(short|sell|sold|shorts)\b/i.test(q) && !/\b(long|buy|bought|longs)\b/i.test(q)) {
    entities.direction = 'SHORT';
  }

  // 7. Extract Date Range Terms
  if (q.includes('today')) entities.dateRangeText = 'today';
  else if (q.includes('yesterday')) entities.dateRangeText = 'yesterday';
  else if (q.includes('this week')) entities.dateRangeText = 'this_week';
  else if (q.includes('last week')) entities.dateRangeText = 'last_week';
  else if (q.includes('this month')) entities.dateRangeText = 'this_month';
  else if (q.includes('last month')) entities.dateRangeText = 'last_month';
  else if (q.includes('this quarter')) entities.dateRangeText = 'this_quarter';
  else if (q.includes('this year')) entities.dateRangeText = 'this_year';
  else if (q.includes('last year')) entities.dateRangeText = 'last_year';
  else {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    for (const m of months) {
      if (q.includes(m)) {
        entities.dateRangeText = m;
        break;
      }
    }
  }

  // 8. Extract Scenario / What-If
  if (
    q.includes('what if') ||
    q.includes('what would my p&l') ||
    q.includes('what happens if') ||
    q.includes('hypothetical') ||
    q.includes('if i removed') ||
    q.includes('without my') ||
    q.includes('without fomo') ||
    q.includes('if i had stopped') ||
    q.includes('if i only traded')
  ) {
    if (q.includes('fomo') || entities.mistakes.length > 0) {
      entities.scenarioType = 'REMOVE_MISTAKE';
      entities.targetMistake = entities.mistakes[0] || 'FOMO';
    } else if (q.includes('worst') && (q.includes('trade') || q.includes('5') || q.includes('3'))) {
      entities.scenarioType = 'REMOVE_WORST_TRADES';
    } else if (q.includes('worst') && q.includes('symbol')) {
      entities.scenarioType = 'REMOVE_WORST_SYMBOL';
    } else if (q.includes('two') || q.includes('2 losses') || q.includes('consecutive losses')) {
      entities.scenarioType = 'STOP_AFTER_2_LOSSES';
    } else if (q.includes('a+') || q.includes('a plus') || q.includes('best setup') || q.includes('rules followed')) {
      entities.scenarioType = 'ONLY_A_PLUS_SETUPS';
    } else if (q.includes('50%') || q.includes('half size') || q.includes('reduced position')) {
      entities.scenarioType = 'REDUCE_SIZE_50';
    } else {
      entities.scenarioType = 'CUSTOM';
    }
  }

  // 9. Extract Comparison
  if (
    q.includes('compare') ||
    q.includes(' vs ') ||
    q.includes('versus') ||
    q.includes('better in london or') ||
    q.includes('5m vs 15m')
  ) {
    if (entities.sessions.length >= 2 || (q.includes('london') && (q.includes('ny') || q.includes('new york')))) {
      entities.compareEntities = {
        type: 'SESSION',
        itemA: 'London',
        itemB: 'New York',
      };
    } else if (entities.timeframes.length >= 2) {
      entities.compareEntities = {
        type: 'TIMEFRAME',
        itemA: entities.timeframes[0],
        itemB: entities.timeframes[1],
      };
    } else if (entities.symbols.length >= 2) {
      entities.compareEntities = {
        type: 'SYMBOL',
        itemA: entities.symbols[0],
        itemB: entities.symbols[1],
      };
    }
  }

  // Check if it looks like a follow-up query (short or referring to previous)
  const isFollowUp =
    q.startsWith('and ') ||
    q.startsWith('what about') ||
    q.startsWith('how about') ||
    q.startsWith('compare that') ||
    q.startsWith('why is that') ||
    q.startsWith('what about during') ||
    q.length < 25;

  // Determine Primary Intent
  if (entities.scenarioType) {
    return { primaryIntent: 'WHAT_IF_SCENARIO', confidence: 0.95, entities, isFollowUp };
  }

  if (
    q.includes('prop firm') ||
    q.includes('prop account') ||
    q.includes('daily loss limit') ||
    q.includes('breach') ||
    q.includes('profit target') ||
    q.includes('drawdown buffer') ||
    q.includes('pass phase') ||
    q.includes('phase 1') ||
    q.includes('phase 2') ||
    q.includes('payout eligibility') ||
    q.includes('safely take another trade') ||
    q.includes('at highest risk')
  ) {
    return { primaryIntent: 'PROP_FIRM', confidence: 0.95, entities, isFollowUp };
  }

  if (
    q.includes('mistake') ||
    q.includes('costing me') ||
    q.includes('leaks') ||
    q.includes('leak') ||
    q.includes('fomo') ||
    q.includes('moving stop') ||
    q.includes('moved stop') ||
    q.includes('stop moving') ||
    q.includes('chased') ||
    q.includes('doing wrong') ||
    q.includes('what should i stop') ||
    q.includes('biggest weakness')
  ) {
    return { primaryIntent: 'MISTAKES', confidence: 0.9, entities, isFollowUp };
  }

  if (
    q.includes('setup') ||
    q.includes('playbook') ||
    q.includes('strategy') ||
    q.includes('breakout') ||
    q.includes('reversal') ||
    q.includes('which setup') ||
    q.includes('best playbook') ||
    q.includes('highest expectancy')
  ) {
    return { primaryIntent: 'STRATEGY_PLAYBOOK', confidence: 0.9, entities, isFollowUp };
  }

  if (
    entities.compareEntities ||
    q.includes('compare') ||
    q.includes(' vs ') ||
    q.includes('versus')
  ) {
    return { primaryIntent: 'COMPARISON', confidence: 0.9, entities, isFollowUp };
  }

  if (
    q.includes('overtrading') ||
    q.includes('overtrade') ||
    q.includes('revenge') ||
    q.includes('discipline') ||
    q.includes('psychology') ||
    q.includes('mindset') ||
    q.includes('hold losers') ||
    q.includes('take profits too early') ||
    q.includes('early exit') ||
    q.includes('emotional') ||
    q.includes('emotions')
  ) {
    return { primaryIntent: 'BEHAVIOR_PSYCHOLOGY', confidence: 0.9, entities, isFollowUp };
  }

  if (
    q.includes('risk') ||
    q.includes('drawdown') ||
    q.includes('position size') ||
    q.includes('consecutive losses') ||
    q.includes('survive') ||
    q.includes('risk per trade') ||
    q.includes('risking too much')
  ) {
    return { primaryIntent: 'RISK_DRAWDOWN', confidence: 0.9, entities, isFollowUp };
  }

  if (
    entities.sessions.length > 0 ||
    q.includes('session') ||
    q.includes('time of day') ||
    q.includes('what time') ||
    q.includes('morning') ||
    q.includes('afternoon') ||
    q.includes('day of week') ||
    q.includes('monday') ||
    q.includes('friday') ||
    q.includes('best day')
  ) {
    return { primaryIntent: 'SESSION_TIME', confidence: 0.85, entities, isFollowUp };
  }

  if (
    entities.symbols.length > 0 ||
    q.includes('instrument') ||
    q.includes('symbol') ||
    q.includes('asset') ||
    q.includes('forex') ||
    q.includes('crypto') ||
    q.includes('futures')
  ) {
    return { primaryIntent: 'SYMBOL_INSTRUMENT', confidence: 0.85, entities, isFollowUp };
  }

  if (
    q.includes('win rate') ||
    q.includes('expectancy') ||
    q.includes('profit factor') ||
    q.includes('performance') ||
    q.includes('how am i performing') ||
    q.includes('net p&l') ||
    q.includes('best month') ||
    q.includes('worst day') ||
    q.includes('average win') ||
    q.includes('average loss') ||
    q.includes('r multiple') ||
    q.includes('statistics') ||
    q.includes('stats')
  ) {
    return { primaryIntent: 'PERFORMANCE', confidence: 0.85, entities, isFollowUp };
  }

  if (
    q.includes('analyze my trading') ||
    q.includes('audit') ||
    q.includes('review') ||
    q.includes('overview') ||
    q.includes('summary') ||
    q.includes('look at my recent') ||
    q.includes('tell me everything')
  ) {
    return { primaryIntent: 'GENERAL_AUDIT', confidence: 0.8, entities, isFollowUp };
  }

  return { primaryIntent: 'GENERAL_AUDIT', confidence: 0.6, entities, isFollowUp };
}
