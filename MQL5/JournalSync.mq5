//+------------------------------------------------------------------+
//|                                                  JournalSync.mq5 |
//|                     Real-Time HyperTrade MT5 Auto-Sync Journal EA|
//|                        Syncs History, Live Trades & Account State|
//+------------------------------------------------------------------+
#property copyright "HyperTrade PRO Auto-Sync"
#property link      "http://localhost:3000"
#property version   "3.00"
#property strict

input string WebhookURL      = "http://localhost:3000/api/webhook/trade";
input string BatchWebhookURL = "http://localhost:3000/api/webhook/batch";
input bool   AutoSyncOnStart = true;
input int    SyncIntervalSec = 3;       // Auto-sync interval in seconds (0 to disable timer)
input int    MaxHistoryDeals = 1000;    // Maximum historical closed deals to sync

int g_totalHistorySynced = 0;
int g_totalOpenPositions = 0;
string g_lastSyncStatus = "Ready";
datetime g_lastSyncTime = 0;

//+------------------------------------------------------------------+
//| Format datetime into ISO-8601 UTC string                         |
//+------------------------------------------------------------------+
string FormatISOTime(datetime t)
{
   if(t <= 0) t = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02d.000Z", 
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

//+------------------------------------------------------------------+
//| Clean Symbol string                                              |
//+------------------------------------------------------------------+
string CleanSymbol(string sym)
{
   string s = sym;
   StringToUpper(s);
   return s;
}

//+------------------------------------------------------------------+
//| Draw On-Chart HUD Dashboard                                      |
//+------------------------------------------------------------------+
void UpdateChartHUD()
{
   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   string server = AccountInfoString(ACCOUNT_SERVER);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   string currency = AccountInfoString(ACCOUNT_CURRENCY);
   
   string timeStr = (g_lastSyncTime > 0) ? TimeToString(g_lastSyncTime, TIME_MINUTES|TIME_SECONDS) : "Pending";
   
   string hud = StringFormat(
      "╔══════════════════════════════════════════════════════════════╗\n" +
      "║        ⚡ HYPERTRADE PRO AUTO-SYNC JOURNAL (v3.0)            ║\n" +
      "╠══════════════════════════════════════════════════════════════╣\n" +
      "║  Account : %I64d (%s)\n" +
      "║  Balance : $%.2f %s   |  Equity : $%.2f %s\n" +
      "║  Open Pos: %d active trade(s)\n" +
      "║  History : %d closed trades synced to Journal\n" +
      "║  Endpoint: %s\n" +
      "║  Status  : %s (Last: %s)\n" +
      "╚══════════════════════════════════════════════════════════════╝\n" +
      "  [ Tip: Click anywhere on Chart to Force Instant Re-Sync ]",
      login, server, balance, currency, equity, currency,
      g_totalOpenPositions, g_totalHistorySynced, WebhookURL, g_lastSyncStatus, timeStr
   );
   
   Comment(hud);
}

//+------------------------------------------------------------------+
//| Send HTTP POST to Local Journal Webhook                          |
//+------------------------------------------------------------------+
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
   
   string headers = "Content-Type: application/json\r\n";
   
   ResetLastError();
   int res = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
   return res;
}

//+------------------------------------------------------------------+
//| Write Direct to Local MQL5/Files Sandbox                         |
//+------------------------------------------------------------------+
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

