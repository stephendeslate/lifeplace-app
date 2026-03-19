import { useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCurrencySettings } from '@/hooks/useCurrency';
import { useEventsWithContracts } from '@/hooks/useEventsWithContracts';
import { useEventQuotes } from '@/hooks/useEventQuotes';
import { useInvoices } from '@/hooks/useFinancial';
import { contractsApi } from '@/apis/contracts.api';
import type { Contract } from '@/types/contracts.types';
import { EVENT_TAB_INDICES } from './constants';

export function useEventDetailLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatAmount } = useCurrencySettings();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= EVENT_TAB_INDICES.NOTES) {
        return tabIndex;
      }
    }
    return (location.state as { activeTab?: number })?.activeTab ?? 0;
  });
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [preferencesData, setPreferencesData] = useState<Record<string, unknown>>({});
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const eventId = parseInt(id || '0');
  const { useEventWithContracts, useUpdatePreferences, useEventContracts } =
    useEventsWithContracts();

  const {
    data: event,
    isLoading: isLoadingEvent,
    error: eventError,
  } = useEventWithContracts(eventId);

  const {
    contracts: eventContracts,
    isLoading: isLoadingContracts,
    needsSignature,
  } = useEventContracts(eventId);

  const { data: quotesData } = useEventQuotes(eventId);
  const quotesCount = quotesData?.results?.length || 0;

  const { data: invoicesData } = useInvoices({ event: eventId });
  const invoicesCount = invoicesData?.results?.length || 0;

  const updatePreferencesMutation = useUpdatePreferences();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSearchParams({ tab: newValue.toString() }, { replace: true });
  };

  const handleBack = () => {
    navigate('/events');
  };

  const handlePreferencesOpen = () => {
    if (event?.preferences) {
      setPreferencesData(event.preferences);
    }
    setPreferencesDialogOpen(true);
  };

  const handlePreferencesClose = () => {
    setPreferencesDialogOpen(false);
    setPreferencesData({});
  };

  const handlePreferencesSave = async () => {
    await updatePreferencesMutation.mutateAsync({
      id: eventId,
      data: { preferences: preferencesData },
    });
    handlePreferencesClose();
  };

  const handlePreferenceChange = (key: string, value: unknown) => {
    setPreferencesData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSignContract = async (contract: Contract) => {
    try {
      const fullContract = await contractsApi.getContract(contract.id);
      setSelectedContract(fullContract);
      setSigningDialogOpen(true);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching contract details for signing:', error);
      setSelectedContract(contract);
      setSigningDialogOpen(true);
    }
  };

  const handleSignComplete = () => {
    setSigningDialogOpen(false);
    setSelectedContract(null);
  };

  const handleSignError = (error: string) => {
    if (import.meta.env.DEV) console.error('Contract signing error:', error);
  };

  return {
    eventId,
    event,
    isLoadingEvent,
    eventError,
    eventContracts,
    isLoadingContracts,
    needsSignature,
    quotesCount,
    invoicesCount,
    activeTab,
    handleTabChange,
    handleBack,
    formatAmount,
    navigate,
    // Preferences
    preferencesDialogOpen,
    preferencesData,
    handlePreferencesOpen,
    handlePreferencesClose,
    handlePreferencesSave,
    handlePreferenceChange,
    updatePreferencesMutation,
    // Contract signing
    signingDialogOpen,
    setSigningDialogOpen,
    selectedContract,
    setSelectedContract,
    handleSignContract,
    handleSignComplete,
    handleSignError,
  };
}
