import Papa from 'papaparse';
import { Trade, TradeDirection } from '../types';
import { normalizeSymbol, calculatePips, calculatePlannedRisk, calculateRMultiple, autoDetectSession } from './calculations';

export interface ParseResult {
  trades: Trade[];
  errors: string[];
  totalParsed: number;
}

/**
 * Clean numeric string (e.g., "$1,234.50" or " 0.10 " -> 1234.50)
 */
function parseNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalizes date strings from MT4/MT5/Exness format (e.g. "2026.08.01 14:30:00" or "2026-08-01 14:30") to ISO format
 */
function parseExnessDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return new Date().toISOString();
  try {
    let clean = dateStr.trim();
    // Replace dots in dates like "2026.08.01 14:30:00" -> "2026-08-01 14:30:00"
    clean = clean.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3');
    const dt = new Date(clean);
    if (!isNaN(dt.getTime())) {
      return dt.toISOString();
    }
    return new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Core Exness CSV/HTML parsing engine
 */
export async function parseExnessFile(file: File): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.htm') || fileName.endsWith('.html')) {
    return parseExnessHtml(file);
  } else {
    return parseExnessCsv(file);
  }
}

/**
 * Parses Exness / MT4 / MT5 CSV file
 */
function parseExnessCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const trades: Trade[] = [];
        const errors: string[] = [];

        if (!results.data || results.data.length === 0) {
          resolve({ trades: [], errors: ['File is empty or contains no valid rows.'], totalParsed: 0 });
          return;
        }

        results.data.forEach((row: any, idx: number) => {
          try {
            if (!row || typeof row !== 'object') return;
            const keys = Object.keys(row);
            const getVal = (...possibleNames: string[]): string => {
              for (const name of possibleNames) {
                const foundKey = keys.find(k => k.trim().toLowerCase() === name.toLowerCase());
                if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                  return String(row[foundKey]).trim();
                }
              }
              return '';
            };

            const typeRaw = getVal('Type', 'Order Type', 'Action', 'Direction', 'deal_type').toUpperCase();
            if (!typeRaw.includes('BUY') && !typeRaw.includes('SELL')) {
              // Skip balance deposits/withdrawals
              return;
            }

            const direction: TradeDirection = typeRaw.includes('BUY') ? 'BUY' : 'SELL';
            const symbolRaw = getVal('Symbol', 'Item', 'Instrument', 'Pair', 'deal_symbol') || 'XAUUSD';
            const symbol = normalizeSymbol(symbolRaw);
            const ticket = getVal('Ticket', 'Position', 'Order', 'Position ID', 'ID', 'deal_ticket') || `ex-${Date.now()}-${idx}`;
            
            const openTimeRaw = getVal('Open Time', 'OpenTime', 'Created At', 'Time', 'deal_time');
            const closeTimeRaw = getVal('Close Time', 'CloseTime', 'Closed At', 'Time Closed') || openTimeRaw;

            const openTime = parseExnessDate(openTimeRaw);
            const closeTime = parseExnessDate(closeTimeRaw);

            const lotSize = parseNumber(getVal('Volume', 'Lots', 'Size', 'Amount', 'deal_volume')) || 0.01;
            const openPrice = parseNumber(getVal('Open Price', 'Price', 'OpenPrice', 'deal_price'));
            const closePrice = parseNumber(getVal('Close Price', 'Price 2', 'ClosePrice')) || openPrice;
            const stopLoss = parseNumber(getVal('S / L', 'SL', 'Stop Loss', 'S/L')) || undefined;
            const takeProfit = parseNumber(getVal('T / P', 'TP', 'Take Profit', 'T/P')) || undefined;

            const commission = parseNumber(getVal('Commission', 'Commissions', 'deal_commission'));
            const swap = parseNumber(getVal('Swap', 'Storage', 'deal_swap'));
            const netProfit = parseNumber(getVal('Profit', 'Net Profit', 'Profit (USD)', 'Gross Profit', 'deal_profit'));

            // Calculate pips
            const pips = calculatePips(symbol, direction, openPrice, closePrice);
            const plannedRisk = calculatePlannedRisk(symbol, openPrice, stopLoss, lotSize);
            const rMultiple = calculateRMultiple(netProfit, plannedRisk);
            const session = autoDetectSession(openTime);

            const trade: Trade = {
              id: `trd-${ticket}-${Date.now()}-${idx}`,
              ticket,
              symbol,
              direction,
              openTime,
              closeTime,
              openPrice,
              closePrice,
              stopLoss,
              takeProfit,
              lotSize,
              netProfit: Number(netProfit.toFixed(2)),
              pips,
              rMultiple,
              commission: Number(commission.toFixed(2)),
              swap: Number(swap.toFixed(2)),
              session,
              strategy: 'Statement Import',
              confluences: ['History CSV'],
              mistakes: [],
              emotions: 'Disciplined',
              notes: `Imported from history export. Ticket #${ticket}`
            };

            trades.push(trade);
          } catch (err: any) {
            errors.push(`Row parse warning: ${err.message}`);
          }
        });

        resolve({
          trades,
          errors,
          totalParsed: trades.length
        });
      },
      error: (error: any) => {
        resolve({
          trades: [],
          errors: [`CSV Parsing error: ${error.message}`],
          totalParsed: 0
        });
      }
    });
  });
}

