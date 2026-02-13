// frontend/client-portal/src/components/layout/PublicHeader.tsx

import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { Menu as MenuIcon, Close as CloseIcon } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { tokens } from "../../design-system";
import type { NavigationItem } from "../../types/layout.types";

const navigationItems: NavigationItem[] = [
  { id: "home", label: "Home", path: "/" },
  { id: "about", label: "About Us", path: "/about" },
  { id: "services", label: "Services", path: "/services" },
  { id: "rates", label: "Rates", path: "/rates" },
  { id: "facilities", label: "Facilities", path: "/facilities" },
  { id: "partner", label: "Partner With Us", path: "/partner" },
  { id: "reviews", label: "Reviews", path: "/reviews" },
  { id: "podcasts", label: "Podcasts", path: "/podcasts" },
  { id: "contact", label: "Contact", path: "/contact" },
];

export const PublicHeader: React.FC = () => {
  const isMobile = useMediaQuery("(max-width:1199.95px)");
  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();
  // Toast actions available but not used in this component
  // const { showInfo } = useToastActions();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // FIXED: Book Now should always lead to booking, regardless of auth status
  const handleBookNow = () => {
    navigate("/booking");
    setMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // FIXED: Consider booking pages as non-home for header styling
  const isHomePage = location.pathname === "/";
  const isBookingPage = location.pathname.startsWith("/booking");

  // Robust background color system for proper logo contrast
  // On home page (not scrolled): transparent to show gradient background
  // Otherwise: Use warm sage for consistent branding and logo visibility
  const headerBackground =
    isScrolled || !isHomePage
      ? alpha(tokens.color.base.sage[500], 0.95)
      : alpha("#ffffff", 0.1);

  const textColor = isScrolled || !isHomePage ? "#ffffff" : "white";

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: headerBackground,
          backdropFilter: "blur(20px)",
          color: textColor,
          transition: "all 0.3s ease",
          borderBottom:
            isScrolled || !isHomePage
              ? `1px solid ${alpha("#ffffff", 0.2)}`
              : "none",
        }}
      >
        <Toolbar sx={{ py: 1, px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Left Section: Logo */}
          <Box
            display="flex"
            alignItems="center"
            sx={{
              cursor: "pointer",
              mr: { xs: 2, lg: 2, xl: 3 },
              flexShrink: 0,
            }}
            onClick={() => handleNavigation("/")}
          >
            {!logoError ? (
              <Box
                component="img"
                src="/logo.png"
                alt="LifePlace Alfonso"
                onError={() => setLogoError(true)}
                sx={{
                  height: { xs: 72, lg: 80, xl: 96 },
                  width: "auto",
                  objectFit: "contain",
                  maxWidth: { xs: "220px", lg: "240px", xl: "300px" },
                }}
              />
            ) : (
              <>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    color: "inherit",
                    letterSpacing: "-0.02em",
                  }}
                >
                  LifePlace
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    ml: 1,
                    opacity: 0.8,
                    fontWeight: 500,
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  Alfonso
                </Typography>
              </>
            )}
          </Box>

          {/* Center Section: Navigation (Desktop) */}
          {!isMobile && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-evenly",
                flex: 1,
                minWidth: 0,
              }}
            >
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: "inherit",
                    fontWeight: 500,
                    px: { lg: 1, xl: 1.5 },
                    py: 1,
                    borderRadius: 2,
                    position: "relative",
                    whiteSpace: "nowrap",
                    "&:hover": {
                      backgroundColor:
                        isScrolled || !isHomePage
                          ? alpha("#ffffff", 0.2)
                          : alpha(tokens.color.base.sage[500], 0.1),
                    },
                    ...(isActivePath(item.path) && {
                      color:
                        isScrolled || !isHomePage
                          ? "#ffffff"
                          : tokens.color.base.sage[600],
                      fontWeight: 600,
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 24,
                        height: 2,
                        backgroundColor:
                          isScrolled || !isHomePage
                            ? "#ffffff"
                            : tokens.color.base.terracotta[500],
                        borderRadius: 1,
                      },
                    }),
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Right Section: Actions */}
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            sx={{ flexShrink: 0 }}
          >
            {/* User Actions */}
            <Box display="flex" alignItems="center" gap={1}>
              {/* Show dashboard link for authenticated users */}
              {isAuthenticated && !isMobile && (
                <Button
                  variant="outlined"
                  onClick={() => navigate("/dashboard")}
                  sx={{
                    borderColor: "currentColor",
                    color: "inherit",
                    "&:hover": {
                      borderColor: "currentColor",
                      backgroundColor:
                        isScrolled || !isHomePage
                          ? alpha("#ffffff", 0.2)
                          : alpha(tokens.color.base.sage[500], 0.1),
                    },
                  }}
                >
                  My Dashboard
                </Button>
              )}

              {/* Show login link for unauthenticated users on desktop */}
              {!isAuthenticated && !isMobile && (
                <Button
                  variant="text"
                  onClick={() => handleNavigation("/login")}
                  sx={{
                    color: "inherit",
                    "&:hover": {
                      backgroundColor:
                        isScrolled || !isHomePage
                          ? alpha("#ffffff", 0.2)
                          : alpha(tokens.color.base.sage[500], 0.1),
                    },
                  }}
                >
                  Sign In
                </Button>
              )}

              {/* Book Now button - always visible and leads to booking */}
              <Button
                variant="contained"
                onClick={handleBookNow}
                sx={{
                  backgroundColor:
                    isScrolled || !isHomePage
                      ? tokens.color.base.terracotta[500]
                      : tokens.color.base.terracotta[500],
                  color: "#ffffff",
                  px: 3,
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: tokens.color.base.terracotta[600],
                    transform: "translateY(-1px)",
                  },
                  // Highlight if on booking page
                  ...(isBookingPage && {
                    backgroundColor: tokens.color.base.terracotta[600],
                  }),
                }}
              >
                {isBookingPage ? "Booking..." : "Book Now"}
              </Button>
            </Box>

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <IconButton
                edge="end"
                onClick={() => setMobileMenuOpen(true)}
                sx={{ color: "inherit", ml: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            {!logoError ? (
              <Box
                component="img"
                src="/logo.png"
                alt="LifePlace Alfonso"
                onError={() => setLogoError(true)}
                sx={{
                  height: 64,
                  width: "auto",
                  objectFit: "contain",
                  maxWidth: "240px",
                }}
              />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                LifePlace Alfonso
              </Typography>
            )}
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Navigation */}
          <List sx={{ flex: 1, px: 1 }}>
            {navigationItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={isActivePath(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      backgroundColor: alpha(tokens.color.base.sage[500], 0.1),
                      color: tokens.color.base.sage[600],
                      "&:hover": {
                        backgroundColor: alpha(
                          tokens.color.base.sage[500],
                          0.15,
                        ),
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    sx={{
                      "& .MuiListItemText-primary": {
                        fontWeight: isActivePath(item.path) ? 600 : 500,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}

            {/* Add Book Now to mobile menu for easy access */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleBookNow}
                selected={isBookingPage}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  mb: 0.5,
                  backgroundColor: alpha(
                    tokens.color.base.terracotta[500],
                    0.1,
                  ),
                  "&:hover": {
                    backgroundColor: alpha(
                      tokens.color.base.terracotta[500],
                      0.15,
                    ),
                  },
                  "&.Mui-selected": {
                    backgroundColor: alpha(
                      tokens.color.base.terracotta[500],
                      0.2,
                    ),
                    color: tokens.color.base.terracotta[600],
                  },
                }}
              >
                <ListItemText
                  primary={isBookingPage ? "Booking..." : "Book Event"}
                  sx={{
                    "& .MuiListItemText-primary": {
                      fontWeight: 600,
                      color: tokens.color.base.terracotta[600],
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>

          {/* Actions */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            {!isAuthenticated ? (
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleNavigation("/login")}
                >
                  Sign In
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => handleNavigation("/register")}
                  sx={{ color: "text.secondary" }}
                >
                  Create Account
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleNavigation("/dashboard")}
              >
                My Dashboard
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
