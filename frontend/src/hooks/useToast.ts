// Simple toast hook - can be replaced with a proper toast library like react-hot-toast or sonner
// This hook always returns an object with toast methods to prevent optional chaining issues
export const useToast = () => {
  const success = (message: string) => {
    console.log('SUCCESS:', message);
    // TODO: Implement actual toast notification
    // Could use browser notification API or a toast library
  };

  const error = (message: string) => {
    console.error('ERROR:', message);
    // TODO: Implement actual toast notification
  };

  const info = (message: string) => {
    console.info('INFO:', message);
    // TODO: Implement actual toast notification
  };

  const warning = (message: string) => {
    console.warn('WARNING:', message);
    // TODO: Implement actual toast notification
  };

  return { success, error, info, warning };
};
