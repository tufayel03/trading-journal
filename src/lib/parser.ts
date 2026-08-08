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
    // Replace dots in dates like "2026.08.01 14:30:00"
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
            // Find keys case-insensitively
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

            const typeRaw = getVal('Type', 'Order Type', 'Action', 'Direction').toUpperCase();
            if (!typeRaw.includes('BUY') && !typeRaw.includes('SELL')) {
              // Skip balance, deposit, withdrawal rows
              return;
            }

            const direction: TradeDirection = typeRaw.includes('BUY') ? 'BUY' : 'SELL';
            const symbolRaw = getVal('Symbol', 'Item', 'Instrument', 'Pair');
            if (!symbolRaw) return;

            const symbol = normalizeSymbol(symbolRaw);
            const ticket = getVal('Ticket', 'Position', 'Order', 'Position ID', 'ID') || `ex-${Date.now()}-${idx}`;
            
            const openTimeRaw = getVal('Open Time', 'OpenTime', 'Created At', 'Time');
            const closeTimeRaw = getVal('Close Time', 'CloseTime', 'Closed At', 'Time Closed') || openTimeRaw;

            const openTime = parseExnessDate(openTimeRaw);
            const closeTime = parseExnessDate(closeTimeRaw);

            const lotSize = parseNumber(getVal('Volume', 'Lots', 'Size', 'Amount'));
            const openPrice = parseNumber(getVal('Open Price', 'Price', 'OpenPrice'));
            const closePrice = parseNumber(getVal('Close Price', 'Price 2', 'ClosePrice'));
            const stopLoss = parseNumber(getVal('S / L', 'SL', 'Stop Loss', 'S/L')) || undefined;
            const takeProfit = parseNumber(getVal('T / P', 'TP', 'Take Profit', 'T/P')) || undefined;

            const commission = parseNumber(getVal('Commission', 'Commissions'));
            const swap = parseNumber(getVal('Swap', 'Storage'));
            const rawProfit = parseNumber(getVal('Profit', 'Net Profit', 'Profit (USD)', 'Gross Profit'));

            // Net Profit includes profit + swap + commission if not already deducted
            const netProfit = rawProfit;

            // Calculate pips
            const pips = calculatePips(symbol, direction, openPrice, closePrice);

            // Calculate risk & R-Multiple
            const plannedRisk = calculatePlannedRisk(symbol, openPrice, stopLoss, lotSize);
            const rMultiple = calculateRMultiple(netProfit, plannedRisk);

            // Auto detect trading session
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
              lotSize: lotSize || 0.1,
              netProfit: Number(netProfit.toFixed(2)),
              pips,
              rMultiple,
              commission: Number(commission.toFixed(2)),
              swap: Number(swap.toFixed(2)),
              session,
              strategy: 'Exness Auto-Import',
              confluences: ['Exness Trade Export'],
              mistakes: [],
              emotions: 'Neutral',
              notes: `Imported from Exness export (${symbolRaw}). Ticket #${ticket}`
            };

            trades.push(trade);
          } catch (err: any) {
            errors.push(`Row ${idx + 1}: ${err.message || 'Error parsing row'}`);
          }
        });

        resolve({
          trades,
          errors,
          totalParsed: trades.length
        });
      },
      error: (err) => {
        resolve({ trades: [], errors: [`CSV Parsing Failed: ${err.message}`], totalParsed: 0 });
      }
    });
  });
}

/**
 * Parses Exness / MetaTrader HTML report file
 */
async function parseExnessHtml(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const htmlContent = e.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const rows = doc.querySelectorAll('tr');

        const trades: Trade[] = [];
        const errors: string[] = [];

        rows.forEach((tr, idx) => {
          const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '');
          if (cells.length < 10) return; // Not a trade row

          const typeText = cells[2]?.toUpperCase() || '';
          if (!typeText.includes('BUY') && !typeText.includes('SELL')) return;

          const direction: TradeDirection = typeText.includes('BUY') ? 'BUY' : 'SELL';
          const ticket = cells[0] || `ex-html-${idx}`;
          const openTime = parseExnessDate(cells[1]);
          const lotSize = parseNumber(cells[3]);
          const symbol = normalizeSymbol(cells[4]);
          const openPrice = parseNumber(cells[5]);
          const stopLoss = parseNumber(cells[6]) || undefined;
          const takeProfit = parseNumber(cells[7]) || undefined;
          
          let closeTime = openTime;
          let closePrice = openPrice;
          let commission = 0;
          let swap = 0;
          let netProfit = 0;

          // Standard MT4 HTML statement layout
          if (cells.length >= 13) {
            closeTime = parseExnessDate(cells[8]);
            closePrice = parseNumber(cells[9]);
            commission = parseNumber(cells[10]);
            swap = parseNumber(cells[11]);
            netProfit = parseNumber(cells[12]);
          } else if (cells.length >= 10) {
            closePrice = parseNumber(cells[8]);
            netProfit = parseNumber(cells[9]);
          }

          const pips = calculatePips(symbol, direction, openPrice, closePrice);
          const plannedRisk = calculatePlannedRisk(symbol, openPrice, stopLoss, lotSize);
          const rMultiple = calculateRMultiple(netProfit, plannedRisk);
          const session = autoDetectSession(openTime);

          trades.push({
            id: `trd-${ticket}-${idx}`,
            ticket,
            symbol,
            direction,
            openTime,
            closeTime,
            openPrice,
            closePrice,
            stopLoss,
            takeProfit,
            lotSize: lotSize || 0.1,
            netProfit: Number(netProfit.toFixed(2)),
            pips,
            rMultiple,
            commission,
            swap,
            session,
            strategy: 'Exness HTML Import',
            confluences: ['MT4/MT5 Statement'],
            mistakes: [],
            emotions: 'Neutral',
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
