import React, { useState } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { THEMES, ThemeId, ThemeConfig, applyTheme } from '../lib/theme';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  variant?: 'popover' | 'inline' | 'compact';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange,
  variant = 'popover'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (id: ThemeId) => {
    applyTheme(id);
    onThemeChange(id);
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className="space-y-3">
        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-[var(--accent-gold)]" /> Choose App Color Palette
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.values(THEMES).map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                type="button"
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 shadow-md ring-1 ring-[var(--accent-gold)]/30'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1.5 rounded-lg border border-[var(--border-color)]" style={{ backgroundColor: theme.previewColors.bg }}>
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: theme.previewColors.card }} />
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: theme.previewColors.accent }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      {theme.name}
                      {!theme.isDark && (
                        <span className="text-[9px] px-1 py-0.2 bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] rounded font-semibold">Light</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{theme.description}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[var(--accent-gold)] shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={variant === 'compact'
          ? "px-2 py-1 flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-white rounded-md hover:bg-[var(--bg-card-hover)] transition-colors"
          : "h-9 px-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] transition-all shadow-sm"
        }
        title={`Change Theme (Current: ${THEMES[currentTheme]?.name || 'Theme'})`}
      >
        <Palette className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
        {variant !== 'compact' && (
          <span className="hidden xl:inline">{THEMES[currentTheme]?.name || 'Theme'}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)] px-1">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> Select Theme
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">5 Presets</span>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {Object.values(THEMES).map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--text-primary)] font-bold'
                        : 'border-[var(--border-color)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--border-color)]" style={{ backgroundColor: theme.previewColors.bg }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.previewColors.card }} />
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.previewColors.accent }} />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-none text-[var(--text-primary)]">{theme.name}</div>
                        <div className="text-[9px] text-[var(--text-secondary)] mt-0.5">{theme.description}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
