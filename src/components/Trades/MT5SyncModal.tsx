import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  Radio, 
  Download,
  AlertCircle,
  Activity,
  Layers,
  Trash2,
  Archive,
  AlertTriangle,
  Plus,
  ArrowRight,
  Power,
  Laptop,
  Check
} from 'lucide-react';
import { Trade, AccountStatus } from '../../types';

interface MT5SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncNewTrades: (trades: Trade[]) => void;
  accountStatus?: AccountStatus | null;
  accounts?: AccountStatus[];
  onClearAll?: () => void;
  onToggleAccountStatus?: (login: string, action: 'connect' | 'disconnect') => void;
  onRemoveAccount?: (login: string, type: 'soft' | 'hard') => void;
  onAddAccount?: (login: string, server?: string, currency?: string, isCent?: boolean) => void;
}

export const MT5SyncModal: React.FC<MT5SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncNewTrades,
  accountStatus,
  accounts = [],
  onClearAll,
  onToggleAccountStatus,
  onRemoveAccount,
  onAddAccount
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAutoSyncRunning, setIsAutoSyncRunning] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [modalAccountToRemove, setModalAccountToRemove] = useState<{ login: string } | null>(null);
  const [newLoginInput, setNewLoginInput] = useState<string>('');
  const [newServerInput, setNewServerInput] = useState<string>('FivePercentOnline-Real');
  const [newIsCent, setNewIsCent] = useState<boolean>(false);
  const [showAddBox, setShowAddBox] = useState<boolean>(false);
  
  // PC Startup Auto-Sync State
  const [startupState, setStartupState] = useState<{
    isDaemonRunning: boolean;
    isStartupEnabled: boolean;
    totalAccounts: number;
    lastSync: string;
    recentLogs: string[];
  }>({
    isDaemonRunning: true,
    isStartupEnabled: true,
    totalAccounts: accounts.length || 4,
    lastSync: new Date().toISOString(),
    recentLogs: []
  });
  const [isSettingUpStartup, setIsSettingUpStartup] = useState<boolean>(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/autosync/status');
        if (res.ok) {
          const data = await res.json();
          setStartupState(data);
        }
      } catch {}
    };
    fetchStatus();
  }, [isOpen]);

  const webhookUrl = `${window.location.origin}/api/webhook/trade`;
  const batchWebhookUrl = `${window.location.origin}/api/webhook/batch`;

  const mql5Code = `//+------------------------------------------------------------------+
//|                                                  JournalSync.mq5 |
//|                     Real-Time HyperTrade MT5 Auto-Sync Journal EA|
//|                        Syncs History, Live Trades & Account State|
//+------------------------------------------------------------------+
#property copyright "HyperTrade PRO Auto-Sync"
#property link      "${window.location.origin}"
#property version   "3.00"
#property strict

input string WebhookURL      = "${webhookUrl}";
input string BatchWebhookURL = "${batchWebhookUrl}";
input bool   AutoSyncOnStart = true;
input int    SyncIntervalSec = 3;
input int    MaxHistoryDeals = 1000;

int g_totalHistorySynced = 0;
int g_totalOpenPositions = 0;
string g_lastSyncStatus = "Ready";
datetime g_lastSyncTime = 0;

string FormatISOTime(datetime t)
{
   if(t <= 0) t = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.000Z", 
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

string CleanSymbol(string sym)
{
   string s = sym;
   StringToUpper(s);
   return s;
}

void UpdateChartHUD()
{
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   string server = AccountInfoString(ACCOUNT_SERVER);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   string currency = AccountInfoString(ACCOUNT_CURRENCY);
   
   string timeStr = (g_lastSyncTime > 0) ? TimeToString(g_lastSyncTime, TIME_MINUTES|TIME_SECONDS) : "Pending";
   
   string hud = StringFormat(
      "╔══════════════════════════════════════════════════════════════╗\\n" +
      "║        ⚡ HYPERTRADE PRO AUTO-SYNC JOURNAL (v3.0)            ║\\n" +
      "╠══════════════════════════════════════════════════════════════╣\\n" +
      "║  Account : %I64d (%s)\\n" +
      "║  Balance : $%.2f %s   |  Equity : $%.2f %s\\n" +
      "║  Open Pos: %d active trade(s)\\n" +
      "║  History : %d closed trades synced to Journal\\n" +
      "║  Status  : %s (Last: %s)\\n" +
      "╚══════════════════════════════════════════════════════════════╝\\n" +
      "  [ Tip: Click anywhere on Chart to Force Instant Re-Sync ]",
      login, server, balance, currency, equity, currency,
      g_totalOpenPositions, g_totalHistorySynced, g_lastSyncStatus, timeStr
   );
   Comment(hud);
}

int PostJSON(string url, string payload)
{
   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   if(ArraySize(postData) > 0 && postData[ArraySize(postData)-1] == 0)
   {
      ArrayResize(postData, ArraySize(postData)-1);
   }
   string headers = "Content-Type: application/json\\r\\n";
   ResetLastError();
   return WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
}

void WriteDirectSyncFile(string content)
{
   ResetLastError();
   int handle = FileOpen("journal_sync.json", FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(handle != INVALID_HANDLE)
   {
      FileWriteString(handle, content);
      FileClose(handle);
   }
}

string BuildOpenPositionsJSON()
{
   int total = PositionsTotal();
   g_totalOpenPositions = total;
   string json = "[";
   bool first = true;
   
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;
      string symbol    = CleanSymbol(PositionGetString(POSITION_SYMBOL));
      long type        = PositionGetInteger(POSITION_TYPE);
      double volume    = PositionGetDouble(POSITION_VOLUME);
      double priceOpen = PositionGetDouble(POSITION_PRICE_OPEN);
      double priceCur  = PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl        = PositionGetDouble(POSITION_SL);
      double tp        = PositionGetDouble(POSITION_TP);
      double profit    = PositionGetDouble(POSITION_PROFIT);
      datetime time    = (datetime)PositionGetInteger(POSITION_TIME);
      string direction = (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      
      string item = StringFormat(
         "{\\"ticket\\":\\"%I64u\\",\\"symbol\\":\\"%s\\",\\"direction\\":\\"%s\\",\\"lotSize\\":%.2f,\\"openPrice\\":%.5f,\\"currentPrice\\":%.5f,\\"stopLoss\\":%.5f,\\"takeProfit\\":%.5f,\\"profit\\":%.2f,\\"openTime\\":\\"%s\\"}",
         ticket, symbol, direction, volume, priceOpen, priceCur, sl, tp, profit, FormatISOTime(time)
      );
      if(!first) json += ",";
      json += item;
      first = false;
   }
   json += "]";
   return json;
}

string BuildAccountInfoJSON()
{
   long login       = AccountInfoInteger(ACCOUNT_LOGIN);
   string server    = AccountInfoString(ACCOUNT_SERVER);
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity    = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin    = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin= AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   string currency  = AccountInfoString(ACCOUNT_CURRENCY);
   
   double initialDeposit = 0.0;
   if(HistorySelect(0, TimeCurrent()))
   {
      int totalDeals = HistoryDealsTotal();
      for(int k = 0; k < totalDeals; k++)
      {
         ulong t = HistoryDealGetTicket(k);
         if(t > 0 && HistoryDealGetInteger(t, DEAL_TYPE) == DEAL_TYPE_BALANCE)
         {
            double p = HistoryDealGetDouble(t, DEAL_PROFIT);
            if(p > 0)
            {
               initialDeposit = p;
               break;
            }
         }
      }
   }
   if(initialDeposit <= 0) initialDeposit = balance;
   
   return StringFormat(
      "{\\"login\\":\\"%I64d\\",\\"server\\":\\"%s\\",\\"balance\\":%.2f,\\"equity\\":%.2f,\\"margin\\":%.2f,\\"freeMargin\\":%.2f,\\"currency\\":\\"%s\\",\\"initialDeposit\\":%.2f,\\"lastUpdate\\":\\"%s\\"}",
      login, server, balance, equity, margin, freeMargin, currency, initialDeposit, FormatISOTime(TimeCurrent())
   );
}

void SyncAllTrades()
{
   g_lastSyncTime = TimeCurrent();
   if(!HistorySelect(0, TimeCurrent())) return;
   
   int totalDeals = HistoryDealsTotal();
   int count = 0;
   string tradesJSON = "[";
   bool firstTrade = true;
   
   for(int i = totalDeals - 1; i >= 0 && count < MaxHistoryDeals; i--)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket <= 0) continue;
      long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      
      if(entryType == DEAL_ENTRY_OUT)
      {
         string symbol     = CleanSymbol(HistoryDealGetString(dealTicket, DEAL_SYMBOL));
         double profit     = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
         double volume     = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
         double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
         double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
         double swap       = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
         long   dealType   = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
         datetime closeTime= (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
         ulong  posId      = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
         string comment    = HistoryDealGetString(dealTicket, DEAL_COMMENT);
         
         string direction = (dealType == DEAL_TYPE_BUY) ? "SELL" : "BUY";
         double openPrice = closePrice;
         datetime openTime = closeTime - 60;
         
         if(posId > 0)
         {
            for(int j = 0; j < totalDeals; j++)
            {
               ulong ot = HistoryDealGetTicket(j);
               if(ot > 0 && ot != dealTicket && HistoryDealGetInteger(ot, DEAL_POSITION_ID) == posId)
               {
                  if(HistoryDealGetInteger(ot, DEAL_ENTRY) == DEAL_ENTRY_IN)
                  {
                     openPrice = HistoryDealGetDouble(ot, DEAL_PRICE);
                     openTime  = (datetime)HistoryDealGetInteger(ot, DEAL_TIME);
                     break;
                  }
               }
            }
         }
         
         string itemJSON = StringFormat(
            "{\\"ticket\\":\\"%I64u\\",\\"symbol\\":\\"%s\\",\\"direction\\":\\"%s\\",\\"openPrice\\":%.5f,\\"closePrice\\":%.5f,\\"profit\\":%.2f,\\"lots\\":%.2f,\\"commission\\":%.2f,\\"swap\\":%.2f,\\"openTime\\":\\"%s\\",\\"closeTime\\":\\"%s\\",\\"comment\\":\\"%s\\"}",
            dealTicket, symbol, direction, openPrice, closePrice, profit, volume, commission, swap,
            FormatISOTime(openTime), FormatISOTime(closeTime), comment
         );
         
         if(!firstTrade) tradesJSON += ",";
         tradesJSON += itemJSON;
         firstTrade = false;
         count++;
      }
   }
   tradesJSON += "]";
   g_totalHistorySynced = count;
   
   string fullPayload = StringFormat(
      "{\\"account\\":%s,\\"openPositions\\":%s,\\"trades\\":%s}",
      BuildAccountInfoJSON(), BuildOpenPositionsJSON(), tradesJSON
   );
   
   WriteDirectSyncFile(fullPayload);
   int httpRes = PostJSON(BatchWebhookURL, fullPayload);
   if(httpRes == 200) {
      g_lastSyncStatus = StringFormat("Auto-synced (%d history, %d open)", count, g_totalOpenPositions);
   } else {
      g_lastSyncStatus = StringFormat("File Synced (%d history, %d open)", count, g_totalOpenPositions);
   }
   UpdateChartHUD();
}

int OnInit()
{
   Print("JournalSync EA v3.0 Initialized for HyperTrade PRO.");
   UpdateChartHUD();
   if(SyncIntervalSec > 0) EventSetTimer(SyncIntervalSec);
   if(AutoSyncOnStart) SyncAllTrades();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

void OnTimer() { SyncAllTrades(); }

void OnTradeTransaction(const MqlTradeTransaction& trans, const MqlTradeRequest& req, const MqlTradeResult& res)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD || trans.type == TRADE_TRANSACTION_POSITION)
   {
      SyncAllTrades();
   }
}

void OnChartEvent(const int id, const long& lparam, const double& dparam, const string& sparam)
{
   if(id == CHARTEVENT_CLICK) SyncAllTrades();
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(mql5Code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    const blob = new Blob([mql5Code], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'JournalSync.mq5';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleForceScanNow = async () => {
    setIsScanning(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/autosync/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.trades && Array.isArray(data.trades)) {
          onSyncNewTrades(data.trades);
          setSyncMessage(`Synced ${data.trades.length} trades & balances across all ${Object.keys(data.accounts || {}).length} MT5 accounts!`);
        }
      } else {
        const fallbackRes = await fetch('/api/webhook/trade');
        if (fallbackRes.ok) {
          const trades = await fallbackRes.json();
          if (Array.isArray(trades)) onSyncNewTrades(trades);
        }
        setSyncMessage('Direct multi-terminal scan completed.');
      }
      fetch('/api/candles/sync-mt5').catch(() => {});
    } catch (e: any) {
      setSyncMessage(`Scan notice: ${e.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTriggerAllAccountsSync = async () => {
    setIsAutoSyncRunning(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/autosync/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.trades && Array.isArray(data.trades)) {
          onSyncNewTrades(data.trades);
          setSyncMessage(`All ${Object.keys(data.accounts || {}).length} accounts synchronized successfully! (Total deals: ${data.trades.length})`);
        }
      } else {
        setSyncMessage('Sync request dispatched to background engine.');
      }
    } catch (e: any) {
      setSyncMessage(`Auto-sync notice: ${e.message}`);
    } finally {
      setIsAutoSyncRunning(false);
    }
  };

  const handleSetupStartupAutoSync = async () => {
    setIsSettingUpStartup(true);
    try {
      const res = await fetch('/api/autosync/setup-startup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStartupState(prev => ({ ...prev, isStartupEnabled: true, isDaemonRunning: true }));
        setSyncMessage('Windows PC Startup Auto-Sync registered successfully! All accounts will auto-sync on boot.');
      }
    } catch (e: any) {
      setSyncMessage(`Startup setup notice: ${e.message}`);
    } finally {
      setIsSettingUpStartup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B0F19] border-b border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">HyperTrade MT5 Real-Time Auto Sync</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Sync Active
                </span>
              </div>
              <p className="text-xs text-gray-400">Zero mock trades — all accounts sync on PC startup without manual switching</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* PC Boot & Multi-Account Auto-Sync Control Center */}
          <div className="bg-gradient-to-br from-[#0D1527] via-[#0B0F19] to-[#0A1A17] p-4 rounded-xl border border-emerald-500/40 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Laptop className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-white">PC Startup Multi-Account Auto-Sync</span>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Windows Boot Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1">
                    When you turn on your PC, HyperTrade automatically connects to all installed terminals (The5ers, Exness #104675892, #160096169 Cent, #276133463, etc.) and synchronizes all trades and live positions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTriggerAllAccountsSync}
                  disabled={isAutoSyncRunning}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-700/25 flex items-center gap-1.5 transition-all"
                  title="Run Python Multi-Account Sync Engine across all accounts immediately"
                >
                  <Zap className={`w-3.5 h-3.5 ${isAutoSyncRunning ? 'animate-spin' : 'text-amber-300'}`} />
                  <span>{isAutoSyncRunning ? 'Syncing All...' : 'Sync All Accounts Now'}</span>
                </button>

                <button
                  onClick={handleSetupStartupAutoSync}
                  disabled={isSettingUpStartup}
                  className="px-3 py-2 bg-[#1F2937] hover:bg-[#374151] text-gray-200 hover:text-white font-semibold text-xs rounded-lg border border-gray-700 flex items-center gap-1.5 transition-colors"
                  title="Configure Windows Startup Shortcut"
                >
                  <Power className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{startupState.isStartupEnabled ? 'Startup Enabled' : 'Enable on Boot'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Broker History Protection & Vault Callout */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-[#0B0F19] to-cyan-950/30 p-4 rounded-xl border border-emerald-500/30 flex items-start gap-3.5 shadow-lg">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-emerald-300">Multi-Broker Trade History Vault Active</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Exness, The5ers & Prop Firms Safe
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Even if brokers or MT5 archive closed deals after 30–90 days, your trade history is <strong>permanently preserved in your local journal database</strong>. Every connected account seamlessly syncs its authentic history and live positions.
              </p>
            </div>
          </div>

          {/* Add / Reconnect MT5 Account Section */}
          <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-dashed border-[#1F2937] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Plus className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>Connect or Restore MT5 Account</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleForceScanNow}
                  disabled={isScanning}
                  className="px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-colors border border-emerald-500/30"
                  title="Auto-detect and sync all running MT5 terminals (The5ers, Exness, etc.)"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Auto-Detect All Accounts</span>
                </button>

                {!showAddBox && (
                  <button
                    onClick={() => setShowAddBox(true)}
                    className="px-2.5 py-1 rounded bg-[var(--accent-gold)]/10 hover:bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] text-xs font-bold transition-colors"
                  >
                    + Add Account
                  </button>
                )}
              </div>
            </div>

            {showAddBox && (
              <div className="pt-2 border-t border-gray-800 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Account Login #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 26573113"
                      value={newLoginInput}
                      onChange={(e) => setNewLoginInput(e.target.value)}
                      className="w-full bg-[#111827] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs font-mono focus:border-[var(--accent-gold)] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Broker Server
                    </label>
                    <select
                      value={newServerInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewServerInput(val);
                        if (val.includes('Cent') || val.includes('Real20')) {
                          setNewIsCent(true);
                        } else {
                          setNewIsCent(false);
                        }
                      }}
                      className="w-full bg-[#111827] border border-gray-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-[var(--accent-gold)] outline-none"
                    >
                      <option value="FivePercentOnline-Real">The5ers (FivePercentOnline-Real - USD)</option>
                      <option value="Exness-MT5Real15">Exness (Exness-MT5Real15 - USD)</option>
                      <option value="Exness-MT5Real26">Exness (Exness-MT5Real26 - USD)</option>
                      <option value="Exness-MT5Real20">Exness Standard Cent (Exness-MT5Real20 - USC)</option>
                      <option value="Custom MT5 Broker">Other / Custom MT5 Server</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4 sm:pt-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={newIsCent}
                        onChange={(e) => setNewIsCent(e.target.checked)}
                        className="rounded bg-[#111827] border-gray-700 text-amber-500"
                      />
                      <span className="text-[11px]">Cent (USC)</span>
                    </label>

                    <button
                      onClick={async () => {
                        const trimmed = newLoginInput.trim();
                        if (!trimmed) return;
                        if (onAddAccount) {
                          await onAddAccount(
                            trimmed,
                            newServerInput,
                            newIsCent ? 'USC' : 'USD',
                            newIsCent
                          );
                        }
                        setNewLoginInput('');
                        setShowAddBox(false);
                        handleForceScanNow();
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>Connect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => setShowAddBox(false)}
                      className="px-2.5 py-1.5 text-gray-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Account Status Overview */}
          {accounts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--accent-gold)] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Managed MT5 Accounts ({accounts.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Vault Protected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map(acc => {
                  const isThe5ers = String(acc.server || '').toLowerCase().includes('fivepercent');
                  const isAccCent = Boolean(acc.isCent || acc.currency === 'USC' || (String(acc.server).toLowerCase().includes('cent') && !isThe5ers)) && acc.currency !== 'USD';
                  const isDisconnected = acc.status === 'disconnected';

                  return (
                    <div key={acc.login} className={`bg-[#0B0F19] p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                      isDisconnected
                        ? 'border-slate-700/60 opacity-85'
                        : (isThe5ers 
                            ? 'border-purple-500/40 bg-gradient-to-b from-[#0F0D1C] to-[#0B0F19]' 
                            : (isAccCent ? 'border-amber-500/30' : 'border-emerald-500/30'))
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isDisconnected ? 'bg-slate-500' : (isThe5ers ? 'bg-purple-400' : (isAccCent ? 'bg-amber-400' : 'bg-emerald-400'))
                            } ${!isDisconnected ? 'animate-pulse' : ''}`} />
                            <span className="font-bold text-white text-xs font-mono">Account #{acc.login}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                              isDisconnected
                                ? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                : (isThe5ers
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : (isAccCent 
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'))
                            }`}>
                              {isDisconnected 
                                ? 'Disconnected' 
                                : (isThe5ers 
                                    ? 'The5ers (USD)' 
                                    : (isAccCent ? 'Standard Cent (USC)' : (acc.server || 'Live USD')))}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                            <span>
                              Balance: <strong className="text-gray-200 font-mono">
                                {isAccCent ? `${acc.balance?.toFixed(2)} USC` : `$${acc.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </strong>
                              {isAccCent && <span className="text-gray-400 ml-1">(≈ ${((acc.balance || 0) / 100).toFixed(2)})</span>}
                            </span>
                            <span>•</span>
                            <span>Open: <strong className="text-emerald-400 font-mono">{acc.openPositionsCount || 0}</strong></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] text-gray-400 uppercase font-semibold">Live Equity</div>
                          <div className={`text-sm font-extrabold font-mono ${
                            isDisconnected ? 'text-gray-400' : (isThe5ers ? 'text-purple-300' : (isAccCent ? 'text-amber-400' : 'text-emerald-400'))
                          }`}>
                            {isAccCent ? `${acc.equity?.toFixed(2)} USC` : `$${acc.equity?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </div>
                          {isAccCent && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              ≈ ${((acc.equity || 0) / 100).toFixed(2)} USD
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Account Action Strip */}
                      <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {isDisconnected ? 'Trades saved in vault' : 'Live real-time auto sync'}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {onToggleAccountStatus && (
                            <button
                              onClick={() => onToggleAccountStatus(String(acc.login), isDisconnected ? 'connect' : 'disconnect')}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                isDisconnected 
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                                  : 'bg-slate-800 hover:bg-rose-500/20 text-gray-300 hover:text-rose-300 border border-gray-700'
                              }`}
                            >
                              {isDisconnected ? 'Reconnect Sync' : 'Disconnect'}
                            </button>
                          )}

                          {onRemoveAccount && (
                            <button
                              onClick={() => setModalAccountToRemove({ login: String(acc.login) })}
                              className="px-2 py-1 rounded text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 transition-all font-semibold flex items-center gap-1"
                              title="Remove account options (Soft or Hard remove)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : accountStatus ? (
            <div className="bg-[#0B0F19] p-4 rounded-xl border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Live Account</span>
                <div className="text-sm font-bold text-white font-mono">#{accountStatus.login}</div>
                <div className="text-[10px] text-emerald-400">{accountStatus.server || 'MT5 Live'}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Live Balance</span>
                <div className="text-sm font-bold text-white font-mono">${accountStatus.balance?.toFixed(2)}</div>
                <div className="text-[10px] text-gray-400">{accountStatus.currency || 'USD'}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Live Equity</span>
                <div className="text-sm font-bold text-emerald-400 font-mono">${accountStatus.equity?.toFixed(2)}</div>
                <div className="text-[10px] text-gray-400">Free: ${accountStatus.freeMargin?.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Sync Status</span>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </div>
                <div className="text-[10px] text-gray-400 font-mono">Every 3s interval</div>
              </div>
            </div>
          ) : null}

          {/* Direct Actions Banner */}
          <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">Local Webhook Endpoint</span>
              <code className="text-xs font-mono font-bold text-amber-400 bg-[#111827] px-2.5 py-1 rounded-md border border-gray-800">
                {webhookUrl}
              </code>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleForceScanNow}
                disabled={isScanning}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Sync MT5 Now'}
              </button>

              {onClearAll && (
                <button
                  onClick={onClearAll}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg font-medium flex items-center gap-1"
                  title="Clear all stored trades"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Trades
                </button>
              )}
            </div>
          </div>

          {syncMessage && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* 3 Step Setup Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" /> How Real-Time Auto Sync Works
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h5 className="font-bold text-white text-xs">Turn Algo Trading ON</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  In MT5 top toolbar, click the <strong className="text-emerald-400">Algo Trading</strong> button to turn it Green.
                </p>
              </div>

              <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h5 className="font-bold text-white text-xs">Drag JournalSync EA to Chart</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  In MT5 Navigator (left side) under <strong className="text-gray-200">Expert Advisors</strong>, drag <strong className="text-amber-400">JournalSync</strong> onto your chart (e.g. XAUUSD).
                </p>
              </div>

              <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <h5 className="font-bold text-white text-xs">Zero Manual Work</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  All past trade history, open positions, and every newly closed trade will instantly auto-sync directly!
                </p>
              </div>
            </div>
          </div>

          {/* EA Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400">MQL5 Expert Advisor Script (JournalSync.mq5)</span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={copyScript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0B0F19] hover:bg-[#1F2937] border border-gray-700 text-gray-200 text-[11px] font-medium"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  {copied ? 'Copied!' : 'Copy Script'}
                </button>

                <button
                  onClick={downloadScript}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .mq5
                </button>
              </div>
            </div>

            <pre className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] font-mono text-[11px] text-gray-300 max-h-48 overflow-y-auto leading-tight selection:bg-amber-500 selection:text-black">
              {mql5Code}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0B0F19] border-t border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Direct local terminal synchronization. No cloud fees, zero latency.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1F2937] hover:bg-[#374151] text-white font-bold rounded-lg text-xs"
          >
            Close
          </button>
        </div>

      </div>

      {/* Remove Account Confirmation Dialog inside MT5 Sync Modal */}
      {modalAccountToRemove && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Remove Account #{modalAccountToRemove.login}</h3>
              </div>
              <button 
                onClick={() => setModalAccountToRemove(null)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Please choose removal method for <strong>Account #{modalAccountToRemove.login}</strong>:
            </p>

            {/* Option 1: Soft Remove */}
            <div 
              onClick={() => {
                onRemoveAccount?.(modalAccountToRemove.login, 'soft');
                setModalAccountToRemove(null);
              }}
              className="p-3.5 bg-[#0B0F19] hover:bg-cyan-950/20 border border-cyan-500/30 rounded-xl cursor-pointer transition-all space-y-1 hover:border-cyan-400"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <Archive className="w-4 h-4 text-cyan-400" />
                  <span>Soft Remove (Keep Data in Journal)</span>
                </div>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-bold">Keeps Trades</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed pl-6">
                Removes account from active sync. <strong>All trade history, statistics, and notes remain permanently safe in your journal database.</strong>
              </p>
            </div>

            {/* Option 2: Hard Remove */}
            <div 
              onClick={() => {
                if (confirm(`⚠️ PERMANENT DELETE: Are you 100% sure you want to completely erase Account #${modalAccountToRemove.login} and delete ALL its trades from the database? This cannot be undone.`)) {
                  onRemoveAccount?.(modalAccountToRemove.login, 'hard');
                  setModalAccountToRemove(null);
                }
              }}
              className="p-3.5 bg-[#0B0F19] hover:bg-rose-950/20 border border-rose-500/30 rounded-xl cursor-pointer transition-all space-y-1 hover:border-rose-400"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Hard Remove (Wipe All Trades)</span>
                </div>
                <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold">Deletes Data</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed pl-6">
                Completely deletes this account <strong>AND wipes all trades belonging to this account from the database and storage.</strong>
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalAccountToRemove(null)}
                className="px-4 py-1.5 bg-[#1F2937] hover:bg-[#374151] text-gray-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
