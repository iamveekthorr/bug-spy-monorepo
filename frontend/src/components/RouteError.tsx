import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RouteError = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected error occurred';
  let errorStatus = 'Error';

  if (isRouteErrorResponse(error)) {
    errorStatus = `${error.status}`;
    errorMessage = error.statusText || error.data?.message || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Error Status */}
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-2">
          {errorStatus}
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 text-center mb-6">{errorMessage}</p>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              Error Details
            </summary>
            <pre className="text-xs text-gray-700 bg-gray-100 p-2 rounded border border-gray-300 overflow-x-auto mt-2">
              {error.stack}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={handleGoHome}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RouteError;
