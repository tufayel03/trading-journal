import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FilterBar } from './components/FilterBar';
import { KPIOverview } from './components/Analytics/KPIOverview';
import { EquityCurveChart } from './components/Analytics/EquityCurveChart';
import { CalendarHeatmap } from './components/Analytics/CalendarHeatmap';
import { MistakeBreakdownChart } from './components/Analytics/MistakeBreakdownChart';
import { PairAndSessionCharts } from './components/Analytics/PairAndSessionCharts';
import { StrategyBreakdown } from './components/Analytics/StrategyBreakdown';
import { TradeTable } from './components/Trades/TradeTable';
import { TradeDetailModal } from './components/Trades/TradeDetailModal';
import { ManualTradeModal } from './components/Trades/ManualTradeModal';
import { CSVImporterModal } from './components/Trades/CSVImporterModal';
import { MT5SyncModal } from './components/Trades/MT5SyncModal';
import { PsychologyDashboard } from './components/Psychology/PsychologyDashboard';
import { PlaybookView } from './components/Playbook/PlaybookView';
import { SettingsModal } from './components/Settings/SettingsModal';
import { KeyboardShortcutsModal } from './components/Common/KeyboardShortcutsModal';
import { X, Zap } from 'lucide-react';

import { Trade, PlaybookSetup, UserSettings, FilterOptions, AccountStatus, OpenPosition } from './types';
import { loadTrades, saveTrades, clearAllTrades, loadPlaybook, savePlaybook, loadSettings, saveSettings, exportBackupJSON, exportTradesCSV, resetToSampleData } from './lib/storage';
import { calculateKPIStats, normalizeSymbol } from './lib/calculations';
import { ThemeId, applyTheme, loadSavedTheme, ZoomLevel, applyZoom, loadSavedZoom } from './lib/theme';

