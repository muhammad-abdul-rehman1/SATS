import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  CircularProgress,
  Grid,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCode as QrCodeIcon,
  Inventory as AssetIcon,
  Edit as EditIcon,
  SwapHoriz as TransferIcon,
  History as HistoryIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Apartment as DepartmentIcon,
  Image as ImageIcon,
  Tune as CustomizeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Map as MapIcon,
  Build as BuildIcon,
  Event as EventIcon,
  PictureAsPdf as PdfIcon,
  FileDownload as DownloadIcon,
  Room as RoomIcon,
  ReportProblem as ReportProblemIcon,
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Image from 'next/image';
import { Layout } from '@/components/Layout/MainLayout';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { assetsAPI } from '@/services/assets';
import { roomsAPI } from '@/services/rooms';
import { maintenanceAPI } from '@/services/maintenance';
import { issuesAPI } from '@/services/issues';
import { MaintenanceSchedule, AssetMovement, AssetIssue } from '@/types';
import { formatDateTime, formatLabel } from '@/utils/formatting';
import { DEPARTMENTS } from '@/utils/constants';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:      { bg: '#e8f5e9', color: '#2e7d32' },
  INACTIVE:    { bg: '#f5f5f5', color: '#616161' },
  MAINTENANCE: { bg: '#fff3e0', color: '#e65100' },
  RETIRED:     { bg: '#ffebee', color: '#c62828' },
};

