// frontend/admin-crm/src/hooks/useGallery.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { galleryApi, type GalleryPhotoQueryParams } from "../apis/gallery.api";
import { useToastActions } from "../contexts/ToastContext";

export const useGalleryPhotos = (params?: GalleryPhotoQueryParams) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Query
  const {
    data: paginatedData,
    isLoading: isLoadingGalleryPhotos,
    error: galleryPhotosError,
    refetch: refetchGalleryPhotos,
  } = useQuery({
    queryKey: ["gallery-photos", params],
    queryFn: () => galleryApi.getGalleryPhotos(params),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const galleryPhotos = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageCount = paginatedData?.page_count || 1;

  // Create mutation
  const createGalleryPhotoMutation = useMutation({
    mutationFn: (formData: FormData) => galleryApi.createGalleryPhoto(formData),
    onSuccess: (newPhoto) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      showSuccess(
        "Photo Added",
        `${newPhoto.title || "Gallery photo"} has been added successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail,
            ) || "Failed to add gallery photo"
          : "Failed to add gallery photo";
      showError("Create Failed", message);
    },
  });

  // Update mutation
  const updateGalleryPhotoMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      galleryApi.updateGalleryPhoto(id, formData),
    onSuccess: (updatedPhoto) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      queryClient.invalidateQueries({
        queryKey: ["gallery-photo", updatedPhoto.id],
      });
      showSuccess(
        "Photo Updated",
        `${updatedPhoto.title || "Gallery photo"} has been updated successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail,
            ) || "Failed to update gallery photo"
          : "Failed to update gallery photo";
      showError("Update Failed", message);
    },
  });

  // Delete mutation
  const deleteGalleryPhotoMutation = useMutation({
    mutationFn: galleryApi.deleteGalleryPhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      showSuccess(
        "Photo Deleted",
        "Gallery photo has been deleted successfully.",
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail,
            ) || "Failed to delete gallery photo"
          : "Failed to delete gallery photo";
      showError("Delete Failed", message);
    },
  });

  // Bulk create mutation
  const bulkCreateGalleryPhotosMutation = useMutation({
    mutationFn: (formData: FormData) =>
      galleryApi.bulkCreateGalleryPhotos(formData),
    onSuccess: (photos) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      showSuccess(
        "Photos Uploaded",
        `${photos.length} photo${photos.length === 1 ? "" : "s"} uploaded successfully.`,
      );
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === "object" && "response" in error
          ? String(
              (error as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail,
            ) || "Failed to upload photos"
          : "Failed to upload photos";
      showError("Bulk Upload Failed", message);
    },
  });

  return {
    // Data
    galleryPhotos,
    totalCount,
    pageCount,

    // Loading states
    isLoadingGalleryPhotos,
    isCreatingGalleryPhoto: createGalleryPhotoMutation.isPending,
    isUpdatingGalleryPhoto: updateGalleryPhotoMutation.isPending,
    isDeletingGalleryPhoto: deleteGalleryPhotoMutation.isPending,
    isBulkCreatingGalleryPhotos: bulkCreateGalleryPhotosMutation.isPending,

    // Error states
    galleryPhotosError,

    // Actions
    createGalleryPhoto: createGalleryPhotoMutation.mutate,
    updateGalleryPhoto: updateGalleryPhotoMutation.mutate,
    deleteGalleryPhoto: deleteGalleryPhotoMutation.mutate,
    bulkCreateGalleryPhotos: bulkCreateGalleryPhotosMutation.mutate,
    refetchGalleryPhotos,
  };
};
