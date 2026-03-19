import type {
  VenueListItem,
  VenueDetail,
  CreateVenueData,
  UpdateVenueData,
} from '@/types/venues.types';

export interface VenueFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingVenue?: VenueListItem | VenueDetail | null;
  onSubmit: (data: CreateVenueData | UpdateVenueData, formData?: FormData) => void;
  isLoading: boolean;
}

export interface VenueFormData {
  // Basic info
  name: string;
  code: string;
  description: string;
  is_overnight: boolean;
  // Capacity
  minimum_capacity: string;
  maximum_capacity: string;
  recommended_capacity: string;
  // Status
  is_active: boolean;
  is_bookable: boolean;
  is_featured: boolean;
  // Display
  location_description: string;
  sort_order: string;
  // Images
  featured_image: File | string | null;
  gallery_images: (File | string)[];
  // Standalone pricing (for custom package curation)
  is_rentable_standalone: boolean;
  standalone_base_price: string;
  standalone_included_hours: string;
  standalone_excess_hour_price: string;
  // Operating rules
  operating_rules: OperatingRulesFormData;
}

export interface OperatingRulesFormData {
  // Check-in/Checkout
  default_check_in_time: string;
  default_checkout_time: string;
  checkout_next_day: boolean;
  // Program Duration
  minimum_program_hours: string;
  maximum_program_hours: string;
  default_program_hours: string;
  is_fixed_duration: boolean;
  // Ingress/Egress
  ingress_hours: string;
  egress_hours: string;
  allow_custom_ingress: boolean;
  allow_custom_egress: boolean;
  min_ingress_hours: string;
  max_ingress_hours: string;
  min_egress_hours: string;
  max_egress_hours: string;
  // Time Constraints
  earliest_start_time: string;
  latest_end_time: string;
  hard_cutoff_time: string;
  hard_cutoff_next_day: boolean;
  early_access_minutes: string;
  // Early Check-in
  early_checkin_allowed: boolean;
  early_checkin_fee_per_hour: string;
  earliest_checkin_time: string;
  // Late Checkout
  late_checkout_allowed: boolean;
  late_checkout_fee_per_hour: string;
  late_checkout_max_hours: string;
  latest_checkout_time: string;
}

/** Props shared by all accordion section sub-components */
export interface SectionProps {
  formData: VenueFormData;
  expanded: boolean;
  onToggle: () => void;
  onInputChange: (
    field: keyof VenueFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSwitchChange: (
    field: keyof VenueFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Props for operating-rules accordion sections */
export interface RulesSectionProps {
  formData: VenueFormData;
  expanded: boolean;
  onToggle: () => void;
  onRulesChange: (
    field: keyof OperatingRulesFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onRulesSwitchChange: (
    field: keyof OperatingRulesFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}
