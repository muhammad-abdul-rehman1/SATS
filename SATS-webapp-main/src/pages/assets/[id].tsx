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
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  QrCode as QrCodeIcon,
  Inventory as AssetIcon,
  Edit as EditIcon,
  SwapHoriz as TransferIcon,
} from '@mui/icons-material';
import Image from 'next/image';
import { Layout } from '@/components/Layout/MainLayout';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useAuth } from '@/contexts/AuthContext';
import { assetsAPI } from '@/services/assets';
import { roomsAPI } from '@/services/rooms';
import { scanHistoryAPI } from '@/services/scanHistory';
import { formatDateTime, formatLabel } from '@/utils/formatting';

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
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');

  // Transfer Room state
  const [transferOpen, setTransferOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || authLoading || !id) return;

    const load = async () => {
      try {
        setLoading(true);
        const [assetRes, qrRes, scanRes, roomsRes] = await Promise.all([
          assetsAPI.getById(id as string),
          assetsAPI.generateQRCode(id as string),
          scanHistoryAPI.getScanHistory(1, 10, 'ASSET'),
          roomsAPI.getAll(),
        ]);

        const a = (assetRes.data as any).data ?? (assetRes.data as any);
        setAsset(a);
        setSelectedRoomId(a?.roomId?._id || '');

        const qr = (qrRes.data as any).data?.qrCode ?? (qrRes.data as any).qrCode ?? '';
        setQrCode(qr);

        const scanData = (scanRes.data as any).scanLogs ?? (scanRes.data as any).data?.scanLogs ?? [];
        setScanHistory(scanData);

        const roomData = (roomsRes.data as any).data ?? (roomsRes.data as any) ?? [];
        setRooms(Array.isArray(roomData) ? roomData : []);
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
      await assetsAPI.update(id as string, { roomId: selectedRoomId || null } as any);
      const updated = await assetsAPI.getById(id as string);
      setAsset((updated.data as any).data ?? (updated.data as any));
      setSnackbar('Room transferred successfully!');
      setTransferOpen(false);
    } catch (err: any) {
      setSnackbar(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
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
                Asset Details, QR Code & Scan History
              </Typography>
            </Box>
            {user?.role === 'SUPER_ADMIN' && (
              <Button
                variant="outlined"
                startIcon={<TransferIcon />}
                onClick={() => setTransferOpen(true)}
                sx={{ textTransform: 'none', borderRadius: '10px', alignSelf: 'flex-start' }}
              >
                Transfer Room
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Info Card */}
          <Grid item xs={12} md={8}>
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

          {/* QR Code Card */}
          <Grid item xs={12} md={4}>
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
                    <Button
                      variant="outlined"
                      size="small"
                      href={qrCode}
                      download={`${asset.assetTag}-QR.png`}
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
                    >
                      Download QR
                    </Button>
                  </>
                ) : (
                  <CircularProgress size={40} />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Scan History */}
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#001A4D' }}>
          Recent Scan History
        </Typography>
        <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px' }}>
          <CardContent sx={{ p: 0 }}>
            {scanHistory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <QrCodeIcon sx={{ fontSize: 48, color: '#ddd', mb: 1 }} />
                <Typography color="textSecondary">No scans recorded yet.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Scanned By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scanHistory.map((log) => (
                      <TableRow key={log._id} sx={{ '&:hover': { backgroundColor: '#f5f7ff' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.scannedBy?.name || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {log.scannedBy?.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={log.action || 'VIEW'} size="small" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDateTime(log.scannedAt)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Transfer Room Dialog */}
        <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700 }}>Transfer Asset to Room</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Currently in: <strong>{asset?.roomId?.name || 'No Room'}</strong>
            </Typography>
            <TextField
              select
              fullWidth
              label="Select New Room"
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
