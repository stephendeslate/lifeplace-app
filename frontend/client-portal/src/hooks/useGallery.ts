import { useQuery } from "@tanstack/react-query";
import { GalleryApi } from "../apis/gallery.api";

export const useVenueGallery = () => {
  return useQuery({
    queryKey: ["venues", "gallery"],
    queryFn: () => GalleryApi.getVenuesWithGallery(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useGalleryPhotos = (category?: string) => {
  return useQuery({
    queryKey: ["gallery", "photos", category],
    queryFn: () => GalleryApi.getGalleryPhotos(category),
    staleTime: 10 * 60 * 1000,
  });
};

export const useEventTypeImages = () => {
  return useQuery({
    queryKey: ["event-types", "images"],
    queryFn: () => GalleryApi.getEventTypesWithImages(),
    staleTime: 10 * 60 * 1000,
  });
};
