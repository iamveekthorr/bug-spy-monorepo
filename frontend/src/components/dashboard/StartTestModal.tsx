import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StartTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: TestParams) => void;
}

export interface TestParams {
  url: string;
  testType: 'performance' | 'accessibility' | 'seo' | 'best-practices';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  includeScreenshots: boolean;
}

export const StartTestModal = ({ isOpen, onClose, onSubmit }: StartTestModalProps) => {
  const [url, setUrl] = useState('');
  const [testType, setTestType] = useState<TestParams['testType']>('performance');
  const [deviceType, setDeviceType] = useState<TestParams['deviceType']>('desktop');
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [errors, setErrors] = useState<{ url?: string }>({});

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL
    if (!url.trim()) {
      setErrors({ url: 'Please enter a URL' });
      return;
    }

    if (!validateUrl(url)) {
      setErrors({ url: 'Please enter a valid URL (include http:// or https://)' });
      return;
    }

    setErrors({});

    // Submit the test
    onSubmit({
      url,
      testType,
      deviceType,
      includeScreenshots,
    });

    // Reset form
    setUrl('');
    setTestType('performance');
    setDeviceType('desktop');
    setIncludeScreenshots(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Start New Test</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <Input
                id="url"
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErrors({});
                }}
                className={errors.url ? 'border-red-500' : ''}
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-600">{errors.url}</p>
              )}
            </div>

            {/* Test Type */}
            <div>
              <label htmlFor="testType" className="block text-sm font-medium text-gray-700 mb-2">
                Test Type
              </label>
              <select
                id="testType"
                value={testType}
                onChange={(e) => setTestType(e.target.value as TestParams['testType'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="performance">Performance</option>
                <option value="accessibility">Accessibility</option>
                <option value="seo">SEO</option>
                <option value="best-practices">Best Practices</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {testType === 'performance' && 'Measure page load speed, Core Web Vitals, and performance metrics'}
                {testType === 'accessibility' && 'Check for accessibility issues and WCAG compliance'}
                {testType === 'seo' && 'Analyze SEO best practices and meta tags'}
                {testType === 'best-practices' && 'Evaluate overall code quality and best practices'}
              </p>
            </div>

            {/* Device Type */}
            <div>
              <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-2">
                Device Type
              </label>
              <select
                id="deviceType"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as TestParams['deviceType'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            {/* Include Screenshots */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="includeScreenshots"
                  type="checkbox"
                  checked={includeScreenshots}
                  onChange={(e) => setIncludeScreenshots(e.target.checked)}
                  className="w-4 h-4 border border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="includeScreenshots" className="text-sm font-medium text-gray-700">
                  Include Screenshots
                </label>
                <p className="text-sm text-gray-500">
                  Capture screenshots during the test (may increase test duration)
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit">
                Start Test
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
