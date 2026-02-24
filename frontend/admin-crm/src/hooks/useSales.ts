// frontend/admin-crm/src/hooks/useSales.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../apis/sales.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  CreateQuoteTemplateData,
  UpdateQuoteTemplateData,
  CreateQuoteTemplateProductData,
  UpdateQuoteTemplateProductData,
  CreateEventQuoteData,
  UpdateEventQuoteData,
  CreateQuoteLineItemData,
  UpdateQuoteLineItemData,
  CreateQuoteOptionData,
  QuoteTemplateFilters,
  EventQuoteFilters,
  QuoteLineItemFilters,
  QuoteSigningData,
} from '../types/sales.types';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
}

// Quote Templates
export const useQuoteTemplates = (filters?: QuoteTemplateFilters) => {
  return useQuery({
    queryKey: ['quoteTemplates', filters],
    queryFn: () => salesApi.getQuoteTemplates(filters),
  });
};

export const useQuoteTemplate = (id: number) => {
  return useQuery({
    queryKey: ['quoteTemplate', id],
    queryFn: () => salesApi.getQuoteTemplate(id),
    enabled: !!id,
  });
};

export const useActiveQuoteTemplates = () => {
  return useQuery({
    queryKey: ['quoteTemplates', 'active'],
    queryFn: () => salesApi.getActiveQuoteTemplates(),
  });
};

export const useCreateQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateQuoteTemplateData) => salesApi.createQuoteTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showSuccess('Template Created', 'Quote template has been created successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to create quote template';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteTemplateData }) =>
      salesApi.updateQuoteTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplate', id] });
      showSuccess('Template Updated', 'Quote template has been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update quote template';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteQuoteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showSuccess('Template Deleted', 'Quote template has been deleted successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to delete quote template';
      showError('Deletion Failed', message);
    },
  });
};

// Quote Template Products
export const useQuoteTemplateProducts = () => {
  return useQuery({
    queryKey: ['quoteTemplateProducts'],
    queryFn: () => salesApi.getQuoteTemplateProducts(),
  });
};

export const useCreateQuoteTemplateProduct = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateQuoteTemplateProductData) => salesApi.createQuoteTemplateProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplateProducts'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showSuccess('Product Added', 'Product has been added to the template.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to add product to template';
      showError('Addition Failed', message);
    },
  });
};

export const useUpdateQuoteTemplateProduct = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteTemplateProductData }) =>
      salesApi.updateQuoteTemplateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplateProducts'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showSuccess('Product Updated', 'Template product has been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update template product';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteQuoteTemplateProduct = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteQuoteTemplateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplateProducts'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showSuccess('Product Removed', 'Product has been removed from the template.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to remove product from template';
      showError('Removal Failed', message);
    },
  });
};
// Client Quotes
export const useQuotesForClient = (clientId: number) => {
  return useQuery({
    queryKey: ['eventQuotes', 'forClient', clientId],
    queryFn: () => salesApi.getQuotesForClient(clientId),
    enabled: !!clientId,
  });
};

// Event Quotes
export const useEventQuotes = (filters?: EventQuoteFilters) => {
  return useQuery({
    queryKey: ['eventQuotes', filters],
    queryFn: () => salesApi.getEventQuotes(filters),
  });
};

export const useEventQuote = (id: number) => {
  return useQuery({
    queryKey: ['eventQuote', id],
    queryFn: () => salesApi.getEventQuote(id),
    enabled: !!id,
  });
};

export const useQuotesForEvent = (eventId: number) => {
  return useQuery({
    queryKey: ['eventQuotes', 'forEvent', eventId],
    queryFn: () => salesApi.getQuotesForEvent(eventId),
    enabled: !!eventId,
  });
};

export const useCreateEventQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateEventQuoteData) => salesApi.createEventQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showSuccess('Quote Created', 'Event quote has been created successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to create event quote';
      showError('Creation Failed', message);
    },
  });
};

export const useUpdateEventQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventQuoteData }) =>
      salesApi.updateEventQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showSuccess('Quote Updated', 'Event quote has been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update event quote';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteEventQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteEventQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showSuccess('Quote Deleted', 'Event quote has been deleted successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to delete event quote';
      showError('Deletion Failed', message);
    },
  });
};

export const useSendQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => salesApi.sendQuote(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showSuccess('Quote Sent', 'Quote has been sent to the client.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to send quote';
      showError('Send Failed', message);
    },
  });
};

export const useAcceptQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => salesApi.acceptQuote(id, notes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showSuccess('Quote Accepted', 'Quote has been accepted successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to accept quote';
      showError('Accept Failed', message);
    },
  });
};

export const useRejectQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => salesApi.rejectQuote(id, notes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showSuccess('Quote Rejected', 'Quote has been rejected.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to reject quote';
      showError('Reject Failed', message);
    },
  });
};

export const useDuplicateQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => salesApi.duplicateQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showSuccess('Quote Duplicated', 'Quote has been duplicated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to duplicate quote';
      showError('Duplication Failed', message);
    },
  });
};

// Quote Line Items
export const useQuoteLineItems = (filters?: QuoteLineItemFilters) => {
  return useQuery({
    queryKey: ['quoteLineItems', filters],
    queryFn: () => salesApi.getQuoteLineItems(filters),
  });
};

export const useCreateQuoteLineItem = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateQuoteLineItemData) => salesApi.createQuoteLineItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showSuccess('Line Item Added', 'Line item has been added to the quote.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to add line item';
      showError('Addition Failed', message);
    },
  });
};

export const useUpdateQuoteLineItem = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteLineItemData }) =>
      salesApi.updateQuoteLineItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showSuccess('Line Item Updated', 'Line item has been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update line item';
      showError('Update Failed', message);
    },
  });
};

export const useDeleteQuoteLineItem = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteQuoteLineItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showSuccess('Line Item Removed', 'Line item has been removed from the quote.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to remove line item';
      showError('Removal Failed', message);
    },
  });
};

// Quote Options
export const useQuoteOptions = (quoteId: number) => {
  return useQuery({
    queryKey: ['quoteOptions', quoteId],
    queryFn: () => salesApi.getQuoteOptions(quoteId),
    enabled: !!quoteId,
  });
};

export const useCreateQuoteOption = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: (data: CreateQuoteOptionData) => salesApi.createQuoteOption(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['quoteOptions', data.quote] });
      showSuccess('Option Added', 'Quote option has been added successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to add quote option';
      showError('Addition Failed', message);
    },
  });
};

// Quote Activities
export const useQuoteActivities = (quoteId: number) => {
  return useQuery({
    queryKey: ['quoteActivities', quoteId],
    queryFn: () => salesApi.getQuoteActivities(quoteId),
    enabled: !!quoteId,
  });
};

// Quote Reminders
export const useQuoteReminders = (quoteId: number) => {
  return useQuery({
    queryKey: ['quoteReminders', quoteId],
    queryFn: () => salesApi.getQuoteReminders(quoteId),
    enabled: !!quoteId,
  });
};

export const useCreateQuoteReminder = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({
      quoteId,
      data,
    }: {
      quoteId: number;
      data: { scheduled_date: string; message?: string };
    }) => salesApi.createQuoteReminder(quoteId, data),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['quoteReminders', quoteId] });
      showSuccess('Reminder Created', 'Quote reminder has been scheduled.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to create reminder';
      showError('Reminder Failed', message);
    },
  });
};

// Quote Signing
export const useSignQuote = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuoteSigningData }) =>
      salesApi.signQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showSuccess('Quote Signed', 'Quote has been signed successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to sign quote';
      showError('Signing Failed', message);
    },
  });
};
