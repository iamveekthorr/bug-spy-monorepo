import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Check, Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import type { SignupFormData } from '@/types';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
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

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, setError, error } = useAuthStore();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const password = form.watch('password');
  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
  ];

  const onSubmit: SubmitHandler<SignupFormData> = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock API call - replace with actual registration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Mock user data - replace with actual user data from API
      const mockUser = {
        id: '1',
        email: data.email,
        name: data.name,
        plan: 'free' as const,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      };

      login(mockUser);
      navigate('/dashboard');
    } catch (error) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to home
        </Link>

        {/* Signup form */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
            <p className="text-gray-600">Start testing your websites with BugSpy</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Field>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full name
              </label>
              <div className="relative">
                <Input
                  {...form.register('name')}
                  type="text"
                  id="name"
                  placeholder="Enter your full name"
                  className={cn(
                    'pl-10',
                    form.formState.errors.name && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  )}
                />
                <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              {form.formState.errors.name && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </Field>

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

            <Field>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  {...form.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Create a password"
                  className={cn(
                    'pl-10 pr-10',
                    form.formState.errors.password && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  )}
                />
                <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.password.message}</p>
              )}
            </Field>

            <Field>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  {...form.register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm your password"
                  className={cn(
                    'pl-10 pr-10',
                    form.formState.errors.confirmPassword && 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  )}
                />
                <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.confirmPassword.message}</p>
              )}
            </Field>

            <Field>
              <label className="flex items-start">
                <input
                  {...form.register('agreeToTerms')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mt-0.5"
                />
                <span className="ml-3 text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {form.formState.errors.agreeToTerms && (
                <p className="text-red-600 text-sm mt-1">{form.formState.errors.agreeToTerms.message}</p>
              )}
            </Field>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Social signup options */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" type="button" className="w-full">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="ml-2">Google</span>
              </Button>
              <Button variant="outline" type="button" className="w-full">
                <Github className="w-5 h-5" />
                <span className="ml-2">GitHub</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;