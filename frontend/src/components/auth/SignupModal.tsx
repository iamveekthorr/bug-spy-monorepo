import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Check, Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthStore, useUIStore } from '@/store';
import { useSignup } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { SignupFormData } from '@/types';

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  agreeToTerms: z.boolean().refine((val) => val === true, 'You must agree to the terms and conditions'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const SignupModal = ({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { error, isLoading } = useAuthStore();
  const { openLoginModal } = useUIStore();
  const signupMutation = useSignup();

  const form = useForm<Omit<SignupFormData, 'name'> & { agreeToTerms: boolean }>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, form]);

  const password = form.watch('password');
  const passwordRequirements = [
    { label: 'At least 8 characters', met: password?.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password || '') },
    { label: 'One lowercase letter', met: /[a-z]/.test(password || '') },
    { label: 'One number', met: /\d/.test(password || '') },
  ];

  const onSubmit: SubmitHandler<Omit<SignupFormData, 'name'> & { agreeToTerms: boolean }> = async (data) => {
    signupMutation.mutate(
      {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      },
      {
        onSuccess: () => {
          form.reset();
          onClose();
          // After signup, prompt user to login
          openLoginModal();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white p-0 gap-0">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
            <p className="text-sm text-gray-600">Start testing your websites with BugSpy</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <Field>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <Input
                {...form.register('email')}
                type="email"
                id="email"
                placeholder="you@example.com"
                className={cn(
                  'h-11',
                  form.formState.errors.email && 'border-red-300 focus:border-red-500'
                )}
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.email.message}</p>
              )}
            </Field>

            {/* Password Field */}
            <Field>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  {...form.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Create a password"
                  className={cn(
                    'h-11 pr-10',
                    form.formState.errors.password && 'border-red-300 focus:border-red-500'
                  )}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <Check
                        size={12}
                        className={cn(
                          'mr-2',
                          req.met ? 'text-green-500' : 'text-gray-300'
                        )}
                      />
                      <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {form.formState.errors.password && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.password.message}</p>
              )}
            </Field>

            {/* Confirm Password Field */}
            <Field>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  {...form.register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  className={cn(
                    'h-11 pr-10',
                    form.formState.errors.confirmPassword && 'border-red-300 focus:border-red-500'
                  )}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </Field>

            {/* Terms Agreement */}
            <Field>
              <label className="flex items-start">
                <input
                  {...form.register('agreeToTerms')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                  disabled={isLoading}
                />
                <span className="ml-3 text-sm text-gray-600">
                  I agree to the{' '}
                  <button type="button" className="text-blue-600 hover:text-blue-700 font-medium">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="text-blue-600 hover:text-blue-700 font-medium">
                    Privacy Policy
                  </button>
                </span>
              </label>
              {form.formState.errors.agreeToTerms && (
                <p className="text-red-600 text-xs mt-1">{form.formState.errors.agreeToTerms.message}</p>
              )}
            </Field>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" className="h-10">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm">Google</span>
            </Button>
            <Button variant="outline" type="button" className="h-10">
              <Github className="w-4 h-4 mr-2" />
              <span className="text-sm">GitHub</span>
            </Button>
          </div>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupModal;
