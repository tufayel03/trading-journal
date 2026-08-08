//+------------------------------------------------------------------+
//|                                                  JournalSync.mq4 |
//|                             Direct Webhook Sync for Trade Journal |
//|                             Supports Forex & Gold (XAUUSD) Exness |
//+------------------------------------------------------------------+
#property copyright "Trading Journal Sync"
#property link      "http://127.0.0.1:3000"
#property version   "1.00"
#property strict

extern string WebhookURL = "http://127.0.0.1:3000/api/webhook/trade";

int lastHistoryTotal = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("JournalSync MT4 Initialized. Auto-syncing closed trades to Local Journal...");
   lastHistoryTotal = OrdersHistoryTotal();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function / Timer Check                               |
//+------------------------------------------------------------------+
void OnTick()
{
   CheckClosedTrades();
}

void OnTimer()
{
   CheckClosedTrades();
}

//+------------------------------------------------------------------+
//| Check recently closed trades in OrderHistory                     |
//+------------------------------------------------------------------+
void CheckClosedTrades()
{
   int currentTotal = OrdersHistoryTotal();
   if(currentTotal > lastHistoryTotal)
   {
      for(int i = lastHistoryTotal; i < currentTotal; i++)
      {
         if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
         {
            int orderType = OrderType();
            if(orderType == OP_BUY || orderType == OP_SELL)
            {
               string symbol     = OrderSymbol();
               double profit     = OrderProfit();
               double lots       = OrderLots();
               double openPrice  = OrderOpenPrice();
               double closePrice = OrderClosePrice();
               double commission = OrderCommission();
               double swap       = OrderSwap();
               int ticket        = OrderTicket();
               datetime closeTime= OrderCloseTime();
               datetime openTime = OrderOpenTime();
               string direction  = (orderType == OP_BUY) ? "BUY" : "SELL";

               string json = StringFormat(
                  "{\"ticket\":\"%d\",\"symbol\":\"%s\",\"direction\":\"%s\",\"profit\":%.2f,\"lots\":%.2f,\"openPrice\":%.5f,\"closePrice\":%.5f,\"commission\":%.2f,\"swap\":%.2f,\"openTime\":\"%s\",\"closeTime\":\"%s\"}",
                  ticket, symbol, direction, profit, lots, openPrice, closePrice, commission, swap,
                  TimeToStr(openTime, TIME_DATE|TIME_SECONDS), TimeToStr(closeTime, TIME_DATE|TIME_SECONDS)
               );

               SendTradeToJournal(json);
            }
         }
      }
      lastHistoryTotal = currentTotal;
   }
}

void SendTradeToJournal(string payload)
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
      Print("Journal sync notice: Server returned HTTP ", res, ". Make sure http://127.0.0.1:3000 is allowed in MT4 WebRequest.");
   }
}
