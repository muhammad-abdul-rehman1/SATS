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
  Stack,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  ReportProblem as ReportProblemIcon,
  Add as AddIcon,
  Search as SearchIcon,
  CheckCircle as ResolveIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  WarningAmber as WarningIcon,
  AccessTime as AccessTimeIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Image as ImageIcon,
  OpenInNew as OpenInNewIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { issuesAPI, IssueStats } from '@/services/issues';
import { assetsAPI } from '@/services/assets';
import { AssetIssue, Asset } from '@/types';
import { formatDateTime } from '@/utils/formatting';

export default function MyIssuesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();

  // State
  const [issues, setIssues] = useState<AssetIssue[]>([]);
  const [stats, setStats] = useState<IssueStats>({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState(0);

  // Available assets for reporting
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<AssetIssue | null>(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Create Form State
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({
    assetId: '',
    assetTag: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    imageUrl: '',
  });

  // Resolve Form State
  const [resolvingIssue, setResolvingIssue] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch Issues
  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      };

      // If user is super admin, they can view all; else view user's reported issues
      let res;
      if (user?.role === 'SUPER_ADMIN') {
        res = await issuesAPI.getAll(params);
      } else {
        res = await issuesAPI.getMyIssues(params);
      }

      if (res.data) {
        setIssues(res.data.issues || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load reported issues');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Assets for creation dialog
  const fetchAssets = async () => {
    try {
      const res = await assetsAPI.getAll({ limit: 200 });
      if (res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).assets || [];
        setAvailableAssets(list);
      }
    } catch (err) {
      console.warn('Failed to load assets for issue dialog');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchData();
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, search, statusFilter, priorityFilter]);

  // Tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const statuses = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    setStatusFilter(statuses[newValue] || 'ALL');
  };

  // Handle Photo upload in web dialog
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setIssueForm(prev => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Submit Report Issue (FR25-01, FR25-02, FR25-03, FR25-04)
  const handleSubmitReport = async () => {
    if (!issueForm.assetId && !issueForm.assetTag) {
      setErrorMessage('Please select an asset to report an issue for.');
      return;
    }
    if (!issueForm.description.trim()) {
      setErrorMessage('Please provide a description of the issue.');
      return;
    }

    try {
      setReportingIssue(true);
      await issuesAPI.reportIssue({
        assetId: issueForm.assetId,
        assetTag: issueForm.assetTag,
        title: issueForm.title.trim() || undefined,
        description: issueForm.description.trim(),
        priority: issueForm.priority,
        imageUrl: issueForm.imageUrl || undefined,
      });

      setSuccessMessage('Asset issue reported successfully and administrators have been alerted.');
      setCreateDialogOpen(false);
      setIssueForm({
        assetId: '',
        assetTag: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        imageUrl: '',
      });
      fetchData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit issue report.');
    } finally {
      setReportingIssue(false);
    }
  };

  // Open Status / Resolve Dialog
  const handleOpenResolve = (issue: AssetIssue) => {
    setSelectedIssue(issue);
    setTargetStatus(issue.status === 'RESOLVED' ? 'CLOSED' : 'RESOLVED');
    setResolutionNotes(issue.resolutionNotes || '');
    setResolveDialogOpen(true);
  };

  // Submit Status / Resolve Update (FR25-05)
  const handleConfirmResolve = async () => {
    if (!selectedIssue) return;
    try {
      setResolvingIssue(true);
      await issuesAPI.updateStatus(selectedIssue._id, {
        status: targetStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });

      setSuccessMessage(`Issue status updated to ${targetStatus}.`);
      setResolveDialogOpen(false);
      setSelectedIssue(null);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update issue status.');
    } finally {
      setResolvingIssue(false);
    }
  };

  // Delete Issue
  const handleDeleteIssue = async (issue: AssetIssue) => {
    if (!window.confirm(`Are you sure you want to delete this issue report: "${issue.title}"?`)) {
      return;
    }
    try {
      await issuesAPI.delete(issue._id);
      setSuccessMessage('Issue report deleted successfully.');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete issue report.');
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
  const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    OPEN: { color: '#2563EB', bg: '#EFF6FF', label: 'Open' },
    UNDER_REVIEW: { color: '#CA8A04', bg: '#FEF9C3', label: 'Under Review' },
    IN_PROGRESS: { color: '#D97706', bg: '#FEF3C7', label: 'In Progress' },
    RESOLVED: { color: '#16A34A', bg: '#DCFCE7', label: 'Resolved' },
    CLOSED: { color: '#64748B', bg: '#F1F5F9', label: 'Closed' },
  };

  // Columns for Table
  const columns = [
    {
      id: 'asset',
      label: 'Asset',
      minWidth: 180,
      render: (row: AssetIssue) => {
        const assetObj = typeof row.assetId === 'object' ? row.assetId : null;
        const targetId = assetObj?._id || row.assetTag;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              variant="rounded"
              sx={{ width: 40, height: 40, bgcolor: '#EFF6FF', color: '#0066FF', fontWeight: 700, fontSize: '0.8rem' }}
            >
              <ReportProblemIcon fontSize="small" />
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: '#0066FF',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                  onClick={() => router.push(`/assets/${targetId}`)}
                >
                  {row.assetTag}
                </Typography>
                <IconButton size="small" onClick={() => router.push(`/assets/${targetId}`)}>
                  <OpenInNewIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                </IconButton>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.82rem' }}>
                {row.assetName}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'issueDetails',
      label: 'Issue Summary & Description',
      minWidth: 260,
      render: (row: AssetIssue) => (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.3 }}>
            {row.title}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
            {row.description}
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
      ),
    },
    {
      id: 'photo',
      label: 'Photo',
      minWidth: 90,
      render: (row: AssetIssue) => (
        row.imageUrl ? (
          <Tooltip title="Click to view full photo">
            <Box
              component="img"
              src={row.imageUrl}
              alt="Issue Photo"
              onClick={() => setImagePreviewUrl(row.imageUrl || null)}
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                objectFit: 'cover',
                cursor: 'pointer',
                border: '1px solid #CBD5E1',
                transition: 'transform 0.15s ease',
                '&:hover': { transform: 'scale(1.08)' },
              }}
            />
          </Tooltip>
        ) : (
          <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
            None
          </Typography>
        )
      ),
    },
    {
      id: 'priority',
      label: 'Severity',
      minWidth: 100,
      render: (row: AssetIssue) => {
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
      minWidth: 110,
      render: (row: AssetIssue) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.OPEN;
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
      id: 'reporter',
      label: 'Reported By',
      minWidth: 140,
      render: (row: AssetIssue) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#1E293B' }}>
            {row.reportedByName || row.reportedBy?.name || 'Staff Member'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 130,
      align: 'right' as const,
      render: (row: AssetIssue) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="Update Status / Resolve">
            <IconButton size="small" onClick={() => handleOpenResolve(row)} sx={{ color: '#0066FF' }}>
              <CheckCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {(user?.role === 'SUPER_ADMIN' || row.status === 'OPEN') && (
            <Tooltip title="Delete Report">
              <IconButton size="small" onClick={() => handleDeleteIssue(row)} sx={{ color: '#EF4444' }}>
                <DeleteIcon fontSize="small" />
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
              <Avatar sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: 44, height: 44 }}>
                <ReportProblemIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D' }}>
                  Reported Asset Issues
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Log fault and damage reports, upload photographic evidence, track investigation statuses, and resolve complaints.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                bgcolor: '#0066FF',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                '&:hover': { bgcolor: '#0052CC' },
              }}
            >
              Report New Issue
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        {/* Feedback Messages */}
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

        {/* KPI Summary Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Reported Issues
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', borderLeft: '4px solid #2563EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Open Issues
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2563EB', mt: 0.5 }}>
                  {stats.open}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', borderLeft: '4px solid #D97706', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  In Progress / Review
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#D97706', mt: 0.5 }}>
                  {stats.inProgress}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', borderLeft: '4px solid #16A34A', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                  Resolved Issues
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#16A34A', mt: 0.5 }}>
                  {stats.resolved}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Tabs */}
        <Paper sx={{ mb: 3, borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
              <Tab label="All Issues" />
              <Tab label="Open" />
              <Tab label="In Progress" />
              <Tab label="Resolved" />
              <Tab label="Closed" />
            </Tabs>
          </Box>

          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search by asset tag, name, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Severity"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All Severities</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="LOW">Low</MenuItem>
            </TextField>
          </Box>
        </Paper>

        {/* DataTable */}
        <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <DataTable
            columns={columns}
            rows={issues}
            loading={loading}
            emptyMessage="No asset issues found matching your filters."
          />
        </Card>

        {/* Report New Issue Dialog (FR25-01, FR25-02, FR25-04) */}
        <Dialog
          open={createDialogOpen}
          onClose={() => !reportingIssue && setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReportProblemIcon sx={{ color: '#EF4444' }} />
              Report Asset Issue
            </Box>
            <IconButton onClick={() => setCreateDialogOpen(false)} disabled={reportingIssue} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 1 }}>
              <TextField
                select
                fullWidth
                label="Target Asset *"
                value={issueForm.assetId}
                onChange={(e) => {
                  const selected = availableAssets.find(a => a._id === e.target.value);
                  setIssueForm(prev => ({
                    ...prev,
                    assetId: e.target.value,
                    assetTag: selected?.assetTag || '',
                  }));
                }}
                helperText="Select the asset experiencing damage or functional fault"
              >
                {availableAssets.map((asset) => (
                  <MenuItem key={asset._id} value={asset._id}>
                    {asset.name} ({asset.assetTag}) - {asset.assetType}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Issue Summary / Title"
                placeholder="e.g. Screen has dead pixels"
                value={issueForm.title}
                onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Detailed Description *"
                placeholder="Describe what is wrong or damaged with the asset..."
                value={issueForm.description}
                onChange={(e) => setIssueForm(prev => ({ ...prev, description: e.target.value }))}
              />

              <TextField
                select
                fullWidth
                label="Severity / Priority"
                value={issueForm.priority}
                onChange={(e) => setIssueForm(prev => ({ ...prev, priority: e.target.value as any }))}
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
              </TextField>

              {/* Photo Upload Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Photo Attachment (Optional)
                </Typography>
                {issueForm.imageUrl ? (
                  <Box sx={{ position: 'relative', width: 140, height: 100, borderRadius: 2, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                    <Box component="img" src={issueForm.imageUrl} alt="Preview" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton
                      size="small"
                      onClick={() => setIssueForm(prev => ({ ...prev, imageUrl: '' }))}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<PhotoCameraIcon />}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Upload Photo Evidence
                    <input type="file" accept="image/*" hidden onChange={handleImageFileChange} />
                  </Button>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCreateDialogOpen(false)} disabled={reportingIssue} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitReport}
              disabled={reportingIssue || !issueForm.description.trim() || !issueForm.assetId}
              sx={{ bgcolor: '#0066FF', textTransform: 'none', fontWeight: 700 }}
            >
              {reportingIssue ? <CircularProgress size={22} color="inherit" /> : 'Submit Report'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Update Status / Resolve Dialog (FR25-05) */}
        <Dialog
          open={resolveDialogOpen}
          onClose={() => !resolvingIssue && setResolveDialogOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0F172A' }}>
            Update Issue Status
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Updating status for issue on <strong>{selectedIssue?.assetTag}</strong> ({selectedIssue?.title})
              </Typography>

              <TextField
                select
                fullWidth
                label="New Status"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as any)}
              >
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="RESOLVED">Resolved</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
              </TextField>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Resolution Notes"
                placeholder="Describe resolution actions taken, parts replaced, or inspection results..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setResolveDialogOpen(false)} disabled={resolvingIssue} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmResolve}
              disabled={resolvingIssue}
              sx={{ bgcolor: '#0066FF', textTransform: 'none', fontWeight: 700 }}
            >
              {resolvingIssue ? <CircularProgress size={22} color="inherit" /> : 'Save Status'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Full Image Preview Dialog */}
        <Dialog
          open={!!imagePreviewUrl}
          onClose={() => setImagePreviewUrl(null)}
          maxWidth="md"
        >
          <Box sx={{ position: 'relative', bgcolor: '#0F172A', p: 1 }}>
            <IconButton
              onClick={() => setImagePreviewUrl(null)}
              sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.6)', color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
            {imagePreviewUrl && (
              <Box
                component="img"
                src={imagePreviewUrl}
                alt="Issue Full Evidence"
                sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', m: 'auto' }}
              />
            )}
          </Box>
        </Dialog>
      </Container>
    </Layout>
  );
}
