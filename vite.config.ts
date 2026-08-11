import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { execSync, exec } from 'child_process';
import { defineConfig, Plugin } from 'vite';

function mt5SyncPlugin(): Plugin {
  return {
    name: 'mt5-sync-plugin',
    configureServer(server) {
      const dataDir = path.resolve(__dirname, 'data');
      const syncFile = path.resolve(dataDir, 'synced_trades.json');
      const statusFile = path.resolve(dataDir, 'account_status.json');

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (!fs.existsSync(syncFile)) {
        fs.writeFileSync(syncFile, '[]', 'utf-8');
      }
      if (!fs.existsSync(statusFile)) {
        fs.writeFileSync(statusFile, JSON.stringify({
          accounts: {},
          account: null,
          openPositions: [],
          totalSyncedDeals: 0,
          lastSync: new Date().toISOString()
        }, null, 2), 'utf-8');
      }

      let inMemoryTrades: any[] = [];
      let inMemoryStatus: any = {
        accounts: {},
        account: null,
        openPositions: [],
        totalSyncedDeals: 0,
        lastSync: new Date().toISOString()
      };

      try {
        inMemoryTrades = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
      } catch {}
      try {
        const parsedStatus = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
        inMemoryStatus = {
          accounts: parsedStatus.accounts || {},
          account: parsedStatus.account || null,
          openPositions: parsedStatus.openPositions || [],
          totalSyncedDeals: parsedStatus.totalSyncedDeals || 0,
          lastSync: parsedStatus.lastSync || new Date().toISOString()
        };
      } catch {}

      const parseIncomingTrade = (trade: any, defaultAccount?: any) => {
        const rawSymbol = String(trade.symbol || 'XAUUSD').toUpperCase();
        const symbol = rawSymbol.replace(/(\.M|_M|ECN|#|C|M)$/i, '');
        const direction = trade.direction || (trade.type === 'DEAL_TYPE_BUY' || trade.type === 'BUY' ? 'BUY' : 'SELL');
        const openPrice = parseFloat(trade.openPrice || trade.closePrice || 0);
        const closePrice = parseFloat(trade.closePrice || trade.openPrice || 0);
        const lotSize = parseFloat(trade.lots || trade.lotSize || 0.01);
        const openTime = trade.openTime || new Date(Date.now() - 3600000).toISOString();
        const closeTime = trade.closeTime || new Date().toISOString();

        const accountLogin = trade.accountLogin 
          ? String(trade.accountLogin) 
          : (defaultAccount?.login ? String(defaultAccount.login) : '');

        const accountServer = trade.accountServer || (defaultAccount?.server ? String(defaultAccount.server) : 'Live MT5');
        const accountCurrency = String(trade.accountCurrency || defaultAccount?.currency || 'USD').toUpperCase();

        const isCent = (accountCurrency === 'USC' || 
                       accountCurrency.includes('CENT') || 
                       (accountServer.toLowerCase().includes('cent') && !accountServer.toLowerCase().includes('fivepercent') && !accountServer.toLowerCase().includes('percent')) ||
                       Boolean(defaultAccount?.isCent) ||
                       Boolean(trade?.isCent)) &&
                       !accountServer.toLowerCase().includes('fivepercent') &&
                       accountCurrency !== 'USD';
        const conversionRate = isCent ? 0.01 : 1.0;

        const rawProfit = parseFloat(trade.profit || trade.netProfit || 0);
        const netProfit = Number((rawProfit * conversionRate).toFixed(4));
        const nativeNetProfit = rawProfit;

        const rawCommission = parseFloat(trade.commission || 0);
        const commission = Number((rawCommission * conversionRate).toFixed(4));

        const rawSwap = parseFloat(trade.swap || 0);
        const swap = Number((rawSwap * conversionRate).toFixed(4));

        // Calculate pips if not given
        let pips = parseFloat(trade.pips || 0);
        if (!pips && openPrice && closePrice) {
          const diff = direction === 'BUY' ? closePrice - openPrice : openPrice - closePrice;
          if (symbol.includes('XAU') || symbol.includes('GOLD')) {
            pips = Number((diff / 0.10).toFixed(1));
          } else if (symbol.includes('JPY')) {
            pips = Number((diff / 0.01).toFixed(1));
          } else if (symbol.includes('BTC') || symbol.includes('ETH')) {
            pips = Number(diff.toFixed(2));
          } else if (openPrice < 5) {
            pips = Number((diff / 0.0001).toFixed(1));
          } else {
            pips = Number(diff.toFixed(2));
          }
        }

        // Auto detect session
        let session = trade.session;
        if (!session) {
          try {
            const h = new Date(openTime).getUTCHours();
            if (h >= 0 && h < 7) session = 'ASIAN';
            else if (h >= 7 && h < 12) session = 'LONDON_OPEN';
            else if (h >= 12 && h < 17) session = 'NY_AM';
            else if (h >= 17 && h < 20) session = 'NY_PM';
            else session = 'LONDON_CLOSE';
          } catch {
            session = 'NY_AM';
          }
        }

        return {
          id: trade.id || `mt5-${accountLogin}-${trade.ticket || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ticket: trade.ticket ? String(trade.ticket) : undefined,
          symbol,
          direction,
          openTime,
          closeTime,
          openPrice,
          closePrice,
          stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
          takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
          lotSize,
          netProfit,
          nativeNetProfit,
          pips,
          commission,
          swap,
          nativeCommission: rawCommission,
          nativeSwap: rawSwap,
          session,
          strategy: trade.strategy || 'HyperTrade MT5 Auto Sync',
          confluences: trade.confluences || ['MT5 Live Execution'],
          mistakes: trade.mistakes || [],
          emotions: trade.emotions || 'Disciplined',
          notes: trade.comment ? `MT5 Deal #${trade.ticket || ''}: ${trade.comment}` : (trade.notes || `Auto-synced from MT5 #${accountLogin}`),
          accountLogin,
          accountServer,
          accountCurrency: isCent ? 'USC' : accountCurrency,
          isCent,
          receivedAt: new Date().toISOString()
        };
      };

      const processSyncBundle = (raw: any) => {
        let tradesList: any[] = [];
        let accountData: any = null;
        let openPositionsData: any[] = [];

        if (Array.isArray(raw)) {
          tradesList = raw;
        } else if (raw && typeof raw === 'object') {
          if (Array.isArray(raw.trades)) tradesList = raw.trades;
          if (raw.account) accountData = raw.account;
          if (Array.isArray(raw.openPositions)) openPositionsData = raw.openPositions;
        }

        const parsedTrades = tradesList.map(t => parseIncomingTrade(t, accountData)).filter(Boolean);
        let changed = false;

        parsedTrades.forEach(nt => {
          const idx = inMemoryTrades.findIndex((t: any) => t.ticket && String(t.ticket) === String(nt.ticket));
          if (idx >= 0) {
            const existing = inMemoryTrades[idx];
            inMemoryTrades[idx] = {
              ...nt,
              ...existing,
              openPrice: nt.openPrice || existing.openPrice,
              closePrice: nt.closePrice || existing.closePrice,
              netProfit: nt.netProfit !== undefined ? nt.netProfit : existing.netProfit,
              nativeNetProfit: nt.nativeNetProfit !== undefined ? nt.nativeNetProfit : existing.nativeNetProfit,
              lotSize: nt.lotSize || existing.lotSize,
              pips: nt.pips || existing.pips,
              commission: nt.commission !== undefined ? nt.commission : existing.commission,
              swap: nt.swap !== undefined ? nt.swap : existing.swap,
              closeTime: nt.closeTime || existing.closeTime,
              accountLogin: nt.accountLogin || existing.accountLogin,
              accountServer: nt.accountServer || existing.accountServer,
              accountCurrency: nt.accountCurrency || existing.accountCurrency,
              isCent: nt.isCent !== undefined ? nt.isCent : existing.isCent,
              mistakes: (existing.mistakes && existing.mistakes.length > 0) ? existing.mistakes : (nt.mistakes || []),
              notes: existing.notes && !existing.notes.startsWith('Auto-synced from MT5') ? existing.notes : (nt.notes || existing.notes),
              rating: existing.rating || (nt as any).rating || 0,
              emotions: existing.emotions || nt.emotions || 'Disciplined',
              strategy: existing.strategy && existing.strategy !== 'HyperTrade MT5 Auto Sync' ? existing.strategy : (nt.strategy || existing.strategy),
              confluences: (existing.confluences && existing.confluences.length > 0 && !existing.confluences.includes('MT5 Live Execution')) ? existing.confluences : (nt.confluences || existing.confluences),
              beforeChartUrl: existing.beforeChartUrl || (nt as any).beforeChartUrl,
              afterChartUrl: existing.afterChartUrl || (nt as any).afterChartUrl,
            };
          } else {
            inMemoryTrades.unshift(nt);
            changed = true;
          }
        });

        if (changed) {
          try {
            fs.writeFileSync(syncFile, JSON.stringify(inMemoryTrades, null, 2), 'utf-8');
          } catch {}
        }

        if (accountData) {
          const loginKey = String(accountData.login);

          // Check if this account was removed by the user
          inMemoryStatus.removedAccounts = inMemoryStatus.removedAccounts || [];
          if (inMemoryStatus.removedAccounts.includes(loginKey)) {
            return {
              trades: inMemoryTrades,
              newCount: 0,
              accounts: inMemoryStatus.accounts,
              account: inMemoryStatus.account,
              openPositions: inMemoryStatus.openPositions
            };
          }

          const existingAcc = inMemoryStatus.accounts?.[loginKey];
          const isPreviouslyDisconnected = existingAcc?.status === 'disconnected';

          const isCentAccount = (String(accountData.currency || '').toUpperCase() === 'USC' || 
                                String(accountData.currency || '').toUpperCase().includes('CENT') ||
                                String(accountData.server || '').toLowerCase().includes('cent')) &&
                                !String(accountData.server || '').toLowerCase().includes('fivepercent') &&
                                !String(accountData.server || '').toLowerCase().includes('percent') &&
                                String(accountData.currency || '').toUpperCase() !== 'USD';
          const rate = isCentAccount ? 0.01 : 1.0;
          const nativeBalance = parseFloat(accountData.balance || 0);
          const nativeEquity = parseFloat(accountData.equity || 0);
          const nativeMargin = parseFloat(accountData.margin || 0);
          const nativeFreeMargin = parseFloat(accountData.freeMargin || 0);

          const usdBalance = Number((nativeBalance * rate).toFixed(2));
          const usdEquity = Number((nativeEquity * rate).toFixed(2));

          inMemoryStatus.accounts = inMemoryStatus.accounts || {};
          inMemoryStatus.accounts[loginKey] = {
            ...accountData,
            login: loginKey,
            currency: isCentAccount ? 'USC' : (accountData.currency || 'USD'),
            isCent: isCentAccount,
            balance: nativeBalance,
            equity: nativeEquity,
            margin: nativeMargin,
            freeMargin: nativeFreeMargin,
            usdBalance,
            usdEquity,
            initialDeposit: accountData.initialDeposit !== undefined ? parseFloat(accountData.initialDeposit) : existingAcc?.initialDeposit,
            nativeInitialDeposit: accountData.nativeInitialDeposit !== undefined ? parseFloat(accountData.nativeInitialDeposit) : existingAcc?.nativeInitialDeposit,
            totalDeposits: accountData.totalDeposits !== undefined ? parseFloat(accountData.totalDeposits) : existingAcc?.totalDeposits,
            totalWithdrawals: accountData.totalWithdrawals !== undefined ? parseFloat(accountData.totalWithdrawals) : existingAcc?.totalWithdrawals,
            lastUpdate: new Date().toISOString(),
            openPositionsCount: isPreviouslyDisconnected ? 0 : openPositionsData.length,
            status: isPreviouslyDisconnected ? 'disconnected' : (existingAcc?.status || 'connected'),
            disconnectedAt: isPreviouslyDisconnected ? (existingAcc?.disconnectedAt || new Date().toISOString()) : undefined
          };

          if (inMemoryStatus.account?.login === loginKey) {
            inMemoryStatus.account = inMemoryStatus.accounts[loginKey];
          }

          // If disconnected, do not populate live open positions
          if (!isPreviouslyDisconnected) {
            const otherPositions = (inMemoryStatus.openPositions || []).filter((p: any) => p.accountLogin && String(p.accountLogin) !== loginKey);
            const currentPositions = openPositionsData.map((p: any) => {
              const rawProfit = parseFloat(p.profit || 0);
              return {
                ...p,
                accountLogin: loginKey,
                accountServer: accountData.server,
                accountCurrency: isCentAccount ? 'USC' : (accountData.currency || 'USD'),
                isCent: isCentAccount,
                nativeProfit: rawProfit,
                profit: Number((rawProfit * rate).toFixed(4))
              };
            });
            inMemoryStatus.openPositions = [...otherPositions, ...currentPositions];
          } else {
            inMemoryStatus.openPositions = (inMemoryStatus.openPositions || []).filter((p: any) => String(p.accountLogin) !== loginKey);
          }

          inMemoryStatus.totalSyncedDeals = inMemoryTrades.length;
          inMemoryStatus.lastSync = new Date().toISOString();

          try {
            fs.writeFileSync(statusFile, JSON.stringify(inMemoryStatus, null, 2), 'utf-8');
          } catch {}
        }

        return {
          trades: inMemoryTrades,
          newCount: parsedTrades.length,
          accounts: inMemoryStatus.accounts,
          account: inMemoryStatus.account,
          openPositions: inMemoryStatus.openPositions
        };
      };

      const appData = process.env.APPDATA || '';
      const terminalFileHashes: Record<string, string> = {};

      const scanMT5DirectFiles = () => {
        if (!appData) return;
        const mt5Base = path.join(appData, 'MetaQuotes', 'Terminal');
        if (fs.existsSync(mt5Base)) {
          const dirs = fs.readdirSync(mt5Base);
          for (const dir of dirs) {
            const filesDir = path.join(mt5Base, dir, 'MQL5', 'Files');
            const directSync = path.join(filesDir, 'journal_sync.json');
            if (fs.existsSync(directSync)) {
              try {
                const content = fs.readFileSync(directSync, 'utf-8');
                if (content && content.trim().length > 0 && content !== terminalFileHashes[dir]) {
                  terminalFileHashes[dir] = content;
                  const raw = JSON.parse(content);
                  processSyncBundle(raw);
                }
              } catch {}
            }

            // Ingest and PERMANENTLY MERGE any direct candle export files from MT5 EA
            if (fs.existsSync(filesDir)) {
              try {
                const candleFiles = fs.readdirSync(filesDir).filter(f => f.startsWith('candles_') && f.endsWith('.json'));
                for (const cf of candleFiles) {
                  const src = path.join(filesDir, cf);
                  const destName = cf.replace(/^candles_/, '');
                  const dest = path.join(candlesDir, destName);
                  const candleContent = fs.readFileSync(src, 'utf-8');
                  if (candleContent && candleContent.length > 50) {
                    try {
                      const incomingCandles = JSON.parse(candleContent);
                      if (Array.isArray(incomingCandles) && incomingCandles.length > 0) {
                        let existingCandles: any[] = [];
                        if (fs.existsSync(dest)) {
                          try {
                            existingCandles = JSON.parse(fs.readFileSync(dest, 'utf-8'));
                          } catch {}
                        }
                        const candleMap = new Map<number, any>();
                        existingCandles.forEach(c => {
                          if (c && typeof c.time === 'number') candleMap.set(c.time, c);
                        });
                        incomingCandles.forEach(c => {
                          if (c && typeof c.time === 'number') candleMap.set(c.time, c);
                        });
                        const merged = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
                        fs.writeFileSync(dest, JSON.stringify(merged), 'utf-8');
                      }
                    } catch {}
                  }
                }
              } catch {}
            }
          }
        }
      };

      // Periodic background scanner for MT5 direct file drops (every 3 seconds)
      const interval = setInterval(scanMT5DirectFiles, 3000);
      server.httpServer?.on('close', () => clearInterval(interval));

      const handleWebhookReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method === 'PUT') {
          let body = '';
          req.on('data', (chunk: string) => { body += chunk; });
          req.on('end', () => {
            try {
              const updatedTrade = JSON.parse(body);
              if (updatedTrade && (updatedTrade.id || updatedTrade.ticket)) {
                const idx = inMemoryTrades.findIndex((t: any) => 
                  (updatedTrade.ticket && t.ticket && String(t.ticket) === String(updatedTrade.ticket)) || 
                  (updatedTrade.id && t.id === updatedTrade.id)
                );
                if (idx >= 0) {
                  inMemoryTrades[idx] = { ...inMemoryTrades[idx], ...updatedTrade };
                } else {
                  inMemoryTrades.unshift(updatedTrade);
                }
                try {
                  fs.writeFileSync(syncFile, JSON.stringify(inMemoryTrades, null, 2), 'utf-8');
                } catch {}
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, trade: inMemoryTrades[idx >= 0 ? idx : 0] }));
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid trade data' }));
              }
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: string) => { body += chunk; });
          req.on('end', () => {
            try {
              const rawData = JSON.parse(body);
              const result = processSyncBundle(rawData);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `Successfully synced ${result.newCount} trade(s) from MT5!`,
                totalSynced: result.trades.length,
                accounts: result.accounts,
                account: result.account,
                openPositions: result.openPositions
              }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else if (req.method === 'GET') {
          scanMT5DirectFiles();
          if (fs.existsSync(syncFile)) {
            try { inMemoryTrades = JSON.parse(fs.readFileSync(syncFile, 'utf-8')); } catch {}
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(inMemoryTrades));
        } else if (req.method === 'DELETE') {
          inMemoryTrades = [];
          inMemoryStatus = { accounts: {}, account: null, openPositions: [], totalSyncedDeals: 0, lastSync: new Date().toISOString() };
          try {
            fs.writeFileSync(syncFile, '[]', 'utf-8');
            fs.writeFileSync(statusFile, JSON.stringify(inMemoryStatus, null, 2), 'utf-8');
          } catch {}
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Sync cache cleared' }));
        }
      };

      const handleStatusReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        scanMT5DirectFiles();
        if (fs.existsSync(statusFile)) {
          try {
            inMemoryStatus = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
          } catch {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(inMemoryStatus));
      };

      const handleClearReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        inMemoryTrades = [];
        inMemoryStatus = { accounts: {}, account: null, openPositions: [], totalSyncedDeals: 0, lastSync: new Date().toISOString() };
        try {
          fs.writeFileSync(syncFile, '[]', 'utf-8');
          fs.writeFileSync(statusFile, JSON.stringify(inMemoryStatus, null, 2), 'utf-8');
        } catch {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'All trades & sync history wiped cleanly' }));
      };

      const handleAccountToggleReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { login, action } = JSON.parse(body || '{}');
            const loginKey = String(login);
            if (loginKey && inMemoryStatus.accounts && inMemoryStatus.accounts[loginKey]) {
              const acc = inMemoryStatus.accounts[loginKey];
              if (action === 'disconnect') {
                acc.status = 'disconnected';
                acc.disconnectedAt = new Date().toISOString();
                // Clear open positions for this disconnected account
                inMemoryStatus.openPositions = (inMemoryStatus.openPositions || []).filter(
                  (p: any) => String(p.accountLogin) !== loginKey
                );
              } else {
                acc.status = 'connected';
                delete acc.disconnectedAt;
                delete acc.archivedAt;
                // Unblock from removed list
                if (inMemoryStatus.removedAccounts) {
                  inMemoryStatus.removedAccounts = inMemoryStatus.removedAccounts.filter((k: string) => k !== loginKey);
                }
              }
              try {
                fs.writeFileSync(statusFile, JSON.stringify(inMemoryStatus, null, 2), 'utf-8');
              } catch {}
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: true, 
                message: `Account #${loginKey} ${action === 'disconnect' ? 'disconnected (trade history preserved in vault)' : 'reconnected'}`,
                account: acc,
                accounts: inMemoryStatus.accounts
              }));
              return;
            }
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Account not found' }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      };

      const handleAccountAddReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { login, server, currency, isCent } = JSON.parse(body || '{}');
            const loginKey = String(login).trim();
            if (!loginKey) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Login is required' }));
              return;
            }

            // Unblock from removed list
            if (inMemoryStatus.removedAccounts) {
              inMemoryStatus.removedAccounts = inMemoryStatus.removedAccounts.filter((k: string) => k !== loginKey);
            }

            inMemoryStatus.accounts = inMemoryStatus.accounts || {};
            const existing = inMemoryStatus.accounts[loginKey];

            inMemoryStatus.accounts[loginKey] = {
              ...(existing || {}),
              login: loginKey,
              server: server || existing?.server || 'Exness-MT5Real26',
              currency: currency || existing?.currency || 'USD',
              balance: existing?.balance || 0,
              equity: existing?.equity || 0,
              margin: existing?.margin || 0,
              freeMargin: existing?.freeMargin || 0,
              isCent: isCent !== undefined ? isCent : (existing?.isCent || false),
              status: 'connected',
              lastUpdate: new Date().toISOString()
            };
            delete inMemoryStatus.accounts[loginKey].disconnectedAt;
            delete inMemoryStatus.accounts[loginKey].archivedAt;

            inMemoryStatus.account = inMemoryStatus.accounts[loginKey];

            try {
              fs.writeFileSync(statusFile, JSON.stringify(inMemoryStatus, null, 2), 'utf-8');
            } catch {}

            // Trigger terminal scan for this account
            try {
              scanMT5DirectFiles();
            } catch {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: `Account #${loginKey} connected to live auto sync!`,
              account: inMemoryStatus.accounts[loginKey],
              accounts: inMemoryStatus.accounts,
              trades: inMemoryTrades
            }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      };

      const handleAccountRemoveReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          try {
            const { login, type } = JSON.parse(body || '{}');
            const loginKey = String(login);

            inMemoryStatus.removedAccounts = inMemoryStatus.removedAccounts || [];
            if (!inMemoryStatus.removedAccounts.includes(loginKey)) {
              inMemoryStatus.removedAccounts.push(loginKey);
            }

            if (inMemoryStatus.accounts && inMemoryStatus.accounts[loginKey]) {
              delete inMemoryStatus.accounts[loginKey];
            }

            if (inMemoryStatus.account?.login === loginKey) {
              const remainingLogins = Object.keys(inMemoryStatus.accounts || {});
              inMemoryStatus.account = remainingLogins.length > 0 ? inMemoryStatus.accounts[remainingLogins[0]] : null;
            }

            inMemoryStatus.openPositions = (inMemoryStatus.openPositions || []).filter(
              (p: any) => String(p.accountLogin) !== loginKey
            );

            if (type === 'hard') {
              // Hard remove: Delete all trades from this account from database
              inMemoryTrades = inMemoryTrades.filter((t: any) => String(t.accountLogin) !== loginKey);
              try {
                fs.writeFileSync(syncFile, JSON.stringify(inMemoryTrades, null, 2), 'utf-8');
              } catch {}
            }

            inMemoryStatus.totalSyncedDeals = inMemoryTrades.length;
            try {
              fs.writeFileSync(statusFile, JSON.stringify(inMemoryStatus, null, 2), 'utf-8');
            } catch {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              message: `Account #${loginKey} ${type === 'hard' ? 'permanently removed and all trades wiped' : 'soft removed (trade history safely preserved in journal)'}`,
              type,
              accounts: inMemoryStatus.accounts,
              trades: inMemoryTrades
            }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      };

      const candlesDir = path.resolve(dataDir, 'candles');
      if (!fs.existsSync(candlesDir)) {
        fs.mkdirSync(candlesDir, { recursive: true });
      }

      const cleanSymbolName = (sym: string): string => {
        return String(sym || 'XAUUSD').replace(/(\.m|_m|ecn|#|c|m)$/i, '').toUpperCase().trim();
      };

      const fetchMT5CandlesLive = (symbol: string, timeframe: string, fromSec: number, toSec: number, count: number = 50000) => {
        try {
          const scriptPath = path.resolve(__dirname, 'scripts', 'fetch_mt5_candles.py');
          const cleanSym = cleanSymbolName(symbol);
          const tf = timeframe.toLowerCase();
          const cmd = `python "${scriptPath}" --symbol "${cleanSym}" --timeframe "${tf}" --from ${fromSec} --to ${toSec} --count ${count}`;
          execSync(cmd, { cwd: __dirname, timeout: 25000, stdio: 'pipe' });
        } catch (err: any) {
          // MT5 might not be running or symbols already fetched
        }
      };

      const normalizeTfKey = (tf: string): string => {
        const raw = String(tf || '5m').trim();
        const lower = raw.toLowerCase();
        if (raw === '1M' || lower === '1mn' || lower === 'mn1' || lower === 'monthly') return '1mn';
        if (lower === '1w' || lower === 'w1') return '1w';
        if (lower === '1d' || lower === 'd1') return '1d';
        if (lower === '4h' || lower === 'h4') return '4h';
        if (lower === '1h' || lower === 'h1') return '1h';
        if (lower === '30m') return '30m';
        if (lower === '15m') return '15m';
        if (lower === '1m') return '1m';
        return '5m';
      };

      const handleCandlesReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: string) => { body += chunk; });
          req.on('end', () => {
            try {
              const { symbol, timeframe, candles } = JSON.parse(body || '{}');
              if (symbol && Array.isArray(candles)) {
                const normSym = cleanSymbolName(symbol);
                const tf = normalizeTfKey(timeframe);
                const file = path.resolve(candlesDir, `${normSym}_${tf}.json`);
                
                let existing: any[] = [];
                if (fs.existsSync(file)) {
                  try { existing = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
                }
                
                const combinedMap = new Map<number, any>();
                existing.forEach(c => combinedMap.set(c.time, c));
                candles.forEach(c => combinedMap.set(c.time, c));

                const sorted = Array.from(combinedMap.values()).sort((a, b) => a.time - b.time);
                fs.writeFileSync(file, JSON.stringify(sorted, null, 2), 'utf-8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: sorted.length }));
                return;
              }
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'GET') {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
            const symbol = cleanSymbolName(urlObj.searchParams.get('symbol') || 'XAUUSD');
            const rawTf = urlObj.searchParams.get('timeframe') || '5m';
            const timeframe = normalizeTfKey(rawTf);
            const from = parseInt(urlObj.searchParams.get('from') || '0', 10);
            const to = parseInt(urlObj.searchParams.get('to') || '0', 10);
            const forceFetch = urlObj.searchParams.get('force') === 'true';
            const returnAll = urlObj.searchParams.get('all') === 'true';

            const file = path.resolve(candlesDir, `${symbol}_${timeframe}.json`);
            let savedCandles: any[] = [];
            if (fs.existsSync(file)) {
              try {
                savedCandles = JSON.parse(fs.readFileSync(file, 'utf-8'));
              } catch {}
            }

            const oldestSavedTime = savedCandles.length > 0 ? savedCandles[0].time : 0;
            const newestSavedTime = savedCandles.length > 0 ? savedCandles[savedCandles.length - 1].time : 0;
            const nowSec = Math.floor(Date.now() / 1000);

            const tfSecondsMap: Record<string, number> = {
              '1m': 60,
              '5m': 300,
              '15m': 900,
              '30m': 1800,
              '1h': 3600,
              '4h': 14400,
              '1d': 86400,
              '1w': 604800,
              '1mn': 2592000
            };
            const barSec = tfSecondsMap[timeframe] || 300;

            // Fetch if:
            // 1. We have no candles
            // 2. User forced fetch
            // 3. User requested backward scrolling (to <= oldestSavedTime)
            // 4. Latest saved candle is older than current time by more than 1.5 bars
            const isMissingNewCandles = newestSavedTime > 0 && (nowSec - newestSavedTime > barSec * 1.5);
            const needsFetch = (to > 0 && to <= oldestSavedTime) || savedCandles.length < 50 || forceFetch || isMissingNewCandles;

            if (needsFetch) {
              fetchMT5CandlesLive(symbol, timeframe, from, to, 50000);
              if (fs.existsSync(file)) {
                try {
                  savedCandles = JSON.parse(fs.readFileSync(file, 'utf-8'));
                } catch {}
              }
            }

            let resultCandles = savedCandles;

            // If range requested and not returnAll
            if (!returnAll && (from > 0 || to > 0)) {
              const reqFrom = from > 0 ? from : 0;
              const reqTo = to > 0 ? to : Math.floor(Date.now() / 1000) + 86400;
              const filtered = savedCandles.filter(c => c.time >= reqFrom && c.time <= reqTo);
              if (filtered.length >= 10) {
                resultCandles = filtered;
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              symbol,
              timeframe,
              candles: resultCandles,
              count: resultCandles.length,
              source: 'exness_mt5_database'
            }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        }
      };

      const handleCandlesSyncReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        try {
          const scriptPath = path.resolve(__dirname, 'scripts', 'fetch_mt5_candles.py');
          const output = execSync(`python "${scriptPath}" --all-trades --json`, {
            cwd: __dirname,
            timeout: 60000,
            encoding: 'utf-8'
          });
          const parsed = JSON.parse(output || '{}');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(parsed));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      };

      const startupLnkPath = path.join(
        process.env.APPDATA || '',
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Startup',
        'HyperTrade_AutoSync.lnk'
      );

      const handleAutoSyncStatusReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const pidFile = path.resolve(dataDir, 'auto_sync_daemon.pid');
        const logFile = path.resolve(dataDir, 'auto_sync_daemon.log');
        let isDaemonRunning = false;
        let daemonPid = null;

        if (fs.existsSync(pidFile)) {
          try {
            daemonPid = fs.readFileSync(pidFile, 'utf-8').trim();
            if (daemonPid) {
              try {
                process.kill(parseInt(daemonPid, 10), 0);
                isDaemonRunning = true;
              } catch {
                isDaemonRunning = false;
              }
            }
          } catch {}
        }

        const isStartupEnabled = fs.existsSync(startupLnkPath);
        let recentLogs: string[] = [];
        if (fs.existsSync(logFile)) {
          try {
            const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
            recentLogs = lines.slice(-8);
          } catch {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          isDaemonRunning,
          daemonPid,
          isStartupEnabled,
          lastSync: inMemoryStatus.lastSync || new Date().toISOString(),
          totalAccounts: Object.keys(inMemoryStatus.accounts || {}).length,
          accounts: inMemoryStatus.accounts,
          recentLogs
        }));
      };

      let isSyncInProgress = false;

      const handleAutoSyncRunReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (isSyncInProgress) {
          try {
            inMemoryTrades = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
            inMemoryStatus = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
          } catch {}

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Sync in progress, returning latest saved data',
            trades: inMemoryTrades,
            accounts: inMemoryStatus.accounts,
            account: inMemoryStatus.account,
            openPositions: inMemoryStatus.openPositions
          }));
          return;
        }

        isSyncInProgress = true;
        const syncScript = path.resolve(__dirname, 'scripts', 'sync_mt5_account.py');
        exec(`python "${syncScript}" --no-webhook`, { cwd: __dirname, timeout: 35000 }, (error, stdout, stderr) => {
          isSyncInProgress = false;
          try {
            inMemoryTrades = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
            inMemoryStatus = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
          } catch {}

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `All ${Object.keys(inMemoryStatus.accounts || {}).length} accounts synced seamlessly!`,
            trades: inMemoryTrades,
            accounts: inMemoryStatus.accounts,
            account: inMemoryStatus.account,
            openPositions: inMemoryStatus.openPositions
          }));
        });
      };

      const handleAutoSyncSetupStartupReq = (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        try {
          const installScript = path.resolve(__dirname, 'scripts', 'install_startup.py');
          execSync(`python "${installScript}"`, { cwd: __dirname, timeout: 15000, encoding: 'utf-8' });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            isStartupEnabled: true,
            message: 'PC Startup Auto-Sync enabled! All accounts will sync automatically whenever Windows boots.'
          }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      };

      // Fast, non-blocking periodic multi-account background sync every 3.5s
      const bgSyncInterval = setInterval(() => {
        if (isSyncInProgress) return;
        isSyncInProgress = true;
        const syncScript = path.resolve(__dirname, 'scripts', 'sync_mt5_account.py');
        exec(`python "${syncScript}" --no-webhook`, { cwd: __dirname }, (error, stdout, stderr) => {
          isSyncInProgress = false;
          if (!error) {
            try {
              if (fs.existsSync(syncFile)) inMemoryTrades = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
              if (fs.existsSync(statusFile)) inMemoryStatus = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
            } catch {}
          }
        });
      }, 3500);
      server.httpServer?.on('close', () => clearInterval(bgSyncInterval));

      server.middlewares.use('/api/webhook/trade', handleWebhookReq);
      server.middlewares.use('/api/webhook/batch', handleWebhookReq);
      server.middlewares.use('/api/webhook/status', handleStatusReq);
      server.middlewares.use('/api/sync/clear', handleClearReq);
      server.middlewares.use('/api/account/toggle', handleAccountToggleReq);
      server.middlewares.use('/api/account/remove', handleAccountRemoveReq);
      server.middlewares.use('/api/account/add', handleAccountAddReq);
      server.middlewares.use('/api/account/restore', handleAccountAddReq);
      server.middlewares.use('/api/candles/sync-mt5', handleCandlesSyncReq);
      server.middlewares.use('/api/candles', handleCandlesReq);
      server.middlewares.use('/api/autosync/status', handleAutoSyncStatusReq);
      server.middlewares.use('/api/autosync/run', handleAutoSyncRunReq);
      server.middlewares.use('/api/autosync/setup-startup', handleAutoSyncSetupStartupReq);
    }
  };
}

export default defineConfig(() => {
  // Force restart to reload clean trades from disk
  return {
    plugins: [react(), tailwindcss(), mt5SyncPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        overlay: false,
      },
      watch: {
        ignored: [
          '**/data/**',
          '**/data/**/*',
          '**/*.json',
          '**/compile.log',
          '**/.git/**',
          '**/MQL5/**',
          '**/MQL4/**',
          '**/scripts/**'
        ]
      },
    },
  };
});
