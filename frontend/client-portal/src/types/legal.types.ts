// frontend/client-portal/src/types/legal.types.ts

export interface PublicLegalDocument {
  document_type: string;
  document_type_display: string;
  title: string;
  content: string;
  version: string;
  effective_date: string | null;
}
