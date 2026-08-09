import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Trade } from '../../types';
import { parseExnessFile, ParseResult } from '../../lib/parser';

interface CSVImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (parsedTrades: Trade[], replaceExisting: boolean) => void;
}

export const CSVImporterModal: React.FC<CSVImporterModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport
}) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleFile = async (file: File) => {
    setIsLoading(true);
    try {
      const res = await parseExnessFile(file);
      setParseResult(res);
    } catch (err: any) {
      setParseResult({
        trades: [],
        errors: [`Failed to parse file: ${err.message}`],
        totalParsed: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleConfirm = () => {
    if (parseResult && parseResult.trades.length > 0) {
      onConfirmImport(parseResult.trades, replaceExisting);
      onClose();
    }
  };

  const totalNetProfit = parseResult?.trades.reduce((sum, t) => sum + t.netProfit, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B0F19] border-b border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Trade Statement & Report Parser</h3>
              <p className="text-xs text-gray-400">Drag & drop MT4/MT5 CSV or HTML trade statement export files</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* File Upload Dropzone */}
          {!parseResult && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center transition-all ${
                dragActive ? 'border-amber-400 bg-amber-500/10' : 'border-[#1F2937] hover:border-amber-500/40 bg-[#0B0F19]'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-amber-400" />
              </div>

              <h4 className="text-sm font-bold text-white mb-1">
                Drop your MT4/MT5 or Broker CSV / HTML report here
              </h4>
              <p className="text-xs text-gray-400 max-w-md mb-4">
                Supports automated Gold (XAUUSD / GOLDm) and Forex pair detection, lot extraction, swap, commission, and pip calculations.
              </p>

              <label className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 transition-all">
                Select Report File
                <input type="file" accept=".csv,.htm,.html" onChange={handleFileInput} className="hidden" />
              </label>

              {isLoading && (
                <div className="mt-4 text-amber-400 font-semibold animate-pulse">
                  Parsing trade report structure...
                </div>
              )}
            </div>
          )}

          {/* Parse Preview Results */}
          {parseResult && (
            <div className="space-y-4">
              
              {/* Summary Stats Pill */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Parsed Trades Found</span>
                  <span className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    {parseResult.totalParsed} Executed Trades Ready
                  </span>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Import Net P&L</span>
                  <span className={`text-base font-extrabold ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalNetProfit >= 0 ? '+' : ''}${totalNetProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Errors if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Parser Warnings ({parseResult.errors.length})
                  </div>
                  {parseResult.errors.slice(0, 3).map((e, idx) => (
                    <div key={idx} className="text-[11px] text-rose-400">{e}</div>
                  ))}
                </div>
              )}

              {/* Trades Preview Table */}
              <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937] max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#1F2937] text-[10px] uppercase">
                      <th className="pb-2">Ticket</th>
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2 text-center">Type</th>
                      <th className="pb-2 text-center">Lots</th>
                      <th className="pb-2 text-right">Entry / Exit</th>
                      <th className="pb-2 text-right">Pips</th>
                      <th className="pb-2 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {parseResult.trades.map((t, idx) => (
                      <tr key={idx} className="font-mono text-[11px]">
                        <td className="py-2 text-gray-300">#{t.ticket}</td>
                        <td className="py-2 font-bold text-amber-400">{t.symbol}</td>
                        <td className="py-2 text-center font-bold">{t.direction}</td>
                        <td className="py-2 text-center">{t.lotSize}</td>
                        <td className="py-2 text-right text-gray-400">{t.openPrice} → {t.closePrice}</td>
                        <td className="py-2 text-right font-bold">{t.pips}</td>
                        <td className={`py-2 text-right font-bold ${t.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${t.netProfit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Options */}
              <div className="flex items-center gap-4 py-2 border-t border-[#1F2937]">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded bg-[#0B0F19] border-gray-700 text-amber-500 focus:ring-0"
                  />
                  <span>Replace existing journal trades with imported batch</span>
                </label>
              </div>

              {/* Confirm Actions */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setParseResult(null)}
                  className="px-4 py-2 bg-[#1F2937] text-gray-300 rounded-lg text-xs font-medium hover:bg-[#374151]"
                >
                  Choose Another File
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  Confirm Import ({parseResult.trades.length} Trades)
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
