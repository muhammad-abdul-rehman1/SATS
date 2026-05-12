import { useState, useCallback, useEffect } from 'react';
import { Room } from '@/types';
import { roomsAPI } from '@/services/rooms';

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchRooms = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await roomsAPI.getAll(filters);
      
      // Handle different response formats
      let roomData: Room[] = [];
      
      if (Array.isArray(response.data)) {
        roomData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        roomData = response.data.data;
      } else if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        roomData = response.data.data.data;
        setTotal(response.data.data.total || roomData.length);
      }
      
      setRooms(roomData);
      setTotal((prev) => (prev === 0 && roomData.length > 0 ? roomData.length : prev));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoomById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await roomsAPI.getById(id);
      
      // Handle different response formats
      if (response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch room');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { rooms, loading, error, total, fetchRooms, fetchRoomById };
};
