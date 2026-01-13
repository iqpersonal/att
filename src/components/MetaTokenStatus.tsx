'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Check, Clock, RefreshCw } from 'lucide-react';

interface TokenStatus {
  isConfigured: boolean;
  expiresAt: number;
  expiry: {
    daysRemaining: number;
    formatted: string;
    isExpired: boolean;
  };
  lastRefreshed: number;
  tokenVersion: number;
  hasHistory: boolean;
}

export function MetaTokenStatus({ tenantId = 'tellus-teams' }: { tenantId?: string }) {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [tenantId]);

  async function fetchStatus() {
    try {
      const response = await fetch(`/api/integrations/meta?tenantId=${tenantId}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      const response = await fetch('/api/integrations/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (!response.ok) throw new Error('Refresh failed');
      const data = await response.json();
      setStatus(prev => prev ? {
        ...prev,
        expiresAt: data.expiresAt,
        expiry: data.expiry,
        tokenVersion: data.tokenVersion,
      } : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <div className="p-4 bg-gray-50 rounded-lg animate-pulse h-20"></div>;
  }

  if (!status?.isConfigured) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Meta Token Not Configured</h3>
          <p className="text-sm text-red-800">WhatsApp integration token is not set up</p>
        </div>
      </div>
    );
  }

  const isExpiringSoon = status.expiry.daysRemaining <= 7;
  const isExpired = status.expiry.isExpired;

  return (
    <div className="p-4 rounded-lg border bg-slate-50 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isExpired ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : isExpiringSoon ? (
            <Clock className="w-5 h-5 text-yellow-600" />
          ) : (
            <Check className="w-5 h-5 text-green-600" />
          )}
          <div>
            <h3 className="font-semibold">WhatsApp Token Status</h3>
            <p className="text-sm mt-1">
              {isExpired ? 'EXPIRED' : `Expires in ${status.expiry.formatted}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded font-medium flex items-center gap-2 transition bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          <RefreshCw className={refreshing ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