//+------------------------------------------------------------------+
//| Export Broker Candlestick Data to MQL5/Files                     |
//+------------------------------------------------------------------+
void ExportSymbolCandles(string sym, ENUM_TIMEFRAMES tf, string tfName, int maxBars = 1000)
{
   MqlRates rates[];
   ArraySetAsSeries(rates, false);
   int copied = CopyRates(sym, tf, 0, maxBars, rates);
   if(copied <= 0) return;
   
   string cleanSym = CleanSymbol(sym);
   StringReplace(cleanSym, ".M", "");
   StringReplace(cleanSym, "_M", "");
   StringReplace(cleanSym, "ECN", "");
   StringReplace(cleanSym, "#", "");
   
   string json = "[";
   for(int i = 0; i < copied; i++)
   {
      string item = StringFormat(
         "{\"time\":%I64d,\"open\":%.5f,\"high\":%.5f,\"low\":%.5f,\"close\":%.5f,\"volume\":%I64d}",
         (long)rates[i].time, rates[i].open, rates[i].high, rates[i].low, rates[i].close, rates[i].tick_volume
      );
      if(i > 0) json += ",";
      json += item;
   }
   json += "]";
   
   string filename = StringFormat("candles_%s_%s.json", cleanSym, tfName);
   int handle = FileOpen(filename, FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(handle != INVALID_HANDLE)
   {
      FileWriteString(handle, json);
      FileClose(handle);
   }
}

void ExportAllActiveCandles()
{
   string chartSym = Symbol();
   ExportSymbolCandles(chartSym, PERIOD_M1, "1m", 1500);
   ExportSymbolCandles(chartSym, PERIOD_M5, "5m", 1500);
   ExportSymbolCandles(chartSym, PERIOD_M15, "15m", 1000);
   ExportSymbolCandles(chartSym, PERIOD_M30, "30m", 800);
   ExportSymbolCandles(chartSym, PERIOD_H1, "1h", 500);
   ExportSymbolCandles(chartSym, PERIOD_H4, "4h", 300);
   ExportSymbolCandles(chartSym, PERIOD_D1, "1d", 200);
   ExportSymbolCandles(chartSym, PERIOD_W1, "1w", 150);
   ExportSymbolCandles(chartSym, PERIOD_MN1, "1mn", 100);
}

//+------------------------------------------------------------------+
//| Build JSON for Open Active Positions                             |
//+------------------------------------------------------------------+
string BuildOpenPositionsJSON()
{
   int total = PositionsTotal();
   g_totalOpenPositions = total;
   
   string json = "[";
   bool first = true;
   
   long currentLogin = AccountInfoInteger(ACCOUNT_LOGIN);
   string currentServer = AccountInfoString(ACCOUNT_SERVER);
   string currentCurrency = AccountInfoString(ACCOUNT_CURRENCY);
   
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
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"direction\":\"%s\",\"lotSize\":%.2f,\"openPrice\":%.5f,\"currentPrice\":%.5f,\"stopLoss\":%.5f,\"takeProfit\":%.5f,\"profit\":%.2f,\"openTime\":\"%s\",\"accountLogin\":\"%I64d\",\"accountServer\":\"%s\",\"accountCurrency\":\"%s\"}",
         ticket, symbol, direction, volume, priceOpen, priceCur, sl, tp, profit, FormatISOTime(time), currentLogin, currentServer, currentCurrency
      );
      
      if(!first) json += ",";
      json += item;
      first = false;
   }
   
   json += "]";
   return json;
}

//+------------------------------------------------------------------+
//| Build JSON for Account Information                               |
//+------------------------------------------------------------------+
string BuildAccountInfoJSON()
{
   long login       = AccountInfoInteger(ACCOUNT_LOGIN);
   string server    = AccountInfoString(ACCOUNT_SERVER);
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity    = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin    = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin= AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   string currency  = AccountInfoString(ACCOUNT_CURRENCY);
   
   return StringFormat(
      "{\"login\":\"%I64d\",\"server\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"freeMargin\":%.2f,\"currency\":\"%s\",\"lastUpdate\":\"%s\"}",
      login, server, balance, equity, margin, freeMargin, currency, FormatISOTime(TimeCurrent())
   );
}

