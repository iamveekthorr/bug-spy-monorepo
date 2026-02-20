import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, X, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const ForgotPasswordModal = ({ isOpen, onClose, onSwitchToLogin }: ForgotPasswordModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (_data) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual password reset
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
    } catch (error) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isSubmitted ? 'Check your email' : 'Reset your password'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{form.getValues('email')}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  form.reset();
                }}
                variant="outline"
                className="w-full mb-3"
              >
                Try again
              </Button>
              <Button
                onClick={onSwitchToLogin}
                className="w-full"
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Field>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Input
                      {...form.register('email')}
                      type="email"
                      id="email"
                      placeholder="Enter your email"
                      className={cn(
                        'pl-10',
                        form.formState.errors.email && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      )}
                    />
                    <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.email.message}</p>
                  )}
                </Field>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{' '}
                  <button 
                    onClick={onSwitchToLogin}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;