/**
 * Parses MetaTrader HTML report file
 */
async function parseExnessHtml(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const html = e.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = Array.from(doc.querySelectorAll('tr'));
        const trades: Trade[] = [];
        const errors: string[] = [];

        rows.forEach((row, idx) => {
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          if (cells.length < 9) return;

          // Check if row has valid ticket ID
          const ticket = cells[0];
          if (!ticket || !/^\d+$/.test(ticket)) return;

          const openTime = parseExnessDate(cells[1] || cells[0]);
          const directionRaw = (cells[2] || '').toUpperCase();
          const direction: 'BUY' | 'SELL' = directionRaw.includes('BUY') ? 'BUY' : 'SELL';
          const lotSize = parseFloat(cells[3]) || 0.01;
          const symbol = normalizeSymbol(cells[4] || 'XAUUSD');
          const openPrice = parseFloat(cells[5]) || 0;
          const stopLoss = parseFloat(cells[6]) || undefined;
          const takeProfit = parseFloat(cells[7]) || undefined;

          let closeTime = new Date().toISOString();
          let closePrice = openPrice;
          let commission = 0;
          let swap = 0;
          let netProfit = 0;

          if (cells.length >= 13) {
            closeTime = parseExnessDate(cells[8]);
            closePrice = parseFloat(cells[9]) || openPrice;
            commission = parseFloat(cells[10]) || 0;
            swap = parseFloat(cells[11]) || 0;
            netProfit = parseFloat(cells[12]) || 0;
          } else {
            closePrice = parseFloat(cells[8]) || openPrice;
            netProfit = parseFloat(cells[cells.length - 1]) || 0;
          }

          const pips = calculatePips(symbol, direction, openPrice, closePrice);
          const plannedRisk = calculatePlannedRisk(symbol, openPrice, stopLoss, lotSize);
          const rMultiple = calculateRMultiple(netProfit, plannedRisk);
          const session = autoDetectSession(openTime);

          trades.push({
            id: `trd-${ticket}-${Date.now()}-${idx}`,
            ticket,
            symbol,
            direction,
            openTime,
            closeTime,
            openPrice,
            closePrice,
            stopLoss,
            takeProfit,
            lotSize,
            netProfit: Number(netProfit.toFixed(2)),
            pips,
            rMultiple,
            commission: Number(commission.toFixed(2)),
            swap: Number(swap.toFixed(2)),
            session,
            strategy: 'Statement Import',
            confluences: ['MT5 HTML Report'],
            mistakes: [],
            emotions: 'Disciplined',
            notes: `HTML Statement trade ticket #${ticket}`
          });
        });

        resolve({
          trades,
          errors,
          totalParsed: trades.length
        });
      } catch (err: any) {
        resolve({ trades: [], errors: [`HTML Parse Error: ${err.message}`], totalParsed: 0 });
      }
    };

    reader.onerror = () => {
      resolve({ trades: [], errors: ['Failed to read HTML file'], totalParsed: 0 });
    };

    reader.readAsText(file);
  });
}
