// shared/test-utils/accessibility-helpers.ts
/// <reference types="./types" />
import { within, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// Using vitest globals

/**
 * Accessibility testing utilities for WCAG compliance
 * These utilities help ensure our components meet accessibility standards
 */

/**
 * Test keyboard navigation through focusable elements
 */
export const testKeyboardNavigation = async (container: HTMLElement) => {
  const user = userEvent.setup()
  
  // Get all focusable elements using multiple strategies
  const buttonElements = within(container).queryAllByRole('button')
  const linkElements = within(container).queryAllByRole('link')
  const textboxElements = within(container).queryAllByRole('textbox')
  const checkboxElements = within(container).queryAllByRole('checkbox')
  const radioElements = within(container).queryAllByRole('radio')
  
  const focusableElements = [
    ...buttonElements,
    ...linkElements,
    ...textboxElements,
    ...checkboxElements,
    ...radioElements,
  ]

  if (focusableElements.length === 0) {
    throw new Error('No focusable elements found for keyboard navigation test')
  }

  // Test Tab navigation
  for (let i = 0; i < focusableElements.length; i++) {
    await user.tab()
    const activeElement = document.activeElement
    expect(focusableElements).toContain(activeElement)
  }

  // Test Shift+Tab navigation
  for (let i = focusableElements.length - 1; i >= 0; i--) {
    await user.tab({ shift: true })
    const activeElement = document.activeElement
    expect(focusableElements).toContain(activeElement)
  }
}

/**
 * Test screen reader announcements using aria-live regions
 */
export const testScreenReaderAnnouncements = (container: HTMLElement) => {
  const liveRegions = within(container).queryAllByRole('status') ||
                     within(container).queryAllByRole('alert') ||
                     container.querySelectorAll('[aria-live]')

  return {
    hasLiveRegions: liveRegions.length > 0,
    liveRegions,
    announceChange: (text: string) => {
      if (liveRegions.length > 0) {
        liveRegions[0].textContent = text
      }
    },
  }
}

/**
 * Test focus management for modal dialogs and overlays
 */
export const testFocusTrap = async (dialogElement: HTMLElement) => {
  const user = userEvent.setup()
  
  // Get all focusable elements using multiple strategies
  const buttonElements = within(dialogElement).queryAllByRole('button')
  const linkElements = within(dialogElement).queryAllByRole('link')
  const textboxElements = within(dialogElement).queryAllByRole('textbox')
  const checkboxElements = within(dialogElement).queryAllByRole('checkbox')
  const radioElements = within(dialogElement).queryAllByRole('radio')
  
  const focusableElements = [
    ...buttonElements,
    ...linkElements,
    ...textboxElements,
    ...checkboxElements,
    ...radioElements,
  ]

  if (focusableElements.length < 2) {
    return // Need at least 2 focusable elements to test trap
  }

  // Focus should be on first element
  focusableElements[0].focus()
  expect(document.activeElement).toBe(focusableElements[0])

  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    await user.tab()
    expect(document.activeElement).toBe(focusableElements[i])
  }

  // Tab from last element should wrap to first
  await user.tab()
  expect(document.activeElement).toBe(focusableElements[0])

  // Shift+tab from first element should wrap to last
  await user.tab({ shift: true })
  expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1])
}

/**
 * Test ARIA labels and descriptions
 */
export const testAriaLabels = (element: HTMLElement) => {
  const ariaLabel = element.getAttribute('aria-label')
  const ariaLabelledBy = element.getAttribute('aria-labelledby')
  const ariaDescribedBy = element.getAttribute('aria-describedby')

  const hasAccessibleName = ariaLabel || ariaLabelledBy || element.textContent

  return {
    hasAriaLabel: !!ariaLabel,
    hasAriaLabelledBy: !!ariaLabelledBy,
    hasAriaDescribedBy: !!ariaDescribedBy,
    hasAccessibleName: !!hasAccessibleName,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
  }
}

/**
 * Test color contrast ratios (simplified check)
 */
export const testColorContrast = (element: HTMLElement) => {
  const styles = window.getComputedStyle(element)
  const backgroundColor = styles.backgroundColor
  const color = styles.color

  // Basic check - in a real implementation, you'd calculate actual contrast ratios
  const hasBackgroundColor = backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)'
  const hasTextColor = color && color !== 'rgba(0, 0, 0, 0)'

  return {
    backgroundColor,
    textColor: color,
    hasDefinedColors: hasBackgroundColor && hasTextColor,
  }
}

/**
 * Test form accessibility features
 */
