import React, { useRef, useState, useCallback, useEffect } from "react";
import { Box, IconButton } from "@mui/material";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { tokens } from "../../design-system/tokens";
import { OptimizedImage } from "../common/OptimizedImage";
import type { GalleryImage } from "../../types/gallery.types";

type ResponsiveHeight = Record<string, string>;

interface ImageCarouselProps {
  images: GalleryImage[];
  height?: string | ResponsiveHeight;
  showThumbnails?: boolean;
  showArrows?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  onImageClick?: (index: number) => void;
  overlay?: "none" | "gradient";
  children?: React.ReactNode;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  height = { xs: "300px", md: "450px" },
  showThumbnails = false,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  onImageClick,
  overlay = "none",
  children,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const scrollWidth = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({
      left: scrollWidth * index,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  }, []);

  const handlePrev = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    scrollToIndex(newIndex);
  }, [currentIndex, images.length, scrollToIndex]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    scrollToIndex(newIndex);
  }, [currentIndex, images.length, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const scrollWidth = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / scrollWidth);
    setCurrentIndex(newIndex);
  }, []);

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;
    const interval = setInterval(handleNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, handleNext, images.length]);

  if (images.length === 0) return null;

  const arrowStyles = {
    position: "absolute" as const,
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: tokens.spacing.zIndex.base + 2,
    color: "#FFFFFF",
    ...tokens.color.glass.subtle,
    borderRadius: tokens.spacing.radius.full,
    width: 40,
    height: 40,
    transition: tokens.animation.transition.smooth,
    "&:hover": {
      ...tokens.color.glass.dark,
      transform: "translateY(-50%) scale(1.1)",
    },
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          borderRadius: tokens.spacing.radius.image,
          overflow: "hidden",
          height,
        }}
      >
        {images.map((image, index) => (
          <Box
            key={`${image.src}-${index}`}
            onClick={() => onImageClick?.(index)}
            sx={{
              scrollSnapAlign: "start",
              flexShrink: 0,
              width: "100%",
              height: "100%",
              position: "relative",
              cursor: onImageClick ? "pointer" : "default",
            }}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              height="100%"
              objectFit="cover"
              priority={index === 0}
            />
          </Box>
        ))}
      </Box>

      {overlay === "gradient" && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: tokens.color.overlays.gradientDark,
            pointerEvents: "none",
            borderRadius: tokens.spacing.radius.image,
            zIndex: tokens.spacing.zIndex.base + 1,
          }}
        />
      )}

      {children && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: tokens.spacing.zIndex.base + 3,
            pointerEvents: "none",
            "& > *": { pointerEvents: "auto" },
          }}
        >
          {children}
        </Box>
      )}

      {showArrows && images.length > 1 && (
        <>
          <IconButton
            onClick={handlePrev}
            aria-label="Previous image"
            sx={{ ...arrowStyles, left: 12 }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            onClick={handleNext}
            aria-label="Next image"
            sx={{ ...arrowStyles, right: 12 }}
          >
            <ChevronRight />
          </IconButton>
        </>
      )}

      {images.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 1,
            zIndex: tokens.spacing.zIndex.base + 2,
          }}
        >
          {images.map((_, index) => (
            <Box
              key={index}
              onClick={() => scrollToIndex(index)}
              sx={{
                width: index === currentIndex ? 24 : 8,
                height: 8,
                borderRadius: tokens.spacing.radius.full,
                backgroundColor:
                  index === currentIndex
                    ? "#FFFFFF"
                    : "rgba(255, 255, 255, 0.5)",
                cursor: "pointer",
                transition: tokens.animation.transition.fast,
              }}
            />
          ))}
        </Box>
      )}

      {showThumbnails && images.length > 1 && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mt: 1.5,
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            pb: 0.5,
          }}
        >
          {images.map((image, index) => (
            <Box
              key={`thumb-${image.src}-${index}`}
              onClick={() => scrollToIndex(index)}
              sx={{
                flexShrink: 0,
                width: 64,
                height: 48,
                borderRadius: tokens.spacing.radius.sm,
                overflow: "hidden",
                cursor: "pointer",
                opacity: index === currentIndex ? 1 : 0.6,
                border:
                  index === currentIndex
                    ? `2px solid ${tokens.color.base.sage[500]}`
                    : "2px solid transparent",
                transition: tokens.animation.transition.fast,
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              <OptimizedImage
                src={image.src}
                alt={`Thumbnail ${index + 1}`}
                height="100%"
                objectFit="cover"
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ImageCarousel;
