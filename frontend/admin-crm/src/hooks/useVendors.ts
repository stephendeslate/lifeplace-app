// frontend/admin-crm/src/hooks/useVendors.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '../apis/vendors.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  UpdateVendorData,
  CreateOperatingRulesData,
  CreatePackageVendorData,
  VendorFilters,
  PackageVendorFilters,
} from '../types/vendors.types';

export const useVendors = (filters?: VendorFilters) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: vendors = [],
    isLoading: isLoadingVendors,
    error: vendorsError,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ['vendors', filters],
    queryFn: () => vendorsApi.getVendors(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useVendor = (id: number) => {
    return useQuery({
      queryKey: ['vendor', id],
      queryFn: () => vendorsApi.getVendor(id),
      enabled: !!id,
    });
  };

  const useAllVendors = () => {
    return useQuery({
      queryKey: ['vendors-all'],
      queryFn: () => vendorsApi.getAllVendors(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useActiveVendors = () => {
    return useQuery({
      queryKey: ['vendors-active'],
      queryFn: () => vendorsApi.getActiveVendors(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createVendorMutation = useMutation({
    mutationFn: vendorsApi.createVendor,
    onSuccess: (newVendor) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      showSuccess('Vendor Created', `${newVendor.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to create vendor'
          : 'Failed to create vendor';
      showError('Create Failed', message);
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVendorData }) =>
      vendorsApi.updateVendor(id, data),
    onSuccess: (updatedVendor) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', updatedVendor.id] });
      showSuccess('Vendor Updated', `${updatedVendor.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update vendor'
          : 'Failed to update vendor';
      showError('Update Failed', message);
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: vendorsApi.deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      showSuccess('Vendor Deleted', 'Vendor has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to delete vendor'
          : 'Failed to delete vendor';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    vendors,

    // Loading states
    isLoadingVendors,
    isCreatingVendor: createVendorMutation.isPending,
    isUpdatingVendor: updateVendorMutation.isPending,
    isDeletingVendor: deleteVendorMutation.isPending,

    // Error states
    vendorsError,
    createError: createVendorMutation.error,
    updateError: updateVendorMutation.error,
    deleteError: deleteVendorMutation.error,

    // Actions
    createVendor: createVendorMutation.mutate,
    updateVendor: updateVendorMutation.mutate,
    deleteVendor: deleteVendorMutation.mutate,
    refetchVendors,

    // Hooks for specific queries
    useVendor,
    useAllVendors,
    useActiveVendors,
  };
};

export const useVendorOperatingRules = (vendorId: number) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: operatingRules,
    isLoading: isLoadingRules,
    error: rulesError,
  } = useQuery({
    queryKey: ['vendor-operating-rules', vendorId],
    queryFn: () => vendorsApi.getOperatingRules(vendorId),
    enabled: !!vendorId,
  });

  const updateRulesMutation = useMutation({
    mutationFn: (data: CreateOperatingRulesData) => vendorsApi.updateOperatingRules(vendorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-operating-rules', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      showSuccess('Rules Updated', 'Operating rules have been updated successfully.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update operating rules'
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

export const usePackageVendors = (filters?: PackageVendorFilters) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  const {
    data: packageVendors = [],
    isLoading: isLoadingPackageVendors,
    error: packageVendorsError,
    refetch: refetchPackageVendors,
  } = useQuery({
    queryKey: ['package-vendors', filters],
    queryFn: () => vendorsApi.getPackageVendors(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useVendorsForPackage = (packageId: number) => {
    return useQuery({
      queryKey: ['package-vendors-inline', packageId],
      queryFn: () => vendorsApi.getVendorsForPackage(packageId),
      enabled: !!packageId,
    });
  };

  const usePackagesForVendor = (vendorId: number) => {
    return useQuery({
      queryKey: ['vendor-packages', vendorId],
      queryFn: () => vendorsApi.getPackagesForVendor(vendorId),
      enabled: !!vendorId,
    });
  };

  const createPackageVendorMutation = useMutation({
    mutationFn: vendorsApi.createPackageVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['package-vendors-inline'] });
      showSuccess('Vendor Assigned', 'Vendor has been assigned to the package.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to assign vendor'
          : 'Failed to assign vendor';
      showError('Assignment Failed', message);
    },
  });

  const updatePackageVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePackageVendorData> }) =>
      vendorsApi.updatePackageVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['package-vendors-inline'] });
      showSuccess('Assignment Updated', 'Package vendor assignment has been updated.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to update assignment'
          : 'Failed to update assignment';
      showError('Update Failed', message);
    },
  });

  const deletePackageVendorMutation = useMutation({
    mutationFn: vendorsApi.deletePackageVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['package-vendors-inline'] });
      showSuccess('Vendor Removed', 'Vendor has been removed from the package.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to remove vendor'
          : 'Failed to remove vendor';
      showError('Removal Failed', message);
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: vendorsApi.bulkAssignVendors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['package-vendors-inline'] });
      showSuccess('Vendors Assigned', 'Vendors have been assigned to the package.');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response?.data?.detail,
            ) || 'Failed to assign vendors'
          : 'Failed to assign vendors';
      showError('Assignment Failed', message);
    },
  });

  return {
    // Data
    packageVendors,

    // Loading states
    isLoadingPackageVendors,
    isCreatingPackageVendor: createPackageVendorMutation.isPending,
    isUpdatingPackageVendor: updatePackageVendorMutation.isPending,
    isDeletingPackageVendor: deletePackageVendorMutation.isPending,
    isBulkAssigning: bulkAssignMutation.isPending,

    // Error states
    packageVendorsError,

    // Actions
    createPackageVendor: createPackageVendorMutation.mutate,
    updatePackageVendor: updatePackageVendorMutation.mutate,
    deletePackageVendor: deletePackageVendorMutation.mutate,
    bulkAssign: bulkAssignMutation.mutate,
    refetchPackageVendors,

    // Hooks
    useVendorsForPackage,
    usePackagesForVendor,
  };
};
