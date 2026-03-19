// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/KeyboardShortcutsProvider.tsx

import React, { createContext, useContext } from 'react';
import type { KeyboardShortcutsContextType, KeyboardShortcutsProviderProps } from './types';
import { useKeyboardShortcutsLogic } from './useKeyboardShortcutsLogic';
import { ShortcutsHelpDialog } from './ShortcutsHelpDialog';
import { KeySequenceIndicator } from './KeySequenceIndicator';

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

export const KeyboardShortcutsProvider: React.FC<KeyboardShortcutsProviderProps> = ({
  children,
}) => {
  const {
    shortcuts,
    addShortcut,
    removeShortcut,
    isHelpOpen,
    setIsHelpOpen,
    toggleHelp,
    executeShortcut,
    keySequence,
    groupedShortcuts,
  } = useKeyboardShortcutsLogic();

  const contextValue: KeyboardShortcutsContextType = {
    shortcuts,
    addShortcut,
    removeShortcut,
    isHelpOpen,
    toggleHelp,
    executeShortcut,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}

      <ShortcutsHelpDialog
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        groupedShortcuts={groupedShortcuts}
      />

      <KeySequenceIndicator keySequence={keySequence} />
    </KeyboardShortcutsContext.Provider>
  );
};
