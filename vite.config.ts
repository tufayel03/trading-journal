import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
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

        const accountLogin = trade.accountLogin ? String(trade.accountLogin) : (defaultAccount?.login ? String(defaultAccount.login) : '276133463');
        const accountServer = trade.accountServer || (defaultAccount?.server ? String(defaultAccount.server) : 'Live MT5');
        const accountCurrency = String(trade.accountCurrency || defaultAccount?.currency || 'USD').toUpperCase();

        const isCent = accountCurrency === 'USC' || 
                       accountCurrency.includes('CENT') || 
                       accountServer.toLowerCase().includes('cent');
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

        const parsedTrades = tradesList.map(t => parseIncomingTrade(t, accountData));
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

          const isCentAccount = String(accountData.currency || '').toUpperCase() === 'USC' || 
                                String(accountData.currency || '').toUpperCase().includes('CENT') ||
                                String(accountData.server || '').toLowerCase().includes('cent');
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
            const directSync = path.join(mt5Base, dir, 'MQL5', 'Files', 'journal_sync.json');
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
                // Unblock from removed list if previously removed
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

      server.middlewares.use('/api/webhook/trade', handleWebhookReq);
      server.middlewares.use('/api/webhook/batch', handleWebhookReq);
      server.middlewares.use('/api/webhook/status', handleStatusReq);
      server.middlewares.use('/api/sync/clear', handleClearReq);
      server.middlewares.use('/api/account/toggle', handleAccountToggleReq);
      server.middlewares.use('/api/account/remove', handleAccountRemoveReq);
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
