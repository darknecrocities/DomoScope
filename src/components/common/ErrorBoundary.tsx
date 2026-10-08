import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronRight } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDetailsOpen: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    isDetailsOpen: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[DomoScope ErrorBoundary] Caught unhandled rendering exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isDetailsOpen: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleGoHome = (): void => {
    this.handleReset();
    if (typeof window !== 'undefined') {
      if (window.location.hash) {
        window.location.hash = '#/';
      } else {
        window.location.href = './';
      }
    }
  };

  public toggleDetails = (): void => {
    this.setState((prev) => ({ isDetailsOpen: !prev.isDetailsOpen }));
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error || new Error('Unknown error'), this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.fallbackTitle || 'Component Error Encountered';
      const message =
        this.props.fallbackMessage ||
        this.state.error?.message ||
        'An unexpected error occurred while rendering this view.';

      return (
        <div
          role="alert"
          className={`w-full p-6 sm:p-8 flex items-center justify-center min-h-[280px] bg-zinc-50/80 border border-zinc-200 rounded-2xl ${
            this.props.className || ''
          }`}
        >
          <div className="max-w-lg w-full bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-sm space-y-4 text-zinc-900">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-semibold text-zinc-900 tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed break-words font-sans">
                  {message}
                </p>
              </div>
            </div>

            {/* Error Stack Trace Details (Collapsible) */}
            {this.state.error && (
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50/60">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="w-full px-3 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-900 flex items-center justify-between cursor-pointer select-none"
                >
                  <span>Diagnostic Trace</span>
                  {this.state.isDetailsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {this.state.isDetailsOpen && (
                  <pre className="p-3 text-[11px] font-mono text-zinc-700 bg-zinc-950 text-zinc-200 overflow-x-auto max-h-48 border-t border-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {this.state.error.stack || this.state.error.message}
                  </pre>
                )}
              </div>
            )}

            {/* Action Recovery Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-medium transition-colors cursor-pointer border border-zinc-200"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
