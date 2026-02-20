import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console (can be extended to error tracking service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to error tracking service (e.g., Sentry, LogRocket, etc.)
    // Example: errorTrackingService.logError(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>

            {/* Error Description */}
            <p className="text-gray-600 text-center mb-6">
              We're sorry for the inconvenience. An unexpected error occurred while processing your request.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Error Message:</p>
                    <p className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded border border-red-200">
                      {this.state.error.message}
                    </p>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Component Stack:</p>
                      <pre className="text-xs text-gray-700 bg-gray-100 p-2 rounded border border-gray-300 overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center mt-6">
              If this problem persists, please contact our support team.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
