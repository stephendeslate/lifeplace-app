// frontend/admin-crm/src/utils/focusManagement.ts

/**
 * Utility functions for managing focus in React components to ensure accessibility compliance
 * and prevent aria-hidden focus issues with MUI dialogs and other components.
 */

/**
 * Safely blur the currently focused element if it's not the document body
 * This prevents focus from being trapped in elements that will become aria-hidden
 */
export const safeBlyurActiveElement = (): void => {
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement && activeElement.blur && activeElement !== document.body) {
    try {
      activeElement.blur();
    } catch (error) {
      console.warn('Failed to blur active element:', error);
    }
  }
};

/**
 * Safely focus an element with error handling and fallback
 * @param element - The element to focus
 * @param fallbackElement - Fallback element to focus if primary fails
 * @param delay - Optional delay before focusing (useful after dialog animations)
 */
export const safeFocusElement = (
  element: HTMLElement | null, 
  fallbackElement?: HTMLElement | null,
  delay: number = 0
): void => {
  const focusAction = () => {
    try {
      if (element && document.contains(element)) {
        element.focus();
        return;
      }
      
      if (fallbackElement && document.contains(fallbackElement)) {
        fallbackElement.focus();
        return;
      }
    } catch (error) {
      console.warn('Failed to focus element:', error);
      // Try fallback element if primary fails
      if (fallbackElement && document.contains(fallbackElement)) {
        try {
          fallbackElement.focus();
        } catch (fallbackError) {
          console.warn('Failed to focus fallback element:', fallbackError);
        }
      }
    }
  };

  if (delay > 0) {
    setTimeout(focusAction, delay);
  } else {
    focusAction();
  }
};

/**
 * Store the currently focused element for later restoration
 * Only stores elements that are likely to remain in the DOM
 */
export const storeFocusedElement = (): HTMLElement | null => {
  const activeElement = document.activeElement as HTMLElement;
  
  // Don't store focus for temporary elements or elements inside dialogs
  if (activeElement && 
      activeElement !== document.body && 
      !activeElement.closest('[role="dialog"]') &&
      !activeElement.closest('.MuiModal-root')) {
    return activeElement;
  }
  
  return null;
};

/**
 * Enhanced dialog close handler that manages focus properly
 * @param onClose - The original close handler
 * @param storedFocusElement - Previously stored focus element
 * @param fallbackElement - Fallback element to focus
 * @param isLoading - Whether the dialog is in a loading state
 */
export const createDialogCloseHandler = (
  onClose: () => void,
  storedFocusElement: HTMLElement | null,
  fallbackElement?: HTMLElement | null,
  isLoading: boolean = false
) => {
  return () => {
    if (isLoading) return;

    // Clear focus from dialog elements first
    safeBlyurActiveElement();
    
    // Close the dialog
    setTimeout(() => {
      onClose();
      
      // Restore focus after dialog close animation
      setTimeout(() => {
        safeFocusElement(storedFocusElement, fallbackElement, 0);
      }, 100);
    }, 10);
  };
};

/**
 * Get enhanced dialog props for better accessibility
 * @param ariaLabelledBy - ID of the element that labels the dialog
 * @param ariaDescribedBy - ID of the element that describes the dialog
 */
export const getEnhancedDialogProps = (
  ariaLabelledBy?: string,
  ariaDescribedBy?: string
) => ({
  disableRestoreFocus: false,
  disableEnforceFocus: false,
  keepMounted: false,
  ...(ariaLabelledBy && { 'aria-labelledby': ariaLabelledBy }),
  ...(ariaDescribedBy && { 'aria-describedby': ariaDescribedBy }),
});

/**
 * Enhanced menu close handler that restores focus to the trigger button
 * @param setMenuAnchor - Function to close the menu
 * @param triggerButtonRef - Ref to the button that opened the menu
 * @param shouldRestoreFocus - Whether to restore focus (false for navigation actions)
 */
export const createMenuCloseHandler = (
  setMenuAnchor: (anchor: null) => void,
  triggerButtonRef: React.RefObject<HTMLElement>,
  shouldRestoreFocus: boolean = true
) => {
  return () => {
    setMenuAnchor(null);
    
    if (shouldRestoreFocus) {
      // Small delay to ensure menu is closed before focusing
      setTimeout(() => {
        safeFocusElement(triggerButtonRef.current);
      }, 100);
    }
  };
};

/**
 * Handle keyboard navigation for custom interactive elements
 * @param event - Keyboard event
 * @param onActivate - Function to call when Enter or Space is pressed
 */
export const handleKeyboardActivation = (
  event: React.KeyboardEvent,
  onActivate: () => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
};

/**
 * Enhanced focus styles for custom interactive elements
 */
export const getFocusVisibleStyles = (theme?: { palette?: { primary?: { main?: string } } }) => ({
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: theme?.palette?.primary?.main || '#0087ff',
    outlineOffset: '2px',
  }
});

/**
 * Create a ref callback that automatically focuses an element when it mounts
 * Useful for focusing the first input in dialogs
 * @param delay - Delay before focusing (to wait for animations)
 */
export const createAutoFocusRef = (delay: number = 150) => {
  return (element: HTMLElement | null) => {
    if (element) {
      safeFocusElement(element, null, delay);
    }
  };
};

/**
 * Check if an element is within a dialog or modal
 * @param element - Element to check
 */
export const isElementInDialog = (element: HTMLElement): boolean => {
  return !!(element.closest('[role="dialog"]') || element.closest('.MuiModal-root'));
};

/**
 * Escape key handler for dialogs and modals
 * @param event - Keyboard event
 * @param onEscape - Function to call when Escape is pressed
 * @param isLoading - Whether to ignore escape (e.g., during loading)
 */
export const handleEscapeKey = (
  event: React.KeyboardEvent,
  onEscape: () => void,
  isLoading: boolean = false
) => {
  if (event.key === 'Escape' && !isLoading) {
    event.preventDefault();
    onEscape();
  }
};