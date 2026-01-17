/**
 * Converts technical errors into user-friendly messages
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Payment errors
    if (message.includes('card_declined') || message.includes('card declined')) {
      return 'Your card was declined. Please try a different card or contact your bank.';
    }
    if (message.includes('insufficient_funds') || message.includes('insufficient funds')) {
      return 'Insufficient funds. Please try a different payment method.';
    }
    if (message.includes('expired_card') || message.includes('expired card')) {
      return 'Your card has expired. Please use a different card.';
    }
    if (message.includes('invalid_cvc') || message.includes('invalid cvc')) {
      return 'Invalid security code. Please check your card details.';
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return 'Connection error. Please check your internet and try again.';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The request timed out. Please try again.';
    }

    // Auth errors
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Your session has expired. Please log in again.';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'You do not have permission to perform this action.';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Please check your input and try again.';
    }
  }

  return 'Something went wrong. Please try again or contact support.';
};

/**
 * Error messages for common form fields
 */
export const fieldErrorMessages = {
  email: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address',
  },
  phone: {
    required: 'Phone number is required',
    invalid: 'Please enter a valid phone number',
  },
  name: {
    required: 'Name is required',
    tooShort: 'Name must be at least 2 characters',
  },
  password: {
    required: 'Password is required',
    tooShort: 'Password must be at least 8 characters',
    noMatch: 'Passwords do not match',
  },
} as const;
