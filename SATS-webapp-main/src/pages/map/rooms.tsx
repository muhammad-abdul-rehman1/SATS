import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Paper, Card, CardContent, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Chip } from '@mui/material';
import { Layout } from '../../components/Layout/MainLayout';
import { RoomsMap } from '../../components/Map/RoomsMap';
import { useRooms } from '../../hooks/useRooms';
import { useProtectedRoute } from '../../hooks/useRoute';

interface Room {
  _id: string;
  name: string;
  code: string;
  building?: string;
  floor?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  roomType?: string;
  lastScanned?: string;
}

export default function RoomsMapPage() {
  const { isAuthenticated, isLoading: authLoading } = useProtectedRoute();
  const { rooms, loading, error, fetchRooms } = useRooms();
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Fetch rooms on mount (once authenticated)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchRooms({ limit: 200 });
  }, [isAuthenticated, authLoading, fetchRooms]);

  useEffect(() => {
    let result = rooms;

    // Filter by search term
    if (searchTerm) {
      result = result.filter(
        (room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by building
    if (selectedBuilding !== 'all') {
      result = result.filter((room) => room.building === selectedBuilding);
    }

    // Filter by floor
    if (selectedFloor !== 'all') {
      result = result.filter((room) => room.floor === selectedFloor);
    }

    // Filter by room type
    if (selectedType !== 'all') {
      result = result.filter((room) => room.roomType === selectedType);
    }

    setFilteredRooms(result);
  }, [rooms, searchTerm, selectedBuilding, selectedFloor, selectedType]);

  // Get unique values for filters
  const buildings = [...new Set(rooms.map((r) => r.building).filter(Boolean))] as string[];
  const floors = [...new Set(rooms.map((r) => r.floor).filter(Boolean))] as string[];
  const roomTypes = [...new Set(rooms.map((r) => r.roomType).filter(Boolean))] as string[];

  const roomsWithCoords = filteredRooms.filter((r) => r.latitude && r.longitude);
  const roomsWithoutCoords = filteredRooms.filter((r) => !r.latitude || !r.longitude);

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Rooms Map
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Visualize your rooms with location data on an interactive map
          </Typography>
        </Box>

        {error && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#ffebee', borderLeft: '4px solid #d32f2f' }}>
            <Typography color="error">Error loading rooms: {error}</Typography>
          </Paper>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by name or code"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g., Meeting Room"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={selectedBuilding}
                    label="Building"
                    onChange={(e) => setSelectedBuilding(e.target.value)}
                  >
                    <MenuItem value="all">All Buildings</MenuItem>
                    {buildings.map((building) => (
                      <MenuItem key={building} value={building}>
                        {building}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Floor</InputLabel>
                  <Select
                    value={selectedFloor}
                    label="Floor"
                    onChange={(e) => setSelectedFloor(e.target.value)}
                  >
                    <MenuItem value="all">All Floors</MenuItem>
                    {floors.map((floor) => (
                      <MenuItem key={floor} value={floor}>
                        {floor}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Room Type</InputLabel>
                  <Select
                    value={selectedType}
                    label="Room Type"
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {roomTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Rooms
                </Typography>
                <Typography variant="h5">{filteredRooms.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  With Location
                </Typography>
                <Typography variant="h5">{roomsWithCoords.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Without Location
                </Typography>
                <Typography variant="h5">{roomsWithoutCoords.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Loading Status
                </Typography>
                <Typography variant="h5" color={loading ? 'info' : 'success'}>
                  {loading ? 'Loading...' : 'Ready'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Map */}
        <Box sx={{ mb: 3 }}>
          <RoomsMap rooms={filteredRooms} loading={loading} />
        </Box>

        {/* Rooms Without Location */}
        {roomsWithoutCoords.length > 0 && (
          <Card sx={{ backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: '#e65100' }}>
                Rooms Without Location Data ({roomsWithoutCoords.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {roomsWithoutCoords.map((room) => (
                  <Chip
                    key={room._id}
                    label={`${room.name} (${room.code})`}
                    variant="outlined"
                    color="warning"
                  />
                ))}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#e65100' }}>
                These rooms don&apos;t have latitude/longitude coordinates set. Add location data to display them on the map.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </Layout>
  );
}
