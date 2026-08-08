# Exness Forex & Gold (XAUUSD) Trading Journal

A modern, high-performance, dark-themed **Tradezella alternative** built for Forex and Gold (`XAUUSD`) traders on **Exness**.

---

## Features & Highlights

- **Forex & Gold (XAUUSD) Calculation Engine**:
  - Automatically calculates **Pips** ($0.10 for Gold, 0.0001 for 5-digit Forex pairs, 0.01 for JPY).
  - Calculates **R-Multiple** (Risk-to-Reward ratio) and **Planned Risk ($)**.
  - Computes **Net P&L**, **Profit Factor**, **Trade Expectancy**, and **Max Drawdown**.
- **Interactive Visualizations**:
  - **Equity Curve**: Cumulative balance growth chart.
  - **Calendar Heatmap**: Monthly calendar with daily P&L and green/red days.
  - **Mistake Breakdown**: Quantified dollar cost of execution errors (FOMO, Moved SL, Early Exit).
  - **Session & Pair Performance**: Compare performance across Asian, London Open, NY AM, and NY PM sessions.
- **Exness Trade Importer**:
  - Drag-and-drop parser for Exness MT4/MT5 **CSV** and **HTML** statement reports.
  - Automatically normalizes symbols (`XAUUSDm`, `GOLD`, `EURUSDm`).
- **Psychology & Playbook**:
  - Tag emotional state (`Disciplined`, `FOMO`, `Revenge`, `Greedy`).
  - Playbook review with Grade A+/A setups and before/after chart markup screenshots.
- **100% Local & Private**:
  - All trades, stats, and screenshots are stored safely on your local machine.

---

## How to Run Locally

### 1. Start the Local App
From this directory:
```bash
npm run dev
```

### 2. Open in Your Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `N` | Add New Trade Manually |
| `I` | Open Exness CSV/HTML Importer |
| `1` | Navigate to **Analytics Dashboard** |
| `2` | Navigate to **Trade Log Table** |
| `3` | Navigate to **Psychology Engine** |
| `4` | Navigate to **Playbook Setups** |
| `Esc` | Close any active modal |

---

## How to Export from Exness MT4/MT5

1. In Exness MT4/MT5, open the **History** tab (at the bottom terminal panel).
2. Right-click anywhere in the trade history list and select:
   - **Report** → **Open XML / HTML / CSV** (or **Save as Detailed Report**).
3. In this journal, press `I` or click **"Import Exness CSV"**.
4. Drag and drop the file — all trades will be parsed and calculated instantly!