//+------------------------------------------------------------------+
//| Sync Full Account History (Closed Deals) & Live State            |
//+------------------------------------------------------------------+
void SyncAllTrades()
{
   g_lastSyncTime = TimeCurrent();
   
   if(!HistorySelect(0, TimeCurrent()))
   {
      g_lastSyncStatus = "History access pending";
      UpdateChartHUD();
      return;
   }
   
   long currentLogin = AccountInfoInteger(ACCOUNT_LOGIN);
   string currentServer = AccountInfoString(ACCOUNT_SERVER);
   string currentCurrency = AccountInfoString(ACCOUNT_CURRENCY);
   
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
         
         // In MT5, DEAL_TYPE_BUY for exit means closing a short trade (SELL)
         string direction = (dealType == DEAL_TYPE_BUY) ? "SELL" : "BUY";
         
         double openPrice = closePrice;
         datetime openTime = closeTime - 60;
         
         if(posId > 0)
         {
            for(int j = 0; j < totalDeals; j++)
            {
               ulong openTicket = HistoryDealGetTicket(j);
               if(openTicket > 0 && openTicket != dealTicket)
               {
                  if(HistoryDealGetInteger(openTicket, DEAL_POSITION_ID) == posId)
                  {
                     if(HistoryDealGetInteger(openTicket, DEAL_ENTRY) == DEAL_ENTRY_IN)
                     {
                        openPrice = HistoryDealGetDouble(openTicket, DEAL_PRICE);
                        openTime  = (datetime)HistoryDealGetInteger(openTicket, DEAL_TIME);
                        direction = (HistoryDealGetInteger(openTicket, DEAL_TYPE) == DEAL_TYPE_BUY) ? "BUY" : "SELL";
                        break;
                     }
                  }
               }
            }
         }
         
         string itemJSON = StringFormat(
            "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"direction\":\"%s\",\"openPrice\":%.5f,\"closePrice\":%.5f,\"profit\":%.2f,\"lots\":%.2f,\"commission\":%.2f,\"swap\":%.2f,\"openTime\":\"%s\",\"closeTime\":\"%s\",\"comment\":\"%s\",\"accountLogin\":\"%I64d\",\"accountServer\":\"%s\",\"accountCurrency\":\"%s\"}",
            dealTicket, symbol, direction, openPrice, closePrice, profit, volume, commission, swap,
            FormatISOTime(openTime), FormatISOTime(closeTime), comment, currentLogin, currentServer, currentCurrency
         );
         
         if(!firstTrade) tradesJSON += ",";
         tradesJSON += itemJSON;
         firstTrade = false;
         count++;
      }
   }
   
   tradesJSON += "]";
   g_totalHistorySynced = count;
   
   string accountJSON = BuildAccountInfoJSON();
   string openPositionsJSON = BuildOpenPositionsJSON();
   
   // Create full sync payload bundle
   string fullPayload = StringFormat(
      "{\"account\":%s,\"openPositions\":%s,\"trades\":%s}",
      accountJSON, openPositionsJSON, tradesJSON
   );
   
   // 1. Direct Local File Export to MQL5/Files/journal_sync.json
   WriteDirectSyncFile(fullPayload);
   ExportAllActiveCandles();
   
   // 2. Direct Webhook HTTP Push
   int httpRes = PostJSON(BatchWebhookURL, fullPayload);
   if(httpRes == 200)
   {
      g_lastSyncStatus = StringFormat("Auto-synced (%d history, %d open)", count, g_totalOpenPositions);
   }
   else
   {
      // If WebRequest is not enabled in MT5 Options, file sync is still 100% active
      g_lastSyncStatus = StringFormat("File Synced (%d history, %d open)", count, g_totalOpenPositions);
   }
   
   UpdateChartHUD();
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("JournalSync EA v3.0 Initialized for HyperTrade PRO.");
   UpdateChartHUD();
   
   if(SyncIntervalSec > 0)
   {
      EventSetTimer(SyncIntervalSec);
   }
   
   if(AutoSyncOnStart)
   {
      SyncAllTrades();
   }
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("JournalSync EA Stopped.");
}

//+------------------------------------------------------------------+
//| Timer Event Handler                                              |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncAllTrades();
}

//+------------------------------------------------------------------+
//| Trade Transaction Event Handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Trigger sync on deal addition or position changes
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD || 
      trans.type == TRADE_TRANSACTION_POSITION ||
      trans.type == TRADE_TRANSACTION_ORDER_ADD ||
      trans.type == TRADE_TRANSACTION_ORDER_DELETE)
   {
      SyncAllTrades();
   }
}

//+------------------------------------------------------------------+
//| Chart Event Handler                                              |
//+------------------------------------------------------------------+
void OnChartEvent(const int id,
                  const long& lparam,
                  const double& dparam,
                  const string& sparam)
{
   if(id == CHARTEVENT_CLICK)
   {
      SyncAllTrades();
   }
}
