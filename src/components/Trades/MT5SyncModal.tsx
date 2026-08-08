import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  Radio, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Trade } from '../../types';

interface MT5SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncNewTrades: (trades: Trade[]) => void;
}

export const MT5SyncModal: React.FC<MT5SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncNewTrades
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const webhookUrl = `${window.location.origin}/api/webhook/trade`;

  const mql5Code = `//+------------------------------------------------------------------+
//|                                                  JournalSync.mq5 |
//|                             Direct Webhook Sync for Trade Journal |
//|                             Supports Forex & Gold (XAUUSD) Exness |
//+------------------------------------------------------------------+
#property copyright "Trading Journal Sync"
#property link      "${window.location.origin}"
#property version   "1.00"
#property strict

input string WebhookURL = "${webhookUrl}";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("JournalSync EA Initialized. Auto-syncing closed trades to Local Journal...");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Trade transaction event handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dealTicket = trans.deal;
      if(dealTicket > 0 && HistoryDealSelect(dealTicket))
      {
         long entryType = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         
         // Only trigger on closing transactions (DEAL_ENTRY_OUT)
         if(entryType == DEAL_ENTRY_OUT)
         {
            string symbol     = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
            double profit     = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
            double volume     = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
            double price      = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
            double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
            double swap       = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
            long   type       = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
            datetime time     = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
            
            // In MT5, DEAL_TYPE_BUY for an exit deal means closing a short (SELL trade)
            string direction = (type == DEAL_TYPE_BUY) ? "SELL" : "BUY";
            
            string json = StringFormat(
               "{\\"ticket\\":\\"%I64u\\",\\"symbol\\":\\"%s\\",\\"direction\\":\\"%s\\",\\"profit\\":%.2f,\\"lots\\":%.2f,\\"closePrice\\":%.5f,\\"commission\\":%.2f,\\"swap\\":%.2f,\\"closeTime\\":\\"%s\\"}",
               dealTicket, symbol, direction, profit, volume, price, commission, swap, TimeToString(time, TIME_DATE|TIME_SECONDS)
            );
            
            SendTradeToLocalJournal(json);
         }
      }
   }
}

void SendTradeToLocalJournal(string payload)
{
   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   string headers = "Content-Type: application/json\\r\\n";
   
   int res = WebRequest("POST", WebhookURL, headers, 3000, postData, result, resultHeaders);
   if(res == 200)
   {
      Print("Trade synced to local journal successfully: ", payload);
   }
   else
   {
      Print("Journal sync notice: Server returned HTTP ", res, ". Make sure ${window.location.origin} is allowed in MT5 WebRequest.");
   }
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

  const handleSendTestTrade = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const mockTicket = String(Math.floor(10000000 + Math.random() * 90000000));
      const testPayload = {
        ticket: mockTicket,
        symbol: 'XAUUSD',
        direction: 'BUY',
        lots: 0.50,
        openPrice: 2415.50,
        closePrice: 2423.80,
        profit: 415.00,
        pips: 83.0,
        commission: -3.50,
        swap: 0.00,
        openTime: new Date(Date.now() - 3600000).toISOString(),
        closeTime: new Date().toISOString(),
        strategy: 'ICT Silver Bullet / NY Open',
        session: 'NY_AM',
        notes: 'Live Auto-Sync Verification Test Trade from Exness MT5'
      };

      const res = await fetch('/api/webhook/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (res.ok) {
        const data = await res.json();
        setTestResult(`Success! Test Gold trade #${mockTicket} (+$415.00) synced directly to journal.`);
        onSyncNewTrades([data.trade]);
      } else {
        setTestResult('Failed to connect to local webhook endpoint.');
      }
    } catch (e: any) {
      setTestResult(`Error sending test trade: ${e.message}`);
    } finally {
      setIsTesting(false);
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
                <h3 className="text-base font-bold text-white">Exness MT5 Real-Time Auto Sync</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Webhook Active
                </span>
              </div>
              <p className="text-xs text-gray-400">Zero manual CSV imports — trades sync to your journal automatically when closed</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Endpoint Banner */}
          <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">Your Local Webhook Endpoint</span>
              <code className="text-xs font-mono font-bold text-amber-400 bg-[#111827] px-2.5 py-1 rounded-md border border-gray-800">
                {webhookUrl}
              </code>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSendTestTrade}
                disabled={isTesting}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Radio className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Testing...' : 'Send Test Trade'}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.startsWith('Success') 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{testResult}</span>
            </div>
          )}

          {/* 3 Step Setup Guide */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" /> 3-Minute Setup in Exness MT5
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Step 1 */}
              <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] space-y-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h5 className="font-bold text-white text-xs">Enable MT5 WebRequest</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  In Exness MT5, open:
                  <br />
                  <strong className="text-gray-200">Tools → Options → Expert Advisors</strong>.
                  <br />
                  Check <em className="text-amber-300 font-medium">"Allow WebRequest for listed URL"</em>.
                  <br />
                  Add: <code className="text-amber-400">{window.location.origin}</code>
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] space-y-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h5 className="font-bold text-white text-xs">Get JournalSync.mq5</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Download or copy the 1-file EA below.
                  <br />
                  Save it inside your MT5 folder:
                  <br />
                  <strong className="text-gray-200">MQL5 / Experts / JournalSync.mq5</strong>
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <h5 className="font-bold text-white text-xs">Attach to Chart & Trade</h5>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  In MT5 Navigator, drag <strong className="text-gray-200">JournalSync</strong> onto any 1 chart (e.g. XAUUSD).
                  <br />
                  Every trade you close will instantly post to this journal!
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
            <span>100% Local & Private. All trade sync runs directly on your machine without external cloud fees.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1F2937] hover:bg-[#374151] text-white font-bold rounded-lg text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
