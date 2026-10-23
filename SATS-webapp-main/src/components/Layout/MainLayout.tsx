import React, { useState, useRef, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  InputBase,
  Paper,
  Badge,
  Popover,
  Chip,
  Stack,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Map as MapIcon,
  AccountCircle as AccountCircleIcon,
  History as HistoryIcon,
  MeetingRoom as RoomIcon,
  Person as PersonIcon,
  BarChart as BarChartIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  Notifications as NotificationsIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  WarningAmber as WarningIcon,
  QrCode as QrCodeIcon,
  ReportProblem as ReportProblemIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI } from '@/services/notifications';
import { SystemNotification } from '@/types';

const DRAWER_WIDTH = 240;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Sync navbar search bar with the active ?search= URL param
  useEffect(() => {
    if (router.isReady) {
      setSearchQuery((router.query.search as string) || '');
    }
  }, [router.isReady, router.query.search]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    setLogoutDialogOpen(true);
  };

  const handleConfirmLogout = async () => {
    setLogoutDialogOpen(false);
    await logout();
    router.push('/login?loggedOut=true');
  };

  // System Notifications State
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [recentAlerts, setRecentAlerts] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getActive();
      setRecentAlerts(res.data?.data || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      loadNotifications();
    } catch (err) {
      // silent
    }
  };

  const menuItems = [
    { label: 'Dashboard',     icon: <DashboardIcon />,     href: '/' },
    { label: 'Assets',        icon: <AssignmentIcon />,    href: '/assets' },
    { label: 'Rooms',         icon: <RoomIcon />,          href: '/rooms' },
    { label: 'Rooms Map',     icon: <MapIcon />,           href: '/map/rooms' },
    { label: 'QR Management', icon: <QrCodeIcon />,        href: '/qr-management' },
    { label: 'Maintenance',   icon: <BuildIcon />,         href: '/maintenance' },
    { label: 'Reported Issues', icon: <ReportProblemIcon />, href: '/my-issues' },
    { label: 'Notifications', icon: <NotificationsIcon />, href: '/notifications' },
    { label: 'Scan History',  icon: <HistoryIcon />,       href: '/scan-history' },
    { label: 'Reports',       icon: <BarChartIcon />,      href: '/reports' },
    { label: 'Users',         icon: <PeopleIcon />,        href: '/users' },
    { label: 'My Profile',    icon: <PersonIcon />,        href: '/profile' },
  ];

  const drawer = (
    <Box sx={{ overflow: 'auto', height: '100%', background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)' }}>
      {/* Sidebar Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%)',
          borderBottom: '2px solid rgba(0, 217, 255, 0.2)',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 217, 255, 0.3)',
          }}
        >
          <DashboardIcon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
          }}
        >
          SATS
        </Typography>
      </Box>

      {/* Navigation List */}
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.href} disablePadding sx={{ mb: 0.5, px: 1 }}>
            <Link href={item.href} style={{ width: '100%' }}>
              <Tooltip title={item.label} placement="right">
                <ListItemButton
                  selected={router.pathname === item.href}
                  sx={{
                    borderRadius: '10px',
                    mx: 0.5,
                    transition: 'all 0.3s ease',
                    color: router.pathname === item.href ? '#00D9FF' : 'rgba(255,255,255,0.6)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 102, 255, 0.15)',
                      color: '#00D9FF',
                      transform: 'translateX(4px)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(0, 102, 255, 0.25)',
                      borderLeft: '3px solid #00D9FF',
                      color: '#00D9FF',
                      '& .MuiListItemIcon-root': {
                        color: '#00D9FF',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 102, 255, 0.35)',
                      },
                    },
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      minWidth: 40,
                      color: 'inherit',
                      fontSize: '1.3rem',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    sx={{
                      '& .MuiTypography-root': {
                        fontSize: '0.95rem',
                        fontWeight: router.pathname === item.href ? 600 : 500,
                      },
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            </Link>
          </ListItem>
        ))}
      </List>

      {/* Sidebar Footer - User Info Preview */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          borderTop: '1px solid rgba(0, 217, 255, 0.1)',
          background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%)',
        }}
      >
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>
          👤 Logged in
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(0, 217, 255, 0.8)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user?.name || 'User'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
          boxShadow: '0 8px 24px rgba(0, 102, 255, 0.15)',
          borderBottom: '1px solid rgba(0, 217, 255, 0.1)',
          overflow: 'visible',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', overflow: 'visible' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 1, 
                display: { sm: 'none' },
                color: '#00D9FF',
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00D9FF 0%, #0099FF 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px',
              }}
            >
              Smart Asset Tracker
            </Typography>
          </Box>
          {/* Global Search */}
          <Box ref={searchRef} sx={{ position: 'relative', display: { xs: 'none', md: 'flex' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', px: 2, py: 0.8, border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s', '&:focus-within': { backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(0,217,255,0.4)' }, minWidth: 220 }}>
              <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }} />
              <InputBase
                placeholder="Search assets, rooms…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 300)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/assets?search=${encodeURIComponent(searchQuery)}`);
                    setSearchOpen(false);
                  }
                }}
                endAdornment={searchQuery ? (
                  <IconButton 
                    size="small" 
                    onClick={() => { setSearchQuery(''); router.push(router.pathname); }}
                    sx={{ color: 'rgba(255,255,255,0.4)', padding: '2px' }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                ) : null}
                sx={{ color: 'white', fontSize: '0.875rem', '& input::placeholder': { color: 'rgba(255,255,255,0.4)' }, flex: 1 }}
              />
            </Box>
            {searchOpen && searchQuery.trim().length > 0 && (
              <Paper elevation={8} sx={{ position: 'absolute', top: '110%', left: 0, right: 0, borderRadius: '10px', overflow: 'hidden', zIndex: 9999, minWidth: 280 }}>
                <MenuItem dense onClick={() => { router.push(`/assets?search=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}
                  sx={{ '&:hover': { backgroundColor: 'rgba(0,102,255,0.08)' } }}>
                  <SearchIcon sx={{ mr: 1.5, fontSize: 16, color: '#0066FF' }} />
                  <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>Search Assets for &quot;{searchQuery}&quot;</Typography></Box>
                </MenuItem>
                <Divider />
                <MenuItem dense onClick={() => { router.push(`/rooms?search=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}
                  sx={{ '&:hover': { backgroundColor: 'rgba(0,102,255,0.08)' } }}>
                  <SearchIcon sx={{ mr: 1.5, fontSize: 16, color: '#7C3AED' }} />
                  <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>Search Rooms for &quot;{searchQuery}&quot;</Typography></Box>
                </MenuItem>
              </Paper>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Notifications Bell */}
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={(e) => setNotifAnchorEl(e.currentTarget)}
                sx={{
                  color: '#00D9FF',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  '&:hover': { backgroundColor: 'rgba(0,217,255,0.15)' },
                  width: 40,
                  height: 40,
                }}
              >
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Notification Popover */}
            <Popover
              open={Boolean(notifAnchorEl)}
              anchorEl={notifAnchorEl}
              onClose={() => setNotifAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  width: 360,
                  maxHeight: 460,
                  borderRadius: '16px',
                  boxShadow: '0 12px 40px rgba(0, 26, 77, 0.18)',
                  border: '1px solid rgba(0, 102, 255, 0.1)',
                  p: 0,
                  overflow: 'hidden',
                },
              }}
            >
              <Box sx={{ p: 2, background: 'linear-gradient(135deg, #001A4D 0%, #002B80 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationsIcon sx={{ color: '#00D9FF', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Notifications</Typography>
                  {unreadCount > 0 && (
                    <Chip label={`${unreadCount} New`} size="small" sx={{ bgcolor: '#EF4444', color: 'white', height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                  )}
                </Box>
                {unreadCount > 0 && (
                  <Button size="small" onClick={handleMarkAllRead} sx={{ color: '#00D9FF', textTransform: 'none', fontSize: '0.75rem', p: 0 }}>
                    Mark all read
                  </Button>
                )}
              </Box>

              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {recentAlerts.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 36, color: '#10B981', mb: 1 }} />
                    <Typography variant="body2" color="textSecondary">All caught up! No active alerts.</Typography>
                  </Box>
                ) : (
                  recentAlerts.slice(0, 5).map((alert) => (
                    <Box
                      key={alert._id}
                      onClick={() => {
                        setNotifAnchorEl(null);
                        router.push('/notifications');
                      }}
                      sx={{
                        p: 1.8,
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        bgcolor: alert.isRead ? 'transparent' : 'rgba(0, 102, 255, 0.04)',
                        '&:hover': { bgcolor: 'rgba(0, 102, 255, 0.08)' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: alert.priority === 'CRITICAL' ? '#DC2626' : alert.priority === 'HIGH' ? '#EA580C' : '#0284C7' }}>
                          {alert.priority} • {alert.category}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: alert.isRead ? 500 : 700, color: '#1E293B', mb: 0.3 }}>
                        {alert.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {alert.message}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>

              <Divider />
              <Box sx={{ p: 1.2, textAlign: 'center', bgcolor: '#F8FAFC' }}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => {
                    setNotifAnchorEl(null);
                    router.push('/notifications');
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700, color: '#0066FF' }}
                >
                  View All Notifications & Settings
                </Button>
              </Box>
            </Popover>

            <Tooltip title="User Profile">
              <Avatar
                sx={{ 
                  width: 40, 
                  height: 40, 
                  background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 217, 255, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 8px 20px rgba(0, 217, 255, 0.5)',
                    transform: 'scale(1.05)',
                  },
                }}
                onClick={handleMenuOpen}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  width: 260,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fb 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 12px 40px rgba(0, 26, 77, 0.15)',
                  border: '1px solid rgba(0, 102, 255, 0.1)',
                  mt: 1.5,
                  overflow: 'visible',
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 18,
                    width: 12,
                    height: 12,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                    borderLeft: '1px solid rgba(0, 102, 255, 0.1)',
                    borderTop: '1px solid rgba(0, 102, 255, 0.1)',
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
                    boxShadow: '0 4px 12px rgba(0, 217, 255, 0.3)',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#001A4D', lineHeight: 1.2 }}>
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                    {user?.email}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#0066FF', 
                      backgroundColor: 'rgba(0, 102, 255, 0.1)', 
                      px: 1, 
                      py: 0.2, 
                      borderRadius: '6px',
                      fontWeight: 700,
                      display: 'inline-block',
                      fontSize: '0.65rem',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'User'}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ borderColor: 'rgba(0,0,0,0.05)' }} />
              
              <Box sx={{ p: 1 }}>
                <MenuItem 
                  onClick={() => {
                    handleMenuClose();
                    router.push('/profile');
                  }}
                  sx={{
                    borderRadius: '8px',
                    mb: 0.5,
                    px: 2,
                    py: 1.5,
                    color: '#444',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 102, 255, 0.05)',
                      color: '#0066FF',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <AccountCircleIcon sx={{ mr: 2, fontSize: 22 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>My Profile</Typography>
                </MenuItem>

                <MenuItem 
                  onClick={handleLogoutClick}
                  sx={{
                    borderRadius: '8px',
                    px: 2,
                    py: 1.5,
                    color: '#FF4D7D',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 77, 125, 0.05)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <LogoutIcon sx={{ mr: 2, fontSize: 22 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Logout</Typography>
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              mt: 8,
              background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
              borderRight: '1px solid rgba(0, 217, 255, 0.1)',
              position: 'fixed',
              height: 'calc(100vh - 64px)',
              overflow: 'auto',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          background: 'linear-gradient(135deg, #f5f7fb 0%, #eef1f8 100%)',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>

      {/* Profile Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f7fb 100%)',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
          <Avatar
            sx={{ 
              width: 80, 
              height: 80, 
              margin: '0 auto',
              mb: 2,
              background: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
              boxShadow: '0 8px 24px rgba(0, 217, 255, 0.3)',
              fontSize: '2.5rem',
              fontWeight: 'bold',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#001A4D' }}>
            {user?.name}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#0066FF', 
              backgroundColor: 'rgba(0, 102, 255, 0.1)', 
              px: 1.5, 
              py: 0.5, 
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-block',
              mt: 1,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
          >
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'User'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: 4, pb: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Email Address
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
              {user?.email}
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              Account ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#666', mb: 2 }}>
              {user?.id || (user as any)?._id || 'N/A'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            onClick={() => setProfileDialogOpen(false)}
            sx={{ borderRadius: '8px', px: 4 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logout Confirmation Dialog (FR06-04) */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 1,
            maxWidth: 420,
            width: '100%',
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', pb: 1 }}>
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.6 }}>
            Are you sure you want to log out of your account? You will be redirected to the login page.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setLogoutDialogOpen(false)}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              color: '#666',
              borderColor: '#ccc',
              '&:hover': { borderColor: '#999' }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmLogout}
            color="error"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              background: 'linear-gradient(135deg, #FF4D7D 0%, #E0245E 100%)',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(255, 77, 125, 0.3)',
            }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Layout;