export const testFormAccessibility = (formElement: HTMLElement) => {
  // Get form inputs using multiple strategies
  const textboxElements = within(formElement).queryAllByRole('textbox')
  const checkboxElements = within(formElement).queryAllByRole('checkbox')
  const radioElements = within(formElement).queryAllByRole('radio')
  const comboboxElements = within(formElement).queryAllByRole('combobox')
  
  const inputs = [
    ...textboxElements,
    ...checkboxElements,
    ...radioElements,
    ...comboboxElements,
  ]
  
  const labels = formElement.querySelectorAll('label')

  const results = inputs.map(input => {
    const inputId = input.getAttribute('id')
    const ariaLabel = input.getAttribute('aria-label')
    const ariaLabelledBy = input.getAttribute('aria-labelledby')
    const ariaDescribedBy = input.getAttribute('aria-describedby')
    
    // Check if input has associated label
    const associatedLabel = Array.from(labels).find(label => 
      label.getAttribute('for') === inputId
    )

    const isRequired = input.hasAttribute('required') || input.getAttribute('aria-required') === 'true'
    const hasErrorDescription = !!ariaDescribedBy

    return {
      input,
      hasLabel: !!associatedLabel || !!ariaLabel || !!ariaLabelledBy,
      hasRequiredIndicator: isRequired,
      hasErrorDescription,
      isAccessible: (!!associatedLabel || !!ariaLabel || !!ariaLabelledBy),
    }
  })

  return {
    totalInputs: inputs.length,
    accessibleInputs: results.filter(r => r.isAccessible).length,
    inaccessibleInputs: results.filter(r => !r.isAccessible),
    allInputsAccessible: results.every(r => r.isAccessible),
    results,
  }
}

/**
 * Test button accessibility
 */
export const testButtonAccessibility = (buttonElement: HTMLElement) => {
  const role = buttonElement.getAttribute('role')
  const isButton = buttonElement.tagName === 'BUTTON' || role === 'button'
  const isDisabled = buttonElement.hasAttribute('disabled') || 
                    buttonElement.getAttribute('aria-disabled') === 'true'
  const hasAccessibleName = testAriaLabels(buttonElement).hasAccessibleName

  return {
    isSemanticButton: isButton,
    hasAccessibleName,
    isDisabled,
    isAccessible: isButton && hasAccessibleName,
  }
}

/**
 * Test heading structure and hierarchy
 */
export const testHeadingStructure = (container: HTMLElement) => {
  const headings = within(container).getAllByRole('heading')
  const headingLevels = headings.map(heading => {
    const tagName = heading.tagName.toLowerCase()
    const ariaLevel = heading.getAttribute('aria-level')
    
    if (ariaLevel) return parseInt(ariaLevel)
    if (tagName.match(/h[1-6]/)) return parseInt(tagName.charAt(1))
    
    return 0
  })

  const hasProperHierarchy = headingLevels.every((level, index) => {
    if (index === 0) return true
    const prevLevel = headingLevels[index - 1]
    return level <= prevLevel + 1 // Headings shouldn't skip levels
  })

  return {
    headings,
    headingLevels,
    hasProperHierarchy,
    startLevel: headingLevels[0] || null,
  }
}

/**
 * Mock screen reader for testing announcements
 */
export const createMockScreenReader = () => {
  const announcements: string[] = []
  
  const mockAnnounce = vi.fn((text: string) => {
    announcements.push(text)
  })

  // Mock aria-live region updates
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      const target = mutation.target as Element
      if (target.getAttribute('aria-live') || target.getAttribute('role') === 'status' || target.getAttribute('role') === 'alert') {
        mockAnnounce(target.textContent || '')
      }
    })
  })

  return {
    announcements,
    announce: mockAnnounce,
    startObserving: (element: HTMLElement) => {
      observer.observe(element, { childList: true, subtree: true, characterData: true })
    },
    stopObserving: () => observer.disconnect(),
    clear: () => announcements.splice(0),
  }
}

/**
 * Test landmark regions (main, nav, banner, etc.)
 */
export const testLandmarkRegions = (container: HTMLElement) => {
  const landmarks = {
    main: within(container).queryAllByRole('main'),
    navigation: within(container).queryAllByRole('navigation'),
    banner: within(container).queryAllByRole('banner'),
    contentinfo: within(container).queryAllByRole('contentinfo'),
    complementary: within(container).queryAllByRole('complementary'),
    search: within(container).queryAllByRole('search'),
  }

  return {
    ...landmarks,
    hasMainLandmark: landmarks.main.length > 0,
    hasNavigationLandmark: landmarks.navigation.length > 0,
    totalLandmarks: Object.values(landmarks).flat().length,
  }
}