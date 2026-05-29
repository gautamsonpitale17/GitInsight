"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { reportClientError } from "@/lib/report-client-error";

const MAX_AUTO_RETRIES = 3;
const AUTO_RETRY_DELAY_MS = 500;

type SmartErrorBoundaryProps = {
  sectionName: string;
  children: ReactNode;
  fallback?: ReactNode;
  retryFetch?: () => void | Promise<void>;
};

type SmartErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  autoRetryCount: number;
  isPermanent: boolean;
  resetKey: number;
};

export class SmartErrorBoundary extends Component<
  SmartErrorBoundaryProps,
  SmartErrorBoundaryState
> {
  private autoRetryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  state: SmartErrorBoundaryState = {
    hasError: false,
    error: null,
    autoRetryCount: 0,
    isPermanent: false,
    resetKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<SmartErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportClientError(error, {
      sectionName: this.props.sectionName,
      componentStack: errorInfo.componentStack ?? undefined,
    });

    this.setState((prev) => {
      const autoRetryCount = prev.autoRetryCount + 1;
      return {
        autoRetryCount,
        isPermanent: autoRetryCount > MAX_AUTO_RETRIES,
      };
    }, () => {
      if (!this.state.isPermanent) {
        this.scheduleAutoRetry();
      }
    });
  }

  componentWillUnmount(): void {
    this.clearAutoRetry();
  }

  private clearAutoRetry(): void {
    if (this.autoRetryTimeoutId !== null) {
      clearTimeout(this.autoRetryTimeoutId);
      this.autoRetryTimeoutId = null;
    }
  }

  private scheduleAutoRetry(): void {
    this.clearAutoRetry();
    this.autoRetryTimeoutId = setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        resetKey: prev.resetKey + 1,
      }));
    }, AUTO_RETRY_DELAY_MS);
  }

  private handleManualRetry = (): void => {
    const { retryFetch } = this.props;

    if (retryFetch) {
      void Promise.resolve(retryFetch()).then(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          autoRetryCount: 0,
          isPermanent: false,
          resetKey: prev.resetKey + 1,
        }));
      });
      return;
    }

    window.location.reload();
  };

  private renderDefaultFallback(): ReactNode {
    const { sectionName } = this.props;

    return (
      <div
        role="alert"
        className="print-section rounded-card border border-gh-gray-2 bg-gh-surface p-4 text-sm text-gh-gray-5"
      >
        {sectionName} failed to load —{" "}
        <button
          type="button"
          onClick={this.handleManualRetry}
          className="gh-link font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, resetKey } = this.state;

    if (hasError) {
      return fallback ?? this.renderDefaultFallback();
    }

    return (
      <div key={resetKey} className="contents">
        {children}
      </div>
    );
  }
}
