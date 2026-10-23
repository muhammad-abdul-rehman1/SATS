import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  CircularProgress,
  Grid,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Avatar,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  FormControlLabel,
  Switch,
  Stack,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  WarningAmber as WarningIcon,
  ErrorOutline as ErrorIcon,
  InfoOutlined as InfoIcon,
  Build as BuildIcon,
  Security as SecurityIcon,
  Tune as TuneIcon,
  History as HistoryIcon,
  DoneAll as DoneAllIcon,
  DeleteSweep as DeleteSweepIcon,
  Campaign as BroadcastIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsAPI } from '@/services/notifications';
import { SystemNotification, NotificationSetting, NotificationStats } from '@/types';
import { formatDateTime } from '@/utils/formatting';

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();

  // Tab State: 0 = Active Alerts, 1 = Settings & Frequency, 2 = Notification History
  const [activeTab, setActiveTab] = useState(0);

  // Data States
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    active: 0,
    resolved: 0,
    dismissed: 0,
    critical: 0,
    unread: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Settings State
  const [settings, setSettings] = useState<NotificationSetting>({
    scope: 'GLOBAL',
    emailNotifications: true,
    inAppAlerts: true,
    maintenanceReminders: true,
    securityAlerts: true,
    assetStatusAlerts: true,
    assetMovementAlerts: true,
    notificationFrequency: 'REALTIME',
    digestTime: '09:00',
    minSeverity: 'LOW',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Resolve Dialog State
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<SystemNotification | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Broadcast Dialog State
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    category: 'SYSTEM' as 'ASSET' | 'MAINTENANCE' | 'SECURITY' | 'USER' | 'SYSTEM',
    type: 'SYSTEM' as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'MAINTENANCE' | 'SECURITY' | 'SYSTEM',
  });
  const [broadcasting, setBroadcasting] = useState(false);

  // Fetch Notifications and Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifsRes, statsRes] = await Promise.all([
        notificationsAPI.getAll({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          limit: 100,
        }),
        notificationsAPI.getStats(),
      ]);

      const items = (notifsRes.data as any)?.data || (notifsRes.data as any)?.items || (Array.isArray(notifsRes.data) ? notifsRes.data : []);
      setNotifications(items);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await notificationsAPI.getSettings();
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchData();
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, search, statusFilter, priorityFilter, categoryFilter]);

  // Handle Save Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await notificationsAPI.updateSettings(settings);
      setSuccessMessage('Notification preferences and delivery frequency saved successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update notification settings.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Resolve Dialog
  const handleOpenResolve = (alert: SystemNotification) => {
    setResolvingAlert(alert);
    setResolutionNotes('');
    setResolveDialogOpen(true);
  };

  // Submit Resolve
  const handleConfirmResolve = async () => {
    if (!resolvingAlert) return;
    try {
      setResolving(true);
      await notificationsAPI.resolve(resolvingAlert._id, resolutionNotes);
      setSuccessMessage(`Alert "${resolvingAlert.title}" marked as resolved.`);
      setResolveDialogOpen(false);
      setResolvingAlert(null);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to resolve alert.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setResolving(false);
    }
  };

  // Dismiss Alert
  const handleDismiss = async (alert: SystemNotification) => {
    try {
      await notificationsAPI.dismiss(alert._id);
      setSuccessMessage(`Alert dismissed.`);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to dismiss alert.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Acknowledge alert
  const handleAcknowledge = async (alert: SystemNotification) => {
    try {
      await notificationsAPI.acknowledge(alert._id);
      setSuccessMessage(`Alert acknowledged successfully.`);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to acknowledge alert.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Simulate unauthorized movement alert
  const handleSimulateMovementAlert = async () => {
    try {
      await notificationsAPI.simulateMovementAlert({
        assetTag: 'AST-001',
        assetName: 'Dell UltraSharp Monitor',
        locationName: 'Unknown Area (Outside Campus Geofence)',
        severity: 'HIGH',
      });
      setSuccessMessage('Unauthorized movement alert simulated for AST-001.');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to simulate movement alert.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Mark single as read
  const handleMarkRead = async (alert: SystemNotification) => {
    try {
      await notificationsAPI.markRead(alert._id);
      fetchData();
    } catch (err) {
      // silent
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setSuccessMessage('All notifications marked as read.');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to mark all as read.');
    }
  };

  // Clear resolved
  const handleClearResolved = async () => {
    try {
      const res = await notificationsAPI.clearResolved();
      setSuccessMessage(res.data?.message || 'Resolved alerts cleared.');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to clear resolved alerts.');
    }
  };

  // Submit Broadcast Alert
  const handleBroadcastSubmit = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      setErrorMessage('Title and message are required for broadcast alerts.');
      return;
    }
    try {
      setBroadcasting(true);
      await notificationsAPI.broadcast(broadcastForm);
      setSuccessMessage('System alert broadcast sent successfully.');
      setBroadcastDialogOpen(false);
      setBroadcastForm({
        title: '',
        message: '',
        priority: 'MEDIUM',
        category: 'SYSTEM',
        type: 'SYSTEM',
      });
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to broadcast alert.');
    } finally {
      setBroadcasting(false);
    }
  };

  // Priority Styling
  const PRIORITY_CONFIG = {
    LOW: { color: '#0284C7', bg: '#E0F2FE', label: 'Low' },
    MEDIUM: { color: '#D97706', bg: '#FEF3C7', label: 'Medium' },
    HIGH: { color: '#EA580C', bg: '#FFEDD5', label: 'High' },
    CRITICAL: { color: '#DC2626', bg: '#FEE2E2', label: 'Critical' },
  };

  // Status Styling
  const STATUS_CONFIG = {
    ACTIVE: { color: '#2563EB', bg: '#EFF6FF', label: 'Active' },
    RESOLVED: { color: '#16A34A', bg: '#DCFCE7', label: 'Resolved' },
    DISMISSED: { color: '#64748B', bg: '#F1F5F9', label: 'Dismissed' },
  };

  // Category Icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MAINTENANCE':
        return <BuildIcon fontSize="small" sx={{ color: '#EA580C' }} />;
      case 'SECURITY':
        return <SecurityIcon fontSize="small" sx={{ color: '#DC2626' }} />;
      case 'ASSET':
        return <InfoIcon fontSize="small" sx={{ color: '#0284C7' }} />;
      default:
        return <NotificationsIcon fontSize="small" sx={{ color: '#2563EB' }} />;
    }
  };

  // Columns for Alert Management Table
  const columns = [
    {
      id: 'alert',
      label: 'Alert & Details',
      minWidth: 280,
      render: (row: SystemNotification) => (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              bgcolor: (PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.MEDIUM).bg,
              mt: 0.2,
            }}
          >
            {getCategoryIcon(row.category)}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: row.isRead ? 600 : 800, color: '#1E293B' }}>
                {row.title}
              </Typography>
              {!row.isRead && (
                <Chip label="NEW" size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#EF4444', color: 'white', fontWeight: 800 }} />
              )}
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
              {row.message}
            </Typography>
            {row.resolutionNotes && (
              <Box sx={{ mt: 0.8, p: 0.8, bgcolor: '#F0FDF4', borderRadius: 1, border: '1px solid #BBF7D0' }}>
                <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, display: 'block' }}>
                  ✓ Resolution: {row.resolutionNotes}
                </Typography>
                {row.resolvedBy?.name && (
                  <Typography variant="caption" color="textSecondary">
                    Resolved by {row.resolvedBy.name} on {row.resolvedAt ? formatDateTime(row.resolvedAt) : ''}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      minWidth: 120,
      render: (row: SystemNotification) => (
        <Chip
          size="small"
          label={row.category}
          sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}
        />
      ),
    },
    {
      id: 'priority',
      label: 'Severity',
      minWidth: 100,
      render: (row: SystemNotification) => {
        const cfg = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.MEDIUM;
        return (
          <Chip
            size="small"
            label={cfg.label}
            sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: cfg.bg, color: cfg.color }}
          />
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      render: (row: SystemNotification) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.ACTIVE;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
            <Chip
              size="small"
              label={cfg.label}
              sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: cfg.bg, color: cfg.color }}
            />
            {row.isAcknowledged && (
              <Chip
                size="small"
                label="Acknowledged"
                sx={{ fontWeight: 600, fontSize: '0.68rem', bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}
              />
            )}
          </Box>
        );
      },
    },
    {
      id: 'createdAt',
      label: 'Timestamp',
      minWidth: 150,
      render: (row: SystemNotification) => (
        <Box>
          <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
            {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 160,
      align: 'right' as const,
      render: (row: SystemNotification) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          {row.status === 'ACTIVE' && !row.isAcknowledged && (
            <Tooltip title="Acknowledge Alert">
              <IconButton size="small" onClick={() => handleAcknowledge(row)} sx={{ color: '#0284C7' }}>
                <AssignmentTurnedInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {row.status === 'ACTIVE' && (
            <Tooltip title="Resolve Alert">
              <IconButton size="small" onClick={() => handleOpenResolve(row)} sx={{ color: '#16A34A' }}>
                <CheckCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {row.status === 'ACTIVE' && (
            <Tooltip title="Dismiss Alert">
              <IconButton size="small" onClick={() => handleDismiss(row)} sx={{ color: '#64748B' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {!row.isRead && (
            <Tooltip title="Mark as Read">
              <IconButton size="small" onClick={() => handleMarkRead(row)} sx={{ color: '#0284C7' }}>
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'rgba(0, 102, 255, 0.1)', color: '#0066FF', width: 44, height: 44 }}>
                <NotificationsIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D' }}>
                  Notifications & Alerts
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Manage notification preferences, configure alert delivery frequencies, resolve alerts, and review history.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<SecurityIcon />}
              onClick={handleSimulateMovementAlert}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Simulate Movement Alert
            </Button>

            {user?.role === 'SUPER_ADMIN' && (
              <Button
                variant="outlined"
                startIcon={<BroadcastIcon />}
                onClick={() => setBroadcastDialogOpen(true)}
                sx={{
                  borderColor: '#0066FF',
                  color: '#0066FF',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(0, 102, 255, 0.05)' },
                }}
              >
                Broadcast Alert
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllRead}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Mark All as Read
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearResolved}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Clear Resolved
            </Button>
          </Stack>
        </Box>

        {/* Alerts Feedback */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* KPI Stat Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Generated Alerts
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D', mt: 0.5 }}>
                  {stats.total}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Lifetime system events
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #BAE6FD', bgcolor: '#F0F9FF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Unresolved
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284C7', mt: 0.5 }}>
                  {stats.active}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0369A1' }}>
                  Requiring attention
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #FECDD3', bgcolor: '#FFF1F2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#BE123C', fontWeight: 600, textTransform: 'uppercase' }}>
                  Critical Severity
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#E11D48', mt: 0.5 }}>
                  {stats.critical}
                </Typography>
                <Typography variant="caption" sx={{ color: '#BE123C' }}>
                  Immediate priority
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #BBF7D0', bgcolor: '#F0FDF4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>
                  Resolved Alerts
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#16A34A', mt: 0.5 }}>
                  {stats.resolved}
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803D' }}>
                  Completed resolutions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tab Navigation */}
        <Paper sx={{ borderRadius: 3, mb: 3, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => {
              setActiveTab(val);
              if (val === 0) setStatusFilter('ACTIVE');
              if (val === 2) setStatusFilter('all');
            }}
            indicatorColor="primary"
            textColor="primary"
            sx={{ px: 2, bgcolor: '#fff' }}
          >
            <Tab
              icon={<NotificationsIcon fontSize="small" />}
              iconPosition="start"
              label={`System Alerts (${stats.active})`}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              icon={<TuneIcon fontSize="small" />}
              iconPosition="start"
              label="Notification Settings & Frequency"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
            <Tab
              icon={<HistoryIcon fontSize="small" />}
              iconPosition="start"
              label="Notification History Log"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            />
          </Tabs>
        </Paper>

        {/* TAB 0 & TAB 2: ALERTS & HISTORY */}
        {(activeTab === 0 || activeTab === 2) && (
          <Box>
            {/* Filters Bar */}
            <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid #E2E8F0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder="Search alerts by title, description, or notes..."
                      size="small"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} md={2.5}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">Active Unresolved</MenuItem>
                      <MenuItem value="RESOLVED">Resolved</MenuItem>
                      <MenuItem value="DISMISSED">Dismissed</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={6} md={2.5}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Severity"
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Severities</MenuItem>
                      <MenuItem value="LOW">Low</MenuItem>
                      <MenuItem value="MEDIUM">Medium</MenuItem>
                      <MenuItem value="HIGH">High</MenuItem>
                      <MenuItem value="CRITICAL">Critical</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={6} md={2}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Category"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Categories</MenuItem>
                      <MenuItem value="ASSET">Asset Alerts</MenuItem>
                      <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                      <MenuItem value="SECURITY">Security</MenuItem>
                      <MenuItem value="SYSTEM">System</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={6} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <IconButton
                      onClick={() => {
                        setSearch('');
                        setStatusFilter(activeTab === 0 ? 'ACTIVE' : 'all');
                        setPriorityFilter('all');
                        setCategoryFilter('all');
                        fetchData();
                      }}
                      sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Alerts Data Table */}
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <DataTable
                columns={columns}
                rows={notifications}
                loading={loading}
                emptyMessage={activeTab === 0 ? 'No active alerts. All systems are operational!' : 'No notification history records found.'}
              />
            </Card>
          </Box>
        )}

        {/* TAB 1: NOTIFICATION SETTINGS & FREQUENCY CONFIGURATION */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            {/* Delivery Channels & Categories */}
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon sx={{ color: '#0066FF' }} /> Notification Channels & Triggers
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Configure which communication channels and system events generate alerts.
                  </Typography>

                  <Stack spacing={2.5}>
                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Email Notifications
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Dispatch email alerts for maintenance, security, and critical system events.
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                        color="primary"
                      />
                    </Box>

                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          In-App Notification Bell & Toasts
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Display real-time notification badge counts and popover alerts in the navigation bar.
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.inAppAlerts}
                        onChange={(e) => setSettings({ ...settings, inAppAlerts: e.target.checked })}
                        color="primary"
                      />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      Event Category Subscriptions
                    </Typography>

                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Maintenance & Calibration Alerts
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Scheduled service dates, upcoming reminder windows, and reschedule notices.
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.maintenanceReminders}
                        onChange={(e) => setSettings({ ...settings, maintenanceReminders: e.target.checked })}
                        color="primary"
                      />
                    </Box>

                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Security & Account Lockout Alerts
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Repeated failed login attempts, account lockouts, and 2FA anomalies.
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.securityAlerts}
                        onChange={(e) => setSettings({ ...settings, securityAlerts: e.target.checked })}
                        color="primary"
                      />
                    </Box>

                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Asset Status & Location Tracking Alerts
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Assets entering maintenance/retired status and room assignment transfers.
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.assetStatusAlerts}
                        onChange={(e) => setSettings({ ...settings, assetStatusAlerts: e.target.checked, assetMovementAlerts: e.target.checked })}
                        color="primary"
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Delivery Frequency & Quiet Hours */}
            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#001A4D', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ color: '#0066FF' }} /> Notification Frequency
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Configure how frequently alert digests are batched and delivered.
                  </Typography>

                  <Stack spacing={2.5}>
                    {/* Frequency Dropdown */}
                    <TextField
                      select
                      fullWidth
                      label="Delivery Frequency"
                      value={settings.notificationFrequency}
                      onChange={(e) => setSettings({ ...settings, notificationFrequency: e.target.value as any })}
                      helperText="Controls delivery timing for non-critical notification summaries"
                    >
                      <MenuItem value="REALTIME">Real-Time (Immediate delivery)</MenuItem>
                      <MenuItem value="HOURLY">Hourly Digest (Batched summary)</MenuItem>
                      <MenuItem value="DAILY">Daily Digest (Consolidated morning briefing)</MenuItem>
                      <MenuItem value="WEEKLY">Weekly Summary (Weekly administrative report)</MenuItem>
                    </TextField>

                    {/* Digest Time (if Daily/Weekly) */}
                    {(settings.notificationFrequency === 'DAILY' || settings.notificationFrequency === 'WEEKLY') && (
                      <TextField
                        fullWidth
                        type="time"
                        label="Preferred Digest Delivery Time"
                        value={settings.digestTime}
                        onChange={(e) => setSettings({ ...settings, digestTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}

                    {/* Minimum Severity Filter */}
                    <TextField
                      select
                      fullWidth
                      label="Minimum Alert Severity Threshold"
                      value={settings.minSeverity}
                      onChange={(e) => setSettings({ ...settings, minSeverity: e.target.value as any })}
                      helperText="Only alerts at or above this severity will trigger notifications"
                    >
                      <MenuItem value="LOW">Low (Include all routine notices)</MenuItem>
                      <MenuItem value="MEDIUM">Medium (Scheduled services & warnings)</MenuItem>
                      <MenuItem value="HIGH">High (Urgent actions required)</MenuItem>
                      <MenuItem value="CRITICAL">Critical Only (Emergencies & outages)</MenuItem>
                    </TextField>

                    <Divider sx={{ my: 1 }} />

                    {/* Quiet Hours */}
                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Quiet Hours
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Suppress non-critical notifications during off-hours.
                          </Typography>
                        </Box>
                        <Switch
                          checked={settings.quietHoursEnabled}
                          onChange={(e) => setSettings({ ...settings, quietHoursEnabled: e.target.checked })}
                          color="primary"
                        />
                      </Box>

                      {settings.quietHoursEnabled && (
                        <Grid container spacing={1.5} sx={{ mt: 1 }}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              type="time"
                              size="small"
                              label="Quiet Start"
                              value={settings.quietHoursStart}
                              onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value })}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              type="time"
                              size="small"
                              label="Quiet End"
                              value={settings.quietHoursEnd}
                              onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value })}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Grid>
                        </Grid>
                      )}
                    </Box>

                    {/* Save Button */}
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      startIcon={savingSettings ? <CircularProgress size={18} /> : <CheckIcon />}
                      sx={{
                        background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
                        fontWeight: 700,
                        py: 1.2,
                        borderRadius: 2,
                        textTransform: 'none',
                      }}
                    >
                      {savingSettings ? 'Saving Settings...' : 'Save Notification Preferences'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* DIALOG 1: RESOLVE ALERT */}
        <Dialog open={resolveDialogOpen} onClose={() => setResolveDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleOutlineIcon sx={{ color: '#16A34A' }} /> Resolve System Alert
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            {resolvingAlert && (
              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
                  {resolvingAlert.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                  {resolvingAlert.message}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip size="small" label={resolvingAlert.category} />
                  <Chip size="small" label={resolvingAlert.priority} />
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              required
              multiline
              rows={3}
              label="Resolution Summary & Action Notes"
              placeholder="e.g. Inspected server node, verified calibration logs, resolved configuration discrepancy."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              helperText="Describe actions taken to clear and resolve this alert condition"
            />
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setResolveDialogOpen(false)} disabled={resolving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmResolve}
              disabled={resolving || !resolutionNotes.trim()}
              startIcon={resolving ? <CircularProgress size={18} /> : <CheckIcon />}
              sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}
            >
              {resolving ? 'Submitting...' : 'Confirm Resolution'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG 2: BROADCAST SYSTEM ALERT (SUPER ADMIN) */}
        <Dialog open={broadcastDialogOpen} onClose={() => setBroadcastDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BroadcastIcon sx={{ color: '#0066FF' }} /> Broadcast System Alert
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                label="Alert Title / Subject"
                placeholder="e.g. Emergency Server Maintenance, Scheduled Electrical Outage"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Severity Level"
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value as any })}
                  >
                    <MenuItem value="LOW">Low (Informational)</MenuItem>
                    <MenuItem value="MEDIUM">Medium (General Advisory)</MenuItem>
                    <MenuItem value="HIGH">High (Urgent Attention)</MenuItem>
                    <MenuItem value="CRITICAL">Critical (Immediate Outage)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Category"
                    value={broadcastForm.category}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, category: e.target.value as any })}
                  >
                    <MenuItem value="SYSTEM">System</MenuItem>
                    <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                    <MenuItem value="SECURITY">Security</MenuItem>
                    <MenuItem value="ASSET">Asset Management</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              <TextField
                fullWidth
                required
                multiline
                rows={3}
                label="Alert Message / Instructions"
                placeholder="Details of the announcement, impacted facilities, and recommended actions..."
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setBroadcastDialogOpen(false)} disabled={broadcasting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleBroadcastSubmit}
              disabled={broadcasting}
              startIcon={broadcasting ? <CircularProgress size={18} /> : <BroadcastIcon />}
              sx={{ bgcolor: '#0066FF' }}
            >
              {broadcasting ? 'Broadcasting...' : 'Broadcast Alert'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
