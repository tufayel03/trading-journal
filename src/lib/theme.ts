export type ThemeId = 'exness-gold' | 'oceanic-cyan' | 'cyberpunk-neon' | 'titanium-dark' | 'pro-light';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  previewColors: {
    bg: string;
    card: string;
    accent: string;
  };
  variables: {
    '--bg-canvas': string;
    '--bg-card': string;
    '--bg-card-hover': string;
    '--border-color': string;
    '--text-primary': string;
    '--text-secondary': string;
    '--text-muted': string;
    '--accent-gold': string;
    '--accent-gold-hover': string;
    '--accent-green': string;
    '--accent-red': string;
    '--accent-blue': string;
  };
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  'exness-gold': {
    id: 'exness-gold',
    name: 'HyperTrade Emerald Gold',
    description: 'Flagship dark layout with gold & emerald highlights',
    isDark: true,
    previewColors: {
      bg: '#0B0F19',
      card: '#111827',
      accent: '#F59E0B'
    },
    variables: {
      '--bg-canvas': '#0B0F19',
      '--bg-card': '#111827',
      '--bg-card-hover': '#1F2937',
      '--border-color': '#1E293B',
      '--text-primary': '#F9FAFB',
      '--text-secondary': '#94A3B8',
      '--text-muted': '#64748B',
      '--accent-gold': '#F59E0B',
      '--accent-gold-hover': '#D97706',
      '--accent-green': '#10B981',
      '--accent-red': '#EF4444',
      '--accent-blue': '#3B82F6'
    }
  },
  'oceanic-cyan': {
    id: 'oceanic-cyan',
    name: 'Oceanic Cyan & Indigo',
    description: 'Deep navy exchange vibe with bright cyan and indigo accents',
    isDark: true,
    previewColors: {
      bg: '#070C18',
      card: '#0F172A',
      accent: '#06B6D4'
    },
    variables: {
      '--bg-canvas': '#070C18',
      '--bg-card': '#0F172A',
      '--bg-card-hover': '#1E293B',
      '--border-color': '#1E293B',
      '--text-primary': '#F8FAFC',
      '--text-secondary': '#94A3B8',
      '--text-muted': '#64748B',
      '--accent-gold': '#06B6D4',
      '--accent-gold-hover': '#0891B2',
      '--accent-green': '#10B981',
      '--accent-red': '#F43F5E',
      '--accent-blue': '#6366F1'
    }
  },
  'cyberpunk-neon': {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    description: 'High-contrast dark obsidian canvas with neon purple & lime glows',
    isDark: true,
    previewColors: {
      bg: '#0D0714',
      card: '#170F24',
      accent: '#A855F7'
    },
    variables: {
      '--bg-canvas': '#0D0714',
      '--bg-card': '#170F24',
      '--bg-card-hover': '#241838',
      '--border-color': '#2E1C48',
      '--text-primary': '#FAFAFA',
      '--text-secondary': '#C084FC',
      '--text-muted': '#71717A',
      '--accent-gold': '#A855F7',
      '--accent-gold-hover': '#9333EA',
      '--accent-green': '#22C55E',
      '--accent-red': '#FF2A6D',
      '--accent-blue': '#38BDF8'
    }
  },
  'titanium-dark': {
    id: 'titanium-dark',
    name: 'Institutional Obsidian',
    description: 'Ultra dark titanium theme with crisp monochrome & green metrics',
    isDark: true,
    previewColors: {
      bg: '#121212',
      card: '#1E1E1E',
      accent: '#10B981'
    },
    variables: {
      '--bg-canvas': '#121212',
      '--bg-card': '#1E1E1E',
      '--bg-card-hover': '#2D2D2D',
      '--border-color': '#2A2A2A',
      '--text-primary': '#FFFFFF',
      '--text-secondary': '#A3A3A3',
      '--text-muted': '#737373',
      '--accent-gold': '#10B981',
      '--accent-gold-hover': '#059669',
      '--accent-green': '#10B981',
      '--accent-red': '#F87171',
      '--accent-blue': '#60A5FA'
    }
  },
  'pro-light': {
    id: 'pro-light',
    name: 'Institutional Light',
    description: 'Clean high-contrast daytime workspace with slate & gold tones',
    isDark: false,
    previewColors: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      accent: '#D97706'
    },
    variables: {
      '--bg-canvas': '#F1F5F9',
      '--bg-card': '#FFFFFF',
      '--bg-card-hover': '#F8FAFC',
      '--border-color': '#E2E8F0',
      '--text-primary': '#0F172A',
      '--text-secondary': '#475569',
      '--text-muted': '#94A3B8',
      '--accent-gold': '#D97706',
      '--accent-gold-hover': '#B45309',
      '--accent-green': '#059669',
      '--accent-red': '#DC2626',
      '--accent-blue': '#2563EB'
    }
  }
};

export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES[themeId] || THEMES['exness-gold'];
  const root = document.documentElement;

  // Apply CSS Variables
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Toggle dark/light class on root
  if (theme.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // Save to localStorage
  try {
    localStorage.setItem('exness_theme_v1', themeId);
  } catch (e) {
    console.error('Failed to save theme setting', e);
  }
}

export function loadSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem('exness_theme_v1') as ThemeId;
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'exness-gold';
}

export type ZoomLevel = 90 | 95 | 100 | 105 | 110 | 115 | 120 | 125;

export function applyZoom(zoom: ZoomLevel): void {
  const root = document.documentElement;
  root.style.setProperty('--app-zoom', `${zoom / 100}`);
  try {
    localStorage.setItem('exness_zoom_v1', String(zoom));
  } catch (e) {
    console.error('Failed to save zoom setting', e);
  }
}

export function loadSavedZoom(): ZoomLevel {
  try {
    const saved = localStorage.getItem('exness_zoom_v1');
    if (saved) {
      const num = parseInt(saved, 10) as ZoomLevel;
      if ([90, 95, 100, 105, 110, 115, 120, 125].includes(num)) {
        return num;
      }
    }
  } catch {}
  return 115; // default zoomed-in for optimal widescreen legibility
}

