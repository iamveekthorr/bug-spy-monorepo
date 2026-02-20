import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import type { ForgotPasswordFormData } from '@/types';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual password reset request
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
    } catch (error) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h1>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <strong>{form.getValues('email')}</strong>
            </p>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setError(null);
                  }}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  try another email address
                </button>
              </p>
              
              <Link
                to="/auth/login"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to login link */}
        <Link 
          to="/auth/login" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to sign in
        </Link>

        {/* Forgot password form */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password?</h1>
            <p className="text-gray-600">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Field>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
              {isLoading ? 'Sending...' : 'Reset password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Remember your password? <span className="text-blue-600 hover:text-blue-500 font-medium">Sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;