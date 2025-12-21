// frontend/client-portal/src/apis/legal.api.ts

import api from '../utils/api';
import type { PublicLegalDocument } from '../types/legal.types';

export const legalApi = {
  getDocument: (documentType: string) =>
    api.get<{ success: boolean; data: PublicLegalDocument }>(
      `/settings/public/legal/${documentType}/`
    ),
};
