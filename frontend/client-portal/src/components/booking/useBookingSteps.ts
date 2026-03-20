// frontend/client-portal/src/components/booking/useBookingSteps.ts
// Hook to generate standard booking steps - extracted for fast refresh compatibility

interface BookingStep {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isOptional?: boolean;
}

// Hook to generate standard booking steps
export const useBookingSteps = (flowConfig?: { steps?: Array<{ step_type: string }> }) => {
  const standardSteps: BookingStep[] = [
    {
      id: 'introduction',
      label: 'Event Details',
      shortLabel: 'Details',
      description: 'Tell us about your event',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'contact_info',
      label: 'Contact Information',
      shortLabel: 'Contact',
      description: 'Your contact details',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'datetime',
      label: 'Date & Time',
      shortLabel: 'DateTime',
      description: 'When is your event?',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'package_selection',
      label: 'Package Selection',
      shortLabel: 'Package',
      description: 'Choose your package',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'addon_selection',
      label: 'Add-ons',
      shortLabel: 'Add-ons',
      description: 'Customize your experience',
      isCompleted: false,
      isCurrent: false,
      isOptional: true,
    },
    {
      id: 'questionnaire',
      label: 'Questionnaire',
      shortLabel: 'Questions',
      description: 'Help us prepare for your event',
      isCompleted: false,
      isCurrent: false,
      isOptional: true,
    },
    {
      id: 'payment_info',
      label: 'Payment',
      shortLabel: 'Payment',
      description: 'Secure payment information',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'pricing_summary',
      label: 'Pricing Summary',
      shortLabel: 'Summary',
      description: 'Review your pricing and confirm',
      isCompleted: false,
      isCurrent: false,
    },
    {
      id: 'confirmation',
      label: 'Confirmation',
      shortLabel: 'Done',
      description: 'Booking confirmed!',
      isCompleted: false,
      isCurrent: false,
    },
  ];

  // Filter steps based on flow configuration
  if (flowConfig?.steps) {
    return standardSteps.filter((step) =>
      flowConfig.steps?.some((configStep) => configStep.step_type === step.id.toUpperCase()),
    );
  }

  return standardSteps;
};
