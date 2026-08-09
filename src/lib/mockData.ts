import { Trade, PlaybookSetup, UserSettings } from '../types';

export const INITIAL_SETTINGS: UserSettings = {
  initialBalance: 297.78,
  currency: 'USD',
  defaultRiskPercent: 1.0,
  strategies: [
    'HyperTrade MT5 Auto Sync',
    'ICT Silver Bullet + FVG',
    'NY Killzone Liquidity Sweep',
    'London Breakout & Retest',
    'HTF Order Block Bounce'
  ],
  confluences: [
    'MT5 Live Execution',
    '4H Order Block',
    '15M Fair Value Gap (FVG)',
    'Asian High/Low Sweep',
    'Killzone Time Window (08:30-10:00)',
    'Support / Resistance Zone'
  ],
  mistakes: [
    'FOMO Entry',
    'Moved SL to Break Even Early',
    'Oversized Lot',
    'Chased Price After News',
    'Revenge Trading',
    'Early Exit / Closed Pre-TP'
  ]
};

export const MOCK_TRADES: Trade[] = [];

export const MOCK_PLAYBOOK: PlaybookSetup[] = [
  {
    id: 'pb-01',
    title: 'XAUUSD NY AM Silver Bullet (10 AM EST)',
    strategyName: 'ICT Silver Bullet + FVG',
    description: 'High probability Gold scalping setup occurring precisely inside the 10:00 AM - 11:00 AM EST Silver Bullet hour following a liquidity sweep.',
    rules: [
      'Wait for 08:30 EST news or opening volatility to sweep Asian or London High/Low.',
      'Identify a sharp 5M/15M displacement body candle creating a clean Fair Value Gap.',
      'Set Limit Order at 50% Consequent Encroachment (CE) of the FVG.',
      'Stop Loss strictly beyond the swing high/low causing displacement.',
      'Target opposing 1H/4H liquidity or equal highs/lows.'
    ],
    mandatoryConfluences: [
      '15M Fair Value Gap (FVG)',
      'Killzone Time Window (08:30-10:00)',
      'Asian High/Low Sweep'
    ],
    timeframes: ['15M', '5M', '1M'],
    preferredSessions: ['NY_AM'],
    grade: 'A+',
    createdAt: '2026-07-15T10:00:00.000Z'
  },
  {
    id: 'pb-02',
    title: 'London Open Range Raid & Reversal',
    strategyName: 'NY Killzone Liquidity Sweep',
    description: 'Capitalizes on London market open algorithms sweeping the quiet Asian session highs or lows before expanding in the true daily directional bias.',
    rules: [
      'Mark Asian Session High and Low (00:00 - 06:00 UTC).',
      'Between 07:00 and 08:30 UTC, observe a rapid spike through Asian High/Low.',
      'Look for immediate rejection candle leaving a long wick.',
      'Enter on 5M Market Structure Shift (MSS) confirmation.'
    ],
    mandatoryConfluences: [
      'Asian High/Low Sweep',
      '4H Order Block'
    ],
    timeframes: ['1H', '15M', '5M'],
    preferredSessions: ['LONDON_OPEN'],
    grade: 'A',
    createdAt: '2026-07-20T12:00:00.000Z'
  }
];
