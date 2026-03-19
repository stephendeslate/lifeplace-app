// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/types.ts

import React from 'react';

export interface KeyboardShortcut {
  id: string;
  category: string;
  description: string;
  keys: string[];
  action: () => void;
  icon?: React.ReactNode;
  enabled?: boolean;
}

export interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  addShortcut: (shortcut: KeyboardShortcut) => void;
  removeShortcut: (id: string) => void;
  isHelpOpen: boolean;
  toggleHelp: () => void;
  executeShortcut: (keys: string[]) => boolean;
}

export interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}
