// frontend/client-portal/src/hooks/useLegalDocument.ts

import { useQuery } from '@tanstack/react-query';
import { legalApi } from '../apis/legal.api';

export const useLegalDocument = (documentType: string) => {
  const query = useQuery({
    queryKey: ['legalDocument', documentType],
    queryFn: async () => {
      const response = await legalApi.getDocument(documentType);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on 404
  });

  return {
    document: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
};
