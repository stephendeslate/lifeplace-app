// frontend/admin-crm/src/theme.ts
import { createTheme, responsiveFontSizes } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    neutral: Palette["primary"];
  }

  interface PaletteOptions {
    neutral?: PaletteOptions["primary"];
  }
}

// Create a theme instance
let theme = createTheme({
  palette: {
    primary: {
      main: "#0a84ff",
      light: "#63b3ed",
      dark: "#0351b7",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#059669",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#b91c1c",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
      contrastText: "#ffffff",
    },
    info: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#2563eb",
      contrastText: "#ffffff",
    },
    neutral: {
      main: "#6b7280",
      light: "#9ca3af",
      dark: "#4b5563",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#6b7280",
      disabled: "#9ca3af",
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: "2.5rem",
    },
    h2: {
      fontWeight: 700,
      fontSize: "2rem",
    },
    h3: {
      fontWeight: 600,
      fontSize: "1.5rem",
    },
    h4: {
      fontWeight: 600,
      fontSize: "1.25rem",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1rem",
    },
    h6: {
      fontWeight: 600,
      fontSize: "0.875rem",
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
    },
    body1: {
      fontSize: "1rem",
    },
    body2: {
      fontSize: "0.875rem",
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    "none",
    "0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)",
    "0px 1px 5px rgba(0, 0, 0, 0.05), 0px 2px 5px rgba(0, 0, 0, 0.07)",
    "0px 1px 8px rgba(0, 0, 0, 0.05), 0px 3px 7px rgba(0, 0, 0, 0.07)",
    "0px 2px 10px rgba(0, 0, 0, 0.05), 0px 4px 9px rgba(0, 0, 0, 0.07)",
    "0px 3px 12px rgba(0, 0, 0, 0.05), 0px 5px 11px rgba(0, 0, 0, 0.06)",
    "0px 5px 15px rgba(0, 0, 0, 0.05), 0px 6px 13px rgba(0, 0, 0, 0.06)",
    "0px 6px 18px rgba(0, 0, 0, 0.05), 0px 7px 15px rgba(0, 0, 0, 0.06)",
    "0px 7px 21px rgba(0, 0, 0, 0.05), 0px 8px 17px rgba(0, 0, 0, 0.06)",
    "0px 8px 24px rgba(0, 0, 0, 0.05), 0px 9px 19px rgba(0, 0, 0, 0.06)",
    "0px 9px 27px rgba(0, 0, 0, 0.05), 0px 10px 21px rgba(0, 0, 0, 0.06)",
    "0px 10px 30px rgba(0, 0, 0, 0.05), 0px 11px 23px rgba(0, 0, 0, 0.06)",
    "0px 11px 33px rgba(0, 0, 0, 0.05), 0px 12px 25px rgba(0, 0, 0, 0.06)",
    "0px 12px 36px rgba(0, 0, 0, 0.05), 0px 13px 27px rgba(0, 0, 0, 0.06)",
    "0px 13px 39px rgba(0, 0, 0, 0.05), 0px 14px 29px rgba(0, 0, 0, 0.06)",
    "0px 14px 42px rgba(0, 0, 0, 0.05), 0px 15px 31px rgba(0, 0, 0, 0.06)",
    "0px 15px 45px rgba(0, 0, 0, 0.05), 0px 16px 33px rgba(0, 0, 0, 0.06)",
    "0px 16px 48px rgba(0, 0, 0, 0.05), 0px 17px 35px rgba(0, 0, 0, 0.06)",
    "0px 17px 51px rgba(0, 0, 0, 0.05), 0px 18px 37px rgba(0, 0, 0, 0.06)",
    "0px 18px 54px rgba(0, 0, 0, 0.05), 0px 19px 39px rgba(0, 0, 0, 0.06)",
    "0px 19px 57px rgba(0, 0, 0, 0.05), 0px 20px 41px rgba(0, 0, 0, 0.06)",
    "0px 20px 60px rgba(0, 0, 0, 0.05), 0px 21px 43px rgba(0, 0, 0, 0.06)",
    "0px 21px 63px rgba(0, 0, 0, 0.05), 0px 22px 45px rgba(0, 0, 0, 0.06)",
    "0px 22px 66px rgba(0, 0, 0, 0.05), 0px 23px 47px rgba(0, 0, 0, 0.06)",
    "0px 22px 69px rgba(0, 0, 0, 0.05), 0px 24px 49px rgba(0, 0, 0, 0.06)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "8px 16px",
          fontWeight: 600,
        },
        containedPrimary: {
          "&:hover": {
            backgroundColor: "#0351b7",
          },
        },
        containedSecondary: {
          "&:hover": {
            backgroundColor: "#059669",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)",
          borderRadius: 8,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: "24px",
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "24px",
          "&:last-child": {
            paddingBottom: "24px",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Apply responsive typography
theme = responsiveFontSizes(theme);

export default theme;
