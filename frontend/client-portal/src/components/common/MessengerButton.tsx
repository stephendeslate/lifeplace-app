// frontend/client-portal/src/components/common/MessengerButton.tsx

import React from "react";
import { Fab, Tooltip, useMediaQuery, useTheme } from "@mui/material";

const MESSENGER_URL = "https://m.me/137227103653093";

const MessengerIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 36 36"
    width="28"
    height="28"
    fill="white"
  >
    <path d="M18 2C9.163 2 2 8.636 2 16.8c0 4.662 2.33 8.823 5.968 11.538V34l5.37-2.95c1.432.397 2.952.61 4.662.61 8.837 0 16-6.636 16-14.86C34 8.636 26.837 2 18 2zm1.77 19.984l-4.08-4.35-7.96 4.35 8.753-9.29 4.18 4.35 7.86-4.35-8.753 9.29z" />
  </svg>
);

export const MessengerButton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Tooltip
      title="Chat us on Facebook"
      placement="left"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            fontSize: "0.875rem",
            fontWeight: 500,
            py: 1,
            px: 2,
            borderRadius: 2,
          },
        },
      }}
    >
      <Fab
        component="a"
        href={MESSENGER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat us on Facebook Messenger"
        sx={{
          position: "fixed",
          bottom: isMobile ? 20 : 25,
          right: isMobile ? 20 : 25,
          width: isMobile ? 56 : 64,
          height: isMobile ? 56 : 64,
          bgcolor: "#0084FF",
          "&:hover": {
            bgcolor: "#0073E6",
            transform: "scale(1.08)",
          },
          transition: "all 0.2s ease-in-out",
          boxShadow: "0 4px 16px rgba(0, 132, 255, 0.4)",
          zIndex: 1200,
        }}
      >
        <MessengerIcon />
      </Fab>
    </Tooltip>
  );
};
