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

      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (!fs.existsSync(syncFile)) {
        fs.writeFileSync(syncFile, '[]', 'utf-8');
      }

      server.middlewares.use('/api/webhook/trade', (req, res) => {
        // Enable CORS for MT5 and local scripts
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const trade = JSON.parse(body);
              let existing = [];
              try {
                existing = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
              } catch {}

              const newTrade = {
                id: trade.id || `mt5-${trade.ticket || Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                ticket: trade.ticket ? String(trade.ticket) : undefined,
                symbol: trade.symbol || 'XAUUSD',
                direction: trade.direction || (trade.type === 'DEAL_TYPE_BUY' || trade.type === 'BUY' ? 'BUY' : 'SELL'),
                openTime: trade.openTime || new Date(Date.now() - 3600000).toISOString(),
                closeTime: trade.closeTime || new Date().toISOString(),
                openPrice: parseFloat(trade.openPrice || trade.closePrice || 0),
                closePrice: parseFloat(trade.closePrice || trade.openPrice || 0),
                stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
                takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
                lotSize: parseFloat(trade.lots || trade.lotSize || 0.1),
                netProfit: parseFloat(trade.profit || trade.netProfit || 0),
                pips: parseFloat(trade.pips || 0),
                commission: parseFloat(trade.commission || 0),
                swap: parseFloat(trade.swap || 0),
                session: trade.session || 'NY_AM',
                strategy: trade.strategy || 'Exness MT5 Live Sync',
                confluences: trade.confluences || ['MT5 Automated Sync'],
                mistakes: trade.mistakes || [],
                emotions: trade.emotions || 'Disciplined',
                notes: trade.notes || 'Auto-synced directly from Exness MT5 Terminal',
                receivedAt: new Date().toISOString()
              };

              // De-duplicate by MT5 ticket
              const index = existing.findIndex((t: any) => t.ticket && String(t.ticket) === String(newTrade.ticket));
              if (index >= 0) {
                existing[index] = { ...existing[index], ...newTrade };
              } else {
                existing.unshift(newTrade);
              }

              fs.writeFileSync(syncFile, JSON.stringify(existing, null, 2), 'utf-8');

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `Trade ${newTrade.ticket || newTrade.id} successfully synced to local journal!`,
                trade: newTrade,
                totalSynced: existing.length
              }));
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(syncFile, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('[]');
          }
        } else if (req.method === 'DELETE') {
          fs.writeFileSync(syncFile, '[]', 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Sync cache cleared' }));
        }
      });
    }
  };
}

export default defineConfig(() => {
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
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
