'use client';

import { useAuth } from '@/context/AuthContext';
import WhatsAppStatus from './whatsapp-status';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function IntegrationsPage() {
  const { tenantId } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Integration Settings</h1>
          <p className="text-slate-600">Manage your third-party service integrations</p>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 rounded-lg p-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">WhatsApp Business</h2>
              <p className="text-slate-600">Connect your WhatsApp Business Account for messaging</p>
            </div>
          </div>

          <WhatsAppStatus />
        </div>

        {/* Additional Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teams - Coming Soon */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 opacity-60">
            <h3 className="font-bold text-slate-900 mb-2">Microsoft Teams</h3>
            <p className="text-sm text-slate-600 mb-4">Team meetings and calendar sync</p>
            <button disabled className="px-4 py-2 text-sm font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>

          {/* Google Meet - Coming Soon */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 opacity-60">
            <h3 className="font-bold text-slate-900 mb-2">Google Meet</h3>
            <p className="text-sm text-slate-600 mb-4">Video conference integration</p>
            <button disabled className="px-4 py-2 text-sm font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
             <strong>Security:</strong> All integrations are securely connected and your access tokens are encrypted. You can disconnect at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
