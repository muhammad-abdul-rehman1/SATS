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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, QrCode as QrCodeIcon } from '@mui/icons-material';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { roomsAPI } from '@/services/rooms';
import { formatDateTime, formatLabel } from '@/utils/formatting';
import Image from 'next/image';

export default function RoomDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  
  const [room, setRoom] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || authLoading || !id) return;
    
    const fetchRoomDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch in parallel
        const [roomRes, qrRes, assetsRes] = await Promise.all([
          roomsAPI.getById(id as string),
          roomsAPI.generateQRCode(id as string),
          roomsAPI.getAssets(id as string)
        ]);
        
        setRoom(roomRes.data.data ? roomRes.data.data : roomRes.data);
        setQrCode(qrRes.data.data?.qrCode || '');
        setAssets(assetsRes.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load room details');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [id, isAuthenticated, authLoading]);

  const assetColumns = [
    { id: 'assetTag', label: 'Asset Tag', minWidth: 120 },
    { id: 'name', label: 'Asset Name', minWidth: 150 },
    { id: 'assetType', label: 'Type', minWidth: 120, format: (v: string) => formatLabel(v) },
    { id: 'status', label: 'Status', minWidth: 120, format: (v: string) => formatLabel(v) },
    { id: 'scanCount', label: 'Scans', minWidth: 80 },
  ];

  if (!isAuthenticated || authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !room) {
    return (
      <Layout>
        <Container maxWidth="lg">
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/rooms')} sx={{ mb: 2 }}>
            Back to Rooms
          </Button>
          <Alert severity="error">{error || 'Room not found'}</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => router.push('/rooms')} 
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Back to Rooms
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                {room.name}
                <Box component="span" sx={{ fontSize: '0.9rem', backgroundColor: '#e0e0e0', color: '#424242', px: 1.5, py: 0.5, borderRadius: 1 }}>
                  {room.code}
                </Box>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Room Details and Assigned Assets
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Room Info */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography color="textSecondary" variant="caption">Building</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.building || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography color="textSecondary" variant="caption">Floor</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.floor || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography color="textSecondary" variant="caption">Capacity</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.capacity || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography color="textSecondary" variant="caption">Total Scans</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.scanCount || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={8}>
                    <Typography color="textSecondary" variant="caption">Last Scanned</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {room.lastScanned ? formatDateTime(room.lastScanned) : 'Never'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* QR Code */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ mb: 1, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QrCodeIcon /> QR Code
                </Typography>
                <Divider sx={{ mb: 2, width: '100%' }} />
                {qrCode ? (
                  <Box sx={{ p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid #eee', mb: 2 }}>
                    <Image src={qrCode} alt={`QR Code for ${room.name}`} width={180} height={180} />
                  </Box>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress size={40} />
                  </Box>
                )}
                <Button 
                  variant="outlined" 
                  size="small"
                  href={qrCode} 
                  download={`${room.code}-QR.png`}
                  disabled={!qrCode}
                >
                  Download QR
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assigned Assets Table */}
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
          Assigned Assets ({assets.length})
        </Typography>
        <Card>
          <DataTable
            columns={assetColumns}
            rows={assets}
            loading={false}
            emptyMessage="No assets are currently assigned to this room."
          />
        </Card>
      </Container>
    </Layout>
  );
}
