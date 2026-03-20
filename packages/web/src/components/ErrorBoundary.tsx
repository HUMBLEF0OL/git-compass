"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-card/50 border border-destructive/20 shadow-neumo-pressed min-h-[200px] text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-lg font-black tracking-tight">Component Failed</h3>
          <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
            Something went wrong while rendering {this.props.name || 'this component'}.
          </p>
          <button 
            onClick={this.handleReset}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-background shadow-neumo-convex rounded-lg text-xs font-black hover:shadow-neumo-pressed transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
