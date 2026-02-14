import React from "react";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { Box } from "@mui/material";
import { tokens } from "../../design-system/tokens";
import { Button } from "../../design-system/components/Button";
import type { GalleryImage } from "../../types/gallery.types";

interface ImageLightboxProps {
  images: GalleryImage[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  showThumbnails?: boolean;
  showZoom?: boolean;
  showFullscreen?: boolean;
  showCaptions?: boolean;
  ctaButton?: {
    label: string;
    onClick: () => void;
  };
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  open,
  index,
  onClose,
  onIndexChange,
  showThumbnails = true,
  showZoom = true,
  showFullscreen = true,
  showCaptions = false,
  ctaButton,
}) => {
  const slides = images.map((image) => ({
    src: image.src,
    alt: image.alt,
    title: showCaptions ? image.alt : undefined,
    description: showCaptions
      ? [image.venueName, image.eventType].filter(Boolean).join(" - ") ||
        undefined
      : undefined,
  }));

  const plugins = [
    ...(showThumbnails ? [Thumbnails] : []),
    ...(showZoom ? [Zoom] : []),
    ...(showFullscreen ? [Fullscreen] : []),
    ...(showCaptions ? [Captions] : []),
  ];

  return (
    <>
      <Lightbox
        open={open}
        close={onClose}
        index={index}
        slides={slides}
        plugins={plugins}
        on={{
          view: ({ index: currentIndex }) => onIndexChange?.(currentIndex),
        }}
        carousel={{
          finite: false,
          preload: 2,
        }}
        thumbnails={{
          position: "bottom",
          width: 80,
          height: 60,
          gap: 8,
        }}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true,
        }}
        styles={{
          container: {
            backgroundColor: "rgba(46, 42, 40, 0.95)",
          },
        }}
      />

      {ctaButton && open && (
        <Box
          sx={{
            position: "fixed",
            bottom: showThumbnails ? 100 : 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: tokens.spacing.zIndex.max + 1,
          }}
        >
          <Button
            variant="terracotta"
            size="large"
            onClick={ctaButton.onClick}
            sx={{
              boxShadow: tokens.shadow.elevation.xl,
            }}
          >
            {ctaButton.label}
          </Button>
        </Box>
      )}
    </>
  );
};

export default ImageLightbox;
