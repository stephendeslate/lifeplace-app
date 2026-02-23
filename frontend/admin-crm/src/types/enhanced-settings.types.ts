import type { SvgIconComponent } from '@mui/icons-material';

export interface SettingsFavorite {
  id: string;
  path: string;
  label: string;
  addedAt: string;
}

export interface SettingsConfigHealth {
  status: 'healthy' | 'warning' | 'error' | 'incomplete';
  completionRate: number;
  issues?: string[];
  lastUpdated?: string;
}

export interface EnhancedSettingsNavigationItem {
  id: string;
  label: string;
  path: string;
  icon: SvgIconComponent;
  description?: string;
  badge?: {
    type: 'info' | 'warning' | 'error' | 'success';
    content: string | number;
  };
  configHealth?: SettingsConfigHealth;
  quickActions?: Array<{
    id: string;
    label: string;
    action: () => void;
  }>;
  keywords?: string[];
  relatedSettings?: string[];
}

export interface EnhancedSettingsNavigationGroup {
  id: string;
  label: string;
  items: EnhancedSettingsNavigationItem[];
  completionRate?: number;
  expandedByDefault?: boolean;
}

export interface SettingsFormSection {
  id: string;
  title: string;
  description?: string;
  fields: React.ReactNode;
  isComplete?: boolean;
  isExpanded?: boolean;
  validationErrors?: string[];
}

export interface AutoSaveState {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved?: string;
  error?: string;
}

export interface SettingsPreviewMode {
  enabled: boolean;
  changes: Record<string, unknown>;
  originalValues: Record<string, unknown>;
}

export interface SmartCardProps {
  id: string;
  title: string;
  description?: string;
  icon?: SvgIconComponent;
  completionRate?: number;
  lastUpdated?: string;
  quickActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: SvgIconComponent;
  }>;
  preview?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'gradient' | 'outlined';
  animation?: 'none' | 'hover-lift' | 'hover-glow' | 'hover-scale';
}

export interface ProgressiveFormProps {
  sections: SettingsFormSection[];
  onSubmit: (values: Record<string, unknown>) => void;
  autoSave?: boolean;
  preview?: boolean;
  completionTracking?: boolean;
  variant?: 'stepped' | 'accordion' | 'tabs';
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontScale: number;
  animations: boolean;
  reducedMotion: boolean;
}

export interface SettingsContextValue {
  favorites: SettingsFavorite[];
  addFavorite: (item: SettingsFavorite) => void;
  removeFavorite: (id: string) => void;
  theme: ThemeSettings;
  setTheme: (theme: Partial<ThemeSettings>) => void;
}
