// frontend/admin-crm/src/hooks/useLayouts.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { layoutsApi, type EmailLayoutQueryParams } from "../apis/layouts.api";
import { useToastActions } from "../contexts/ToastContext";
import type {
  CreateLayoutData,
  UpdateLayoutData,
  LayoutPreviewData,
} from "../types/layouts.types";

const QUERY_KEY = "email-layouts";

export const useLayouts = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Get all layouts
  const useAllLayouts = (params?: EmailLayoutQueryParams) => {
    const {
      data: paginatedData,
      isLoading,
      error,
      refetch,
    } = useQuery({
      queryKey: [QUERY_KEY, params],
      queryFn: () => layoutsApi.getLayouts(params),
      placeholderData: keepPreviousData,
    });

    const items = paginatedData?.results || [];
    const totalCount = paginatedData?.count || 0;
    const pageCount = paginatedData?.page_count || 1;

    return { data: items, isLoading, error, refetch, totalCount, pageCount };
  };

  // Get single layout
  const useLayout = (id: number) => {
    return useQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: () => layoutsApi.getLayout(id),
      enabled: !!id,
    });
  };

  // Create layout
  const useCreateLayout = () => {
    return useMutation({
      mutationFn: (data: CreateLayoutData) => layoutsApi.createLayout(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        showSuccess("Layout Created", "Email layout created successfully");
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? String(
                (
                  error as {
                    response?: {
                      data?: { detail?: string; templates?: string[] };
                    };
                  }
                ).response?.data?.detail ||
                  (error as { response?: { data?: { templates?: string[] } } })
                    .response?.data?.templates?.[0],
              ) || "Failed to create layout"
            : "Failed to create layout";
        showError("Creation Failed", message);
      },
    });
  };

  // Update layout
  const useUpdateLayout = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateLayoutData }) =>
        layoutsApi.updateLayout(id, data),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
        showSuccess("Layout Updated", "Email layout updated successfully");
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? String(
                (
                  error as {
                    response?: {
                      data?: { detail?: string; templates?: string[] };
                    };
                  }
                ).response?.data?.detail ||
                  (error as { response?: { data?: { templates?: string[] } } })
                    .response?.data?.templates?.[0],
              ) || "Failed to update layout"
            : "Failed to update layout";
        showError("Update Failed", message);
      },
    });
  };

  // Delete layout
  const useDeleteLayout = () => {
    return useMutation({
      mutationFn: (id: number) => layoutsApi.deleteLayout(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        showSuccess("Layout Deleted", "Email layout deleted successfully");
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? String(
                (
                  error as {
                    response?: { data?: { error?: string; detail?: string } };
                  }
                ).response?.data?.error ||
                  (error as { response?: { data?: { detail?: string } } })
                    .response?.data?.detail,
              ) || "Failed to delete layout"
            : "Failed to delete layout";
        showError("Deletion Failed", message);
      },
    });
  };

  // Preview layout
  const usePreviewLayout = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: LayoutPreviewData }) =>
        layoutsApi.previewLayout(id, data),
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response
                  ?.data?.error,
              ) || "Failed to preview layout"
            : "Failed to preview layout";
        showError("Preview Failed", message);
      },
    });
  };

  // Get layout history
  const useLayoutHistory = (id: number) => {
    return useQuery({
      queryKey: [QUERY_KEY, id, "history"],
      queryFn: () => layoutsApi.getLayoutHistory(id),
      enabled: !!id,
    });
  };

  // Rollback layout
  const useRollbackLayout = () => {
    return useMutation({
      mutationFn: ({ id, version }: { id: number; version: number }) =>
        layoutsApi.rollbackLayout(id, version),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY, data.id, "history"],
        });
        showSuccess(
          "Layout Rolled Back",
          "Layout has been rolled back to the selected version",
        );
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response
                  ?.data?.error,
              ) || "Failed to rollback layout"
            : "Failed to rollback layout";
        showError("Rollback Failed", message);
      },
    });
  };

  // Get templates using this layout
  const useLayoutTemplates = (id: number) => {
    return useQuery({
      queryKey: [QUERY_KEY, id, "templates"],
      queryFn: () => layoutsApi.getLayoutTemplates(id),
      enabled: !!id,
    });
  };

  // Duplicate layout
  const useDuplicateLayout = () => {
    return useMutation({
      mutationFn: ({ id, newName }: { id: number; newName?: string }) =>
        layoutsApi.duplicateLayout(id, newName),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        showSuccess(
          "Layout Duplicated",
          "Layout has been duplicated successfully",
        );
      },
      onError: (error: unknown) => {
        const message =
          error && typeof error === "object" && "response" in error
            ? String(
                (error as { response?: { data?: { error?: string } } }).response
                  ?.data?.error,
              ) || "Failed to duplicate layout"
            : "Failed to duplicate layout";
        showError("Duplication Failed", message);
      },
    });
  };

  return {
    useAllLayouts,
    useLayout,
    useCreateLayout,
    useUpdateLayout,
    useDeleteLayout,
    usePreviewLayout,
    useLayoutHistory,
    useRollbackLayout,
    useLayoutTemplates,
    useDuplicateLayout,
  };
};
