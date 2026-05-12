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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { Layout } from '@/components/Layout/MainLayout';
import { DataTable } from '@/components/Common/DataTable';
import { useProtectedRoute } from '@/hooks/useRoute';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/contexts/AuthContext';
import { roomsAPI } from '@/services/rooms';
import { formatDateTime } from '@/utils/formatting';

export default function Rooms() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { user: currentUser } = useAuth();
  const { rooms: allRooms, loading, error, fetchRooms } = useRooms();
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Pre-populate search from global navbar query param (?search=...)
  useEffect(() => {
    if (router.isReady && router.query.search) {
      setSearch(router.query.search as string);
    }
  }, [router.isReady, router.query.search]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchRooms({ search, limit: 100 });
  }, [isAuthenticated, authLoading, fetchRooms, search]);

  useEffect(() => {
    setRooms(allRooms);
  }, [allRooms]);

  const handleOpenForm = (room?: any) => {
    if (room) {
      setSelectedRoom(room);
      setFormData(room);
    } else {
      setSelectedRoom(null);
      setFormData({});
    }
    setFormDialogOpen(true);
  };

  const handleCloseForm = () => {
    setFormDialogOpen(false);
    setSelectedRoom(null);
    setFormData({});
  };

  const handleFormSave = async () => {
    try {
      setActionLoading(true);
      if (selectedRoom) {
        await roomsAPI.update(selectedRoom._id, formData);
        setSuccessMessage('Room updated successfully');
      } else {
        await roomsAPI.create(formData);
        setSuccessMessage('Room created successfully');
      }
      handleCloseForm();
      fetchRooms({ limit: 100 });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOpen = (room: any) => {
    setSelectedRoom(room);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedRoom(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      setActionLoading(true);
      await roomsAPI.delete(selectedRoom._id);
      setSuccessMessage('Room deleted successfully');
      handleDeleteClose();
      fetchRooms({ limit: 100 });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { id: 'code', label: 'Room Code', minWidth: 120 },
    { id: 'name', label: 'Room Name', minWidth: 150 },
    { id: 'building', label: 'Building', minWidth: 120 },
    { id: 'floor', label: 'Floor', minWidth: 80 },
    { id: 'capacity', label: 'Capacity', minWidth: 80 },
    { id: 'scanCount', label: 'Scans', minWidth: 80 },
    { id: 'lastScanned', label: 'Last Scanned', minWidth: 150, format: (v: string) => v ? formatDateTime(v) : 'Never' },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      render: (row: any) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" color="info" onClick={() => router.push(`/rooms/${row._id}`)} title="View Details">
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="primary" onClick={() => handleOpenForm(row)} title="Edit Room">
            <EditIcon fontSize="small" />
          </IconButton>
          {currentUser?.role === 'SUPER_ADMIN' && (
            <IconButton size="small" color="error" onClick={() => handleDeleteOpen(row)} title="Delete Room">
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
              Rooms
            </Typography>
            <Typography variant="body2" color="textSecondary">
              View and manage all rooms in the system
            </Typography>
          </Box>
          {currentUser?.role === 'SUPER_ADMIN' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenForm()}
              sx={{ textTransform: 'none' }}
            >
              Add New Room
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

        {/* Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              label="Search rooms"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
              size="small"
            />
          </CardContent>
        </Card>

        {/* Rooms Table */}
        <DataTable
          columns={columns}
          rows={rooms}
          loading={loading}
          emptyMessage="No rooms found"
        />

        {/* Room Form Dialog */}
        <Dialog open={formDialogOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Room Code"
              value={formData.code || ''}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              margin="normal"
              disabled={!!selectedRoom}
            />
            <TextField
              fullWidth
              label="Room Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Building"
              value={formData.building || ''}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Floor"
              value={formData.floor || ''}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              type="number"
              label="Capacity"
              value={formData.capacity || ''}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              margin="normal"
            />
            <TextField
              fullWidth
              type="number"
              label="Latitude"
              value={formData.latitude || ''}
              onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || undefined })}
              margin="normal"
              placeholder="e.g. 33.6844"
              helperText="Right-click your location on Google Maps to copy coordinates"
              inputProps={{ step: 'any' }}
            />
            <TextField
              fullWidth
              type="number"
              label="Longitude"
              value={formData.longitude || ''}
              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || undefined })}
              margin="normal"
              placeholder="e.g. 73.0479"
              inputProps={{ step: 'any' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseForm}>Cancel</Button>
            <Button onClick={handleFormSave} variant="contained" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteClose} maxWidth="sm" fullWidth>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography>
              Are you sure you want to delete room <strong>{selectedRoom?.name}</strong>? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} variant="contained" color="error" disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
