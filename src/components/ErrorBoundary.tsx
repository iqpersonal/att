"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm m-6">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2 font-outfit">Something went wrong</h2>
          <p className="text-slate-600 max-w-md mb-8">
            An unexpected error occurred in this section. We've been notified and are working on it.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:shadow-lg transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl text-left overflow-auto max-w-full font-mono text-xs text-red-600 border border-red-100">
              {this.state.error?.toString()}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;