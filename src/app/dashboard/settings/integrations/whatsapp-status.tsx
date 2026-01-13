'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, Link as LinkIcon, Unlink } from 'lucide-react';

interface WhatsAppConfig {
  status: 'connected' | 'token_expired' | 'not_connected';
  connectedAt?: number;
  expiresAt?: number;
  phoneNumberId?: string;
  wabaId?: string;
}

export default function WhatsAppStatus() {
  const { tenantId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');

  // Listen for status changes from URL params
  useEffect(() => {
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
    if (type === 'whatsapp') {
      if (status === 'success') {
        setMessage(' WhatsApp connected successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else if (status === 'error') {
        setMessage(' Failed to connect WhatsApp');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  }, [searchParams]);

  // Listen to Firestore for config changes
  useEffect(() => {
    if (!tenantId) return;

    const metaConfigRef = doc(db, `tenants/${tenantId}/integrations/meta`);
    
    const unsubscribe = onSnapshot(metaConfigRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          status: data.status || 'not_connected',
          connectedAt: data.connectedAt,
          expiresAt: data.expiresAt,
          phoneNumberId: data.phoneNumberId,
          wabaId: data.wabaId,
        });
      } else {
        setConfig({ status: 'not_connected' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const handleConnect = async () => {
    setConnecting(true);
    const redirectUri = `/api/integrations/whatsapp/oauth/authorize?tenantId=${tenantId}`;
    window.location.href = redirectUri;
  };

  const handleDisconnect = async () => {
    if (!tenantId) return;
    try {
      const response = await fetch(`/api/integrations/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      
      if (response.ok) {
        setConfig({ status: 'not_connected' });
        setMessage(' WhatsApp disconnected');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Disconnect failed:', error);
      setMessage(' Failed to disconnect');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = config?.status === 'connected';
  const isExpired = config?.status === 'token_expired';

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <div>
                  <h3 className="font-bold text-slate-900">WhatsApp Connected</h3>
                  <p className="text-sm text-slate-600">Ready to send messages</p>
                </div>
              </>
            ) : isExpired ? (
              <>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                <div>
                  <h3 className="font-bold text-slate-900">Token Expired</h3>
                  <p className="text-sm text-slate-600">Please reconnect WhatsApp</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-slate-400" />
                <div>
                  <h3 className="font-bold text-slate-900">Not Connected</h3>
                  <p className="text-sm text-slate-600">Connect WhatsApp to send messages</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        {isConnected && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            {config?.phoneNumberId && (
              <div className="flex justify-between">
                <span className="text-slate-600">Phone Number ID:</span>
                <span className="font-mono text-slate-900">{config.phoneNumberId}</span>
              </div>
            )}
            {config?.expiresAt && (
              <div className="flex justify-between">
                <span className="text-slate-600">Token Expires:</span>
                <span className="text-slate-900">
                  {new Date(config.expiresAt * 1000).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="text-sm font-medium text-slate-700 bg-slate-100 rounded p-3">
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isConnected || isExpired ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Unlink className="h-4 w-4" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="h-4 w-4" />
              )}
              Connect WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
