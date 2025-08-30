/**
 * CID Sentinel - React Hooks for Data Management
 * 
 * Custom hooks for managing CID data, caching, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CIDDashboardItem,
  CIDDetailData,
  EvidencePack,
  CIDSentinelAPI,
  CIDListResponse,
  CIDDetailResponse,
  CacheConfig
} from '../types/ui-data-contract';
import { DataUtils } from '../utils/data-transforms';

// ===== CACHE MANAGEMENT HOOK =====

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  loading: boolean;
  error: string | null;
}

export function useCache<T>(config: CacheConfig) {
  const cache = useRef(new Map<string, CacheEntry<T>>());
  
  const getCached = useCallback((key: string): CacheEntry<T> | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;
    
    if (!DataUtils.isCacheValid(entry.timestamp, config.ttl)) {
      cache.current.delete(key);
      return null;
    }
    
    return entry;
  }, [config.ttl]);
  
  const setCached = useCallback((key: string, data: T, error: string | null = null) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      loading: false,
      error
    });
  }, []);
  
  const setLoading = useCallback((key: string, loading: boolean) => {
    const existing = cache.current.get(key);
    if (existing) {
      cache.current.set(key, { ...existing, loading });
    } else {
      cache.current.set(key, {
        data: null as T,
        timestamp: Date.now(),
        loading,
        error: null
      });
    }
  }, []);
  
  const clearCache = useCallback((pattern?: string) => {
    if (!pattern) {
      cache.current.clear();
      return;
    }
    
    for (const key of cache.current.keys()) {
      if (key.includes(pattern)) {
        cache.current.delete(key);
      }
    }
  }, []);
  
  return { getCached, setCached, setLoading, clearCache };
}

// ===== CID LIST HOOK =====

interface UseCIDListOptions {
  api: CIDSentinelAPI;
  autoRefresh?: boolean;
  refreshInterval?: number;
  sortField?: 'status' | 'uptime' | 'stake' | 'registered';
  sortOrder?: 'asc' | 'desc';
  cache?: CacheConfig;
}

export function useCIDList(options: UseCIDListOptions) {
  const {
    api,
    autoRefresh = false,
    refreshInterval = 30000,
    sortField = 'status',
    sortOrder = 'desc',
    cache = { enabled: true, ttl: 30000 }
  } = options;
  
  const [cids, setCids] = useState<CIDDashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  const { getCached, setCached, setLoading: setCacheLoading } = useCache<CIDDashboardItem[]>(cache);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchCIDs = useCallback(async (force = false) => {
    const cacheKey = DataUtils.getCacheKey('cid-list');
    
    // Check cache first
    if (!force && cache.enabled) {
      const cached = getCached(cacheKey);
      if (cached && !cached.loading) {
        setCids(cached.data);
        setError(cached.error);
        setLoading(false);
        return;
      }
    }
    
    try {
      setCacheLoading(cacheKey, true);
      setLoading(true);
      setError(null);
      
      const response: CIDListResponse = await api.getCIDList();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch CID list');
      }
      
      // Sort the data
      const sortedCIDs = DataUtils.sortCIDs(response.data, sortField, sortOrder);
      
      setCids(sortedCIDs);
      setLastUpdated(Date.now());
      
      if (cache.enabled) {
        setCached(cacheKey, sortedCIDs);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      if (cache.enabled) {
        setCached(cacheKey, [], errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [api, cache.enabled, getCached, setCached, setCacheLoading, sortField, sortOrder]);
  
  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchCIDs(true);
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchCIDs]);
  
  // Initial fetch
  useEffect(() => {
    fetchCIDs();
  }, [fetchCIDs]);
  
  const refresh = useCallback(() => fetchCIDs(true), [fetchCIDs]);
  
  // Sort CIDs when sort params change
  const sortedCIDs = DataUtils.sortCIDs(cids, sortField, sortOrder);
  
  return {
    cids: sortedCIDs,
    loading,
    error,
    lastUpdated,
    refresh
  };
}

// ===== CID DETAIL HOOK =====

interface UseCIDDetailOptions {
  cid: string;
  api: CIDSentinelAPI;
  autoRefresh?: boolean;
  refreshInterval?: number;
  cache?: CacheConfig;
}

export function useCIDDetail(options: UseCIDDetailOptions) {
  const {
    cid,
    api,
    autoRefresh = false,
    refreshInterval = 15000,
    cache = { enabled: true, ttl: 15000 }
  } = options;
  
  const [cidData, setCidData] = useState<CIDDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  const { getCached, setCached, setLoading: setCacheLoading } = useCache<CIDDetailData>(cache);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchCIDDetail = useCallback(async (force = false) => {
    if (!cid) return;
    
    const cacheKey = DataUtils.getCacheKey('cid-detail', cid);
    
    // Check cache first
    if (!force && cache.enabled) {
      const cached = getCached(cacheKey);
      if (cached && !cached.loading) {
        setCidData(cached.data);
        setError(cached.error);
        setLoading(false);
        return;
      }
    }
    
    try {
      setCacheLoading(cacheKey, true);
      setLoading(true);
      setError(null);
      
      const response: CIDDetailResponse = await api.getCIDDetail(cid);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch CID details');
      }
      
      setCidData(response.data);
      setLastUpdated(Date.now());
      
      if (cache.enabled) {
        setCached(cacheKey, response.data);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      if (cache.enabled) {
        setCached(cacheKey, null as any, errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [cid, api, cache.enabled, getCached, setCached, setCacheLoading]);
  
  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchCIDDetail(true);
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchCIDDetail]);
  
  // Fetch when CID changes
  useEffect(() => {
    fetchCIDDetail();
  }, [fetchCIDDetail]);
  
  const refresh = useCallback(() => fetchCIDDetail(true), [fetchCIDDetail]);
  
  return {
    cidData,
    loading,
    error,
    lastUpdated,
    refresh
  };
}

// ===== EVIDENCE PACK HISTORY HOOK =====

interface UseEvidenceHistoryOptions {
  cid: string;
  api: CIDSentinelAPI;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  cache?: CacheConfig;
}

export function useEvidenceHistory(options: UseEvidenceHistoryOptions) {
  const {
    cid,
    api,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 30000,
    cache = { enabled: true, ttl: 30000 }
  } = options;
  
  const [evidencePacks, setEvidencePacks] = useState<EvidencePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  const { getCached, setCached, setLoading: setCacheLoading } = useCache<EvidencePack[]>(cache);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchHistory = useCallback(async (force = false, offset = 0) => {
    if (!cid) return;
    
    const cacheKey = DataUtils.getCacheKey('evidence-history', cid, String(limit), String(offset));
    
    // Check cache first (only for initial load)
    if (!force && offset === 0 && cache.enabled) {
      const cached = getCached(cacheKey);
      if (cached && !cached.loading) {
        setEvidencePacks(cached.data);
        setError(cached.error);
        setLoading(false);
        return;
      }
    }
    
    try {
      setCacheLoading(cacheKey, true);
      setLoading(offset === 0);
      setError(null);
      
      const response = await api.getEvidenceHistory(cid, limit, offset);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch evidence history');
      }
      
      const newPacks = response.data;
      
      if (offset === 0) {
        setEvidencePacks(newPacks);
      } else {
        setEvidencePacks(prev => [...prev, ...newPacks]);
      }
      
      setHasMore(newPacks.length === limit);
      setLastUpdated(Date.now());
      
      if (cache.enabled && offset === 0) {
        setCached(cacheKey, newPacks);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      if (cache.enabled && offset === 0) {
        setCached(cacheKey, [], errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [cid, api, limit, cache.enabled, getCached, setCached, setCacheLoading]);
  
  // Auto-refresh setup (only refresh first page)
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchHistory(true, 0);
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchHistory]);
  
  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  
  const refresh = useCallback(() => fetchHistory(true, 0), [fetchHistory]);
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchHistory(false, evidencePacks.length);
    }
  }, [fetchHistory, loading, hasMore, evidencePacks.length]);
  
  return {
    evidencePacks,
    loading,
    error,
    hasMore,
    lastUpdated,
    refresh,
    loadMore
  };
}

// ===== REAL-TIME UPDATES HOOK =====

interface UseRealtimeUpdatesOptions {
  enabled?: boolean;
  onCIDUpdate?: (cid: string, data: Partial<CIDDetailData>) => void;
  onNewEvidencePack?: (cid: string, pack: EvidencePack) => void;
  reconnectInterval?: number;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const {
    enabled = false,
    onCIDUpdate,
    onNewEvidencePack,
    reconnectInterval = 5000
  } = options;
  
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const connect = useCallback(() => {
    if (!enabled) return;
    
    try {
      // Note: Replace with actual WebSocket URL
      const ws = new WebSocket('wss://api.cid-sentinel.com/ws');
      
      ws.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('CID Sentinel WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'cid_update':
              if (onCIDUpdate) {
                onCIDUpdate(message.cid, message.data);
              }
              break;
            case 'new_evidence_pack':
              if (onNewEvidencePack) {
                onNewEvidencePack(message.cid, message.pack);
              }
              break;
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
        
        // Auto-reconnect
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };
      
      ws.onerror = (err) => {
        setError('WebSocket connection error');
        console.error('WebSocket error:', err);
      };
      
      wsRef.current = ws;
      
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket creation error:', err);
    }
  }, [enabled, onCIDUpdate, onNewEvidencePack, reconnectInterval]);
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnected(false);
  }, []);
  
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    
    return disconnect;
  }, [enabled, connect, disconnect]);
  
  return {
    connected,
    error,
    connect,
    disconnect
  };
}

// ===== EXPORT ALL HOOKS =====

export const CIDHooks = {
  useCache,
  useCIDList,
  useCIDDetail,
  useEvidenceHistory,
  useRealtimeUpdates
};
