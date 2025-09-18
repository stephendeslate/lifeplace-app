/**
 * ClientMessageThread Props Interface
 *
 * This interface defines the component-specific props for ClientMessageThread.
 * Messaging state and actions are now obtained directly from useMessagingContext().
 */

export interface ClientMessageThreadProps {
  // Thread identification
  threadId: string;

  // Optional display props
  simplified?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}