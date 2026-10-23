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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Close as CloseIcon,
  Apartment as DepartmentIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  Image as ImageIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
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
import { ASSET_TYPES, ASSET_STATUSES, DEPARTMENTS } from '@/utils/constants';

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
  const [department, setDepartment] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState<{
    status?: string;
    department?: string;
    roomId?: string;
    ownerId?: string;
  }>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Single Deactivate State
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [assetToDeactivate, setAssetToDeactivate] = useState<any>(null);

  // FR03 States (Image, Purchase Date, Asset Value, Auto-Categorization)
  const [dialogError, setDialogError] = useState('');
  const [autoCategorized, setAutoCategorized] = useState<string | null>(null);
  const [categoryManuallyChanged, setCategoryManuallyChanged] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);

  // FR14: QR Code Styling and Custom Dynamic Fields
  const [customFieldsList, setCustomFieldsList] = useState<Array<{ key: string; value: string }>>([]);
  const [qrStyleState, setQrStyleState] = useState<{ color: string; backgroundColor: string; size: number }>({
    color: '#001A4D',
    backgroundColor: '#FFFFFF',
    size: 200,
  });

  const handleAddCustomField = () => {
    setCustomFieldsList(prev => [...prev, { key: '', value: '' }]);
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    setCustomFieldsList(prev => {
      const copy = [...prev];
      copy[index][field] = val;
      return copy;
    });
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFieldsList(prev => prev.filter((_, i) => i !== index));
  };

  const guessCategoryFromName = (name: string): string | null => {
    const lower = name.toLowerCase();
    
    const electronicsKeywords = ['monitor', 'laptop', 'pc', 'computer', 'printer', 'scanner', 'keyboard', 'mouse', 'server', 'tablet', 'ipad', 'screen', 'cpu', 'macbook', 'headphone', 'router', 'switch', 'phone', 'camera', 'ups', 'hard drive', 'ssd'];
    if (electronicsKeywords.some(k => lower.includes(k))) return 'ELECTRONICS';

    const furnitureKeywords = ['chair', 'desk', 'table', 'sofa', 'cabinet', 'shelf', 'whiteboard', 'bookcase', 'cupboard', 'bench', 'stool', 'drawer', 'podium', 'board'];
    if (furnitureKeywords.some(k => lower.includes(k))) return 'FURNITURE';

    const vehicleKeywords = ['car', 'bus', 'van', 'truck', 'motorcycle', 'bike', 'vehicle', 'ambulance', 'jeep'];
    if (vehicleKeywords.some(k => lower.includes(k))) return 'VEHICLE';

    const equipmentKeywords = ['drill', 'oscilloscope', 'multimeter', 'generator', 'microscope', 'projector', 'machine', 'motor', 'pump', 'meter', 'sensor', 'tester', 'air conditioner', 'ac', 'dispenser'];
    if (equipmentKeywords.some(k => lower.includes(k))) return 'EQUIPMENT';

    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setImageError('Invalid file format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image file is too large. Maximum allowed size is 5MB.');
      return;
    }

    setImageLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev: any) => ({
        ...prev,
        imageUrl: reader.result as string,
      }));
      setImageLoading(false);
    };
    reader.onerror = () => {
      setImageError('Failed to read image file.');
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev: any) => ({
      ...prev,
      imageUrl: null,
    }));
  };

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
      fetchAssets({ search, type, status, department, limit: 100 });
      setSuccessMessage(`Status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setErrorMessage(''), 2000);
    }
  };

  // Initialize status/department filters from query parameters
  useEffect(() => {
    if (router.isReady && router.query.status) {
      setStatus(router.query.status as string);
    }
    if (router.isReady && router.query.department) {
      setDepartment(router.query.department as string);
    }
    if (router.isReady && router.query.search) {
      setSearch(router.query.search as string);
    }
  }, [router.isReady, router.query.status, router.query.department, router.query.search]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchAssets({ search, type, status, department, limit: 100 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, search, type, status, department]);

  // Clean selected IDs when assets change
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => assets.some((a: any) => a._id === id)));
  }, [assets]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(assets.map((a: any) => a._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkUpdateSubmit = async () => {
    try {
      setBulkSubmitting(true);
      setErrorMessage('');

      const cleanUpdates: any = {};
      if (bulkUpdates.status) cleanUpdates.status = bulkUpdates.status;
      if (bulkUpdates.department) cleanUpdates.department = bulkUpdates.department;
      if (bulkUpdates.roomId !== undefined && bulkUpdates.roomId !== '') {
        cleanUpdates.roomId = bulkUpdates.roomId === 'NONE' ? null : bulkUpdates.roomId;
      }
      if (bulkUpdates.ownerId !== undefined && bulkUpdates.ownerId !== '') {
        cleanUpdates.ownerId = bulkUpdates.ownerId === 'NONE' ? null : bulkUpdates.ownerId;
      }

      if (Object.keys(cleanUpdates).length === 0) {
        setErrorMessage('Please select at least one attribute to update.');
        setBulkSubmitting(false);
        return;
      }

      const res = await assetsAPI.bulkUpdate({
        assetIds: selectedIds,
        updates: cleanUpdates,
      });

      setSuccessMessage(`Successfully updated ${res.data?.data?.modifiedCount ?? selectedIds.length} asset(s).`);
      setBulkEditDialogOpen(false);
      setBulkUpdates({});
      setSelectedIds([]);
      fetchAssets({ search, type, status, department, limit: 100 });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to bulk update assets');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      setBulkSubmitting(true);
      const res = await assetsAPI.bulkUpdate({
        assetIds: selectedIds,
        updates: { status: 'INACTIVE' },
      });
      setSuccessMessage(`Successfully deactivated ${res.data?.data?.modifiedCount ?? selectedIds.length} asset(s).`);
      setSelectedIds([]);
      fetchAssets({ search, type, status, department, limit: 100 });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to bulk deactivate assets');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      setBulkSubmitting(true);
      const res = await assetsAPI.bulkDelete(selectedIds);
      setSuccessMessage(`Successfully deleted ${res.data?.data?.deletedCount ?? selectedIds.length} asset(s).`);
      setBulkDeleteDialogOpen(false);
      setSelectedIds([]);
      fetchAssets({ search, type, status, department, limit: 100 });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete selected assets');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleToggleDeactivate = async () => {
    if (!assetToDeactivate) return;
    try {
      const newStatus = assetToDeactivate.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await assetsAPI.update(assetToDeactivate._id, { status: newStatus } as any);
      setSuccessMessage(`Asset ${assetToDeactivate.assetTag} status changed to ${newStatus}.`);
      setDeactivateDialogOpen(false);
      setAssetToDeactivate(null);
      fetchAssets({ search, type, status, department, limit: 100 });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to change asset status');
    }
  };

  const handleOpenDialog = (asset?: any) => {
    setDialogError('');
    setImageError('');
    setAutoCategorized(null);
    setCategoryManuallyChanged(!!asset);
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        ...asset,
        department: asset.department || '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toString().slice(0, 10) : '',
        assetValue: asset.assetValue !== undefined && asset.assetValue !== null ? asset.assetValue : '',
        imageUrl: asset.imageUrl || null,
        ownerId: asset.ownerId?._id ?? asset.ownerId ?? '',
        roomId:  asset.roomId?._id  ?? asset.roomId  ?? '',
      });
      // FR14-03: Populate custom fields list
      if (asset.customFields && typeof asset.customFields === 'object') {
        const fields = Object.entries(asset.customFields).map(([k, v]) => ({ key: k, value: String(v) }));
        setCustomFieldsList(fields);
      } else {
        setCustomFieldsList([]);
      }
      // FR14-02: Populate QR style
      setQrStyleState({
        color: asset.qrStyle?.color || '#001A4D',
        backgroundColor: asset.qrStyle?.backgroundColor || '#FFFFFF',
        size: asset.qrStyle?.size || 200,
      });
    } else {
      setEditingAsset(null);
      setFormData({
        status: 'ACTIVE',
        assetType: 'EQUIPMENT',
        department: '',
        purchaseDate: '',
        assetValue: '',
        imageUrl: null,
      });
      setCustomFieldsList([]);
      setQrStyleState({
        color: '#001A4D',
        backgroundColor: '#FFFFFF',
        size: 200,
      });
    }
    setOpenDialog(true);
    loadDropdownData();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAsset(null);
    setFormData({});
    setCustomFieldsList([]);
    setDialogError('');
    setImageError('');
    setAutoCategorized(null);
  };

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      // Auto-categorize based on asset name keywords (FR03-07)
      if (name === 'name' && !categoryManuallyChanged) {
        const guessed = guessCategoryFromName(value);
        if (guessed) {
          updated.assetType = guessed;
          setAutoCategorized(guessed);
        }
      }

      return updated;
    });

    if (name === 'assetType') {
      setCategoryManuallyChanged(true);
      setAutoCategorized(null);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setDialogError('');
      setErrorMessage('');

      if (!formData.name || !formData.name.trim()) {
        setDialogError('Asset name is required.');
        setSubmitting(false);
        return;
      }

      // FR14-03: Assemble dynamic custom fields into object
      const customFieldsObj: Record<string, string> = {};
      customFieldsList.forEach(item => {
        if (item.key && item.key.trim()) {
          customFieldsObj[item.key.trim()] = item.value ? item.value.trim() : '';
        }
      });

      const payload: any = {
        name: formData.name.trim(),
        description: formData.description || '',
        assetType: formData.assetType || 'EQUIPMENT',
        status: formData.status || 'ACTIVE',
        department: formData.department ? formData.department.trim() : '',
        ownerId: formData.ownerId || null,
        roomId: formData.roomId || null,
        imageUrl: formData.imageUrl || null,
        purchaseDate: formData.purchaseDate || null,
        assetValue: formData.assetValue !== '' && formData.assetValue !== undefined ? Number(formData.assetValue) : 0,
        customFields: customFieldsObj,
        qrStyle: qrStyleState, // FR14-02
      };

      if (formData.assetTag) {
        payload.assetTag = formData.assetTag.trim();
      }

      if (editingAsset) {
        await assetsAPI.update(editingAsset._id, payload);
        setSuccessMessage('Asset updated successfully');
      } else {
        await assetsAPI.create(payload);
        setSuccessMessage('Asset registered successfully');
      }

      setTimeout(() => {
        handleCloseDialog();
        fetchAssets({ search, type, status, department, limit: 100 });
        setSuccessMessage('');
      }, 800);
    } catch (err: any) {
      const backendError = err.response?.data?.error;
      const backendMsg = err.response?.data?.message;
      const msg = backendError ? `${backendMsg}: ${backendError}` : (backendMsg || 'Failed to save asset');
      setDialogError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    if (assets.length === 0) return;
    const headers = ['Asset Tag','Name','Type','Department','Status','Owner','Room','Scan Count','Last Scanned'];
    const rows = assets.map((a: any) => [
      a.assetTag, a.name, a.assetType, a.department || '', a.status,
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
      fetchAssets({ search, type, status, department, limit: 100 });
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
    {
      id: 'imageUrl',
      label: '',
      minWidth: 50,
      render: (row: any) => (
        <Avatar
          src={row.imageUrl || undefined}
          variant="rounded"
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'rgba(0, 102, 255, 0.08)',
            color: '#0066FF',
            border: '1px solid rgba(0, 102, 255, 0.15)',
          }}
        >
          <ImageIcon sx={{ fontSize: 18 }} />
        </Avatar>
      ),
    },
    { id: 'assetTag', label: 'Asset Tag', minWidth: 110 },
    { id: 'name', label: 'Name', minWidth: 140 },
    { id: 'assetType', label: 'Type', minWidth: 110, format: (v: string) => v.replace(/_/g,' ') },
    {
      id: 'department',
      label: 'Department',
      minWidth: 140,
      render: (row: any) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {row.department && <DepartmentIcon sx={{ fontSize: 16, color: '#0066FF' }} />}
          <Typography variant="body2" sx={{ color: row.department ? '#001A4D' : '#aaa', fontWeight: row.department ? 600 : 400 }}>
            {row.department || '— unassigned —'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'assetValue',
      label: 'Value',
      minWidth: 100,
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: row.assetValue ? '#2e7d32' : '#999' }}>
          {row.assetValue ? `PKR ${Number(row.assetValue).toLocaleString()}` : '—'}
        </Typography>
      ),
    },
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
      minWidth: 160,
      render: (row: any) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
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
          <IconButton
            size="small"
            color={row.status === 'INACTIVE' ? 'success' : 'warning'}
            title={row.status === 'INACTIVE' ? 'Reactivate Asset' : 'Deactivate Asset'}
            onClick={() => {
              setAssetToDeactivate(row);
              setDeactivateDialogOpen(true);
            }}
          >
            {row.status === 'INACTIVE' ? <CheckCircleIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
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

        {/* Status Alert Banner (FR09-04, FR09-05) */}
        {assets.filter((a: any) => a.status === 'MAINTENANCE' || a.status === 'RETIRED').length > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2.5, borderRadius: 2, display: 'flex', alignItems: 'center' }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setStatus(status === 'MAINTENANCE' ? '' : 'MAINTENANCE')}
                sx={{ fontWeight: 700, textTransform: 'none', border: '1px solid rgba(0,0,0,0.15)', px: 1.5 }}
              >
                {status === 'MAINTENANCE' ? 'Show All Assets' : 'Filter Maintenance Assets'}
              </Button>
            }
          >
            <strong>Status Attention Required:</strong> {assets.filter((a: any) => a.status === 'MAINTENANCE').length} asset(s) under maintenance, and {assets.filter((a: any) => a.status === 'RETIRED').length} retired asset(s).
          </Alert>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tag, name, dept, room..."
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  size="small"
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {DEPARTMENTS.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <Card
            elevation={3}
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: '12px',
              backgroundColor: '#eef4ff',
              border: '1px solid #c7dcff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={`${selectedIds.length} Asset${selectedIds.length > 1 ? 's' : ''} Selected`}
                color="primary"
                size="medium"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="body2" color="textSecondary">
                Perform bulk operations across selected records
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => {
                  loadDropdownData();
                  setBulkUpdates({});
                  setBulkEditDialogOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Bulk Edit
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<BlockIcon />}
                onClick={handleBulkDeactivate}
                disabled={bulkSubmitting}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Bulk Deactivate
              </Button>
              {user?.role === 'SUPER_ADMIN' && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={bulkSubmitting}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Bulk Delete
                </Button>
              )}
              <Button
                variant="text"
                size="small"
                startIcon={<CloseIcon />}
                onClick={() => setSelectedIds([])}
                sx={{ textTransform: 'none', color: '#666' }}
              >
                Clear
              </Button>
            </Box>
          </Card>
        )}

        {/* Assets Table */}
        <DataTable
          columns={columns}
          rows={assets}
          loading={loading}
          emptyMessage="No assets found"
          selectable={true}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
        />

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D' }}>
            {editingAsset ? 'Edit Asset' : 'Register New Asset'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {dialogError}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Asset Tag / Unique ID"
              name="assetTag"
              value={formData.assetTag || ''}
              onChange={handleFormChange}
              disabled={!!editingAsset}
              placeholder={editingAsset ? '' : 'Leave blank to auto-generate (e.g. AST-XXXXXX)'}
              helperText={editingAsset ? 'Asset Tag cannot be modified after registration' : 'Unique QR/NFC identifier linked to this asset'}
            />

            <TextField
              fullWidth
              required
              label="Asset Name"
              name="name"
              value={formData.name || ''}
              onChange={handleFormChange}
              placeholder="e.g. Dell UltraSharp 24 Monitor"
            />

            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description || ''}
              onChange={handleFormChange}
              multiline
              rows={2}
              placeholder="e.g. 24-inch IPS LED display with HDMI/DisplayPort"
            />

            <Box>
              <TextField
                select
                fullWidth
                label="Category / Asset Type"
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
              {autoCategorized && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, ml: 0.5 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 16, color: '#0066FF' }} />
                  <Typography variant="caption" sx={{ color: '#0066FF', fontWeight: 600 }}>
                    Auto-categorized as {formatLabel(autoCategorized)} based on asset name
                  </Typography>
                </Box>
              )}
            </Box>

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

            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Purchase & Valuation
              </Typography>
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="date"
                  fullWidth
                  label="Purchase Date"
                  name="purchaseDate"
                  value={formData.purchaseDate || ''}
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="number"
                  fullWidth
                  label="Asset Value (PKR)"
                  name="assetValue"
                  value={formData.assetValue ?? ''}
                  onChange={handleFormChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">PKR</InputAdornment>,
                  }}
                  placeholder="e.g. 45000"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Asset Image
              </Typography>
            </Divider>

            <Box>
              {formData.imageUrl ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: '12px', bgcolor: '#fafafa' }}>
                  <Avatar
                    src={formData.imageUrl}
                    variant="rounded"
                    sx={{ width: 64, height: 64, border: '1px solid #ddd' }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                      Asset Photo Attached
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Image stored with asset registration
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={handleRemoveImage}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Box>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    id="asset-image-upload"
                    type="file"
                    onChange={handleImageChange}
                  />
                  <label htmlFor="asset-image-upload">
                    <Button
                      component="span"
                      variant="outlined"
                      fullWidth
                      startIcon={<AddPhotoAlternateIcon />}
                      disabled={imageLoading}
                      sx={{
                        py: 1.5,
                        borderStyle: 'dashed',
                        borderWidth: 2,
                        textTransform: 'none',
                        color: '#0066FF',
                        borderColor: 'rgba(0, 102, 255, 0.4)',
                        '&:hover': {
                          borderStyle: 'dashed',
                          borderWidth: 2,
                          backgroundColor: 'rgba(0, 102, 255, 0.04)',
                        },
                      }}
                    >
                      {imageLoading ? 'Reading image...' : 'Upload Asset Image (JPG, PNG, WebP up to 5MB)'}
                    </Button>
                  </label>
                  {imageError && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                      {imageError}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Assignment & Department
              </Typography>
            </Divider>

            <TextField
              select
              fullWidth
              label="Department"
              name="department"
              value={formData.department || ''}
              onChange={handleFormChange}
            >
              <MenuItem value="">— Unassigned Department —</MenuItem>
              {DEPARTMENTS.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>

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

            {/* QR Code Custom Styling */}
            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                QR Code Styling
              </Typography>
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="QR Color"
                  value={qrStyleState.color}
                  onChange={(e) => setQrStyleState(prev => ({ ...prev, color: e.target.value }))}
                  size="small"
                >
                  <MenuItem value="#000000">Classic Black (#000000)</MenuItem>
                  <MenuItem value="#001A4D">Deep Navy (#001A4D)</MenuItem>
                  <MenuItem value="#0066FF">SATS Blue (#0066FF)</MenuItem>
                  <MenuItem value="#16A34A">Forest Green (#16A34A)</MenuItem>
                  <MenuItem value="#DC2626">Crimson Red (#DC2626)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Background"
                  value={qrStyleState.backgroundColor}
                  onChange={(e) => setQrStyleState(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  size="small"
                >
                  <MenuItem value="#FFFFFF">Pure White (#FFFFFF)</MenuItem>
                  <MenuItem value="#F8FAFC">Light Gray (#F8FAFC)</MenuItem>
                  <MenuItem value="#FFFDF0">Warm White (#FFFDF0)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="QR Size"
                  value={qrStyleState.size}
                  onChange={(e) => setQrStyleState(prev => ({ ...prev, size: Number(e.target.value) }))}
                  size="small"
                >
                  <MenuItem value={200}>Standard (200px)</MenuItem>
                  <MenuItem value={300}>Medium (300px)</MenuItem>
                  <MenuItem value={400}>Large (400px)</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Dynamic Custom Fields Builder */}
            <Divider sx={{ my: 0.5 }}>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                Custom Dynamic Fields
              </Typography>
            </Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {customFieldsList.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label="Field Name"
                    placeholder="e.g. Serial Number"
                    size="small"
                    value={item.key}
                    onChange={(e) => handleCustomFieldChange(idx, 'key', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Field Value"
                    placeholder="e.g. SN-49281"
                    size="small"
                    value={item.value}
                    onChange={(e) => handleCustomFieldChange(idx, 'value', e.target.value)}
                    sx={{ flex: 1.5 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveCustomField(idx)}
                    title="Remove field"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddCustomField}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', mt: 0.5 }}
              >
                Add Dynamic Field
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
              sx={{ textTransform: 'none', px: 3 }}
            >
              {submitting ? <CircularProgress size={24} /> : editingAsset ? 'Save Changes' : 'Register Asset'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditDialogOpen} onClose={() => setBulkEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Bulk Edit ({selectedIds.length} Assets Selected)
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Choose the attributes you wish to update across all {selectedIds.length} selected assets. Leave any field unchanged to keep existing values.
            </Typography>
            <TextField
              select
              fullWidth
              label="Status"
              value={bulkUpdates.status || ''}
              onChange={(e) => setBulkUpdates((prev) => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="">— Keep Existing Status —</MenuItem>
              {ASSET_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{formatLabel(s)}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Department"
              value={bulkUpdates.department || ''}
              onChange={(e) => setBulkUpdates((prev) => ({ ...prev, department: e.target.value }))}
            >
              <MenuItem value="">— Keep Existing Department —</MenuItem>
              {DEPARTMENTS.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Room / Location"
              value={bulkUpdates.roomId || ''}
              onChange={(e) => setBulkUpdates((prev) => ({ ...prev, roomId: e.target.value }))}
            >
              <MenuItem value="">— Keep Existing Room —</MenuItem>
              <MenuItem value="NONE">— Clear Room (Unassign) —</MenuItem>
              {rooms.map((r: any) => (
                <MenuItem key={r._id} value={r._id}>{r.name} ({r.code})</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Assign To (Owner)"
              value={bulkUpdates.ownerId || ''}
              onChange={(e) => setBulkUpdates((prev) => ({ ...prev, ownerId: e.target.value }))}
            >
              <MenuItem value="">— Keep Existing Owner —</MenuItem>
              <MenuItem value="NONE">— Clear Owner (Unassign) —</MenuItem>
              {users.map((u: any) => (
                <MenuItem key={u._id} value={u._id}>{u.name || u.email} ({formatLabel(u.role)})</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkUpdateSubmit}
              variant="contained"
              disabled={bulkSubmitting}
            >
              {bulkSubmitting ? <CircularProgress size={24} /> : 'Apply Updates'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Confirm Bulk Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to permanently delete all <strong>{selectedIds.length}</strong> selected assets? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkDeleteConfirm} color="error" variant="contained" disabled={bulkSubmitting}>
              {bulkSubmitting ? <CircularProgress size={24} /> : 'Delete Assets'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Deactivate/Reactivate Confirmation Dialog */}
        <Dialog open={deactivateDialogOpen} onClose={() => { setDeactivateDialogOpen(false); setAssetToDeactivate(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>
            {assetToDeactivate?.status === 'INACTIVE' ? 'Reactivate Asset' : 'Deactivate Asset'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {assetToDeactivate?.status === 'INACTIVE'
                ? `Are you sure you want to reactivate asset "${assetToDeactivate?.name}" (${assetToDeactivate?.assetTag})? Its status will be set to ACTIVE.`
                : `Are you sure you want to deactivate asset "${assetToDeactivate?.name}" (${assetToDeactivate?.assetTag})? Its status will be set to INACTIVE.`}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDeactivateDialogOpen(false); setAssetToDeactivate(null); }}>Cancel</Button>
            <Button
              onClick={handleToggleDeactivate}
              color={assetToDeactivate?.status === 'INACTIVE' ? 'primary' : 'warning'}
              variant="contained"
            >
              {assetToDeactivate?.status === 'INACTIVE' ? 'Reactivate' : 'Deactivate'}
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
