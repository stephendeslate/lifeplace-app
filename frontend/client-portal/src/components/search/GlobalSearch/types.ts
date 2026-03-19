// frontend/client-portal/src/components/search/GlobalSearch/types.ts

export interface SearchResult {
  id: string;
  type: 'event' | 'payment' | 'invoice' | 'contact' | 'page';
  title: string;
  subtitle?: string;
  description: string;
  url: string;
  metadata?: {
    date?: string;
    amount?: string;
    status?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  highlighted?: boolean;
}

export interface SearchCategory {
  type: string;
  label: string;
  icon: React.ReactNode;
  count: number;
}
