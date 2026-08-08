//+------------------------------------------------------------------+
//|                                                  JournalSync.mq5 |
//|                             Direct Webhook Sync for Trade Journal |
//|                             Supports Forex & Gold (XAUUSD) Exness |
//+------------------------------------------------------------------+
#property copyright "Trading Journal Sync"
#property link      "http://localhost:3000"
#property version   "1.00"
#property strict

input string WebhookURL = "http://localhost:3000/api/webhook/trade";
input string AccountLabel = "Exness-Real";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("JournalSync EA Initialized. Listening for closed trades on Exness...");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("JournalSync EA Stopped.");
}

//+------------------------------------------------------------------+
//| Trade transaction event handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Check if a deal was added (a trade was closed or partially closed)
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
               "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"direction\":\"%s\",\"profit\":%.2f,\"lots\":%.2f,\"closePrice\":%.5f,\"commission\":%.2f,\"swap\":%.2f,\"closeTime\":\"%s\"}",
               dealTicket, symbol, direction, profit, volume, price, commission, swap, TimeToString(time, TIME_DATE|TIME_SECONDS)
            );
            
            SendTradeToLocalJournal(json);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Send HTTP POST to Local Journal App                              |
//+------------------------------------------------------------------+
void SendTradeToLocalJournal(string payload)
{
   char postData[];
   char result[];
   string resultHeaders;
   StringToCharArray(payload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   string headers = "Content-Type: application/json\r\n";
   
   int res = WebRequest("POST", WebhookURL, headers, 3000, postData, result, resultHeaders);
   if(res == 200)
   {
      Print("Trade synced to local journal successfully: ", payload);
   }
   else
   {
      Print("Journal sync notice: Server returned HTTP ", res, ". Make sure http://localhost:3000 is allowed in MT5 WebRequest.");
   }
}
//+------------------------------------------------------------------+
