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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Visibility as VisibilityIcon, Download as DownloadIcon } from '@mui/icons-material';
import { IconButton, Select, Chip, SelectChangeEvent } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAssets } from '@/hooks/useAssets';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/contexts/AuthContext';
import { assetsAPI } from '@/services/assets';
import { usersAPI } from '@/services/users';
import { formatDateTime, formatLabel } from '@/utils/formatting';
import { ASSET_TYPES, ASSET_STATUSES } from '@/utils/constants';

export default function Assets() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();
  const { assets, loading, error, fetchAssets } = useAssets();
  const { rooms, fetchRooms } = useRooms();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Load users & rooms for dropdowns whenever dialog is opened
  const loadDropdownData = async () => {
    try {
      const [usersRes] = await Promise.all([
        usersAPI.getAll(),
        fetchRooms({ limit: 200 }),
      ]);
      const userData = (usersRes.data as any).users ?? (usersRes.data as any).data ?? [];
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (e) {
      console.error('Failed to load dropdown data', e);
    }
  };

  const handleDownloadAllQR = async () => {
    try {
      setDownloadingPdf(true);
      const res = await assetsAPI.getAllQRPdf();
      const blob = new Blob([res.data as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-assets-qr-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleQuickStatusChange = async (assetId: string, newStatus: string) => {
    try {
      await assetsAPI.update(assetId, { status: newStatus } as any);
      fetchAssets({ search, type, status, limit: 100 });
      setSuccessMessage(`Status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setErrorMessage(''), 2000);
    }
  };

  // Initialize status filter from query parameter
  useEffect(() => {
    if (router.isReady && router.query.status) {
      setStatus(router.query.status as string);
    }
    // Support global search redirect
    if (router.isReady && router.query.search) {
      setSearch(router.query.search as string);
    }
  }, [router.isReady, router.query.status, router.query.search]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchAssets({ search, type, status, limit: 100 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, search, type, status]);

  const handleOpenDialog = (asset?: any) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        ...asset,
        ownerId: asset.ownerId?._id ?? asset.ownerId ?? '',
        roomId:  asset.roomId?._id  ?? asset.roomId  ?? '',
      });
    } else {
      setEditingAsset(null);
      setFormData({});
    }
    setOpenDialog(true);
    loadDropdownData();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
    setFormData({});
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage('');

      if (editingAsset) {
        await assetsAPI.update(editingAsset._id, formData);
        setSuccessMessage('Asset updated successfully');
      } else {
        await assetsAPI.create(formData);
        setSuccessMessage('Asset created successfully');
      }

      setTimeout(() => {
        handleCloseDialog();
        fetchAssets({ search, type, status, limit: 100 });
        setSuccessMessage('');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (assets.length === 0) return;
    const headers = ['Asset Tag','Name','Type','Status','Owner','Room','Scan Count','Last Scanned'];
    const rows = assets.map((a: any) => [
      a.assetTag, a.name, a.assetType, a.status,
      a.ownerId?.name || '', a.roomId?.name || '',
      a.scanCount ?? 0,
      a.lastScanned ? new Date(a.lastScanned).toLocaleDateString() : 'Never',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `assets-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenDeleteDialog = (assetId: string) => {
    setAssetToDelete(assetId);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAssetToDelete(null);
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;
    try {
      await assetsAPI.delete(assetToDelete);
      setSuccessMessage('Asset deleted successfully');
      fetchAssets({ search, type, status, limit: 100 });
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete asset');
      setTimeout(() => setErrorMessage(''), 2000);
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const STATUS_CHIP_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    ACTIVE:      { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    INACTIVE:    { bg: '#f5f5f5', color: '#616161', border: '#bdbdbd' },
    MAINTENANCE: { bg: '#fff3e0', color: '#e65100', border: '#ffcc02' },
    RETIRED:     { bg: '#ffebee', color: '#c62828', border: '#ef9a9a' },
  };

  const columns = [
    { id: 'assetTag', label: 'Asset Tag', minWidth: 110 },
    { id: 'name', label: 'Name', minWidth: 140 },
    { id: 'assetType', label: 'Type', minWidth: 110, format: (v: string) => v.replace(/_/g,' ') },
    {
      id: 'ownerId',
      label: 'Owner',
      minWidth: 130,
      render: (row: any) => (
        <Typography variant="body2" sx={{ color: row.ownerId?.name ? '#333' : '#aaa' }}>
          {row.ownerId?.name || '— unassigned —'}
        </Typography>
      ),
    },
    {
      id: 'roomId',
      label: 'Room',
      minWidth: 130,
      render: (row: any) => (
        <Typography variant="body2" sx={{ color: row.roomId?.name ? '#333' : '#aaa' }}>
          {row.roomId ? `${row.roomId.name} (${row.roomId.code})` : '— no room —'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 160,
      render: (row: any) => (
        <Select
          value={row.status}
          size="small"
          variant="outlined"
          onChange={(e: SelectChangeEvent) => handleQuickStatusChange(row._id, e.target.value)}
          sx={{
            '& .MuiSelect-select': {
              py: 0.5,
              px: 1.5,
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '20px',
              ...STATUS_CHIP_COLORS[row.status],
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: STATUS_CHIP_COLORS[row.status]?.border || '#bdbdbd',
              borderRadius: '20px',
            },
            '& .MuiSvgIcon-root': { color: STATUS_CHIP_COLORS[row.status]?.color || '#666' },
          }}
        >
          {['ACTIVE','INACTIVE','MAINTENANCE','RETIRED'].map(s => (
            <MenuItem key={s} value={s} sx={{ fontSize: '0.85rem' }}>{s}</MenuItem>
          ))}
        </Select>
      ),
    },
    { id: 'scanCount', label: 'Scans', minWidth: 80 },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 150,
      render: (row: any) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            color="info"
            title="View Details"
            onClick={() => router.push(`/assets/${row._id}`)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="primary"
            title="Edit Asset"
            onClick={() => handleOpenDialog(row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          {user?.role === 'SUPER_ADMIN' && (
            <IconButton
              size="small"
              color="error"
              title="Delete Asset"
              onClick={() => handleOpenDeleteDialog(row._id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  if (!isAuthenticated || authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              Assets
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage and track all assets in the system
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {assets.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportCSV}
                sx={{ textTransform: 'none' }}
              >
                Export CSV
              </Button>
            )}
            {user?.role === 'SUPER_ADMIN' && (
              <>
                {assets.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadAllQR}
                    disabled={downloadingPdf}
                    sx={{ textTransform: 'none' }}
                  >
                    {downloadingPdf ? 'Generating PDF...' : 'All QR Codes PDF'}
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{ textTransform: 'none' }}
                >
                  Add New Asset
                </Button>
              </>
            )}
          </Box>
        </Box>

        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
        {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {ASSET_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>
                      {formatLabel(t)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {ASSET_STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {formatLabel(s)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <DataTable
          columns={columns}
          rows={assets}
          loading={loading}
          emptyMessage="No assets found"
        />

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingAsset ? 'Edit Asset' : 'Create New Asset'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Asset Tag"
              name="assetTag"
              value={formData.assetTag || ''}
              onChange={handleFormChange}
              disabled={!!editingAsset}
            />
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name || ''}
              onChange={handleFormChange}
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description || ''}
              onChange={handleFormChange}
              multiline
              rows={3}
            />
            <TextField
              select
              fullWidth
              label="Type"
              name="assetType"
              value={formData.assetType || 'EQUIPMENT'}
              onChange={handleFormChange}
            >
              {ASSET_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {formatLabel(t)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Status"
              name="status"
              value={formData.status || 'ACTIVE'}
              onChange={handleFormChange}
            >
              {ASSET_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {formatLabel(s)}
                </MenuItem>
              ))}
            </TextField>

            <Divider sx={{ my: 0.5 }}><Typography variant="caption" color="textSecondary">Assignment</Typography></Divider>

            <TextField
              select
              fullWidth
              label="Assign To (Owner)"
              name="ownerId"
              value={formData.ownerId || ''}
              onChange={handleFormChange}
            >
              <MenuItem value="">— Unassigned —</MenuItem>
              {users.map((u: any) => (
                <MenuItem key={u._id} value={u._id}>
                  {u.name || u.email} ({formatLabel(u.role)})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Room / Location"
              name="roomId"
              value={formData.roomId || ''}
              onChange={handleFormChange}
            >
              <MenuItem value="">— No Room —</MenuItem>
              {rooms.map((r: any) => (
                <MenuItem key={r._id} value={r._id}>
                  {r.name} ({r.code})
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this asset? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
