// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/types.ts

import type { BookingFlowStep, AddonSelectionStepConfiguration } from '@/types/bookingflows';

export interface AddonSelectionStepConfigProps {
  step: BookingFlowStep;
  onUpdate?: (data: Partial<AddonSelectionStepConfiguration>) => void;
  isLoading?: boolean;
}

export interface AddonConfigFormData {
  available_categories: number[];
  available_addons: number[];
  min_selection: number;
  max_selection: number;
  filter_by_event_type: boolean;
  group_by_category: boolean;
  show_recommendations: boolean;
  recommendation_logic: Record<string, unknown>;
}

export const defaultFormData: AddonConfigFormData = {
  available_categories: [],
  available_addons: [],
  min_selection: 0,
  max_selection: 0,
  filter_by_event_type: true,
  group_by_category: true,
  show_recommendations: true,
  recommendation_logic: {},
};

/** Available addon item from the API */
export interface AvailableAddon {
  id: number;
  name: string;
  currency: string;
  base_price: string;
  type: string;
}

/** Available category item from the API */
export interface AvailableCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
}
