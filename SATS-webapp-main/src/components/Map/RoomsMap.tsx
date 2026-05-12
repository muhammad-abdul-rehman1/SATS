import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Grid } from '@mui/material';

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

export const RoomsMap: React.FC<{ rooms: Room[]; loading?: boolean }> = ({ rooms, loading = false }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const roomsWithCoords = rooms.filter(r => {
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  if (roomsWithCoords.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="textSecondary">No rooms with location data</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <MapComp rooms={roomsWithCoords} selected={selectedRoom} onSelect={setSelectedRoom} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Rooms</Typography>
            <Box sx={{ maxHeight: '500px', overflowY: 'auto' }}>
              {roomsWithCoords.map((room) => (
                <Box
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  sx={{
                    p: 2,
                    mb: 1,
                    backgroundColor: selectedRoom?._id === room._id ? '#1976d2' : '#f9f9f9',
                    color: selectedRoom?._id === room._id ? 'white' : 'inherit',
                    cursor: 'pointer',
                    borderRadius: 1,
                  }}
                >
                  <Typography sx={{ fontWeight: 'bold' }}>{room.name}</Typography>
                  <Typography variant="caption">Code: {room.code}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      {selectedRoom && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{selectedRoom.name}</Typography>
              <Typography>Code: {selectedRoom.code}</Typography>
              {selectedRoom.building && <Typography>Building: {selectedRoom.building}</Typography>}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

const MapComp: React.FC<{ rooms: Room[]; selected: Room | null; onSelect: (r: Room | null) => void }> = ({ rooms, selected, onSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowsRef = useRef<Map<string, any>>(new Map());
  const activeInfoWindowRef = useRef<any>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [mapReady, setMapReady] = useState(false);

  const center = useMemo(() => {
    if (!rooms.length) return { lat: 31.401, lng: 74.211 };
    return {
      lat: rooms.reduce((s, r) => s + Number(r.latitude), 0) / rooms.length,
      lng: rooms.reduce((s, r) => s + Number(r.longitude), 0) / rooms.length,
    };
  }, [rooms]);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey || typeof window === 'undefined') return;

    // Check if already loaded
    if ((window as any).google?.maps) {
      setMapReady(true);
      return;
    }

    // Check if script is already in progress
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if ((window as any).google?.maps) {
          setMapReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;

    const handleLoad = () => {
      console.log('Google Maps API loaded');
      setMapReady(true);
    };

    const handleError = () => {
      console.error('Failed to load Google Maps API');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };
  }, [apiKey]);

  // Initialize and render map
  useEffect(() => {
    if (!mapReady || !mapRef.current || !rooms.length) {
      console.log('Map not ready. mapReady:', mapReady, 'mapRef:', !!mapRef.current, 'rooms:', rooms.length);
      return;
    }

    console.log('Initializing map...');

    // Initialize map only once
    if (!mapInstanceRef.current) {
      try {
        const map = new (window as any).google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          mapTypeControl: true,
          zoomControl: true,
          streetViewControl: false,
        });
        mapInstanceRef.current = map;
        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Error initializing map:', error);
        return;
      }
    }

    const map = mapInstanceRef.current;

    // Create InfoWindow content helper
    const createInfoWindowContent = (room: Room) => {
      return `
        <div style="font-family: Roboto, Arial, sans-serif; padding: 10px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${room.name}</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Code:</strong> ${room.code}</p>
          ${room.building ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Building:</strong> ${room.building}</p>` : ''}
          ${room.floor ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Floor:</strong> ${room.floor}</p>` : ''}
          ${room.capacity ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Capacity:</strong> ${room.capacity}</p>` : ''}
          ${room.roomType ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Type:</strong> ${room.roomType}</p>` : ''}
          ${room.lastScanned ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Last Scanned:</strong> ${new Date(room.lastScanned).toLocaleString()}</p>` : ''}
        </div>
      `;
    };

    // Clear previous markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();
    infoWindowsRef.current.clear();

    // Calculate bounds for all rooms
    const bounds = new (window as any).google.maps.LatLngBounds();

    // Add markers
    rooms.forEach((room) => {
      const lat = Number(room.latitude);
      const lng = Number(room.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const position = { lat, lng };

      // Extend bounds to include this marker
      bounds.extend(position);

      const marker = new (window as any).google.maps.Marker({
        position,
        map,
        title: room.name,
        icon: '/images/blue-dot.png',
      });

      // Create InfoWindow for this marker
      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: createInfoWindowContent(room),
      });
      infoWindowsRef.current.set(room._id, infoWindow);

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
        onSelect(room);
      });

      markersRef.current.set(room._id, marker);
    });

    // Fit map to bounds
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
      // Add padding
      setTimeout(() => {
        (window as any).google.maps.event.trigger(map, 'resize');
        map.fitBounds(bounds);
      }, 0);
    }
  }, [mapReady, rooms, center, onSelect]);

  // Update marker colors when selection changes
  useEffect(() => {
    if (!mapReady) return;

    markersRef.current.forEach((marker, roomId) => {
      const isSelected = selected?._id === roomId;
      marker.setIcon(
        isSelected ? '/images/red-dot.png' : '/images/blue-dot.png'
      );
    });
  }, [selected, mapReady]);

  if (!apiKey) {
    return <Card><CardContent>API Key Missing</CardContent></Card>;
  }

  if (!mapReady) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: '500px', 
          borderRadius: '8px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} 
      >
        <Typography color="textSecondary">Loading map...</Typography>
      </Box>
    );
  }

  return (
    <Box 
      ref={mapRef} 
      sx={{ 
        width: '100%', 
        height: '500px', 
        borderRadius: '8px',
        backgroundColor: '#f0f0f0'
      }} 
    />
  );
};

