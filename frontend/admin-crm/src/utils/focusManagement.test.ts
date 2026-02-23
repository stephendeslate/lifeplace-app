import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  safeBlyurActiveElement,
  safeFocusElement,
  storeFocusedElement,
  handleKeyboardActivation,
  handleEscapeKey,
  getEnhancedDialogProps,
  getFocusVisibleStyles,
  isElementInDialog,
} from './focusManagement';

describe('safeBlyurActiveElement', () => {
  it('blurs the currently focused element', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    const blurSpy = vi.spyOn(button, 'blur');

    safeBlyurActiveElement();

    expect(blurSpy).toHaveBeenCalled();
    document.body.removeChild(button);
  });

  it('does nothing when body is focused', () => {
    // body is the default activeElement
    document.body.focus();
    // Should not throw
    safeBlyurActiveElement();
  });
});

describe('safeFocusElement', () => {
  it('focuses the primary element', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const focusSpy = vi.spyOn(input, 'focus');

    safeFocusElement(input);

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('uses fallback when primary is null', () => {
    const fallback = document.createElement('button');
    document.body.appendChild(fallback);
    const focusSpy = vi.spyOn(fallback, 'focus');

    safeFocusElement(null, fallback);

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(fallback);
  });

  it('handles element not in DOM gracefully', () => {
    const detached = document.createElement('input');
    // not appended to document
    safeFocusElement(detached);
    // Should not throw
  });

  it('handles delay parameter', async () => {
    vi.useFakeTimers();
    const input = document.createElement('input');
    document.body.appendChild(input);
    const focusSpy = vi.spyOn(input, 'focus');

    safeFocusElement(input, null, 100);
    expect(focusSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(input);
    vi.useRealTimers();
  });
});

describe('storeFocusedElement', () => {
  it('returns the currently focused element', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const stored = storeFocusedElement();
    expect(stored).toBe(button);

    document.body.removeChild(button);
  });

  it('returns null when body is focused', () => {
    expect(storeFocusedElement()).toBeNull();
  });

  it('returns null for elements inside a dialog', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);
    button.focus();

    const stored = storeFocusedElement();
    expect(stored).toBeNull();

    document.body.removeChild(dialog);
  });
});

describe('handleKeyboardActivation', () => {
  let onActivate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onActivate = vi.fn();
  });

  it('calls onActivate on Enter', () => {
    const event = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    handleKeyboardActivation(event, onActivate);
    expect(onActivate).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('calls onActivate on Space', () => {
    const event = {
      key: ' ',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    handleKeyboardActivation(event, onActivate);
    expect(onActivate).toHaveBeenCalled();
  });

  it('does not call onActivate on other keys', () => {
    const event = {
      key: 'Tab',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    handleKeyboardActivation(event, onActivate);
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('handleEscapeKey', () => {
  it('calls onEscape on Escape', () => {
    const onEscape = vi.fn();
    const event = {
      key: 'Escape',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    handleEscapeKey(event, onEscape);
    expect(onEscape).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not call onEscape when isLoading=true', () => {
    const onEscape = vi.fn();
    const event = {
      key: 'Escape',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    handleEscapeKey(event, onEscape, true);
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('does not call onEscape on other keys', () => {
    const onEscape = vi.fn();
    const event = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;
    handleEscapeKey(event, onEscape);
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe('getEnhancedDialogProps', () => {
  it('returns base props without optional params', () => {
    const props = getEnhancedDialogProps();
    expect(props.disableRestoreFocus).toBe(false);
    expect(props.disableEnforceFocus).toBe(false);
    expect(props.keepMounted).toBe(false);
  });

  it('includes aria-labelledby when provided', () => {
    const props = getEnhancedDialogProps('dialog-title');
    expect(props['aria-labelledby']).toBe('dialog-title');
  });

  it('includes aria-describedby when provided', () => {
    const props = getEnhancedDialogProps(undefined, 'dialog-description');
    expect(props['aria-describedby']).toBe('dialog-description');
  });
});

describe('getFocusVisibleStyles', () => {
  it('returns styles with default color when no theme', () => {
    const styles = getFocusVisibleStyles();
    expect(styles['&:focus-visible'].outlineColor).toBe('#0087ff');
  });

  it('uses theme color when provided', () => {
    const theme = { palette: { primary: { main: '#ff0000' } } };
    const styles = getFocusVisibleStyles(theme);
    expect(styles['&:focus-visible'].outlineColor).toBe('#ff0000');
  });
});

describe('isElementInDialog', () => {
  it('returns true when inside [role="dialog"]', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const button = document.createElement('button');
    dialog.appendChild(button);
    document.body.appendChild(dialog);

    expect(isElementInDialog(button)).toBe(true);

    document.body.removeChild(dialog);
  });

  it('returns true when inside .MuiModal-root', () => {
    const modal = document.createElement('div');
    modal.classList.add('MuiModal-root');
    const button = document.createElement('button');
    modal.appendChild(button);
    document.body.appendChild(modal);

    expect(isElementInDialog(button)).toBe(true);

    document.body.removeChild(modal);
  });

  it('returns false when outside both', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);

    expect(isElementInDialog(button)).toBe(false);

    document.body.removeChild(button);
  });
});
