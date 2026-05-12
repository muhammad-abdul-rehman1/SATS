import React from 'react';
import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { SATSLogo } from './SATSLogo';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

interface HeaderProps {
  showLogo?: boolean;
  hideUserMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showLogo = true, hideUserMenu = false }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Assets', href: '/assets' },
    { label: 'Rooms', href: '/rooms' },
    { label: 'Map', href: '/map' },
    { label: 'Reports', href: '/reports' },
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
        borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(0, 102, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              transition: 'opacity 0.3s ease',
              '&:hover': {
                opacity: 0.8,
              },
            }}
            onClick={() => router.push('/')}
          >
            {showLogo && <SATSLogo size={40} variant="icon" showText={false} />}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #00D9FF 0%, #00E5FF 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '1px',
                  fontSize: '1.1rem',
                }}
              >
                SATS
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(0, 217, 255, 0.7)',
                  display: 'block',
                  letterSpacing: '0.5px',
                  fontSize: '0.7rem',
                }}
              >
                Smart Asset Tracker
              </Typography>
            </Box>
          </Box>

          {/* Desktop Navigation */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 1,
              ml: 4,
            }}
          >
            {navItems.map((item) => (
              <Button
                key={item.href}
                onClick={() => router.push(item.href)}
                sx={{
                  color: router.pathname === item.href ? '#00D9FF' : '#fff',
                  textTransform: 'none',
                  fontWeight: router.pathname === item.href ? 700 : 500,
                  fontSize: '0.95rem',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: router.pathname === item.href ? '100%' : '0%',
                    height: '2px',
                    background: 'linear-gradient(90deg, #0066FF 0%, #00D9FF 100%)',
                    transition: 'width 0.3s ease',
                  },
                  '&:hover::after': {
                    width: '100%',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* User Menu */}
          {!hideUserMenu && user && (
            <>
              <Button
                onClick={handleUserMenuOpen}
                sx={{
                  textTransform: 'none',
                  color: '#fff',
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(0, 217, 255, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 217, 255, 0.1)',
                    borderColor: 'rgba(0, 217, 255, 0.4)',
                  },
                }}
              >
                <AccountCircleIcon sx={{ fontSize: '1.3rem', color: '#00D9FF' }} />
                <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {user.name || user.email?.split('@')[0]}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(0, 217, 255, 0.7)',
                      display: 'block',
                      fontSize: '0.75rem',
                    }}
                  >
                    {user.role || 'User'}
                  </Typography>
                </Box>
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1.5,
                      boxShadow: '0 4px 20px rgba(0, 102, 255, 0.15)',
                      backgroundColor: '#fff',
                      border: '1px solid rgba(0, 102, 255, 0.1)',
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    handleUserMenuClose();
                    router.push('/users/' + user._id);
                  }}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    },
                  }}
                >
                  <AccountCircleIcon sx={{ mr: 1.5, color: '#0066FF' }} />
                  Profile
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    color: '#FF4D7D',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 77, 125, 0.1)',
                    },
                  }}
                >
                  <LogoutIcon sx={{ mr: 1.5, color: '#FF4D7D' }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}

          {/* Mobile Menu Button */}
          <Button
            onClick={handleMobileMenuOpen}
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: '#00D9FF',
              minWidth: 'auto',
            }}
          >
            <MenuIcon />
          </Button>

          <Menu
            anchorEl={mobileMenuAnchorEl}
            open={Boolean(mobileMenuAnchorEl)}
            onClose={handleMobileMenuClose}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  boxShadow: '0 4px 20px rgba(0, 102, 255, 0.15)',
                  backgroundColor: '#fff',
                  border: '1px solid rgba(0, 102, 255, 0.1)',
                },
              },
            }}
          >
            {navItems.map((item) => (
              <MenuItem
                key={item.href}
                onClick={() => {
                  handleMobileMenuClose();
                  router.push(item.href);
                }}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                  },
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