export default function AssetDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();

  const [asset, setAsset] = useState<any>(null);
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');

  // Modification Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Transfer Dialog state
  const [transferOpen, setTransferOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Deactivate confirmation state
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);

  // QR Styling and Custom Dynamic Fields States
  const [qrCustomizeOpen, setQrCustomizeOpen] = useState(false);
  const [editCustomFieldsOpen, setEditCustomFieldsOpen] = useState(false);
  const [customFieldsList, setCustomFieldsList] = useState<Array<{ key: string; value: string }>>([]);
  const [qrStyleState, setQrStyleState] = useState<{ color: string; backgroundColor: string; size: number }>({
    color: '#001A4D',
    backgroundColor: '#FFFFFF',
    size: 200,
  });

  // Maintenance History state
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceSchedule[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  // Movement History state
  const [movementList, setMovementList] = useState<AssetMovement[]>([]);
  const [movementLoading, setMovementLoading] = useState(false);
  const [movementStartDate, setMovementStartDate] = useState('');
  const [movementEndDate, setMovementEndDate] = useState('');
  const [movementExporting, setMovementExporting] = useState<'pdf' | 'csv' | null>(null);

  // Issue reporting state (FR25)
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [issueImageUrl, setIssueImageUrl] = useState('');
  const [assetIssues, setAssetIssues] = useState<AssetIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);

  const loadAssetIssues = async (assetId: string) => {
    try {
      setIssuesLoading(true);
      const res = await issuesAPI.getByAssetId(assetId);
      setAssetIssues(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('Failed to load asset issues:', e);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleIssueImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIssueImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitIssueReport = async () => {
    if (!issueDescription.trim()) {
      setSnackbar('Please enter a description of the issue');
      return;
    }
    try {
      setReportingIssue(true);
      await issuesAPI.reportIssue({
        assetId: asset?._id,
        assetTag: asset?.assetTag,
        title: issueTitle.trim() || undefined,
        description: issueDescription.trim(),
        priority: issuePriority,
        imageUrl: issueImageUrl || undefined,
      });

      setSnackbar('Asset issue reported successfully and administrators have been alerted.');
      setReportIssueOpen(false);
      setIssueTitle('');
      setIssueDescription('');
      setIssuePriority('MEDIUM');
      setIssueImageUrl('');
      if (asset?._id) loadAssetIssues(asset._id);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Failed to submit issue report.');
    } finally {
      setReportingIssue(false);
    }
  };

  const loadLogs = async (assetId: string) => {
    try {
      setLogsLoading(true);
      const res = await assetsAPI.getLogs(assetId);
      const logData = (res.data as any).data ?? (res.data as any) ?? [];
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (e) {
      console.error('Failed to load asset audit logs', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadMaintenance = async (assetId: string) => {
    try {
      setMaintenanceLoading(true);
      const res = await maintenanceAPI.getByAssetId(assetId);
      const mData = (res.data as any).data ?? (res.data as any) ?? [];
      setMaintenanceList(Array.isArray(mData) ? mData : []);
    } catch (e) {
      console.error('Failed to load asset maintenance history', e);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadMovements = async (assetId: string, startDate?: string, endDate?: string) => {
    try {
      setMovementLoading(true);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await assetsAPI.getMovementHistory(assetId, params);
      const mData = (res.data as any).data?.movements ?? (res.data as any)?.movements ?? [];
      setMovementList(Array.isArray(mData) ? mData : []);
    } catch (e) {
      console.error('Failed to load asset movement history', e);
    } finally {
      setMovementLoading(false);
    }
  };

  const handleExportMovements = async (format: 'pdf' | 'csv') => {
    try {
      setMovementExporting(format);
      const params: any = {};
      if (movementStartDate) params.startDate = movementStartDate;
      if (movementEndDate) params.endDate = movementEndDate;
      const res = await assetsAPI.exportMovementHistory(id as string, format, params);
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTag = (asset?.assetTag || (id as string)).replace(/[^a-zA-Z0-9-_]/g, '_');
      link.setAttribute('download', `asset-movement-history-${cleanTag}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export movements:', e);
      setSnackbar('Failed to export movement history');
    } finally {
      setMovementExporting(null);
    }
  };

  const handleSaveQrStyle = async () => {
    try {
      await assetsAPI.update(id as string, { qrStyle: qrStyleState } as any);
      const qrRes = await assetsAPI.generateQRCode(id as string);
      const qr = (qrRes.data as any).data?.qrCode ?? (qrRes.data as any).qrCode ?? '';
      setQrCode(qr);
      setSnackbar('QR style updated successfully!');
      setQrCustomizeOpen(false);
      loadLogs(id as string);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Failed to update QR style');
    }
  };

  const handleSaveCustomFields = async () => {
    try {
      const customFieldsObj: Record<string, string> = {};
      customFieldsList.forEach(item => {
        if (item.key && item.key.trim()) {
          customFieldsObj[item.key.trim()] = item.value ? item.value.trim() : '';
        }
      });
      await assetsAPI.update(id as string, { customFields: customFieldsObj } as any);
      const updated = await assetsAPI.getById(id as string);
      const a = (updated.data as any).data ?? (updated.data as any);
      setAsset(a);
      setSnackbar('Custom dynamic fields updated successfully!');
      setEditCustomFieldsOpen(false);
      loadLogs(id as string);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Failed to save custom fields');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || authLoading || !id) return;

    const load = async () => {
      try {
        setLoading(true);
        const [assetRes, qrRes, roomsRes] = await Promise.all([
          assetsAPI.getById(id as string),
          assetsAPI.generateQRCode(id as string),
          roomsAPI.getAll(),
        ]);

        const a = (assetRes.data as any).data ?? (assetRes.data as any);
        setAsset(a);
        setSelectedRoomId(a?.roomId?._id || '');
        setSelectedDepartment(a?.department || '');

        if (a?.customFields && typeof a.customFields === 'object') {
          setCustomFieldsList(Object.entries(a.customFields).map(([k, v]) => ({ key: k, value: String(v) })));
        } else {
          setCustomFieldsList([]);
        }

        if (a?.qrStyle) {
          setQrStyleState({
            color: a.qrStyle.color || '#001A4D',
            backgroundColor: a.qrStyle.backgroundColor || '#FFFFFF',
            size: a.qrStyle.size || 200,
          });
        }

        const qr = (qrRes.data as any).data?.qrCode ?? (qrRes.data as any).qrCode ?? '';
        setQrCode(qr);

        const roomData = (roomsRes.data as any).data ?? (roomsRes.data as any) ?? [];
        setRooms(Array.isArray(roomData) ? roomData : []);

        loadLogs(id as string);
        loadMaintenance(id as string);
        loadMovements(id as string);
        loadAssetIssues(id as string);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load asset details');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isAuthenticated, authLoading]);

  const handleTransfer = async () => {
    try {
      setTransferring(true);
      const updates: any = {};
      if (selectedRoomId !== undefined) {
        updates.roomId = selectedRoomId || null;
      }
      if (selectedDepartment !== undefined) {
        updates.department = selectedDepartment;
      }

      await assetsAPI.update(id as string, updates);
      const updated = await assetsAPI.getById(id as string);
      const updatedData = (updated.data as any).data ?? (updated.data as any);
      setAsset(updatedData);
      setSelectedRoomId(updatedData?.roomId?._id || '');
      setSelectedDepartment(updatedData?.department || '');
      setSnackbar('Asset transfer recorded successfully!');
      setTransferOpen(false);
      loadLogs(id as string);
      loadMovements(id as string);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = asset.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await assetsAPI.update(id as string, { status: newStatus } as any);
      const updated = await assetsAPI.getById(id as string);
      setAsset((updated.data as any).data ?? (updated.data as any));
      setSnackbar(`Asset marked as ${newStatus}`);
      setDeactivateConfirmOpen(false);
      loadLogs(id as string);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Status change failed');
    }
  };

  if (!isAuthenticated || authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !asset) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/assets')} sx={{ mb: 2 }}>
            Back to Assets
          </Button>
          <Alert severity="error">{error || 'Asset not found'}</Alert>
        </Container>
      </Layout>
    );
  }

  const statusStyle = STATUS_COLORS[asset.status] ?? STATUS_COLORS.INACTIVE;

  return (
    <Layout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/assets')}
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Back to Assets
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#001A4D' }}>
                  {asset.name}
                </Typography>
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.85rem',
                    backgroundColor: '#e8eaf6',
                    color: '#3949ab',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                >
                  {asset.assetTag}
                </Box>
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.8rem',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '8px',
                    fontWeight: 700,
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                  }}
                >
                  {asset.status}
                </Box>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Asset Details and QR Code
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={async () => {
                  try {
                    const res = await assetsAPI.getById(id as string);
                    const a = (res.data as any).data ?? (res.data as any);
                    setAsset(a);
                    setSnackbar(`Refreshed: ${a.roomId?.name || 'Unassigned'} • Status: ${a.status}`);
                  } catch (e) {
                    setSnackbar('Failed to refresh asset');
                  }
                }}
                sx={{ textTransform: 'none', borderRadius: '10px' }}
              >
                Refresh Status
              </Button>
              {asset.roomId && (
                <Button
                  variant="outlined"
                  startIcon={<MapIcon />}
                  onClick={() => router.push('/map/rooms')}
                  sx={{ textTransform: 'none', borderRadius: '10px' }}
                >
                  View on Map
                </Button>
              )}
              {user?.role === 'SUPER_ADMIN' && (
                <Button
                  variant="outlined"
                  color={asset.status === 'INACTIVE' ? 'success' : 'warning'}
                  startIcon={asset.status === 'INACTIVE' ? <CheckCircleIcon /> : <BlockIcon />}
                  onClick={() => setDeactivateConfirmOpen(true)}
                  sx={{ textTransform: 'none', borderRadius: '10px' }}
                >
                  {asset.status === 'INACTIVE' ? 'Reactivate Asset' : 'Deactivate Asset'}
                </Button>
              )}
              {(user?.role === 'SUPER_ADMIN' || user?._id === asset?.ownerId?._id) && (
                <Button
                  variant="contained"
                  startIcon={<TransferIcon />}
                  onClick={() => setTransferOpen(true)}
                  sx={{ textTransform: 'none', borderRadius: '10px' }}
                >
                  Transfer Asset
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<BuildIcon />}
                onClick={() => router.push('/maintenance')}
                sx={{
                  textTransform: 'none',
                  borderRadius: '10px',
                  bgcolor: '#0066FF',
                  '&:hover': { bgcolor: '#0052CC' },
                }}
              >
                Schedule Maintenance
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<ReportProblemIcon />}
                onClick={() => setReportIssueOpen(true)}
                sx={{ textTransform: 'none', borderRadius: '10px' }}
              >
                Report Issue
              </Button>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Info Card */}
          <Grid item xs={12} md={asset.imageUrl ? 6 : 8}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AssetIcon sx={{ color: '#0066FF' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Asset Information</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  {[
                    { label: 'Asset Type', value: formatLabel(asset.assetType || '') },
                    { label: 'Status', value: formatLabel(asset.status || '') },
                    { label: 'Department', value: asset.department || '— Unassigned —' },
                    { label: 'Purchase Date', value: asset.purchaseDate ? formatDateTime(asset.purchaseDate).split(' ')[0] : '—' },
                    { label: 'Asset Value', value: asset.assetValue ? `PKR ${Number(asset.assetValue).toLocaleString()}` : '—' },
                    { label: 'Assigned Owner', value: asset.ownerId?.name ? `${asset.ownerId.name} (${asset.ownerId.email})` : '— Unassigned —' },
                    { label: 'Room / Location', value: asset.roomId?.name ? `${asset.roomId.name} (${asset.roomId.code || ''})` : '— No Room —' },
                    { label: 'Description', value: asset.description || '—' },
                    { label: 'Total Scans', value: asset.scanCount ?? 0 },
                    { label: 'Last Scanned', value: asset.lastScanned ? formatDateTime(asset.lastScanned) : 'Never' },
                    { label: 'Created', value: asset.createdAt ? formatDateTime(asset.createdAt) : '—' },
                  ].map((field) => (
                    <Grid item xs={12} sm={6} key={field.label}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {field.label}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.3 }}>
                        {String(field.value)}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Asset Image Card (FR03-05) */}
          {asset.imageUrl && (
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, alignSelf: 'flex-start' }}>
                    <ImageIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Asset Photo</Typography>
                  </Box>
                  <Divider sx={{ mb: 3, width: '100%' }} />
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fafafa',
                      border: '1px solid #eee',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    <Box
                      component="img"
                      src={asset.imageUrl}
                      alt={asset.name}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* QR Code Card */}
          <Grid item xs={12} sm={asset.imageUrl ? 6 : 12} md={asset.imageUrl ? 3 : 4}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, alignSelf: 'flex-start' }}>
                  <QrCodeIcon sx={{ color: '#0066FF' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>QR Code</Typography>
                </Box>
                <Divider sx={{ mb: 3, width: '100%' }} />
                {qrCode ? (
                  <>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        border: '1px solid #eee',
                        mb: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                    >
                      <Image src={qrCode} alt={`QR for ${asset.name}`} width={180} height={180} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        href={qrCode}
                        download={`${asset.assetTag}-QR.png`}
                        sx={{ textTransform: 'none', borderRadius: '8px' }}
                      >
                        Download QR
                      </Button>
                      {user?.role === 'SUPER_ADMIN' && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CustomizeIcon />}
                          onClick={() => setQrCustomizeOpen(true)}
                          sx={{ textTransform: 'none', borderRadius: '8px' }}
                        >
                          Customize
                        </Button>
                      )}
                    </Box>
                  </>
                ) : (
                  <CircularProgress size={40} />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Custom Dynamic Fields Card */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CustomizeIcon sx={{ color: '#0066FF' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Custom Dynamic Fields</Typography>
                  </Box>
                  {user?.role === 'SUPER_ADMIN' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setEditCustomFieldsOpen(true)}
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
                    >
                      Manage Custom Fields
                    </Button>
                  )}
                </Box>
                <Divider sx={{ mb: 2.5 }} />
                {asset.customFields && Object.keys(asset.customFields).length > 0 ? (
                  <Grid container spacing={2}>
                    {Object.entries(asset.customFields).map(([key, val]) => (
                      <Grid item xs={12} sm={6} md={3} key={key}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {key}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.3, color: '#001A4D' }}>
                          {String(val)}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No custom dynamic fields attached to this asset record yet. Click &quot;Manage Custom Fields&quot; to define custom attributes.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Audit Log / Modification History Card */}
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon sx={{ color: '#0066FF' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Asset Modification History</Typography>
              </Box>
              <Chip
                label={`${logs.length} Log${logs.length !== 1 ? 's' : ''}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              Chronological log of all modifications, assignments, room/department transfers, and status changes for this asset.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {logsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : logs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <HistoryIcon sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                <Typography color="textSecondary" variant="body2">No modification records found for this asset.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,102,255,0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Modified By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log._id} hover>
                        <TableCell>
                          <Chip
                            label={formatLabel(log.action)}
                            size="small"
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor:
                                log.action === 'ASSET_DELETED' || log.action === 'ASSET_DEACTIVATED'
                                  ? '#ffebee'
                                  : log.action === 'ASSET_TRANSFERRED'
                                  ? '#e3f2fd'
                                  : log.action === 'ASSET_ASSIGNED'
                                  ? '#ede7f6'
                                  : '#e8f5e9',
                              color:
                                log.action === 'ASSET_DELETED' || log.action === 'ASSET_DEACTIVATED'
                                  ? '#c62828'
                                  : log.action === 'ASSET_TRANSFERRED'
                                  ? '#1565c0'
                                  : log.action === 'ASSET_ASSIGNED'
                                  ? '#512da8'
                                  : '#2e7d32',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{log.details || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.userName || 'System'}</Typography>
                          <Typography variant="caption" color="textSecondary">{log.email || log.role}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{log.ipAddress || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{formatDateTime(log.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Asset Movement History Card */}
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TransferIcon sx={{ color: '#0066FF' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Asset Movement History</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${movementList.length} Movement${movementList.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={movementExporting === 'pdf' ? <CircularProgress size={14} /> : <PdfIcon fontSize="small" />}
                  onClick={() => handleExportMovements('pdf')}
                  disabled={movementExporting !== null || movementList.length === 0}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  Export PDF
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={movementExporting === 'csv' ? <CircularProgress size={14} /> : <DownloadIcon fontSize="small" />}
                  onClick={() => handleExportMovements('csv')}
                  disabled={movementExporting !== null || movementList.length === 0}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  Export CSV
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<HistoryIcon fontSize="small" />}
                  onClick={() => router.push(`/assets/${asset?.assetTag || id}/history`)}
                  sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#0066FF' }}
                >
                  View Full History
                </Button>
              </Box>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              Track previous locations, room reassignments, and department transfers in reverse chronological order.
            </Typography>

            {/* Quick Date Range Filter */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="From Date"
                type="date"
                value={movementStartDate}
                onChange={(e) => setMovementStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 170 }}
              />
              <TextField
                size="small"
                label="To Date"
                type="date"
                value={movementEndDate}
                onChange={(e) => setMovementEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 170 }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={() => loadMovements(id as string, movementStartDate, movementEndDate)}
                sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#0066FF' }}
              >
                Filter by Date
              </Button>
              {(movementStartDate || movementEndDate) && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setMovementStartDate('');
                    setMovementEndDate('');
                    loadMovements(id as string, '', '');
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Reset
                </Button>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {movementLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : movementList.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <RoomIcon sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                <Typography color="textSecondary" variant="body2">No movement records found for this asset.</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TransferIcon />}
                  onClick={() => setTransferOpen(true)}
                  sx={{ mt: 1.5, textTransform: 'none', borderRadius: '8px' }}
                >
                  Transfer / Update Location
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,102,255,0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Record</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Previous Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>New Location</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Moved By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reason / Notes</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movementList.map((m: any, idx: number) => (
                      <TableRow key={m._id || idx} hover>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          Record #{movementList.length - idx}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Chip
                            label={m.fromRoomName || 'Unassigned'}
                            size="small"
                            sx={{ fontSize: '0.75rem', fontWeight: 600, bgcolor: '#f1f5f9' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: '#0066FF', fontWeight: 700 }}>→</Typography>
                            <Chip
                              label={m.toRoomName || 'Unassigned'}
                              size="small"
                              sx={{ fontSize: '0.75rem', fontWeight: 700, bgcolor: '#eff6ff', color: '#1e40af' }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.movedByName || 'System'}</Typography>
                          {m.movedByEmail && (
                            <Typography variant="caption" color="textSecondary">{m.movedByEmail}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: '#475569' }}>
                          {m.reason || 'Location update'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {formatDateTime(m.movedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Records & History Card */}
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BuildIcon sx={{ color: '#0066FF' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Asset Maintenance History</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${maintenanceList.length} Operation${maintenanceList.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<BuildIcon fontSize="small" />}
                  onClick={() => router.push('/maintenance')}
                  sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#0066FF' }}
                >
                  Manage in Hub
                </Button>
              </Box>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              Track past and upcoming scheduled servicing, calibrations, repairs, technician assignments, and rescheduling records.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {maintenanceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : maintenanceList.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <BuildIcon sx={{ fontSize: 40, color: '#ccc', mb: 1 }} />
                <Typography color="textSecondary" variant="body2">No maintenance operations scheduled for this asset yet.</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/maintenance')}
                  sx={{ mt: 1.5, textTransform: 'none', borderRadius: '8px' }}
                >
                  Schedule Initial Maintenance
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,102,255,0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Operation</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Scheduled Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Technician</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reschedules</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes / Resolution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {maintenanceList.map((m: any) => (
                      <TableRow key={m._id} hover>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.title}</Typography>
                          {m.description && (
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                              {m.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Chip
                            label={m.priority}
                            size="small"
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              bgcolor:
                                m.priority === 'CRITICAL' ? '#ffebee' : m.priority === 'HIGH' ? '#fff3e0' : '#e3f2fd',
                              color:
                                m.priority === 'CRITICAL' ? '#c62828' : m.priority === 'HIGH' ? '#e65100' : '#0277bd',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Chip
                            label={m.status}
                            size="small"
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              bgcolor:
                                m.status === 'COMPLETED' ? '#dcfce7' : m.status === 'IN_PROGRESS' ? '#fef3c7' : '#e0f2fe',
                              color:
                                m.status === 'COMPLETED' ? '#15803d' : m.status === 'IN_PROGRESS' ? '#b45309' : '#0369a1',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatDateTime(m.scheduledDate)}
                          </Typography>
                          {m.reminderSent && (
                            <Typography variant="caption" sx={{ color: '#16a34a', display: 'block' }}>
                              ✓ Reminder Sent
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {m.assignedTo ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.assignedTo.name}</Typography>
                              <Typography variant="caption" color="textSecondary">{m.assignedTo.email}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="textSecondary">Unassigned</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {m.rescheduledCount > 0 ? (
                            <Chip
                              label={`Rescheduled (${m.rescheduledCount}x)`}
                              size="small"
                              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Typography variant="caption" color="textSecondary">Original date</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {m.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Reported Issues Card (FR25) */}
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReportProblemIcon sx={{ color: '#EF4444' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Reported Issues & Faults</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${assetIssues.length} Reported Issue${assetIssues.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => setReportIssueOpen(true)}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  Report Issue
                </Button>
              </Box>
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              View and track damage, hardware defects, and operational issues reported by field staff for this asset.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {issuesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : assetIssues.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="textSecondary" variant="body2">No issues have been reported for this asset.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(239,68,68,0.04)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Issue Title</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reported By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Resolution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assetIssues.map((iss) => (
                      <TableRow key={iss._id} hover>
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{iss.title}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{iss.description}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Chip
                            size="small"
                            label={iss.priority}
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              bgcolor: iss.priority === 'CRITICAL' ? '#fee2e2' : iss.priority === 'HIGH' ? '#ffedd5' : '#fef3c7',
                              color: iss.priority === 'CRITICAL' ? '#dc2626' : iss.priority === 'HIGH' ? '#ea580c' : '#d97706',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          <Chip
                            size="small"
                            label={iss.status}
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              bgcolor: iss.status === 'RESOLVED' ? '#dcfce7' : iss.status === 'IN_PROGRESS' ? '#fef3c7' : '#eff6ff',
                              color: iss.status === 'RESOLVED' ? '#15803d' : iss.status === 'IN_PROGRESS' ? '#b45309' : '#1d4ed8',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{iss.reportedByName || 'Staff Member'}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{formatDateTime(iss.createdAt)}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{iss.resolutionNotes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Transfer Asset Dialog */}
        <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Transfer Asset Location & Department</DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: '8px' }}>
              <Typography variant="caption" color="textSecondary" display="block">Current Assignment:</Typography>
              <Typography variant="body2"><strong>Department:</strong> {asset?.department || 'Unassigned'}</Typography>
              <Typography variant="body2"><strong>Room:</strong> {asset?.roomId?.name || 'No Room'}</Typography>
            </Box>
            <TextField
              select
              fullWidth
              label="Select Destination Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              size="small"
            >
              <MenuItem value="">— Unassigned Department —</MenuItem>
              {DEPARTMENTS.map((dept) => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Select Destination Room"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              size="small"
            >
              <MenuItem value="">— No Room —</MenuItem>
              {rooms.map((r: any) => (
                <MenuItem key={r._id} value={r._id}>{r.name} ({r.code})</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setTransferOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleTransfer}
              disabled={transferring}
              startIcon={<TransferIcon />}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {transferring ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Deactivate Confirmation Dialog */}
        <Dialog open={deactivateConfirmOpen} onClose={() => setDeactivateConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {asset.status === 'INACTIVE' ? 'Reactivate Asset' : 'Deactivate Asset'}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2">
              {asset.status === 'INACTIVE'
                ? `Are you sure you want to reactivate "${asset.name}" (${asset.assetTag})? Its status will become ACTIVE.`
                : `Are you sure you want to deactivate "${asset.name}" (${asset.assetTag})? Its status will become INACTIVE.`}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeactivateConfirmOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              color={asset.status === 'INACTIVE' ? 'success' : 'warning'}
              onClick={handleToggleStatus}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* QR Customizer Dialog */}
        <Dialog open={qrCustomizeOpen} onClose={() => setQrCustomizeOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D' }}>
            Customize QR Code Styling
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Configure the colors and resolution of this asset&apos;s system QR code.
            </Typography>
            <TextField
              select
              fullWidth
              label="Foreground Color"
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
            <TextField
              select
              fullWidth
              label="Background Color"
              value={qrStyleState.backgroundColor}
              onChange={(e) => setQrStyleState(prev => ({ ...prev, backgroundColor: e.target.value }))}
              size="small"
            >
              <MenuItem value="#FFFFFF">Pure White (#FFFFFF)</MenuItem>
              <MenuItem value="#F8FAFC">Light Gray (#F8FAFC)</MenuItem>
              <MenuItem value="#FFFDF0">Warm White (#FFFDF0)</MenuItem>
            </TextField>
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
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setQrCustomizeOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button onClick={handleSaveQrStyle} variant="contained" sx={{ textTransform: 'none', borderRadius: '8px' }}>
              Save QR Styling
            </Button>
          </DialogActions>
        </Dialog>

        {/* Manage Custom Fields Dialog */}
        <Dialog open={editCustomFieldsOpen} onClose={() => setEditCustomFieldsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, color: '#001A4D' }}>
            Manage Custom Dynamic Fields
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Attach dynamic custom attributes to this asset record (e.g. Serial Number, RAM, Warranty Expiry, Vendor).
            </Typography>
            {customFieldsList.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Field Name"
                  placeholder="e.g. Serial Number"
                  size="small"
                  value={item.key}
                  onChange={(e) => {
                    const copy = [...customFieldsList];
                    copy[idx].key = e.target.value;
                    setCustomFieldsList(copy);
                  }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Field Value"
                  placeholder="e.g. SN-89212"
                  size="small"
                  value={item.value}
                  onChange={(e) => {
                    const copy = [...customFieldsList];
                    copy[idx].value = e.target.value;
                    setCustomFieldsList(copy);
                  }}
                  sx={{ flex: 1.5 }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setCustomFieldsList(prev => prev.filter((_, i) => i !== idx))}
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
              onClick={() => setCustomFieldsList(prev => [...prev, { key: '', value: '' }])}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', mt: 0.5 }}
            >
              Add Dynamic Field
            </Button>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditCustomFieldsOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button onClick={handleSaveCustomFields} variant="contained" sx={{ textTransform: 'none', borderRadius: '8px' }}>
              Save Custom Fields
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Asset Issue Dialog (FR25-01, FR25-02, FR25-04) */}
        <Dialog
          open={reportIssueOpen}
          onClose={() => !reportingIssue && setReportIssueOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: '16px' } }}
        >
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportProblemIcon sx={{ color: '#EF4444' }} />
            Report Issue for {asset?.name} ({asset?.assetTag})
          </DialogTitle>
          <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Issue Summary / Title"
              placeholder="e.g. Screen has dead pixels"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              size="small"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Detailed Description *"
              placeholder="Describe what is wrong or damaged with the asset..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              size="small"
            />
            <TextField
              select
              fullWidth
              label="Severity"
              value={issuePriority}
              onChange={(e) => setIssuePriority(e.target.value as any)}
              size="small"
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </TextField>
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                Photo Attachment (Optional)
              </Typography>
              {issueImageUrl ? (
                <Box sx={{ position: 'relative', width: 120, height: 90, borderRadius: 2, overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                  <Box component="img" src={issueImageUrl} alt="Evidence" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    onClick={() => setIssueImageUrl('')}
                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.6)', color: 'white' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} size="small" sx={{ textTransform: 'none' }}>
                  Upload Photo
                  <input type="file" accept="image/*" hidden onChange={handleIssueImageChange} />
                </Button>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setReportIssueOpen(false)} disabled={reportingIssue} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleSubmitIssueReport}
              disabled={reportingIssue || !issueDescription.trim()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {reportingIssue ? <CircularProgress size={20} color="inherit" /> : 'Submit Report'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={!!snackbar}
          autoHideDuration={3000}
          onClose={() => setSnackbar('')}
          message={snackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
    </Layout>
  );
}
