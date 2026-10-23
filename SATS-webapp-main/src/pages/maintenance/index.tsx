import React, { useEffect, useState, useMemo } from 'react';
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
  Checkbox,
  Stack,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Build as BuildIcon,
  Add as AddIcon,
  Search as SearchIcon,
  NotificationsActive as ReminderIcon,
  EditCalendar as RescheduleIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Event as EventIcon,
  Person as PersonIcon,
  WarningAmber as WarningIcon,
  AccessTime as AccessTimeIcon,
  History as HistoryIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { maintenanceAPI } from '@/services/maintenance';
import { assetsAPI } from '@/services/assets';
import { usersAPI } from '@/services/users';
import { MaintenanceSchedule, MaintenanceStats, Asset, User } from '@/types';
import { formatDateTime } from '@/utils/formatting';

export default function MaintenancePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();

  // Data states
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Schedule Maintenance Dialog State (FR11-01, FR11-02)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    assetId: '',
    title: '',
    description: '',
    scheduledDate: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    assignedTo: '',
    notes: '',
    setAssetMaintenance: true,
  });
  const [scheduleFormError, setScheduleFormError] = useState('');

  // Reschedule Dialog State (FR11-05)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [reschedulingTask, setReschedulingTask] = useState<MaintenanceSchedule | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // Complete Dialog State
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<MaintenanceSchedule | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [restoreAssetStatus, setRestoreAssetStatus] = useState(true);
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // View Details & History Dialog State (FR11-03)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceSchedule | null>(null);

  // Checking Due Reminders State (FR11-04)
  const [checkingReminders, setCheckingReminders] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, statsRes] = await Promise.all([
        maintenanceAPI.getAll({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          limit: 100,
        }),
        maintenanceAPI.getStats(),
      ]);

      const items = (schedulesRes.data as any)?.data || (schedulesRes.data as any)?.items || (Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
      setSchedules(items);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  };

  // Load assets and users for dropdowns
  const loadDropdowns = async () => {
    try {
      const [assetsRes, usersRes] = await Promise.all([
        assetsAPI.getAll({ limit: 300 }),
        usersAPI.getAll({ limit: 100 }),
      ]);
      const assetList = (assetsRes.data as any)?.data || (assetsRes.data as any)?.assets || (Array.isArray(assetsRes.data) ? assetsRes.data : []);
      const userList = (usersRes.data as any)?.data?.items || (usersRes.data as any)?.users || (Array.isArray(usersRes.data) ? usersRes.data : []);
      setAssets(assetList);
      setUsers(userList);
    } catch (err) {
      console.error('Failed to load dropdown items for maintenance:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchData();
    loadDropdowns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, search, statusFilter, priorityFilter]);

  // Open Schedule Dialog
  const handleOpenScheduleDialog = (preselectedAssetId?: string) => {
    // Default scheduled date to tomorrow at 09:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localIso = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);

    setScheduleForm({
      assetId: preselectedAssetId || '',
      title: '',
      description: '',
      scheduledDate: localIso,
      priority: 'MEDIUM',
      assignedTo: '',
      notes: '',
      setAssetMaintenance: true,
    });
    setScheduleFormError('');
    setScheduleDialogOpen(true);
  };

  // Handle Schedule Submit (FR11-01, FR11-02)
  const handleScheduleSubmit = async () => {
    if (!scheduleForm.assetId) {
      setScheduleFormError('Please select an asset to maintain.');
      return;
    }
    if (!scheduleForm.title.trim()) {
      setScheduleFormError('Please enter a maintenance title/subject.');
      return;
    }
    if (!scheduleForm.scheduledDate) {
      setScheduleFormError('Please select a valid scheduled date.');
      return;
    }

    try {
      setScheduleSubmitting(true);
      setScheduleFormError('');
      await maintenanceAPI.schedule({
        assetId: scheduleForm.assetId,
        title: scheduleForm.title.trim(),
        description: scheduleForm.description.trim() || undefined,
        scheduledDate: new Date(scheduleForm.scheduledDate).toISOString(),
        priority: scheduleForm.priority,
        assignedTo: scheduleForm.assignedTo || undefined,
        notes: scheduleForm.notes.trim() || undefined,
        setAssetMaintenance: scheduleForm.setAssetMaintenance,
      });

      setSuccessMessage('Maintenance successfully scheduled! Notification email has been sent.');
      setScheduleDialogOpen(false);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setScheduleFormError(err.response?.data?.message || 'Failed to schedule maintenance.');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  // Open Reschedule Dialog
  const handleOpenRescheduleDialog = (task: MaintenanceSchedule) => {
    setReschedulingTask(task);
    const current = new Date(task.scheduledDate);
    const tzOffset = current.getTimezoneOffset() * 60000;
    const localIso = new Date(current.getTime() - tzOffset).toISOString().slice(0, 16);
    setRescheduleDate(localIso);
    setRescheduleReason('');
    setRescheduleError('');
    setRescheduleDialogOpen(true);
  };

  // Submit Reschedule
  const handleRescheduleSubmit = async () => {
    if (!reschedulingTask) return;
    if (!rescheduleDate) {
      setRescheduleError('Please choose a new scheduled date.');
      return;
    }

    try {
      setRescheduleSubmitting(true);
      setRescheduleError('');
      await maintenanceAPI.reschedule(reschedulingTask._id, {
        newDate: new Date(rescheduleDate).toISOString(),
        reason: rescheduleReason.trim() || 'Rescheduled by administrator',
      });

      setSuccessMessage('Maintenance rescheduled successfully! Staff notified via email.');
      setRescheduleDialogOpen(false);
      setReschedulingTask(null);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setRescheduleError(err.response?.data?.message || 'Failed to reschedule task.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  // Open Complete Dialog
  const handleOpenCompleteDialog = (task: MaintenanceSchedule) => {
    setCompletingTask(task);
    setCompleteNotes('');
    setRestoreAssetStatus(true);
    setCompleteDialogOpen(true);
  };

  // Submit Complete
  const handleCompleteSubmit = async () => {
    if (!completingTask) return;
    try {
      setCompleteSubmitting(true);
      await maintenanceAPI.updateStatus(completingTask._id, {
        status: 'COMPLETED',
        notes: completeNotes.trim() || undefined,
        restoreAssetStatus,
      });

      setSuccessMessage('Maintenance marked as completed and asset status restored to ACTIVE.');
      setCompleteDialogOpen(false);
      setCompletingTask(null);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to complete maintenance task.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setCompleteSubmitting(false);
    }
  };

  // Quick Status change (Cancel / In Progress)
  const handleQuickStatus = async (task: MaintenanceSchedule, newStatus: 'IN_PROGRESS' | 'CANCELLED') => {
    try {
      await maintenanceAPI.updateStatus(task._id, {
        status: newStatus,
        restoreAssetStatus: newStatus === 'CANCELLED',
      });
      setSuccessMessage(`Maintenance task updated to ${newStatus}.`);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update task status.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Manual Trigger for Reminder Checks (FR11-04)
  const handleCheckReminders = async () => {
    try {
      setCheckingReminders(true);
      const res = await maintenanceAPI.checkReminders();
      const count = res.data?.dispatched ?? 0;
      setSuccessMessage(
        count > 0
          ? `Dispatched ${count} reminder email(s) for upcoming maintenance due within 48h!`
          : 'All scheduled maintenance reminders are currently up to date.'
      );
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to check reminders.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setCheckingReminders(false);
    }
  };

  // Open Details Modal (FR11-03)
  const handleOpenDetails = (task: MaintenanceSchedule) => {
    setSelectedTask(task);
    setDetailsDialogOpen(true);
  };

  // Priority Chips Styling
  const PRIORITY_CONFIG = {
    LOW: { color: 'info' as const, bg: '#E3F2FD', text: '#0277BD' },
    MEDIUM: { color: 'warning' as const, bg: '#FFF8E1', text: '#F57F17' },
    HIGH: { color: 'warning' as const, bg: '#FFF3E0', text: '#E65100' },
    CRITICAL: { color: 'error' as const, bg: '#FFEBEE', text: '#C62828' },
  };

  // Status Chips Styling
  const STATUS_CONFIG = {
    SCHEDULED: { bg: '#E0F2FE', text: '#0369A1', label: 'Scheduled' },
    IN_PROGRESS: { bg: '#FEF3C7', text: '#B45309', label: 'In Progress' },
    COMPLETED: { bg: '#DCFCE7', text: '#15803D', label: 'Completed' },
    CANCELLED: { bg: '#F1F5F9', text: '#64748B', label: 'Cancelled' },
  };

  // Table columns definition
  const columns = [
    {
      id: 'asset',
      label: 'Asset',
      minWidth: 200,
      render: (row: MaintenanceSchedule) => {
        const asset = row.assetId;
        if (!asset) return <Typography variant="body2" color="textSecondary">Deleted Asset</Typography>;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={asset.imageUrl || undefined}
              variant="rounded"
              sx={{ width: 40, height: 40, bgcolor: 'rgba(0, 102, 255, 0.1)', color: '#0066FF' }}
            >
              <BuildIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { color: '#0066FF', textDecoration: 'underline' },
                }}
                onClick={() => router.push(`/assets/${asset._id}`)}
              >
                {asset.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Tag: {asset.assetTag} • {asset.assetType}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'title',
      label: 'Maintenance Task',
      minWidth: 220,
      render: (row: MaintenanceSchedule) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
            {row.title}
          </Typography>
          {row.description && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {row.description}
            </Typography>
          )}
          {row.rescheduledCount && row.rescheduledCount > 0 ? (
            <Chip
              size="small"
              icon={<HistoryIcon fontSize="small" />}
              label={`Rescheduled (${row.rescheduledCount}x)`}
              onClick={() => handleOpenDetails(row)}
              sx={{
                mt: 0.5,
                height: 20,
                fontSize: '0.68rem',
                bgcolor: '#FEF3C7',
                color: '#92400E',
                cursor: 'pointer',
              }}
            />
          ) : null}
        </Box>
      ),
    },
    {
      id: 'scheduledDate',
      label: 'Scheduled Date',
      minWidth: 170,
      render: (row: MaintenanceSchedule) => {
        const isOverdue =
          ['SCHEDULED', 'IN_PROGRESS'].includes(row.status) &&
          new Date(row.scheduledDate).getTime() < Date.now();
        return (
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isOverdue ? '#D32F2F' : 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <EventIcon fontSize="small" sx={{ fontSize: 16, color: isOverdue ? '#D32F2F' : '#0066FF' }} />
              {new Date(row.scheduledDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {new Date(row.scheduledDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              {isOverdue && (
                <Chip
                  label="OVERDUE"
                  size="small"
                  color="error"
                  sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                />
              )}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 100,
      render: (row: MaintenanceSchedule) => {
        const cfg = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.MEDIUM;
        return (
          <Chip
            size="small"
            label={row.priority}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: cfg.bg,
              color: cfg.text,
              border: `1px solid ${cfg.text}33`,
            }}
          />
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      render: (row: MaintenanceSchedule) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.SCHEDULED;
        return (
          <Chip
            size="small"
            label={cfg.label}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: cfg.bg,
              color: cfg.text,
            }}
          />
        );
      },
    },
    {
      id: 'assignedTo',
      label: 'Assigned Staff',
      minWidth: 150,
      render: (row: MaintenanceSchedule) => {
        if (!row.assignedTo) {
          return <Typography variant="caption" color="textSecondary">Unassigned</Typography>;
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 26, height: 26, fontSize: '0.75rem', bgcolor: '#0066FF' }}>
              {row.assignedTo.name?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                {row.assignedTo.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                {row.assignedTo.email}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 200,
      align: 'right' as const,
      render: (row: MaintenanceSchedule) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          {/* Details / History Button */}
          <Tooltip title="View Details & History">
            <IconButton size="small" onClick={() => handleOpenDetails(row)} sx={{ color: '#0066FF' }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Reschedule Button */}
          {['SCHEDULED', 'IN_PROGRESS'].includes(row.status) && (
            <Tooltip title="Reschedule Maintenance">
              <IconButton
                size="small"
                onClick={() => handleOpenRescheduleDialog(row)}
                sx={{ color: '#E65100' }}
              >
                <RescheduleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Complete Button */}
          {['SCHEDULED', 'IN_PROGRESS'].includes(row.status) && (
            <Tooltip title="Mark as Completed">
              <IconButton
                size="small"
                onClick={() => handleOpenCompleteDialog(row)}
                sx={{ color: '#2E7D32' }}
              >
                <CompleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Start Progress Button */}
          {row.status === 'SCHEDULED' && (
            <Tooltip title="Start Maintenance">
              <IconButton
                size="small"
                onClick={() => handleQuickStatus(row, 'IN_PROGRESS')}
                sx={{ color: '#F57F17' }}
              >
                <BuildIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Cancel Button */}
          {['SCHEDULED', 'IN_PROGRESS'].includes(row.status) && (
            <Tooltip title="Cancel Maintenance">
              <IconButton
                size="small"
                onClick={() => handleQuickStatus(row, 'CANCELLED')}
                sx={{ color: '#9E9E9E' }}
              >
                <CancelIcon fontSize="small" />
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
                <BuildIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D' }}>
                  Asset Maintenance
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Schedule preventive maintenance, automate email alerts, track history, and manage reschedule workflows.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5}>
            {/* Reminder Check Action Button */}
            <Tooltip title="Scan database and send email reminders for maintenance tasks due within 48 hours">
              <Button
                variant="outlined"
                startIcon={checkingReminders ? <CircularProgress size={18} /> : <ReminderIcon />}
                onClick={handleCheckReminders}
                disabled={checkingReminders}
                sx={{
                  borderColor: '#0066FF',
                  color: '#0066FF',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'rgba(0, 102, 255, 0.05)' },
                }}
              >
                Send Due Reminders
              </Button>
            </Tooltip>

            {/* Schedule Maintenance Action Button */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenScheduleDialog()}
              sx={{
                background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
                color: '#fff',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0052CC 0%, #003D99 100%)',
                },
              }}
            >
              Schedule Maintenance
            </Button>
          </Stack>
        </Box>

        {/* Alerts */}
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
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Operations
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D', mt: 0.5 }}>
                  {stats.total}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Lifetime maintenance records
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 3, border: '1px solid #BAE6FD', bgcolor: '#F0F9FF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 600, textTransform: 'uppercase' }}>
                  Scheduled
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0284C7', mt: 0.5 }}>
                  {stats.scheduled}
                </Typography>
                <Typography variant="caption" sx={{ color: '#0369A1' }}>
                  Upcoming planned tasks
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 3, border: '1px solid #FED7AA', bgcolor: '#FFF7ED', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#C2410C', fontWeight: 600, textTransform: 'uppercase' }}>
                  In Progress
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#EA580C', mt: 0.5 }}>
                  {stats.inProgress}
                </Typography>
                <Typography variant="caption" sx={{ color: '#C2410C' }}>
                  Currently being serviced
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 3, border: '1px solid #FECDD3', bgcolor: '#FFF1F2', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#BE123C', fontWeight: 600, textTransform: 'uppercase' }}>
                  Overdue
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#E11D48', mt: 0.5 }}>
                  {stats.overdue}
                </Typography>
                <Typography variant="caption" sx={{ color: '#BE123C' }}>
                  Needs immediate attention
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderRadius: 3, border: '1px solid #BBF7D0', bgcolor: '#F0FDF4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600, textTransform: 'uppercase' }}>
                  Completed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#16A34A', mt: 0.5 }}>
                  {stats.completed}
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803D' }}>
                  Successfully restored
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters & Search Bar */}
        <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  placeholder="Search by asset tag, asset name, or maintenance title..."
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
                  <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="OVERDUE">Overdue Tasks</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={6} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    fetchData();
                  }}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tasks Data Table */}
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <DataTable
            columns={columns}
            rows={schedules}
            loading={loading}
            emptyMessage="No maintenance schedules found. Click 'Schedule Maintenance' to create one."
          />
        </Card>

        {/* DIALOG 1: Schedule Maintenance */}
        <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon sx={{ color: '#0066FF' }} /> Schedule Maintenance
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            {scheduleFormError && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {scheduleFormError}
              </Alert>
            )}

            <Alert severity="info" icon={<ReminderIcon />} sx={{ mb: 2.5, fontSize: '0.85rem' }}>
              <strong>Notification:</strong> The assigned staff member and the asset owner will automatically receive an email with task details, priority, and calendar link.
            </Alert>

            <Grid container spacing={2}>
              {/* Asset Select */}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Select Asset"
                  value={scheduleForm.assetId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, assetId: e.target.value })}
                  helperText="Choose the asset that requires servicing or calibration"
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset._id} value={asset._id}>
                      {asset.name} ({asset.assetTag}) - [{asset.status}]
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Maintenance Title / Operation"
                  placeholder="e.g. Annual Precision Calibration, Battery Replacement, Lens Cleaning"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                />
              </Grid>

              {/* Scheduled Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="datetime-local"
                  label="Scheduled Date & Time"
                  value={scheduleForm.scheduledDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Priority */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Priority Level"
                  value={scheduleForm.priority}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, priority: e.target.value as any })}
                >
                  <MenuItem value="LOW">Low (Routine Check)</MenuItem>
                  <MenuItem value="MEDIUM">Medium (Scheduled Service)</MenuItem>
                  <MenuItem value="HIGH">High (Urgent Repair)</MenuItem>
                  <MenuItem value="CRITICAL">Critical (Immediate Outage)</MenuItem>
                </TextField>
              </Grid>

              {/* Assignee */}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Assigned Technician / Staff Member"
                  value={scheduleForm.assignedTo}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, assignedTo: e.target.value })}
                  helperText="Selected staff member will receive email instructions and reminders"
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u._id} value={u._id}>
                      {u.name} ({u.email}) - {u.role}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Scope of Work / Description"
                  placeholder="Detail what tasks need to be completed during maintenance..."
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Internal Notes (Optional)"
                  placeholder="Vendor contacts, warranty instructions, replacement part numbers..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                />
              </Grid>

              {/* Change Asset Status Checkbox */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={scheduleForm.setAssetMaintenance}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, setAssetMaintenance: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Automatically flag asset status as MAINTENANCE immediately"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setScheduleDialogOpen(false)} disabled={scheduleSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleScheduleSubmit}
              disabled={scheduleSubmitting}
              startIcon={scheduleSubmitting ? <CircularProgress size={18} /> : <BuildIcon />}
              sx={{ bgcolor: '#0066FF' }}
            >
              {scheduleSubmitting ? 'Scheduling...' : 'Schedule & Notify Staff'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG 2: Reschedule Maintenance */}
        <Dialog open={rescheduleDialogOpen} onClose={() => setRescheduleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', gap: 1 }}>
            <RescheduleIcon sx={{ color: '#E65100' }} /> Reschedule Maintenance
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            {rescheduleError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {rescheduleError}
              </Alert>
            )}

            {reschedulingTask && (
              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Task: {reschedulingTask.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Asset: {reschedulingTask.assetId?.name} ({reschedulingTask.assetId?.assetTag})
                </Typography>
                <Typography variant="body2" sx={{ color: '#0284C7', mt: 0.5, fontWeight: 600 }}>
                  Current Date: {formatDateTime(reschedulingTask.scheduledDate)}
                </Typography>
              </Box>
            )}

            <Alert severity="info" icon={<ReminderIcon />} sx={{ mb: 2.5, fontSize: '0.85rem' }}>
              The system will log this previous date in the maintenance history and dispatch an email update to the assigned technician.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="datetime-local"
                  label="New Scheduled Date & Time"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={2}
                  label="Reason for Rescheduling"
                  placeholder="e.g. Parts delayed in transit, technician on leave, client request..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRescheduleDialogOpen(false)} disabled={rescheduleSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleRescheduleSubmit}
              disabled={rescheduleSubmitting}
              startIcon={rescheduleSubmitting ? <CircularProgress size={18} /> : <RescheduleIcon />}
              sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#BF360C' } }}
            >
              {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG 3: Complete Maintenance Dialog */}
        <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompleteIcon sx={{ color: '#2E7D32' }} /> Complete Maintenance Operation
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            {completingTask && (
              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid #BBF7D0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                  {completingTask.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#15803D' }}>
                  Asset: {completingTask.assetId?.name} ({completingTask.assetId?.assetTag})
                </Typography>
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Resolution & Completion Notes"
              placeholder="e.g. Replaced filter, calibrated sensor to +/- 0.01 tolerance, certified operational."
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={restoreAssetStatus}
                  onChange={(e) => setRestoreAssetStatus(e.target.checked)}
                  color="success"
                />
              }
              label="Automatically restore Asset status to ACTIVE"
            />
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCompleteDialogOpen(false)} disabled={completeSubmitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCompleteSubmit}
              disabled={completeSubmitting}
              startIcon={completeSubmitting ? <CircularProgress size={18} /> : <CompleteIcon />}
              sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
            >
              {completeSubmitting ? 'Submitting...' : 'Mark Completed'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG 4: Details & Maintenance History */}
        <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon sx={{ color: '#0066FF' }} />
              Maintenance Details & History
            </Box>
            {selectedTask && (
              <Chip
                size="small"
                label={selectedTask.status}
                sx={{
                  fontWeight: 700,
                  bgcolor: (STATUS_CONFIG as any)[selectedTask.status]?.bg,
                  color: (STATUS_CONFIG as any)[selectedTask.status]?.text,
                }}
              />
            )}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            {selectedTask && (
              <Stack spacing={2.5}>
                {/* Asset & Task Info Header */}
                <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">ASSET</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {selectedTask.assetId?.name} ({selectedTask.assetId?.assetTag})
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Type: {selectedTask.assetId?.assetType} • Current Status: {selectedTask.assetId?.status}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="textSecondary">TASK TITLE</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {selectedTask.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Priority: <strong>{selectedTask.priority}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Scope & Notes */}
                {selectedTask.description && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Scope of Work
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', bgcolor: '#fff', p: 1.5, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                      {selectedTask.description}
                    </Typography>
                  </Box>
                )}

                {selectedTask.notes && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Notes & Resolution Log
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', bgcolor: '#fff', p: 1.5, borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                      {selectedTask.notes}
                    </Typography>
                  </Box>
                )}

                {/* Scheduling & Personnel Meta */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">SCHEDULED DATE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatDateTime(selectedTask.scheduledDate)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">ASSIGNED TECHNICIAN</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedTask.assignedTo?.name || 'Unassigned'}
                    </Typography>
                    {selectedTask.assignedTo?.email && (
                      <Typography variant="caption" color="textSecondary">
                        {selectedTask.assignedTo.email}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">REMINDER STATUS</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: selectedTask.reminderSent ? '#16A34A' : '#64748B' }}>
                      {selectedTask.reminderSent ? 'Reminder Sent (Email)' : 'Pending Due Window'}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Reschedule Timeline / History */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon fontSize="small" sx={{ color: '#0066FF' }} />
                    Reschedule History Audit Log ({selectedTask.previousDates?.length || 0})
                  </Typography>

                  {selectedTask.previousDates && selectedTask.previousDates.length > 0 ? (
                    <List sx={{ bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', p: 0 }}>
                      {selectedTask.previousDates.map((item, index) => (
                        <ListItem key={index} divider={index < (selectedTask.previousDates?.length || 0) - 1}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Originally Scheduled: {formatDateTime(item.date)}
                              </Typography>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 600 }}>
                                  Reason: {item.reason || 'None specified'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                  Rescheduled at: {formatDateTime(item.rescheduledAt)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                      No reschedules recorded. This task was scheduled on its original timeline.
                    </Typography>
                  )}
                </Box>
              </Stack>
            )}
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
