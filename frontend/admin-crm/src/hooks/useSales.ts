// frontend/admin-crm/src/hooks/useSales.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../apis/sales.api';
import { useToast } from '../contexts/ToastContext';
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateQuoteTemplateData) => salesApi.createQuoteTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showToast({
        type: 'success',
        title: 'Template Created',
        message: 'Quote template has been created successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create quote template';
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message,
      });
    },
  });
};

export const useUpdateQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteTemplateData }) =>
      salesApi.updateQuoteTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplate', id] });
      showToast({
        type: 'success',
        title: 'Template Updated',
        message: 'Quote template has been updated successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update quote template';
      showToast({
        type: 'error',
        title: 'Update Failed',
        message,
      });
    },
  });
};

export const useDeleteQuoteTemplate = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteQuoteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showToast({
        type: 'success',
        title: 'Template Deleted',
        message: 'Quote template has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete quote template';
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message,
      });
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateQuoteTemplateProductData) => salesApi.createQuoteTemplateProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplateProducts'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showToast({
        type: 'success',
        title: 'Product Added',
        message: 'Product has been added to the template.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to add product to template';
      showToast({
        type: 'error',
        title: 'Addition Failed',
        message,
      });
    },
  });
};

export const useUpdateQuoteTemplateProduct = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteTemplateProductData }) =>
      salesApi.updateQuoteTemplateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplateProducts'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showToast({
        type: 'success',
        title: 'Product Updated',
        message: 'Template product has been updated successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update template product';
      showToast({
        type: 'error',
        title: 'Update Failed',
        message,
      });
    },
  });
};

export const useDeleteQuoteTemplateProduct = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteQuoteTemplateProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteTemplateProducts'] });
      queryClient.invalidateQueries({ queryKey: ['quoteTemplates'] });
      showToast({
        type: 'success',
        title: 'Product Removed',
        message: 'Product has been removed from the template.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to remove product from template';
      showToast({
        type: 'error',
        title: 'Removal Failed',
        message,
      });
    },
  });
};
// Client Quotes
export const useQuotesForClient = (clientId: number) => {
  return useQuery({
    queryKey: ['eventQuotes', 'forClient', clientId],
    queryFn: () => salesApi.getQuotesForClient(clientId),
    enabled: !!clientId,
    select: (data) => Array.isArray(data) ? data : [],
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateEventQuoteData) => salesApi.createEventQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showToast({
        type: 'success',
        title: 'Quote Created',
        message: 'Event quote has been created successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create event quote';
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message,
      });
    },
  });
};

export const useUpdateEventQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventQuoteData }) =>
      salesApi.updateEventQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showToast({
        type: 'success',
        title: 'Quote Updated',
        message: 'Event quote has been updated successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update event quote';
      showToast({
        type: 'error',
        title: 'Update Failed',
        message,
      });
    },
  });
};

export const useDeleteEventQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteEventQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showToast({
        type: 'success',
        title: 'Quote Deleted',
        message: 'Event quote has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete event quote';
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message,
      });
    },
  });
};

export const useSendQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => salesApi.sendQuote(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showToast({
        type: 'success',
        title: 'Quote Sent',
        message: 'Quote has been sent to the client.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to send quote';
      showToast({
        type: 'error',
        title: 'Send Failed',
        message,
      });
    },
  });
};

export const useAcceptQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      salesApi.acceptQuote(id, notes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showToast({
        type: 'success',
        title: 'Quote Accepted',
        message: 'Quote has been accepted successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to accept quote';
      showToast({
        type: 'error',
        title: 'Accept Failed',
        message,
      });
    },
  });
};

export const useRejectQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      salesApi.rejectQuote(id, notes),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showToast({
        type: 'success',
        title: 'Quote Rejected',
        message: 'Quote has been rejected.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to reject quote';
      showToast({
        type: 'error',
        title: 'Reject Failed',
        message,
      });
    },
  });
};

export const useDuplicateQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => salesApi.duplicateQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showToast({
        type: 'success',
        title: 'Quote Duplicated',
        message: 'Quote has been duplicated successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to duplicate quote';
      showToast({
        type: 'error',
        title: 'Duplication Failed',
        message,
      });
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateQuoteLineItemData) => salesApi.createQuoteLineItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showToast({
        type: 'success',
        title: 'Line Item Added',
        message: 'Line item has been added to the quote.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to add line item';
      showToast({
        type: 'error',
        title: 'Addition Failed',
        message,
      });
    },
  });
};

export const useUpdateQuoteLineItem = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteLineItemData }) =>
      salesApi.updateQuoteLineItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showToast({
        type: 'success',
        title: 'Line Item Updated',
        message: 'Line item has been updated successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update line item';
      showToast({
        type: 'error',
        title: 'Update Failed',
        message,
      });
    },
  });
};

export const useDeleteQuoteLineItem = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => salesApi.deleteQuoteLineItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteLineItems'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      showToast({
        type: 'success',
        title: 'Line Item Removed',
        message: 'Line item has been removed from the quote.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to remove line item';
      showToast({
        type: 'error',
        title: 'Removal Failed',
        message,
      });
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateQuoteOptionData) => salesApi.createQuoteOption(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['quoteOptions', data.quote] });
      showToast({
        type: 'success',
        title: 'Option Added',
        message: 'Quote option has been added successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to add quote option';
      showToast({
        type: 'error',
        title: 'Addition Failed',
        message,
      });
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
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: number; data: { scheduled_date: string; message?: string } }) =>
      salesApi.createQuoteReminder(quoteId, data),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['quoteReminders', quoteId] });
      showToast({
        type: 'success',
        title: 'Reminder Created',
        message: 'Quote reminder has been scheduled.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create reminder';
      showToast({
        type: 'error',
        title: 'Reminder Failed',
        message,
      });
    },
  });
};

// Quote Signing
export const useSignQuote = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuoteSigningData }) =>
      salesApi.signQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['eventQuotes'] });
      queryClient.invalidateQueries({ queryKey: ['eventQuote', id] });
      showToast({
        type: 'success',
        title: 'Quote Signed',
        message: 'Quote has been signed successfully.',
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to sign quote';
      showToast({
        type: 'error',
        title: 'Signing Failed',
        message,
      });
    }
    });
};