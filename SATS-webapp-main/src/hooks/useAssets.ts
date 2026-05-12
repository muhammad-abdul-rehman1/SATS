import { useState, useCallback } from 'react';
import { Asset, AssetFilters } from '@/types';
import { assetsAPI } from '@/services/assets';

export const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchAssets = useCallback(async (filters?: AssetFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetsAPI.getAll(filters);
      
      // Handle different response formats
      let assetData: Asset[] = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        assetData = response.data;
      } else if (response.data?.data) {
        // Wrapped response with .data.data
        if (Array.isArray(response.data.data.data)) {
          assetData = response.data.data.data;
          setTotal(response.data.data.total || assetData.length);
        } else if (Array.isArray(response.data.data)) {
          assetData = response.data.data;
        }
      }
      
      setAssets(assetData);
      setTotal((prev) => (prev === 0 && assetData.length > 0 ? assetData.length : prev));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssetById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetsAPI.getById(id);
      
      // Handle different response formats
      if (response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch asset');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { assets, loading, error, total, fetchAssets, fetchAssetById };
};
