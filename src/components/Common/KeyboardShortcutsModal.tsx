import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', label: 'Log New Trade Modal' },
    { key: 'I', label: 'Import Exness Report CSV/HTML' },
    { key: '1', label: 'Navigate to Analytics Dashboard' },
    { key: '2', label: 'Navigate to Trade Log Table' },
    { key: '3', label: 'Navigate to Psychology Engine' },
    { key: '4', label: 'Navigate to Playbook Setups' },
    { key: 'Esc', label: 'Close Active Modal / Drawer' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between p-2 rounded-lg bg-[#0B0F19] border border-[#1F2937]">
              <span className="text-gray-300 font-medium">{s.label}</span>
              <kbd className="px-2.5 py-1 bg-[#1F2937] text-emerald-400 font-mono font-bold rounded border border-gray-700 text-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
