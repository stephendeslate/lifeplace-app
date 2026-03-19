import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUnfinishedBookings } from '@/hooks/useUnfinishedBookings';
import { useCurrencySettings } from '@/hooks/useCurrency';
import { useVIPStatus } from '@/hooks/useVIP';
import { useAcceptQuote, useRejectQuote } from '@/hooks/useEventQuotes';

export function useDashboardLogic() {
  useDocumentTitle('Dashboard | LifePlace Alfonso');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrencySettings();
  const [rejectionDialog, setRejectionDialog] = useState<{
    open: boolean;
    quoteId: number | null;
    quoteName: string | null;
  }>({ open: false, quoteId: null, quoteName: null });

  const dashboardData = useDashboardData();
  const { data: unfinishedBookings, isLoading: isLoadingBookings } = useUnfinishedBookings();
  const { data: vipStatus, isLoading: isVIPLoading } = useVIPStatus();
  const [benefitsDialogOpen, setBenefitsDialogOpen] = useState(false);

  const acceptQuoteMutation = useAcceptQuote();
  const rejectQuoteMutation = useRejectQuote();

  const handleQuoteAction = async (quoteId: number, action: 'accept' | 'reject') => {
    if (action === 'accept') {
      try {
        await acceptQuoteMutation.mutateAsync({ quoteId });
      } catch (error) {
        if (import.meta.env.DEV) console.error('Failed to accept quote:', error);
      }
    } else {
      const quote = dashboardData.criticalActions.quotesNeedingResponse.find(
        (q) => q.id === quoteId,
      );
      setRejectionDialog({
        open: true,
        quoteId,
        quoteName: quote?.event_details?.name || null,
      });
    }
  };

  const handleQuoteRejection = async (reason: string) => {
    if (!rejectionDialog.quoteId) return;

    try {
      await rejectQuoteMutation.mutateAsync({
        quoteId: rejectionDialog.quoteId,
        data: { reason: reason },
      });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to reject quote:', error);
    }
  };

  const handleRejectionDialogClose = () => {
    setRejectionDialog({ open: false, quoteId: null, quoteName: null });
  };

  const handlePaymentAction = (paymentId: number) => {
    navigate('/payments', { state: { highlightPayment: paymentId } });
  };

  const handleViewEvent = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  return {
    user,
    navigate,
    formatAmount,
    dashboardData,
    unfinishedBookings,
    isLoadingBookings,
    vipStatus,
    isVIPLoading,
    benefitsDialogOpen,
    setBenefitsDialogOpen,
    rejectionDialog,
    rejectQuoteMutation,
    handleQuoteAction,
    handleQuoteRejection,
    handleRejectionDialogClose,
    handlePaymentAction,
    handleViewEvent,
  };
}
