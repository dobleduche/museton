import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("System Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-lg w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <div className="absolute inset-0 border border-red-500/50 rounded-full animate-ping"></div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">System Malfunction</h2>
              <p className="text-slate-400 mb-6">
                The audio or graphics engine encountered a critical error.
              </p>
              
              <div className="bg-black/40 p-4 rounded-lg text-left mb-8 border border-white/5 max-h-32 overflow-auto custom-scrollbar">
                 <p className="font-mono text-[10px] text-red-300 whitespace-pre-wrap">
                    {this.state.error?.message || "Unknown Error"}
                 </p>
              </div>

              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
              >
                <RefreshCw className="w-4 h-4" /> REBOOT WORKSTATION
              </button>
            </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}