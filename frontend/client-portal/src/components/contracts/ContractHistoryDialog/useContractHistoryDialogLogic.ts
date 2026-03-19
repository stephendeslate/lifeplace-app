import { useState } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import { useContractHistoryData } from '@/hooks/useContractHistory';
import type { Contract } from '@/types/contracts.types';

export const useContractHistoryDialogLogic = (contract: Contract | null) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  const { amendments, documents, isLoading } = useContractHistoryData(contract?.id);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: string | null, currency: string = 'PHP') => {
    if (!value) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(value));
  };

  const getStatusColor = (status: string): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'SIGNED':
      case 'DELIVERED':
      case 'APPROVED':
        return 'success';
      case 'SENT':
      case 'PARTIALLY_SIGNED':
        return 'info';
      case 'DRAFT':
      case 'PENDING':
      case 'REQUESTED':
        return 'warning';
      case 'VOIDED':
      case 'EXPIRED':
      case 'REJECTED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'primary';
    }
  };

  const valueChanges = contract?.contract_value
    ? [
        {
          id: '1',
          date: contract.updated_at,
          old_value: null as string | null,
          new_value: contract.contract_value,
          reason: 'Initial contract value set',
          changed_by: undefined,
        },
      ]
    : [];

  const contractStats = contract
    ? {
        created: contract.created_at,
        lastModified: contract.updated_at,
        signatures: contract.signatures?.length || 0,
        amendments: amendments.length,
        documents: documents.length,
        status: contract.status,
        value: contract.contract_value,
        currency: contract.currency,
      }
    : null;

  return {
    theme,
    isMobile,
    activeTab,
    handleTabChange,
    amendments,
    documents,
    isLoading,
    formatDate,
    formatCurrency,
    getStatusColor,
    valueChanges,
    contractStats,
  };
};
