import { Trade, PlaybookSetup, UserSettings } from '../types';
import { MOCK_TRADES, MOCK_PLAYBOOK, INITIAL_SETTINGS } from './mockData';

const TRADES_KEY = 'exness_journal_trades_v1';
const PLAYBOOK_KEY = 'exness_journal_playbook_v1';
const SETTINGS_KEY = 'exness_journal_settings_v1';

export function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(TRADES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((t: any) => 
        t && typeof t === 'object' && t.id &&
        !t.id.startsWith('trd-') &&
        t.accountLogin !== '160096169' &&
        !t.notes?.includes('Live Auto-Sync Verification Test Trade')
      );
      return valid;
    }
    return [];
  } catch {
    return [];
  }
}

export function clearAllTrades(): void {
  try {
    localStorage.setItem(TRADES_KEY, '[]');
  } catch (e) {
    console.error('Failed to clear trades from storage:', e);
  }
}

export function saveTrades(trades: Trade[]): void {
  try {
    const valid = Array.isArray(trades) ? trades.filter((t: any) => t && typeof t === 'object' && t.id) : [];
    localStorage.setItem(TRADES_KEY, JSON.stringify(valid));
  } catch (e) {
    console.error('Failed to save trades to storage:', e);
  }
}

export function loadPlaybook(): PlaybookSetup[] {
  try {
    const raw = localStorage.getItem(PLAYBOOK_KEY);
    if (!raw) {
      savePlaybook(MOCK_PLAYBOOK);
      return MOCK_PLAYBOOK;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : MOCK_PLAYBOOK;
  } catch {
    return MOCK_PLAYBOOK;
  }
}

export function savePlaybook(playbook: PlaybookSetup[]): void {
  try {
    localStorage.setItem(PLAYBOOK_KEY, JSON.stringify(playbook));
  } catch (e) {
    console.error('Failed to save playbook:', e);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      saveSettings(INITIAL_SETTINGS);
      return INITIAL_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...INITIAL_SETTINGS, ...parsed };
  } catch {
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function exportBackupJSON(trades: Trade[], playbook: PlaybookSetup[], settings: UserSettings): void {
  const data = {
    app: 'HyperTrade PRO Journal',
    exportedAt: new Date().toISOString(),
    version: '1.0',
    trades,
    playbook,
    settings
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hypertrade_journal_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTradesCSV(trades: Trade[]): void {
  const headers = [
    'Ticket', 'Symbol', 'Direction', 'Open Time', 'Close Time', 'Open Price', 'Close Price',
    'Stop Loss', 'Take Profit', 'Lot Size', 'Net Profit ($)', 'Pips', 'R-Multiple',
    'Commission', 'Swap', 'Session', 'Strategy', 'Confluences', 'Mistakes', 'Emotion', 'Rating', 'Notes'
  ];

  const rows = trades.map(t => [
    t.ticket || '',
    t.symbol,
    t.direction,
    t.openTime,
    t.closeTime,
    t.openPrice,
    t.closePrice,
    t.stopLoss || '',
    t.takeProfit || '',
    t.lotSize,
    t.netProfit,
    t.pips,
    t.rMultiple || '',
    t.commission || 0,
    t.swap || 0,
    t.session,
    `"${(t.strategy || '').replace(/"/g, '""')}"`,
    `"${(t.confluences || []).join('; ').replace(/"/g, '""')}"`,
    `"${(t.mistakes || []).join('; ').replace(/"/g, '""')}"`,
    t.emotions,
    t.rating || '',
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hypertrade_trades_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function resetToSampleData(): { trades: Trade[]; playbook: PlaybookSetup[]; settings: UserSettings } {
  saveTrades([]);
  savePlaybook(MOCK_PLAYBOOK);
  saveSettings(INITIAL_SETTINGS);
  return {
    trades: [],
    playbook: MOCK_PLAYBOOK,
    settings: INITIAL_SETTINGS
  };
}