export default function App() {
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>(() => loadPlaybook());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => loadSavedTheme());
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>(() => loadSavedZoom());
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [accountsMap, setAccountsMap] = useState<Record<string, AccountStatus>>({});
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    applyZoom(currentZoom);
  }, [currentZoom]);

  // Helper to deduplicate trades by ticket and ID while merging annotations
  const deduplicateTrades = (tradeList: Trade[]): Trade[] => {
    const seenTickets = new Set<string>();
    const seenIds = new Set<string>();
    const result: Trade[] = [];

    for (const t of tradeList) {
      if (!t) continue;
      const ticketKey = t.ticket ? String(t.ticket).trim() : null;
      const idKey = t.id ? String(t.id).trim() : null;

      if (ticketKey && seenTickets.has(ticketKey)) {
        const existingIdx = result.findIndex(r => r.ticket && String(r.ticket).trim() === ticketKey);
        if (existingIdx >= 0) {
          const existing = result[existingIdx];
          result[existingIdx] = {
            ...t,
            ...existing,
            mistakes: (existing.mistakes && existing.mistakes.length > 0) ? existing.mistakes : (t.mistakes || []),
            notes: existing.notes && !existing.notes.startsWith('Auto-synced') ? existing.notes : (t.notes || existing.notes),
            rating: existing.rating || t.rating,
            emotions: existing.emotions || t.emotions || 'Disciplined',
            strategy: existing.strategy && existing.strategy !== 'HyperTrade MT5 Auto Sync' ? existing.strategy : (t.strategy || existing.strategy),
            confluences: (existing.confluences && existing.confluences.length > 0) ? existing.confluences : (t.confluences || []),
            beforeChartUrl: existing.beforeChartUrl || t.beforeChartUrl,
            afterChartUrl: existing.afterChartUrl || t.afterChartUrl
          };
        }
        continue;
      }

      if (idKey && seenIds.has(idKey)) {
        continue;
      }

      if (ticketKey) seenTickets.add(ticketKey);
      if (idKey) seenIds.add(idKey);
      result.push(t);
    }
    return result;
  };

  // Purge any legacy dummy mock trades and deduplicate on mount
  useEffect(() => {
    setTrades(current => {
      const cleaned = current.filter(t => {
        if (!t || !t.id) return false;
        
        // Remove old manual mock trades starting with 'trd-'
        if (t.id.startsWith('trd-')) return false;
        
        // Remove demo account 160096169 trades
        if (String(t.accountLogin) === '160096169' || String(t.id).startsWith('mt5-160096169')) return false;

        // Remove test verification trades
        if (t.notes?.includes('Live Auto-Sync Verification Test Trade')) return false;
        
        // Ensure trade has a real ticket or belongs to real user account
        if (String(t.accountLogin) !== '276133463' && (!t.ticket || String(t.ticket).length < 5)) return false;

        return true;
      });
      const deduped = deduplicateTrades(cleaned);
      saveTrades(deduped);
      return deduped;
    });
  }, []);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'psychology' | 'playbook'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'ALL',
    symbol: 'ALL',
    session: 'ALL',
    strategy: 'ALL',
    mistake: 'ALL',
    emotion: 'ALL',
    direction: 'ALL',
    outcome: 'ALL',
    account: 'ALL',
    searchQuery: ''
  });

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Modals state
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMT5SyncModalOpen, setIsMT5SyncModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [liveSyncToast, setLiveSyncToast] = useState<string | null>(null);

  // Auto-sync polling: Fetches real trades and live account status from MT5
  useEffect(() => {
    const checkLiveSync = async () => {
      try {
        // 1. Check synced trades
        const resTrades = await fetch('/api/webhook/trade');
        if (resTrades.ok) {
          const syncedTrades: Trade[] = await resTrades.json();
          if (Array.isArray(syncedTrades)) {
            setTrades(current => {
              let changed = false;
              // Clean current of any corrupted mock/demo items
              const cleanedCurrent = current.filter(t => 
                t && t.id && 
                !t.id.startsWith('trd-') && 
                String(t.accountLogin) !== '160096169' && 
                !String(t.id).startsWith('mt5-160096169') &&
                (String(t.accountLogin) === '276133463' || (t.ticket && String(t.ticket).length >= 5))
              );
              let merged = [...cleanedCurrent];

              syncedTrades.forEach(st => {
                if (String(st.accountLogin) === '160096169' || String(st.id).startsWith('mt5-160096169')) return;
                const stTicket = st.ticket ? String(st.ticket).trim() : null;
                const stId = st.id ? String(st.id).trim() : null;

                const idx = merged.findIndex(t => 
                  (stTicket && t.ticket && String(t.ticket).trim() === stTicket) || 
                  (stId && t.id && String(t.id).trim() === stId)
                );

                if (idx >= 0) {
                  const existing = merged[idx];
                  const updated: Trade = {
                    ...st,
                    ...existing,
                    openPrice: st.openPrice || existing.openPrice,
                    closePrice: st.closePrice || existing.closePrice,
                    netProfit: st.netProfit !== undefined ? st.netProfit : existing.netProfit,
                    nativeNetProfit: st.nativeNetProfit !== undefined ? st.nativeNetProfit : existing.nativeNetProfit,
                    lotSize: st.lotSize || existing.lotSize,
                    pips: st.pips || existing.pips,
                    commission: st.commission !== undefined ? st.commission : existing.commission,
                    swap: st.swap !== undefined ? st.swap : existing.swap,
                    closeTime: st.closeTime || existing.closeTime,
                    accountLogin: st.accountLogin || existing.accountLogin,
                    accountServer: st.accountServer || existing.accountServer,
                    accountCurrency: st.accountCurrency || existing.accountCurrency,
                    isCent: st.isCent !== undefined ? st.isCent : existing.isCent,
                    // Retain user edits:
                    mistakes: (existing.mistakes && existing.mistakes.length > 0) ? existing.mistakes : (st.mistakes || []),
                    notes: existing.notes && !existing.notes.startsWith('Auto-synced') ? existing.notes : (st.notes || existing.notes),
                    rating: existing.rating || st.rating,
                    emotions: existing.emotions || st.emotions || 'Disciplined',
                    strategy: existing.strategy && existing.strategy !== 'HyperTrade MT5 Auto Sync' ? existing.strategy : (st.strategy || existing.strategy),
                    confluences: (existing.confluences && existing.confluences.length > 0) ? existing.confluences : (st.confluences || []),
                    beforeChartUrl: existing.beforeChartUrl || st.beforeChartUrl,
                    afterChartUrl: existing.afterChartUrl || st.afterChartUrl
                  };

                  if (JSON.stringify(merged[idx]) !== JSON.stringify(updated)) {
                    merged[idx] = updated;
                    changed = true;
                  }
                } else {
                  merged.unshift(st);
                  changed = true;
                  setLiveSyncToast(`Auto-synced trade #${st.ticket || st.symbol} (${st.netProfit >= 0 ? '+' : ''}$${st.netProfit.toFixed(2)}) from MT5!`);
                  setTimeout(() => setLiveSyncToast(null), 5000);
                }
              });

              const deduped = deduplicateTrades(merged);
              if (deduped.length !== current.length || changed) {
                saveTrades(deduped);
                return deduped;
              }
              return current;
            });
          }
        }

        // 2. Check live multi-account status & open positions
        const resStatus = await fetch('/api/webhook/status');
        if (resStatus.ok) {
          const statusData = await resStatus.json();
          if (statusData.accounts && typeof statusData.accounts === 'object') {
            setAccountsMap(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(statusData.accounts)) {
                return statusData.accounts;
              }
              return prev;
            });
          }
          if (statusData.account) {
            setAccountStatus(prev => {
              if (
                !prev ||
                prev.login !== statusData.account.login ||
                prev.balance !== statusData.account.balance ||
                prev.equity !== statusData.account.equity ||
                prev.server !== statusData.account.server
              ) {
                return statusData.account;
              }
              return prev;
            });
          }
          if (Array.isArray(statusData.openPositions)) {
            setOpenPositions(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(statusData.openPositions)) {
                return statusData.openPositions;
              }
              return prev;
            });
          }
        }
      } catch {
        // Offline or dev server restart
      }
    };

    checkLiveSync();
    const interval = setInterval(checkLiveSync, 2500);
    return () => clearInterval(interval);
  }, []);

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setTradeToEdit(null);
        setIsManualModalOpen(true);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setIsImportModalOpen(true);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsMT5SyncModalOpen(true);
      } else if (e.key === '1') {
        setActiveTab('dashboard');
      } else if (e.key === '2') {
        setActiveTab('trades');
      } else if (e.key === '3') {
        setActiveTab('psychology');
      } else if (e.key === '4') {
        setActiveTab('playbook');
      } else if (e.key === 'Escape') {
        setSelectedTradeForDetail(null);
        setTradeToEdit(null);
        setIsManualModalOpen(false);
        setIsImportModalOpen(false);
        setIsMT5SyncModalOpen(false);
        setIsSettingsModalOpen(false);
        setIsShortcutsModalOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save changes to localStorage when updated
  const updateTradesState = (newTrades: Trade[]) => {
    setTrades(newTrades);
    saveTrades(newTrades);
  };

  const handleClearAllTrades = async () => {
    if (confirm('Are you sure you want to clear all trades? This will reset the journal to 0 trades.')) {
      clearAllTrades();
      setTrades([]);
      try {
        await fetch('/api/sync/clear', { method: 'POST' });
      } catch {}
      setLiveSyncToast('All trades cleared. Journal is ready for real trades.');
      setTimeout(() => setLiveSyncToast(null), 4000);
    }
  };

  const updatePlaybookState = (newPlaybook: PlaybookSetup[]) => {
    setPlaybook(newPlaybook);
    savePlaybook(newPlaybook);
  };

  const updateSettingsState = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Filtered symbols list for filter bar
  const availableSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      if (t?.symbol) set.add(normalizeSymbol(t.symbol));
    });
    return Array.from(set);
  }, [trades]);

  // Multi-Account Active List
  const accountsList = useMemo(() => {
    const list = Object.values(accountsMap);
    if (list.length === 0 && accountStatus) {
      return [accountStatus];
    }
    return list;
  }, [accountsMap, accountStatus]);

  const activeAccountLogins = useMemo(() => {
    const active = accountsList.filter(a => a.status !== 'archived');
    return new Set(active.map(a => String(a.login)));
  }, [accountsList]);

  // Main Trade Filter Engine
  const filteredTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    return trades.filter(t => {
      if (!t) return false;
      const cTime = t.closeTime || t.openTime || new Date().toISOString();

      // Account Filter (Individual Account or All Combined Active)
      const activeAccount = filters.account || selectedAccount;
      if (activeAccount && activeAccount !== 'ALL') {
        const tradeAccount = t.accountLogin || '276133463';
        if (String(tradeAccount) !== String(activeAccount)) {
          return false;
        }
      } else {
        // If ALL is selected, only show trades belonging to active (non-archived) accounts
        const tradeAccount = String(t.accountLogin || '276133463');
        if (activeAccountLogins.size > 0 && !activeAccountLogins.has(tradeAccount)) {
          return false;
        }
      }

      // Date Range Filter
      if (filters.dateRange !== 'ALL') {
        const tradeDate = new Date(cTime);
        const now = new Date();
        
        if (filters.dateRange === 'TODAY') {
          if (tradeDate.toDateString() !== now.toDateString()) return false;
        } else if (filters.dateRange === 'THIS_WEEK') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          if (tradeDate < startOfWeek) return false;
        } else if (filters.dateRange === 'THIS_MONTH') {
          if (tradeDate.getMonth() !== now.getMonth() || tradeDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filters.dateRange === 'LAST_MONTH') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (tradeDate.getMonth() !== lastMonth.getMonth() || tradeDate.getFullYear() !== lastMonth.getFullYear()) return false;
        }
      }

      // Calendar Heatmap Day Selection
      if (selectedCalendarDate) {
        const tDate = cTime.includes('T') ? cTime.split('T')[0] : cTime.slice(0, 10);
        if (tDate !== selectedCalendarDate) return false;
      }

      // Symbol
      if (filters.symbol !== 'ALL') {
        const norm = normalizeSymbol(t.symbol || '');
        if (filters.symbol === 'XAUUSD' && norm !== 'XAUUSD') return false;
        if (filters.symbol === 'FOREX' && norm === 'XAUUSD') return false;
        if (filters.symbol !== 'XAUUSD' && filters.symbol !== 'FOREX' && norm !== filters.symbol) return false;
      }

      // Session
      if (filters.session !== 'ALL' && t.session !== filters.session) return false;

      // Strategy
      if (filters.strategy !== 'ALL' && t.strategy !== filters.strategy) return false;

      // Mistake
      if (filters.mistake !== 'ALL') {
        const mList = Array.isArray(t.mistakes) ? t.mistakes : [];
        if (filters.mistake === 'NONE') {
          if (mList.length > 0) return false;
        } else {
          if (!mList.includes(filters.mistake)) return false;
        }
      }

      // Outcome
      if (filters.outcome !== 'ALL') {
        const profit = t.netProfit || 0;
        if (filters.outcome === 'WIN' && profit <= 0.5) return false;
        if (filters.outcome === 'LOSS' && profit >= -0.5) return false;
        if (filters.outcome === 'BREAK_EVEN' && (profit > 0.5 || profit < -0.5)) return false;
      }

      // Search Query
      if (filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const matchSymbol = (t.symbol || '').toLowerCase().includes(q);
        const matchTicket = (t.ticket || '').toLowerCase().includes(q);
        const matchStrategy = (t.strategy || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchSymbol && !matchTicket && !matchStrategy && !matchNotes) return false;
      }

      return true;
    });
  }, [trades, filters, selectedAccount, selectedCalendarDate, activeAccountLogins]);

  // Open Positions filtered by selected account
  const filteredOpenPositions = useMemo(() => {
    const activeAccount = filters.account || selectedAccount;
    if (activeAccount === 'ALL') return openPositions;
    return openPositions.filter(p => String(p.accountLogin || '276133463') === String(activeAccount));
  }, [openPositions, filters.account, selectedAccount]);

  // Active account trades for equity and profit computation
  const activeAccountTrades = useMemo(() => {
    const activeAccount = filters.account || selectedAccount;
    if (activeAccount && activeAccount !== 'ALL') {
      return trades.filter(t => String(t.accountLogin || '276133463') === String(activeAccount));
    }
    return trades.filter(t => {
      const tradeAccount = String(t.accountLogin || '276133463');
      return activeAccountLogins.size === 0 || activeAccountLogins.has(tradeAccount);
    });
  }, [trades, filters.account, selectedAccount, activeAccountLogins]);

  // Overall Net Profit for selected account (or all accounts combined)
  const overallNetProfit = useMemo(() => {
    if (!Array.isArray(activeAccountTrades)) return 0;
    return activeAccountTrades.reduce((sum, t) => sum + (t?.netProfit || 0), 0);
  }, [activeAccountTrades]);

  const startingCapital = useMemo(() => {
    const activeAccount = filters.account || selectedAccount;
    if (activeAccount === 'ALL') {
      if (accountsList.length > 0) {
        const totalBalanceUSD = accountsList.reduce((sum, a) => {
          const balUSD = a.usdBalance !== undefined 
            ? a.usdBalance 
            : ((a.isCent || a.currency === 'USC') ? (a.balance / 100) : a.balance);
          return sum + (balUSD || 0);
        }, 0);
        return Math.max(0, Number((totalBalanceUSD - overallNetProfit).toFixed(2)));
      }
      if (accountStatus?.balance) {
        const balUSD = (accountStatus.isCent || accountStatus.currency === 'USC') ? (accountStatus.balance / 100) : accountStatus.balance;
        return Math.max(0, Number((balUSD - overallNetProfit).toFixed(2)));
      }
      return settings?.initialBalance || 200;
    } else {
      const targetAcc = accountsList.find(a => String(a.login) === String(activeAccount)) || accountStatus;
      if (targetAcc?.balance) {
        const isCent = targetAcc.isCent || targetAcc.currency === 'USC';
        const balUSD = isCent ? (targetAcc.balance / 100) : targetAcc.balance;
        return Math.max(0, Number((balUSD - overallNetProfit).toFixed(2)));
      }
      return settings?.initialBalance || 200;
    }
  }, [filters.account, selectedAccount, accountsList, accountStatus, overallNetProfit, settings?.initialBalance]);

  // Overall KPI Stats
  const kpiStats = useMemo(() => {
    return calculateKPIStats(filteredTrades, startingCapital);
  }, [filteredTrades, startingCapital]);

  // Trade Actions
  const handleSaveTrade = (savedTrade: Trade) => {
    const savedTicket = savedTrade.ticket ? String(savedTrade.ticket).trim() : null;
    const savedId = savedTrade.id ? String(savedTrade.id).trim() : null;

    const index = trades.findIndex(t => 
      (savedTicket && t.ticket && String(t.ticket).trim() === savedTicket) || 
      (savedId && t.id && String(t.id).trim() === savedId)
    );

    let next: Trade[];
    if (index >= 0) {
      next = [...trades];
      next[index] = { ...next[index], ...savedTrade };
    } else {
      next = [savedTrade, ...trades];
    }

    const cleanDeduped = deduplicateTrades(next);
    updateTradesState(cleanDeduped);

    // Asynchronously persist update to backend
    fetch('/api/webhook/trade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedTrade)
    }).catch(() => {});
  };

  const handleDeleteTrade = (tradeId: string) => {
    updateTradesState(trades.filter(t => t.id !== tradeId));
    if (selectedTradeForDetail?.id === tradeId) setSelectedTradeForDetail(null);
  };

  const handleConfirmCSVImport = (importedTrades: Trade[], replaceExisting: boolean) => {
    if (replaceExisting) {
      updateTradesState(importedTrades);
    } else {
      updateTradesState([...importedTrades, ...trades]);
    }
  };

  const handleAddPlaybookSetup = (setup: PlaybookSetup) => {
    updatePlaybookState([setup, ...playbook]);
  };

  const handleDeletePlaybookSetup = (id: string) => {
    updatePlaybookState(playbook.filter(p => p.id !== id));
  };

  const handleResetToSample = () => {
    const res = resetToSampleData();
    setTrades(res.trades);
    setPlaybook(res.playbook);
    setSettings(res.settings);
  };

  const handleToggleAccountStatus = async (login: string, action: 'connect' | 'disconnect') => {
    try {
      const res = await fetch('/api/account/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, action })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          setAccountsMap(data.accounts);
        }
      }
    } catch {}

    setAccountsMap(prev => {
      const copy = { ...prev };
      if (copy[login]) {
        copy[login] = {
          ...copy[login],
          status: action === 'disconnect' ? 'disconnected' : 'connected',
          ...(action === 'disconnect' ? { disconnectedAt: new Date().toISOString() } : {})
        };
      }
      return copy;
    });

    if (action === 'disconnect') {
      setLiveSyncToast(`Account #${login} disconnected. All trade history remains saved safely in vault!`);
    } else {
      setLiveSyncToast(`Account #${login} reconnected to live auto sync!`);
    }
    setTimeout(() => setLiveSyncToast(null), 4500);
  };

  const handleRemoveAccount = async (login: string, type: 'soft' | 'hard') => {
    try {
      const res = await fetch('/api/account/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, type })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          setAccountsMap(data.accounts);
        }
      }
    } catch {}

    setAccountsMap(prev => {
      const copy = { ...prev };
      delete copy[login];
      return copy;
    });

    if (selectedAccount === login) {
      setSelectedAccount('ALL');
      setFilters(prev => ({ ...prev, account: 'ALL' }));
    }

    if (type === 'hard') {
      const filtered = trades.filter(t => String(t.accountLogin) !== String(login));
      updateTradesState(filtered);
      setLiveSyncToast(`Account #${login} permanently removed and all its trades wiped.`);
    } else {
      setLiveSyncToast(`Account #${login} removed from list. Trade history safely preserved in vault!`);
    }
    setTimeout(() => setLiveSyncToast(null), 4500);
  };

  const handleAddOrRestoreAccount = async (login: string, server?: string, currency?: string, isCent?: boolean) => {
    try {
      const res = await fetch('/api/account/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, server, currency, isCent })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          setAccountsMap(data.accounts);
        }
        if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
          updateTradesState(data.trades);
        }
      }
    } catch {}

    setAccountsMap(prev => ({
      ...prev,
      [login]: {
        login,
        server: server || prev[login]?.server || 'Exness-MT5Real26',
        balance: prev[login]?.balance || 0,
        equity: prev[login]?.equity || 0,
        margin: prev[login]?.margin || 0,
        freeMargin: prev[login]?.freeMargin || 0,
        currency: currency || prev[login]?.currency || 'USD',
        isCent: isCent !== undefined ? isCent : (prev[login]?.isCent || false),
        status: 'connected',
        lastUpdate: new Date().toISOString()
      }
    }));

    setSelectedAccount(login);
    setFilters(prev => ({ ...prev, account: login }));
    setLiveSyncToast(`Account #${login} connected & restored to live auto sync!`);
    setTimeout(() => setLiveSyncToast(null), 4500);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      
      {/* Live Sync Toast Banner */}
      {liveSyncToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl animate-bounce text-xs font-bold">
          <Zap className="w-4 h-4 fill-white" />
          <span>{liveSyncToast}</span>
        </div>
      )}

      {/* Desktop Vertical Sidepanel */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          settings={settings}
          netProfit={overallNetProfit}
          openManualModal={() => {
            setTradeToEdit(null);
            setIsManualModalOpen(true);
          }}
          openImportModal={() => setIsImportModalOpen(true)}
          openMT5SyncModal={() => setIsMT5SyncModalOpen(true)}
          openSettingsModal={() => setIsSettingsModalOpen(true)}
          openShortcutsModal={() => setIsShortcutsModalOpen(true)}
          onExportJSON={() => exportBackupJSON(trades, playbook, settings)}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          accountStatus={accountStatus}
          accounts={accountsList}
          selectedAccount={selectedAccount}
        />
      </div>

      {/* Mobile Slide-over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-[var(--bg-canvas)] flex flex-col">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileMenuOpen(false);
              }}
              settings={settings}
              netProfit={overallNetProfit}
              openManualModal={() => {
                setTradeToEdit(null);
                setIsManualModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openImportModal={() => {
                setIsImportModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openMT5SyncModal={() => {
                setIsMT5SyncModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openSettingsModal={() => {
                setIsSettingsModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openShortcutsModal={() => {
                setIsShortcutsModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onExportJSON={() => exportBackupJSON(trades, playbook, settings)}
              isCollapsed={false}
              setIsCollapsed={() => {}}
              accountStatus={accountStatus}
              accounts={accountsList}
              selectedAccount={selectedAccount}
            />
          </div>
        </div>
      )}

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Navbar */}
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openMobileMenu={() => setIsMobileMenuOpen(true)}
          openManualModal={() => {
            setTradeToEdit(null);
            setIsManualModalOpen(true);
          }}
          openImportModal={() => setIsImportModalOpen(true)}
          openMT5SyncModal={() => setIsMT5SyncModalOpen(true)}
          settings={settings}
          netProfit={overallNetProfit}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          accountStatus={accountStatus}
          accounts={accountsList}
          selectedAccount={selectedAccount}
          onSelectAccount={(accId) => {
            setSelectedAccount(accId);
            setFilters(prev => ({ ...prev, account: accId }));
          }}
          onToggleAccountStatus={handleToggleAccountStatus}
          onRemoveAccount={handleRemoveAccount}
          onAddAccount={handleAddOrRestoreAccount}
          currentZoom={currentZoom}
          onZoomChange={setCurrentZoom}
        />

        {/* Main Workspace Canvas */}
        <main className="flex-1 max-w-[1680px] 2xl:max-w-[1800px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Global Filter Bar */}
          <FilterBar
            filters={filters}
            setFilters={(updater) => {
              setFilters(prev => {
                const next = typeof updater === 'function' ? updater(prev) : updater;
                if (next.account && next.account !== selectedAccount) {
                  setSelectedAccount(next.account);
                }
                return next;
              });
            }}
            settings={settings}
            symbols={availableSymbols}
            totalMatches={filteredTrades.length}
            accounts={accountsList}
          />

          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <KPIOverview stats={kpiStats} />
              <EquityCurveChart trades={filteredTrades} initialBalance={startingCapital} />
              <CalendarHeatmap
                trades={trades}
                selectedDate={selectedCalendarDate}
                onSelectDate={setSelectedCalendarDate}
              />
              <PairAndSessionCharts trades={filteredTrades} />
              <MistakeBreakdownChart trades={filteredTrades} />
              <StrategyBreakdown trades={filteredTrades} />
            </div>
          )}

          {/* TAB 2: TRADE LOG TABLE */}
          {activeTab === 'trades' && (
            <div className="animate-fadeIn space-y-6">
              <KPIOverview stats={kpiStats} />
              <TradeTable
                trades={filteredTrades}
                openPositions={filteredOpenPositions}
                selectedAccount={selectedAccount}
                onViewTrade={(trade) => setSelectedTradeForDetail(trade)}
                onEditTrade={(trade) => {
                  setTradeToEdit(trade);
                  setIsManualModalOpen(true);
                }}
                onDeleteTrade={handleDeleteTrade}
                onExportSelected={(selectedList) => exportTradesCSV(selectedList)}
                onOpenMT5Sync={() => setIsMT5SyncModalOpen(true)}
                onOpenImport={() => setIsImportModalOpen(true)}
                onOpenManual={() => {
                  setTradeToEdit(null);
                  setIsManualModalOpen(true);
                }}
                onClearAllTrades={handleClearAllTrades}
              />
            </div>
          )}

          {/* TAB 3: PSYCHOLOGY ENGINE */}
          {activeTab === 'psychology' && (
            <div className="animate-fadeIn">
              <PsychologyDashboard trades={filteredTrades} />
            </div>
          )}

          {/* TAB 4: PLAYBOOK SETUPS */}
          {activeTab === 'playbook' && (
            <div className="animate-fadeIn">
              <PlaybookView
                playbook={playbook}
                trades={trades}
                onAddSetup={handleAddPlaybookSetup}
                onDeleteSetup={handleDeletePlaybookSetup}
              />
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      <TradeDetailModal
        trade={selectedTradeForDetail}
        onClose={() => setSelectedTradeForDetail(null)}
        onUpdateTrade={handleSaveTrade}
      />

      <ManualTradeModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setTradeToEdit(null);
        }}
        onSaveTrade={handleSaveTrade}
        settings={settings}
        tradeToEdit={tradeToEdit}
      />

      <CSVImporterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmCSVImport}
      />

      <MT5SyncModal
        isOpen={isMT5SyncModalOpen}
        onClose={() => setIsMT5SyncModalOpen(false)}
        onSyncNewTrades={(newTrades) => {
          updateTradesState(newTrades);
        }}
        accountStatus={accountStatus}
        accounts={accountsList}
        onClearAll={handleClearAllTrades}
        onToggleAccountStatus={handleToggleAccountStatus}
        onRemoveAccount={handleRemoveAccount}
        onAddAccount={handleAddOrRestoreAccount}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettingsState}
        onResetToSample={handleResetToSample}
        onExportJSON={() => exportBackupJSON(trades, playbook, settings)}
        onExportCSV={() => exportTradesCSV(trades)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

    </div>
  );
}
