// frontend/admin-crm/src/hooks/useVenues.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { venuesApi, type VenueFilters, type PackageVenueFilters } from '../apis/venues.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  UpdateVenueData,
  CreateVenueData,
  CreateOperatingRulesData,
  CreatePackageVenueData,
  BulkAssignVenuesData,
  CreateBlockedDateData,
  CalculateTimesRequest,
} from '../types/venues.types';

export const useVenues = (filters?: VenueFilters) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: venues = [],
    isLoading: isLoadingVenues,
    error: venuesError,
    refetch: refetchVenues
  } = useQuery({
    queryKey: ['venues', filters],
    queryFn: () => venuesApi.getVenues(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useVenue = (id: number) => {
    return useQuery({
      queryKey: ['venue', id],
      queryFn: () => venuesApi.getVenue(id),
      enabled: !!id,
    });
  };

  const useAllVenues = () => {
    return useQuery({
      queryKey: ['venues-all'],
      queryFn: () => venuesApi.getAllVenues(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useActiveVenues = () => {
    return useQuery({
      queryKey: ['venues-active'],
      queryFn: () => venuesApi.getActiveVenues(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createVenueMutation = useMutation({
    mutationFn: venuesApi.createVenue,
    onSuccess: (newVenue) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      showSuccess('Venue Created', `${newVenue.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create venue'
        : 'Failed to create venue';
      showError('Create Failed', message);
    },
  });

  const updateVenueMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVenueData }) =>
      venuesApi.updateVenue(id, data),
    onSuccess: (updatedVenue) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['venue', updatedVenue.id] });
      showSuccess('Venue Updated', `${updatedVenue.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update venue'
        : 'Failed to update venue';
      showError('Update Failed', message);
    },
  });

  const deleteVenueMutation = useMutation({
    mutationFn: venuesApi.deleteVenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      showSuccess('Venue Deleted', 'Venue has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete venue'
        : 'Failed to delete venue';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    venues,

    // Loading states
    isLoadingVenues,
    isCreatingVenue: createVenueMutation.isPending,
    isUpdatingVenue: updateVenueMutation.isPending,
    isDeletingVenue: deleteVenueMutation.isPending,

    // Error states
    venuesError,
    createError: createVenueMutation.error,
    updateError: updateVenueMutation.error,
    deleteError: deleteVenueMutation.error,

    // Actions
    createVenue: createVenueMutation.mutate,
    updateVenue: updateVenueMutation.mutate,
    deleteVenue: deleteVenueMutation.mutate,
    refetchVenues,

    // Hooks for specific queries
    useVenue,
    useAllVenues,
    useActiveVenues,
  };
};

export const useVenueOperatingRules = (venueId: number) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: operatingRules,
    isLoading: isLoadingRules,
    error: rulesError,
  } = useQuery({
    queryKey: ['venue-operating-rules', venueId],
    queryFn: () => venuesApi.getOperatingRules(venueId),
    enabled: !!venueId,
  });

  const updateRulesMutation = useMutation({
    mutationFn: (data: CreateOperatingRulesData) =>
      venuesApi.updateOperatingRules(venueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-operating-rules', venueId] });
      queryClient.invalidateQueries({ queryKey: ['venue', venueId] });
      showSuccess('Rules Updated', 'Operating rules have been updated successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update operating rules'
        : 'Failed to update operating rules';
      showError('Update Failed', message);
    },
  });

  return {
    operatingRules,
    isLoadingRules,
    rulesError,
    updateRules: updateRulesMutation.mutate,
    isUpdatingRules: updateRulesMutation.isPending,
  };
};

export const usePackageVenues = (filters?: PackageVenueFilters) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: packageVenues = [],
    isLoading: isLoadingPackageVenues,
    error: packageVenuesError,
    refetch: refetchPackageVenues,
  } = useQuery({
    queryKey: ['package-venues', filters],
    queryFn: () => venuesApi.getPackageVenues(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useVenuesForPackage = (packageId: number) => {
    return useQuery({
      queryKey: ['package-venues-inline', packageId],
      queryFn: () => venuesApi.getVenuesForPackage(packageId),
      enabled: !!packageId,
    });
  };

  const usePackagesForVenue = (venueId: number) => {
    return useQuery({
      queryKey: ['venue-packages', venueId],
      queryFn: () => venuesApi.getPackagesForVenue(venueId),
      enabled: !!venueId,
    });
  };

  const createPackageVenueMutation = useMutation({
    mutationFn: venuesApi.createPackageVenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-venues'] });
      queryClient.invalidateQueries({ queryKey: ['package-venues-inline'] });
      showSuccess('Venue Assigned', 'Venue has been assigned to the package.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to assign venue'
        : 'Failed to assign venue';
      showError('Assignment Failed', message);
    },
  });

  const updatePackageVenueMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePackageVenueData> }) =>
      venuesApi.updatePackageVenue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-venues'] });
      queryClient.invalidateQueries({ queryKey: ['package-venues-inline'] });
      showSuccess('Assignment Updated', 'Package venue assignment has been updated.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update assignment'
        : 'Failed to update assignment';
      showError('Update Failed', message);
    },
  });

  const deletePackageVenueMutation = useMutation({
    mutationFn: venuesApi.deletePackageVenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-venues'] });
      queryClient.invalidateQueries({ queryKey: ['package-venues-inline'] });
      showSuccess('Venue Removed', 'Venue has been removed from the package.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to remove venue'
        : 'Failed to remove venue';
      showError('Removal Failed', message);
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: venuesApi.bulkAssignVenues,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-venues'] });
      queryClient.invalidateQueries({ queryKey: ['package-venues-inline'] });
      showSuccess('Venues Assigned', 'Venues have been assigned to the package.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to assign venues'
        : 'Failed to assign venues';
      showError('Assignment Failed', message);
    },
  });

  return {
    // Data
    packageVenues,

    // Loading states
    isLoadingPackageVenues,
    isCreatingPackageVenue: createPackageVenueMutation.isPending,
    isUpdatingPackageVenue: updatePackageVenueMutation.isPending,
    isDeletingPackageVenue: deletePackageVenueMutation.isPending,
    isBulkAssigning: bulkAssignMutation.isPending,

    // Error states
    packageVenuesError,

    // Actions
    createPackageVenue: createPackageVenueMutation.mutate,
    updatePackageVenue: updatePackageVenueMutation.mutate,
    deletePackageVenue: deletePackageVenueMutation.mutate,
    bulkAssign: bulkAssignMutation.mutate,
    refetchPackageVenues,

    // Hooks
    useVenuesForPackage,
    usePackagesForVenue,
  };
};

export const useVenueBlockedDates = (venueId?: number) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: blockedDates = [],
    isLoading: isLoadingBlockedDates,
    error: blockedDatesError,
    refetch: refetchBlockedDates,
  } = useQuery({
    queryKey: ['venue-blocked-dates', venueId],
    queryFn: () => venuesApi.getBlockedDates(venueId ? { venue_id: venueId } : undefined),
    staleTime: 5 * 60 * 1000,
  });

  const createBlockedDateMutation = useMutation({
    mutationFn: venuesApi.createBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-blocked-dates'] });
      showSuccess('Date Blocked', 'The date has been blocked successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to block date'
        : 'Failed to block date';
      showError('Block Failed', message);
    },
  });

  const deleteBlockedDateMutation = useMutation({
    mutationFn: venuesApi.deleteBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-blocked-dates'] });
      showSuccess('Date Unblocked', 'The date has been unblocked successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to unblock date'
        : 'Failed to unblock date';
      showError('Unblock Failed', message);
    },
  });

  return {
    blockedDates,
    isLoadingBlockedDates,
    blockedDatesError,
    createBlockedDate: createBlockedDateMutation.mutate,
    deleteBlockedDate: deleteBlockedDateMutation.mutate,
    isCreatingBlockedDate: createBlockedDateMutation.isPending,
    isDeletingBlockedDate: deleteBlockedDateMutation.isPending,
    refetchBlockedDates,
  };
};

export const useVenueTimeCalculation = () => {
  const { showError } = useToastActions();

  const calculateTimesMutation = useMutation({
    mutationFn: ({ venueId, data }: { venueId: number; data: CalculateTimesRequest }) =>
      venuesApi.calculateTimes(venueId, data),
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to calculate times'
        : 'Failed to calculate times';
      showError('Calculation Failed', message);
    },
  });

  return {
    calculateTimes: calculateTimesMutation.mutateAsync,
    isCalculating: calculateTimesMutation.isPending,
    calculationResult: calculateTimesMutation.data,
    calculationError: calculateTimesMutation.error,
  };
};

export const useVenueAvailability = (venueId: number, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['venue-availability', venueId, startDate, endDate],
    queryFn: () => venuesApi.getVenueAvailability(venueId, startDate, endDate),
    enabled: !!venueId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
