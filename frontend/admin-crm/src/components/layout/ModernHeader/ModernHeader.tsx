import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { Menu as MenuIcon, Close, HelpOutlineRounded } from '@mui/icons-material';
import { tokens } from '@/design-system';
import { createTransition } from '@/design-system/utils/animations';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { useModernHeaderLogic } from './useModernHeaderLogic';
import { DesktopNavigation } from './DesktopNavigation';
import { UserMenu } from './UserMenu';
import { MobileNavigation } from './MobileNavigation';

export const ModernHeader: React.FC = () => {
  const {
    isMobile,
    isAboveLg,
    isAboveXl,
    navigate,
    headerHeight,
    headerStyle,
    isDark,
    user,
    appTheme,
    userMenuAnchor,
    mobileMenuOpen,
    moreMenuAnchor,
    setMoreMenuAnchor,
    handleUserMenuOpen,
    handleUserMenuClose,
    handleLogout,
    handleSettingsClick,
    handleThemeToggle,
    toggleMobileMenu,
    handleNavigate,
    isActiveRoute,
    getInitials,
    handleStartTour,
    visibleItems,
    overflowItems,
    hasActiveOverflow,
  } = useModernHeaderLogic();

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          ...headerStyle,
          zIndex: 1300,
          height: headerHeight,
          transition: createTransition(['background'], 'fast'),
        }}
      >
        <Toolbar
          sx={{
            px: { xs: 2, sm: 3, lg: 4 },
            height: headerHeight,
            minHeight: `${headerHeight}px !important`,
          }}
        >
          {/* Left Section: Brand + Navigation */}
          <Box display="flex" alignItems="center" flex={1} minWidth={0} gap={2}>
            {isMobile && (
              <Tooltip title="Menu">
                <IconButton
                  edge="start"
                  onClick={toggleMobileMenu}
                  sx={{
                    borderRadius: tokens.spacing.radius.md,
                    width: 44,
                    height: 44,
                    transition: createTransition(['background'], 'fast'),
                    background: tokens.color.neutral[100],
                    border: `1px solid ${tokens.color.neutral[200]}`,
                    '&:hover': {
                      background: tokens.color.neutral[200],
                    },
                    '&:active': {
                      background: tokens.color.neutral[300],
                    },
                  }}
                >
                  {mobileMenuOpen ? <Close /> : <MenuIcon />}
                </IconButton>
              </Tooltip>
            )}

            <Box
              data-tour="brand-logo"
              display="flex"
              alignItems="center"
              sx={{
                cursor: 'pointer',
                transition: createTransition('opacity', 'fast'),
                '&:hover': {
                  opacity: 0.8,
                },
              }}
              onClick={() => navigate('/dashboard')}
            >
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  color: tokens.color.primary[600],
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '1.1rem', md: '1.35rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                LifePlace Admin
              </Typography>
            </Box>

            {!isMobile && (
              <DesktopNavigation
                visibleItems={visibleItems}
                overflowItems={overflowItems}
                hasActiveOverflow={hasActiveOverflow}
                isAboveLg={isAboveLg}
                isAboveXl={isAboveXl}
                isDark={isDark}
                moreMenuAnchor={moreMenuAnchor}
                setMoreMenuAnchor={setMoreMenuAnchor}
                navigate={navigate}
                isActiveRoute={isActiveRoute}
              />
            )}
          </Box>

          {/* Right Section: Notifications + User */}
          <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
            <Tooltip title="Help Center">
              <IconButton
                onClick={() => navigate('/help')}
                sx={{
                  borderRadius: tokens.spacing.radius.md,
                  width: 40,
                  height: 40,
                  transition: createTransition(['background'], 'fast'),
                  '&:hover': { background: tokens.color.neutral[100] },
                }}
              >
                <HelpOutlineRounded sx={{ fontSize: 22 }} />
              </IconButton>
            </Tooltip>

            <Box data-tour="notification-badge" sx={{ position: 'relative' }}>
              <NotificationBadge />
            </Box>

            <UserMenu
              user={user}
              isDark={isDark}
              themeMode={appTheme.mode}
              effectiveMode={appTheme.effectiveMode}
              userMenuAnchor={userMenuAnchor}
              onUserMenuOpen={handleUserMenuOpen}
              onUserMenuClose={handleUserMenuClose}
              onSettingsClick={handleSettingsClick}
              onThemeToggle={handleThemeToggle}
              onStartTour={handleStartTour}
              onHelpClick={() => navigate('/help')}
              onLogout={handleLogout}
              getInitials={getInitials}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {isMobile && (
        <MobileNavigation
          open={mobileMenuOpen}
          headerHeight={headerHeight}
          isDark={isDark}
          onNavigate={handleNavigate}
          isActiveRoute={isActiveRoute}
        />
      )}
    </>
  );
};
