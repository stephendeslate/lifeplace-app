// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/useKeyboardShortcutsLogic.ts

import { useState, useEffect, useCallback } from 'react';
import type { KeyboardShortcut, KeyboardShortcutsContextType } from './types';
import { createDefaultShortcuts } from './defaultShortcuts';

interface UseKeyboardShortcutsLogicReturn extends KeyboardShortcutsContextType {
  keySequence: string[];
  groupedShortcuts: Record<string, KeyboardShortcut[]>;
  setIsHelpOpen: (open: boolean) => void;
}

export function useKeyboardShortcutsLogic(): UseKeyboardShortcutsLogicReturn {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [keySequence, setKeySequence] = useState<string[]>([]);

  // Initialize default shortcuts
  useEffect(() => {
    setShortcuts(createDefaultShortcuts(() => setIsHelpOpen(true)));
  }, []);

  const addShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => [...prev.filter((s) => s.id !== shortcut.id), shortcut]);
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const executeShortcut = useCallback(
    (keys: string[]): boolean => {
      const shortcut = shortcuts.find(
        (s) =>
          s.enabled &&
          s.keys.length === keys.length &&
          s.keys.every((key, index) => key === keys[index]),
      );

      if (shortcut) {
        shortcut.action();
        return true;
      }
      return false;
    },
    [shortcuts],
  );

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const key = event.key;
      const newPressedKeys = new Set(pressedKeys);

      // Handle modifier keys
      if (event.metaKey) newPressedKeys.add('Meta');
      if (event.ctrlKey) newPressedKeys.add('Control');
      if (event.altKey) newPressedKeys.add('Alt');
      if (event.shiftKey) newPressedKeys.add('Shift');

      // Add the main key
      newPressedKeys.add(key);
      setPressedKeys(newPressedKeys);

      // Build key sequence for sequential shortcuts (like 'g' then 'h')
      const currentSequence = [...keySequence];

      // Reset sequence after timeout or if it gets too long
      if (currentSequence.length > 3) {
        currentSequence.length = 0;
      }

      // For letter keys, add to sequence
      if (key.length === 1 && /[a-zA-Z?]/.test(key)) {
        currentSequence.push(key.toLowerCase());
        setKeySequence(currentSequence);
      }

      // Try to execute shortcuts with current pressed keys
      const currentKeys = Array.from(newPressedKeys);
      if (executeShortcut(currentKeys)) {
        event.preventDefault();
        setPressedKeys(new Set());
        setKeySequence([]);
        return;
      }

      // Try to execute sequential shortcuts
      if (currentSequence.length >= 2) {
        if (executeShortcut(currentSequence)) {
          event.preventDefault();
          setKeySequence([]);
          return;
        }
      }

      // Handle single key shortcuts (like '?' for help)
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (executeShortcut([key])) {
          event.preventDefault();
          setPressedKeys(new Set());
          setKeySequence([]);
          return;
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const newPressedKeys = new Set(pressedKeys);

      // Remove modifier keys
      if (!event.metaKey) newPressedKeys.delete('Meta');
      if (!event.ctrlKey) newPressedKeys.delete('Control');
      if (!event.altKey) newPressedKeys.delete('Alt');
      if (!event.shiftKey) newPressedKeys.delete('Shift');

      // Remove the main key
      newPressedKeys.delete(event.key);
      setPressedKeys(newPressedKeys);
    };

    // Clear sequence after timeout
    const clearSequenceTimeout = setTimeout(() => {
      setKeySequence([]);
    }, 2000);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      clearTimeout(clearSequenceTimeout);
    };
  }, [pressedKeys, keySequence, executeShortcut]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!shortcut.enabled) return acc;
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>,
  );

  return {
    shortcuts,
    addShortcut,
    removeShortcut,
    isHelpOpen,
    setIsHelpOpen,
    toggleHelp,
    executeShortcut,
    keySequence,
    groupedShortcuts,
  };
}
