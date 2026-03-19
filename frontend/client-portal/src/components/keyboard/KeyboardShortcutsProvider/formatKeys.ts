// frontend/client-portal/src/components/keyboard/KeyboardShortcutsProvider/formatKeys.ts

export function formatKeys(keys: string[]): string {
  return keys
    .map((key) => {
      switch (key) {
        case 'Meta':
          return '\u2318';
        case 'Control':
          return 'Ctrl';
        case 'Alt':
          return '\u2325';
        case 'Shift':
          return '\u21E7';
        case 'ArrowUp':
          return '\u2191';
        case 'ArrowDown':
          return '\u2193';
        case 'ArrowLeft':
          return '\u2190';
        case 'ArrowRight':
          return '\u2192';
        case 'Escape':
          return 'Esc';
        case ' ':
          return 'Space';
        default:
          return key;
      }
    })
    .join(' + ');
}
