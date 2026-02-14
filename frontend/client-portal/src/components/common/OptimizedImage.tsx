import React from "react";
import { Box, Skeleton } from "@mui/material";
import type { BoxProps } from "@mui/material";

interface OptimizedImageProps extends Omit<BoxProps, "component"> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  srcSet?: string;
  sizes?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  objectFit = "cover",
  srcSet,
  sizes,
  sx,
  ...props
}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return (
    <Box
      sx={{
        position: "relative",
        width: width || "100%",
        height: height || "auto",
        ...sx,
      }}
      {...props}
    >
      {!loaded && !error && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{ position: "absolute", top: 0, left: 0 }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt={alt}
        srcSet={srcSet}
        sizes={sizes}
        role={alt ? "img" : undefined}
        aria-label={alt || "Image"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        sx={{
          width: "100%",
          height: "100%",
          objectFit,
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
          },
        }}
      />
    </Box>
  );
};

export default OptimizedImage;
