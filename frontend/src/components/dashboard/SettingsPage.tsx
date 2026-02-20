import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Key,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

const notificationSchema = z.object({
  email: z.boolean(),
  browser: z.boolean(),
  testComplete: z.boolean(),
  criticalIssues: z.boolean(),
});

const preferencesSchema = z.object({
  defaultTestType: z.string(),
  defaultDevice: z.string(),
  autoScreenshots: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const SettingsPage = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  // Notifications form
  const notificationsForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      email: true,
      browser: true,
      testComplete: true,
      criticalIssues: true,
    },
  });

  // Preferences form
  const preferencesForm = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      defaultTestType: 'performance',
      defaultDevice: 'desktop',
      autoScreenshots: true,
    },
  });

  // Password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit: SubmitHandler<any> = async (data) => {
    setIsLoading(true);
    setSuccessMessage('');

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (user) {
        setUser({ ...user, name: data.name, email: data.email });
      }
      
      setSuccessMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onNotificationsSubmit: SubmitHandler<any> = async () => {
    setIsLoading(true);
    setSuccessMessage('');

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage('Notification preferences updated!');
    } catch (error) {
      console.error('Failed to update notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const onPreferencesSubmit: SubmitHandler<any> = async () => {
    setIsLoading(true);
    setSuccessMessage('');

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage('Preferences updated successfully!');
    } catch (error) {
      console.error('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit: SubmitHandler<any> = async () => {
    setIsLoading(true);
    setSuccessMessage('');

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage('Password changed successfully!');
      passwordForm.reset();
    } catch (error) {
      console.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'preferences', name: 'Preferences', icon: Shield },
    { id: 'security', name: 'Security', icon: Key },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'danger', name: 'Danger Zone', icon: Trash2 },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <Check size={20} className="mr-2" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon size={20} className="mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <Input
                        {...profileForm.register('name')}
                        type="text"
                        id="name"
                        className={cn(
                          profileForm.formState.errors.name && 'border-red-300'
                        )}
                      />
                      {profileForm.formState.errors.name && (
                        <p className="text-red-600 text-sm mt-1">
                          {profileForm.formState.errors.name.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <Input
                        {...profileForm.register('email')}
                        type="email"
                        id="email"
                        className={cn(
                          profileForm.formState.errors.email && 'border-red-300'
                        )}
                      />
                      {profileForm.formState.errors.email && (
                        <p className="text-red-600 text-sm mt-1">
                          {profileForm.formState.errors.email.message}
                        </p>
                      )}
                    </Field>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Plan
                    </label>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{user?.plan} Plan</p>
                        <p className="text-sm text-gray-500">
                          {user?.plan === 'free' ? 'Limited features' : 'Full access to all features'}
                        </p>
                      </div>
                      {user?.plan === 'free' && (
                        <Button variant="outline" size="sm">
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} className="mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <input
                        {...notificationsForm.register('email')}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Browser Notifications</h3>
                        <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
                      </div>
                      <input
                        {...notificationsForm.register('browser')}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Test Completion</h3>
                        <p className="text-sm text-gray-500">Get notified when tests are completed</p>
                      </div>
                      <input
                        {...notificationsForm.register('testComplete')}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Critical Issues</h3>
                        <p className="text-sm text-gray-500">Get alerted for critical issues found</p>
                      </div>
                      <input
                        {...notificationsForm.register('criticalIssues')}
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Test Preferences</h2>
                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Test Type
                      </label>
                      <Select 
                        onValueChange={(value) => preferencesForm.setValue('defaultTestType', value)}
                        defaultValue={preferencesForm.getValues('defaultTestType')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="ui">UI</SelectItem>
                          <SelectItem value="accessibility">Accessibility</SelectItem>
                          <SelectItem value="seo">SEO</SelectItem>
                          <SelectItem value="full">Full Test</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Device
                      </label>
                      <Select 
                        onValueChange={(value) => preferencesForm.setValue('defaultDevice', value)}
                        defaultValue={preferencesForm.getValues('defaultDevice')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desktop">Desktop</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Auto Screenshots</h3>
                      <p className="text-sm text-gray-500">Automatically capture screenshots during tests</p>
                    </div>
                    <input
                      {...preferencesForm.register('autoScreenshots')}
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Security</h2>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <Field>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <Input
                            {...passwordForm.register('currentPassword')}
                            type={showCurrentPassword ? 'text' : 'password'}
                            id="currentPassword"
                            className={cn(
                              'pr-10',
                              passwordForm.formState.errors.currentPassword && 'border-red-300'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordForm.formState.errors.currentPassword && (
                          <p className="text-red-600 text-sm mt-1">
                            {passwordForm.formState.errors.currentPassword.message}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <Input
                            {...passwordForm.register('newPassword')}
                            type={showNewPassword ? 'text' : 'password'}
                            id="newPassword"
                            className={cn(
                              'pr-10',
                              passwordForm.formState.errors.newPassword && 'border-red-300'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-red-600 text-sm mt-1">
                            {passwordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </Field>

                      <Field>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Input
                            {...passwordForm.register('confirmPassword')}
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            className={cn(
                              'pr-10',
                              passwordForm.formState.errors.confirmPassword && 'border-red-300'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordForm.formState.errors.confirmPassword && (
                          <p className="text-red-600 text-sm mt-1">
                            {passwordForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </Field>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing & Subscription</h2>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Current Plan: {user?.plan} Plan</h3>
                    <p className="text-sm text-gray-500">
                      {user?.plan === 'free' ? 'You are on the free plan with limited features.' : 'You have full access to all features.'}
                    </p>
                    {user?.plan === 'free' && (
                      <Button className="mt-4">Upgrade to Pro</Button>
                    )}
                  </div>
                  
                  {user?.plan !== 'free' && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Payment Method</h3>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-500">No payment method on file</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Add Payment Method
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Danger Zone</h2>
                <div className="border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertTriangle size={20} className="text-red-500 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-medium text-red-900 mb-2">Delete Account</h3>
                      <p className="text-sm text-red-700 mb-4">
                        Once you delete your account, there is no going back. Please be certain.
                        This action will permanently delete your account and all associated data.
                      </p>
                      <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                        <Trash2 size={16} className="mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;